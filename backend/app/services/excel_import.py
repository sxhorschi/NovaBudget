"""Excel Import Engine — intelligently parses TYTAN CAPEX Excel workbooks.

Key capabilities:
- Auto-detects department sheets by header structure (not just hardcoded names)
- Extracts budget from BudgetTemplate sheet (with 0.85 factor)
- Reads calculated values (data_only=True) and preserves formula info
- Duplicate detection: update-on-reimport instead of blind insert
- Detailed per-department validation report
"""

from __future__ import annotations

import io
import logging
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CostItem, Department, WorkArea
from app.models.enums import ApprovalStatus, CostBasis, CostDriver, Product, ProjectPhase
from app.services.import_report import DepartmentReport, ImportReport

logger = logging.getLogger(__name__)

# ── Known sheet names → display names (fallback if auto-detection fails) ──────
KNOWN_DEPARTMENT_SHEETS: dict[str, str] = {
    "Assembly_Equipment": "Assembly Equipment",
    "Testing": "Testing",
    "Logistics": "Logistics",
    "Facility": "Facility",
    "Prototyping": "Prototyping",
}

# ── Expected header keywords (case-insensitive) for auto-detection ────────────
# If Row 5 contains at least 3 of these in any order, we treat it as a dept sheet.
HEADER_KEYWORDS = {"work area", "description", "amount", "cost basis", "approval", "phase"}

# Column headers we look for to confirm the standard layout
EXPECTED_HEADERS_ROW5 = {
    "work area": 2,
    "phase": 3,
    "product": 4,
    "description": 5,
    "amount": 6,
}

HEADER_ROW = 5
DATA_START_ROW = 6
BUDGET_FACTOR = Decimal("0.85")

# ── Column mapping (1-indexed): matches Excel layout ─────────────────────────
COL_WORK_AREA = 2       # B
COL_PHASE = 3            # C
COL_PRODUCT = 4          # D
COL_DESCRIPTION = 5      # E
COL_AMOUNT = 6           # F
COL_CASH_OUT = 7         # G
COL_COST_BASIS = 8       # H
COL_COST_DRIVER = 9      # I
COL_BASIS_DESC = 10      # J
COL_ASSUMPTIONS = 11     # K
COL_APPROVAL = 12        # L
COL_APPROVAL_DATE = 13   # M
COL_ZIELANPASSUNG = 14   # N
COL_COMMENTS = 15        # O


# ═══════════════════════════════════════════════════════════════════════════════
#  Helper functions
# ═══════════════════════════════════════════════════════════════════════════════

def _safe_decimal(value) -> Decimal:
    """Convert a cell value to Decimal, returning 0 on failure."""
    if value is None:
        return Decimal(0)
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, ArithmeticError):
        return Decimal(0)


def _safe_str(value) -> str | None:
    """Convert a cell value to stripped string, returning None if empty."""
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def _parse_date(value) -> date | None:
    """Parse a cell value into a date. Handles datetime, date, and string formats."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    str_val = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(str_val, fmt).date()
        except (ValueError, TypeError):
            continue
    return None


def _parse_enum(enum_class, value, default=None):
    """Fuzzy-match a cell value to a Python enum member.

    Returns (member, error_msg|None).
    """
    if value is None:
        return default, None
    str_val = str(value).strip()
    if not str_val:
        return default, None

    normalized = str_val.upper().replace(" ", "_").replace("-", "_")

    # Legacy product name mapping (old Excel files used Bryan/Guenther/Gin-Tonic)
    if enum_class is Product:
        _LEGACY_PRODUCT_MAP = {
            "BRYAN": Product.ATLAS,
            "GUENTHER": Product.ORION,
            "GÜNTHER": Product.ORION,
            "GIN_TONIC": Product.VEGA,
            "GIN__TONIC": Product.VEGA,
        }
        if normalized in _LEGACY_PRODUCT_MAP:
            return _LEGACY_PRODUCT_MAP[normalized], None

    # Exact match on value or name
    for member in enum_class:
        member_norm = member.value.upper().replace(" ", "_").replace("-", "_")
        if member_norm == normalized or member.name == normalized:
            return member, None

    # Partial / contains match
    for member in enum_class:
        member_norm = member.value.upper().replace(" ", "_").replace("-", "_")
        if normalized in member_norm or member_norm in normalized:
            return member, None

    return default, f"Unknown {enum_class.__name__} value '{str_val}'"


def _is_subtotal_row(ws: Worksheet, row: int) -> bool:
    """Subtotal rows have Work Area name (B) + Amount (F) but NO Description and NO Phase."""
    has_b = ws.cell(row=row, column=COL_WORK_AREA).value is not None
    has_f = ws.cell(row=row, column=COL_AMOUNT).value is not None
    has_description = ws.cell(row=row, column=COL_DESCRIPTION).value is not None
    has_phase = ws.cell(row=row, column=COL_PHASE).value is not None
    return has_b and has_f and not has_description and not has_phase


def _is_data_row(ws: Worksheet, row: int) -> bool:
    """Data rows must have at least a description."""
    has_description = ws.cell(row=row, column=COL_DESCRIPTION).value is not None
    return has_description


def _row_is_empty(ws: Worksheet, row: int) -> bool:
    """Check if an entire data row is empty (columns B through O)."""
    return all(ws.cell(row=row, column=c).value is None for c in range(2, 16))


# ═══════════════════════════════════════════════════════════════════════════════
#  Sheet auto-detection
# ═══════════════════════════════════════════════════════════════════════════════

def _detect_department_sheets(wb) -> dict[str, str]:
    """Detect department sheets by examining header structure in Row 5.

    Returns {sheet_name: display_name}.
    Falls back to known names for sheets that match the hardcoded list.
    """
    detected: dict[str, str] = {}

    for sheet_name in wb.sheetnames:
        # Skip known non-department sheets
        lower = sheet_name.lower()
        if any(skip in lower for skip in (
            "budget", "template", "dropdown", "summary", "graphic", "data_graphic", "fc", "forecast",
        )):
            continue

        ws = wb[sheet_name]
        # Check Row 5 for header keywords
        header_values: list[str] = []
        for col in range(1, 20):
            val = ws.cell(row=HEADER_ROW, column=col).value
            if val is not None:
                header_values.append(str(val).strip().lower())

        matched_keywords = sum(
            1 for kw in HEADER_KEYWORDS if any(kw in h for h in header_values)
        )

        if matched_keywords >= 3:
            # Determine display name: use known mapping or derive from sheet name
            display_name = KNOWN_DEPARTMENT_SHEETS.get(
                sheet_name,
                sheet_name.replace("_", " "),
            )
            detected[sheet_name] = display_name

    # Also include known sheets that exist but were not detected (safety net)
    for sheet_name, display_name in KNOWN_DEPARTMENT_SHEETS.items():
        if sheet_name in wb.sheetnames and sheet_name not in detected:
            # Verify it has at least some data rows
            ws = wb[sheet_name]
            has_data = any(
                ws.cell(row=r, column=COL_DESCRIPTION).value is not None
                for r in range(DATA_START_ROW, min(DATA_START_ROW + 5, ws.max_row + 1))
            )
            if has_data:
                detected[sheet_name] = display_name

    return detected


# ═══════════════════════════════════════════════════════════════════════════════
#  BudgetTemplate parsing
# ═══════════════════════════════════════════════════════════════════════════════

def _find_budget_template_sheet(wb) -> str | None:
    """Find the BudgetTemplate sheet (name starts with 'BudgetTemplate')."""
    for name in wb.sheetnames:
        if name.lower().startswith("budgettemplate"):
            return name
    return None


def _extract_department_budgets(
    wb,
    department_sheets: dict[str, str],
    report: ImportReport,
) -> dict[str, Decimal]:
    """Extract budget totals from BudgetTemplate sheet.

    Reads the formula-computed budget from cell F3 in each department sheet.
    F3 contains: =(BudgetTemplate!M_rows)*0.85
    With data_only=True, we get the calculated value directly.

    If F3 is empty, try to parse the BudgetTemplate directly.

    Returns {display_name: budget_decimal}.
    """
    budgets: dict[str, Decimal] = {}

    # Strategy 1: Read F3 from each department sheet (already has the 0.85 factor applied)
    for sheet_name, display_name in department_sheets.items():
        if sheet_name not in wb.sheetnames:
            continue
        ws = wb[sheet_name]
        f3_value = ws.cell(row=3, column=6).value  # F3
        if f3_value is not None:
            budget = _safe_decimal(f3_value)
            if budget > 0:
                budgets[display_name] = budget
                report.add_info(
                    f"{display_name}: Budget EUR {budget:,.2f} "
                    f"(from F3, includes {BUDGET_FACTOR} factor)"
                )

    # Strategy 2: If BudgetTemplate exists, read total from row 57 col M for unmapped depts
    bt_sheet_name = _find_budget_template_sheet(wb)
    if bt_sheet_name:
        report.budget_template_sheet = bt_sheet_name
        report.add_info(f"BudgetTemplate sheet found: '{bt_sheet_name}'")
    else:
        report.add_warning("No BudgetTemplate sheet found — budgets only from F3 cells")

    return budgets


# ═══════════════════════════════════════════════════════════════════════════════
#  Formula detection (reads from the non-data_only workbook)
# ═══════════════════════════════════════════════════════════════════════════════

def _extract_formula_comment(ws_formulas: Worksheet | None, row: int, col: int) -> str | None:
    """If the cell contains a formula, return it as a comment string."""
    if ws_formulas is None:
        return None
    cell = ws_formulas.cell(row=row, column=col)
    val = cell.value
    if val is not None and isinstance(val, str) and val.startswith("="):
        return f"[Formula: {val}]"
    return None


# ═══════════════════════════════════════════════════════════════════════════════
#  Duplicate detection
# ═══════════════════════════════════════════════════════════════════════════════

async def _find_existing_item(
    session: AsyncSession,
    work_area_id: UUID,
    description: str,
) -> CostItem | None:
    """Find an existing CostItem by work_area + description (case-insensitive)."""
    stmt = select(CostItem).where(
        CostItem.work_area_id == work_area_id,
        CostItem.description.ilike(description.strip()),
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


# ═══════════════════════════════════════════════════════════════════════════════
#  Main import function
# ═══════════════════════════════════════════════════════════════════════════════

async def import_excel_file(
    file_contents: bytes,
    facility_id: UUID,
    session: AsyncSession,
) -> dict:
    """Import a TYTAN CAPEX Excel workbook into the database.

    Returns a detailed JSON-serializable report dict.
    """
    report = ImportReport()
    file_bytes = io.BytesIO(file_contents)

    # Load workbook twice: data_only=True for values, data_only=False for formulas
    wb_data = load_workbook(file_bytes, read_only=True, data_only=True)
    file_bytes.seek(0)
    try:
        wb_formulas = load_workbook(file_bytes, read_only=True, data_only=False)
    except Exception:
        wb_formulas = None
        report.add_warning("Could not load formula workbook — formula comments disabled")

    try:
        # ── Step 1: Detect department sheets ──────────────────────────────
        department_sheets = _detect_department_sheets(wb_data)
        report.sheets_detected = list(department_sheets.keys())
        report.sheets_skipped = [
            s for s in wb_data.sheetnames if s not in department_sheets
        ]

        if not department_sheets:
            report.add_error("No department sheets detected in workbook")
            return report.to_dict()

        report.add_info(
            f"Detected {len(department_sheets)} department sheet(s): "
            + ", ".join(department_sheets.values())
        )

        # ── Step 2: Extract budgets from BudgetTemplate ──────────────────
        budgets = _extract_department_budgets(wb_data, department_sheets, report)

        # ── Step 3: Process each department sheet ─────────────────────────
        for sheet_name, dept_display_name in department_sheets.items():
            ws = wb_data[sheet_name]
            ws_form = wb_formulas[sheet_name] if wb_formulas and sheet_name in wb_formulas.sheetnames else None

            dept_report = DepartmentReport(name=dept_display_name)

            # Find or create department
            dept_stmt = select(Department).where(
                Department.facility_id == facility_id,
                Department.name == dept_display_name,
            )
            dept_result = await session.execute(dept_stmt)
            department = dept_result.scalar_one_or_none()

            if department:
                report.departments_updated += 1
            else:
                department = Department(
                    name=dept_display_name,
                    facility_id=facility_id,
                    budget_total=Decimal(0),
                )
                session.add(department)
                await session.flush()
                report.departments_created += 1

            # Set budget if available from BudgetTemplate
            if dept_display_name in budgets:
                department.budget_total = budgets[dept_display_name]
                dept_report.budget_total = budgets[dept_display_name]

            # ── Parse rows ────────────────────────────────────────────────
            current_work_area: WorkArea | None = None
            max_row = ws.max_row or DATA_START_ROW

            for row in range(DATA_START_ROW, max_row + 1):
                # Skip fully empty rows
                if _row_is_empty(ws, row):
                    continue

                # ── Subtotal row → extract/create work area ───────────────
                if _is_subtotal_row(ws, row):
                    wa_name = _safe_str(ws.cell(row=row, column=COL_WORK_AREA).value)
                    if wa_name:
                        current_work_area = await _get_or_create_work_area(
                            session, department, wa_name, dept_report,
                        )
                    continue

                # ── Data row ──────────────────────────────────────────────
                if not _is_data_row(ws, row):
                    continue

                description_raw = ws.cell(row=row, column=COL_DESCRIPTION).value
                description = str(description_raw).strip() if description_raw else ""
                if not description:
                    continue

                # Resolve work area from col B if needed
                wa_cell = _safe_str(ws.cell(row=row, column=COL_WORK_AREA).value)
                if wa_cell and current_work_area is None:
                    current_work_area = await _get_or_create_work_area(
                        session, department, wa_cell, dept_report,
                    )
                elif wa_cell and current_work_area and wa_cell != current_work_area.name:
                    # Work area changed mid-block
                    current_work_area = await _get_or_create_work_area(
                        session, department, wa_cell, dept_report,
                    )

                if current_work_area is None:
                    current_work_area = await _get_or_create_work_area(
                        session, department, "General", dept_report,
                    )

                # Amount (computed value from data_only workbook)
                amount = _safe_decimal(ws.cell(row=row, column=COL_AMOUNT).value)

                # Skip items with zero amount (optional: could be a warning)
                if amount == 0:
                    dept_report.items_skipped += 1
                    report.add_warning(
                        f"{dept_display_name}, Row {row}: '{description}' skipped (amount = 0)"
                    )
                    continue

                # Formula comment: if the amount cell was a formula, note it
                formula_comment = _extract_formula_comment(ws_form, row, COL_AMOUNT)

                # Parse enum fields with error tracking
                approval_status, approval_err = _parse_enum(
                    ApprovalStatus,
                    ws.cell(row=row, column=COL_APPROVAL).value,
                    ApprovalStatus.OPEN,
                )
                if approval_err:
                    report.add_warning(f"{dept_display_name}, Row {row}: {approval_err}")

                cost_basis, cb_err = _parse_enum(
                    CostBasis,
                    ws.cell(row=row, column=COL_COST_BASIS).value,
                    CostBasis.COST_ESTIMATION,
                )
                if cb_err:
                    report.add_warning(f"{dept_display_name}, Row {row}: {cb_err}")

                cost_driver, cd_err = _parse_enum(
                    CostDriver,
                    ws.cell(row=row, column=COL_COST_DRIVER).value,
                    CostDriver.INITIAL_SETUP,
                )
                if cd_err:
                    report.add_warning(f"{dept_display_name}, Row {row}: {cd_err}")

                phase, ph_err = _parse_enum(
                    ProjectPhase,
                    ws.cell(row=row, column=COL_PHASE).value,
                    ProjectPhase.PHASE_1,
                )
                if ph_err:
                    report.add_warning(f"{dept_display_name}, Row {row}: {ph_err}")

                product, pr_err = _parse_enum(
                    Product,
                    ws.cell(row=row, column=COL_PRODUCT).value,
                    Product.OVERALL,
                )
                if pr_err:
                    report.add_warning(f"{dept_display_name}, Row {row}: {pr_err}")

                ziel_val = _safe_decimal(ws.cell(row=row, column=COL_ZIELANPASSUNG).value)

                # Build comments: merge cell comment + formula comment
                cell_comment = _safe_str(ws.cell(row=row, column=COL_COMMENTS).value)
                comments_parts: list[str] = []
                if cell_comment:
                    comments_parts.append(cell_comment)
                if formula_comment:
                    comments_parts.append(formula_comment)
                final_comments = " | ".join(comments_parts) if comments_parts else None

                # ── Duplicate detection ───────────────────────────────────
                existing = await _find_existing_item(
                    session, current_work_area.id, description,
                )

                if existing:
                    # Update existing item
                    existing.original_amount = amount
                    existing.current_amount = amount
                    existing.expected_cash_out = _parse_date(
                        ws.cell(row=row, column=COL_CASH_OUT).value
                    )
                    existing.cost_basis = cost_basis
                    existing.cost_driver = cost_driver
                    existing.basis_description = _safe_str(
                        ws.cell(row=row, column=COL_BASIS_DESC).value
                    )
                    existing.assumptions = _safe_str(
                        ws.cell(row=row, column=COL_ASSUMPTIONS).value
                    )
                    existing.approval_status = approval_status
                    existing.approval_date = _parse_date(
                        ws.cell(row=row, column=COL_APPROVAL_DATE).value
                    )
                    existing.project_phase = phase
                    existing.product = product
                    existing.zielanpassung = ziel_val if ziel_val != Decimal(0) else None
                    existing.comments = final_comments
                    dept_report.items_updated += 1
                else:
                    # Create new item
                    cost_item = CostItem(
                        work_area_id=current_work_area.id,
                        description=description,
                        original_amount=amount,
                        current_amount=amount,
                        expected_cash_out=_parse_date(
                            ws.cell(row=row, column=COL_CASH_OUT).value
                        ),
                        cost_basis=cost_basis,
                        cost_driver=cost_driver,
                        basis_description=_safe_str(
                            ws.cell(row=row, column=COL_BASIS_DESC).value
                        ),
                        assumptions=_safe_str(
                            ws.cell(row=row, column=COL_ASSUMPTIONS).value
                        ),
                        approval_status=approval_status,
                        approval_date=_parse_date(
                            ws.cell(row=row, column=COL_APPROVAL_DATE).value
                        ),
                        project_phase=phase,
                        product=product,
                        zielanpassung=ziel_val if ziel_val != Decimal(0) else None,
                        comments=final_comments,
                    )
                    session.add(cost_item)
                    dept_report.items_imported += 1

                dept_report.total_amount += amount

            report.department_reports.append(dept_report)

        # ── Finalize ──────────────────────────────────────────────────────
        await session.commit()
        report.finalize()

    finally:
        wb_data.close()
        if wb_formulas:
            wb_formulas.close()

    return report.to_dict()


# ═══════════════════════════════════════════════════════════════════════════════
#  Internal helpers
# ═══════════════════════════════════════════════════════════════════════════════

async def _get_or_create_work_area(
    session: AsyncSession,
    department: Department,
    name: str,
    dept_report: DepartmentReport,
) -> WorkArea:
    """Find an existing WorkArea or create a new one."""
    stmt = select(WorkArea).where(
        WorkArea.department_id == department.id,
        WorkArea.name == name,
    )
    result = await session.execute(stmt)
    work_area = result.scalar_one_or_none()

    if work_area:
        dept_report.work_areas_found += 1
        return work_area

    work_area = WorkArea(
        name=name,
        department_id=department.id,
    )
    session.add(work_area)
    await session.flush()
    dept_report.work_areas_created += 1
    return work_area
