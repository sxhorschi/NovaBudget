"""Excel export services for standard, finance, and steering committee reports."""

from __future__ import annotations

import io
from datetime import date, timedelta
from decimal import Decimal
from typing import Sequence
from uuid import UUID

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import CostItem, Department, Facility, WorkArea
from app.models.enums import ApprovalStatus, CostBasis, ProjectPhase

# ---------------------------------------------------------------------------
# Style constants
# ---------------------------------------------------------------------------

_HEADER_FONT = Font(name="Calibri", bold=True, size=11, color="FFFFFF")
_HEADER_FILL = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
_SUBTOTAL_FONT = Font(name="Calibri", bold=True, size=10)
_SUBTOTAL_FILL = PatternFill(start_color="D9E2F3", end_color="D9E2F3", fill_type="solid")
_TITLE_FONT = Font(name="Calibri", bold=True, size=14, color="1F3864")
_META_FONT = Font(name="Calibri", bold=True, size=11, color="2F5496")
_NUM_FMT = '#,##0.00'
_BORDER_THIN = Border(
    bottom=Side(style="thin", color="B4C6E7"),
)
_BORDER_MEDIUM = Border(
    bottom=Side(style="medium", color="4472C4"),
)

# The configurable budget reserve factor (0.85 = 15% reserve)
DEFAULT_BUDGET_FACTOR = Decimal("0.85")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _enum_display(val) -> str:
    """Convert an enum value to a human-readable string."""
    if val is None:
        return ""
    s = val.value if hasattr(val, "value") else str(val)
    return s.replace("_", " ").title()


def _date_str(d: date | None) -> str:
    if d is None:
        return ""
    return d.strftime("%Y-%m-%d")


def _month_key(d: date) -> str:
    """Return 'YYYY-MM' string for a date."""
    return d.strftime("%Y-%m")


async def _load_departments(
    session: AsyncSession,
    facility_id: UUID,
    department_ids: list[UUID] | None = None,
) -> list[Department]:
    """Load departments with nested work_areas -> cost_items."""
    stmt = (
        select(Department)
        .where(Department.facility_id == facility_id)
        .options(
            selectinload(Department.work_areas).selectinload(WorkArea.cost_items)
        )
        .order_by(Department.name)
    )
    if department_ids:
        stmt = stmt.where(Department.id.in_(department_ids))
    result = await session.execute(stmt)
    return list(result.scalars().all())


def _filter_items(
    items: Sequence[CostItem],
    phase: ProjectPhase | None = None,
) -> list[CostItem]:
    """Apply optional phase filter to items."""
    filtered = list(items)
    if phase:
        filtered = [i for i in filtered if i.project_phase == phase]
    return filtered


# ---------------------------------------------------------------------------
# 1. Standard Export
# ---------------------------------------------------------------------------


async def generate_standard_export(
    session: AsyncSession,
    facility_id: UUID,
    department_ids: list[UUID] | None = None,
    phase: ProjectPhase | None = None,
) -> bytes:
    """Generate a standard department-based Excel export.

    Returns the .xlsx file as bytes.
    """
    departments = await _load_departments(session, facility_id, department_ids)

    wb = Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    for dept in departments:
        ws = wb.create_sheet(title=dept.name[:31])  # Excel sheet name max 31 chars

        # --- Header area ---
        ws.merge_cells("A1:O1")
        ws["A1"] = dept.name
        ws["A1"].font = _TITLE_FONT

        budget = dept.budget_total or Decimal(0)
        cost_of_completion = sum(
            item.current_amount
            for wa in dept.work_areas
            for item in _filter_items(wa.cost_items, phase)
        )
        delta = budget - cost_of_completion

        ws["A2"] = "Budget:"
        ws["A2"].font = _META_FONT
        ws["B2"] = float(budget)
        ws["B2"].number_format = _NUM_FMT

        ws["D2"] = "Cost of Completion:"
        ws["D2"].font = _META_FONT
        ws["E2"] = float(cost_of_completion)
        ws["E2"].number_format = _NUM_FMT

        ws["G2"] = "Delta:"
        ws["G2"].font = _META_FONT
        ws["H2"] = float(delta)
        ws["H2"].number_format = _NUM_FMT

        # --- Column headers (row 4) ---
        headers = [
            "Work Area", "Phase", "Product", "Description", "Amount",
            "Cash Out", "Cost Basis", "Cost Driver", "Basis Description",
            "Assumptions", "Approval Status", "Approval Date",
            "Zielanpassung", "Comments",
        ]
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=header)
            cell.font = _HEADER_FONT
            cell.fill = _HEADER_FILL
            cell.alignment = Alignment(horizontal="center")

        row = 5
        for wa in dept.work_areas:
            items = _filter_items(wa.cost_items, phase)
            if not items:
                continue

            # Work Area Subtotal row
            wa_total = sum(i.current_amount for i in items)
            ws.cell(row=row, column=1, value=wa.name).font = _SUBTOTAL_FONT
            for c in range(1, 15):
                ws.cell(row=row, column=c).fill = _SUBTOTAL_FILL
                ws.cell(row=row, column=c).border = _BORDER_MEDIUM
            amt_cell = ws.cell(row=row, column=5, value=float(wa_total))
            amt_cell.number_format = _NUM_FMT
            amt_cell.font = _SUBTOTAL_FONT
            row += 1

            # Individual items
            for item in items:
                ws.cell(row=row, column=1, value=wa.name)
                ws.cell(row=row, column=2, value=_enum_display(item.project_phase))
                ws.cell(row=row, column=3, value=_enum_display(item.product))
                ws.cell(row=row, column=4, value=item.description)
                amt = ws.cell(row=row, column=5, value=float(item.current_amount))
                amt.number_format = _NUM_FMT
                ws.cell(row=row, column=6, value=_date_str(item.expected_cash_out))
                ws.cell(row=row, column=7, value=_enum_display(item.cost_basis))
                ws.cell(row=row, column=8, value=_enum_display(item.cost_driver))
                ws.cell(row=row, column=9, value=item.basis_description or "")
                ws.cell(row=row, column=10, value=item.assumptions or "")
                ws.cell(row=row, column=11, value=_enum_display(item.approval_status))
                ws.cell(row=row, column=12, value=_date_str(item.approval_date))
                ws.cell(row=row, column=13, value=float(item.zielanpassung) if item.zielanpassung else "")
                ws.cell(row=row, column=14, value=item.comments or "")
                for c in range(1, 15):
                    ws.cell(row=row, column=c).border = _BORDER_THIN
                row += 1

            row += 1  # blank row between work areas

        # Auto-width columns
        for col_idx in range(1, 15):
            ws.column_dimensions[get_column_letter(col_idx)].width = 16
        ws.column_dimensions["D"].width = 35  # Description wider
        ws.column_dimensions["J"].width = 25  # Assumptions

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# 2. Finance Export (BudgetTemplate format)
# ---------------------------------------------------------------------------


def _generate_month_range(start_year: int = 2026, start_month: int = 1,
                          end_year: int = 2027, end_month: int = 12) -> list[date]:
    """Generate list of first-of-month dates for the range."""
    months: list[date] = []
    current = date(start_year, start_month, 1)
    end = date(end_year, end_month, 1)
    while current <= end:
        months.append(current)
        # advance to next month
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    return months


def _quarter_label(d: date) -> str:
    q = (d.month - 1) // 3 + 1
    return f"Q{q} {d.year}"


def _year_label(d: date) -> str:
    return str(d.year)


async def generate_finance_export(
    session: AsyncSession,
    facility_id: UUID,
    budget_factor: Decimal = DEFAULT_BUDGET_FACTOR,
    start_year: int = 2026,
    start_month: int = 1,
    end_year: int = 2027,
    end_month: int = 12,
) -> bytes:
    """Generate the BudgetTemplate-style finance export.

    Core logic: IF(item.cash_out_date == month, item.amount, 0)
    With quarterly and yearly aggregation columns.
    """
    departments = await _load_departments(session, facility_id)

    months = _generate_month_range(start_year, start_month, end_year, end_month)
    month_keys = [_month_key(m) for m in months]

    # Determine unique quarters and years
    quarters_seen: dict[str, list[int]] = {}  # label -> list of month col indices
    years_seen: dict[str, list[int]] = {}     # label -> list of month col indices

    for idx, m in enumerate(months):
        ql = _quarter_label(m)
        quarters_seen.setdefault(ql, []).append(idx)
        yl = _year_label(m)
        years_seen.setdefault(yl, []).append(idx)

    # Stable ordering
    quarter_labels = list(dict.fromkeys(_quarter_label(m) for m in months))
    year_labels = list(dict.fromkeys(_year_label(m) for m in months))

    wb = Workbook()
    ws = wb.active
    ws.title = "BudgetTemplate"

    # --- Metadata columns ---
    meta_headers = [
        "Identifier", "Account", "Account Name", "Category",
        "CC", "CC Name", "Description", "Department", "Work Area",
        "Date", "Unit Cost", "Useful Life",
    ]
    num_meta = len(meta_headers)

    # Month column headers start after meta
    month_col_start = num_meta + 1

    # --- Row 1: Section labels ---
    ws.cell(row=1, column=1, value="Item Metadata")
    ws.cell(row=1, column=month_col_start, value="Monthly Cash-Out")

    qtr_col_start = month_col_start + len(months)
    ws.cell(row=1, column=qtr_col_start, value="Quarterly Totals")

    yr_col_start = qtr_col_start + len(quarter_labels)
    ws.cell(row=1, column=yr_col_start, value="Yearly Totals")

    for c in [1, month_col_start, qtr_col_start, yr_col_start]:
        ws.cell(row=1, column=c).font = Font(bold=True, size=10, color="808080")

    # --- Row 2: Column headers ---
    for col_idx, header in enumerate(meta_headers, 1):
        cell = ws.cell(row=2, column=col_idx, value=header)
        cell.font = _HEADER_FONT
        cell.fill = _HEADER_FILL
        cell.alignment = Alignment(horizontal="center")

    # Month headers
    for idx, m in enumerate(months):
        col = month_col_start + idx
        cell = ws.cell(row=2, column=col, value=m.strftime("%b %Y"))
        cell.font = _HEADER_FONT
        cell.fill = PatternFill(start_color="5B9BD5", end_color="5B9BD5", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")

    # Quarter headers
    for idx, ql in enumerate(quarter_labels):
        col = qtr_col_start + idx
        cell = ws.cell(row=2, column=col, value=ql)
        cell.font = _HEADER_FONT
        cell.fill = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")

    # Year headers
    for idx, yl in enumerate(year_labels):
        col = yr_col_start + idx
        cell = ws.cell(row=2, column=col, value=yl)
        cell.font = _HEADER_FONT
        cell.fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
        cell.alignment = Alignment(horizontal="center")

    # --- Data rows ---
    row_num = 3
    item_counter = 1

    for dept in departments:
        for wa in dept.work_areas:
            for item in wa.cost_items:
                # Meta columns
                ws.cell(row=row_num, column=1, value=f"CAPEX-{item_counter:04d}")
                ws.cell(row=row_num, column=2, value="")  # Account
                ws.cell(row=row_num, column=3, value="")  # Account Name
                ws.cell(row=row_num, column=4, value=_enum_display(item.cost_driver))  # Category
                ws.cell(row=row_num, column=5, value="")  # CC
                ws.cell(row=row_num, column=6, value="")  # CC Name
                ws.cell(row=row_num, column=7, value=item.description)
                ws.cell(row=row_num, column=8, value=dept.name)
                ws.cell(row=row_num, column=9, value=wa.name)
                ws.cell(row=row_num, column=10, value=_date_str(item.expected_cash_out))
                unit_cost = float(item.current_amount * budget_factor)
                ws.cell(row=row_num, column=11, value=unit_cost)
                ws.cell(row=row_num, column=11).number_format = _NUM_FMT
                ws.cell(row=row_num, column=12, value="")  # Useful Life

                # Monthly columns: IF(item.cash_out_date == month, amount * factor, 0)
                item_month = _month_key(item.expected_cash_out) if item.expected_cash_out else None
                monthly_values = []
                for idx, mk in enumerate(month_keys):
                    val = unit_cost if item_month == mk else 0
                    monthly_values.append(val)
                    col = month_col_start + idx
                    cell = ws.cell(row=row_num, column=col, value=val)
                    cell.number_format = _NUM_FMT

                # Quarterly aggregation
                for q_idx, ql in enumerate(quarter_labels):
                    q_month_indices = quarters_seen[ql]
                    q_total = sum(monthly_values[mi] for mi in q_month_indices)
                    col = qtr_col_start + q_idx
                    cell = ws.cell(row=row_num, column=col, value=q_total)
                    cell.number_format = _NUM_FMT

                # Yearly aggregation
                for y_idx, yl in enumerate(year_labels):
                    y_month_indices = years_seen[yl]
                    y_total = sum(monthly_values[mi] for mi in y_month_indices)
                    col = yr_col_start + y_idx
                    cell = ws.cell(row=row_num, column=col, value=y_total)
                    cell.number_format = _NUM_FMT

                row_num += 1
                item_counter += 1

    # --- Totals row ---
    total_row = row_num
    ws.cell(row=total_row, column=1, value="TOTAL").font = Font(bold=True)
    total_cols_start = 11  # Unit Cost column
    # Sum formula for Unit Cost
    if row_num > 3:
        for col in [11]:  # Unit Cost total
            letter = get_column_letter(col)
            ws.cell(row=total_row, column=col,
                    value=f"=SUM({letter}3:{letter}{row_num - 1})")
            ws.cell(row=total_row, column=col).number_format = _NUM_FMT
            ws.cell(row=total_row, column=col).font = Font(bold=True)

        # Monthly, quarterly, yearly totals
        for col in range(month_col_start, yr_col_start + len(year_labels)):
            letter = get_column_letter(col)
            ws.cell(row=total_row, column=col,
                    value=f"=SUM({letter}3:{letter}{row_num - 1})")
            ws.cell(row=total_row, column=col).number_format = _NUM_FMT
            ws.cell(row=total_row, column=col).font = Font(bold=True)

    # Auto-width for meta columns
    for col_idx in range(1, num_meta + 1):
        ws.column_dimensions[get_column_letter(col_idx)].width = 16
    ws.column_dimensions[get_column_letter(7)].width = 35  # Description

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# 3. Steering Committee Export
# ---------------------------------------------------------------------------


async def generate_steering_committee_export(
    session: AsyncSession,
    facility_id: UUID,
) -> bytes:
    """Generate a one-page steering committee summary Excel.

    Contents:
    - Budget vs. Committed vs. Remaining per Department
    - Top 10 largest open items
    - Top 5 risk items (no offer / cost_estimation + high amount)
    - Cash-out next 3 months
    """
    departments = await _load_departments(session, facility_id)

    wb = Workbook()
    ws = wb.active
    ws.title = "Steering Committee"

    # --- Title ---
    ws.merge_cells("A1:G1")
    ws["A1"] = "CAPEX Budget — Steering Committee Report"
    ws["A1"].font = Font(name="Calibri", bold=True, size=16, color="1F3864")

    today = date.today()
    ws["A2"] = f"Generated: {today.strftime('%Y-%m-%d')}"
    ws["A2"].font = Font(italic=True, color="808080")

    # ======================================================================
    # Section 1: Department Overview
    # ======================================================================
    section_row = 4
    ws.cell(row=section_row, column=1, value="Department Overview").font = Font(bold=True, size=13, color="2F5496")

    headers_dept = ["Department", "Budget", "Committed", "Remaining", "% Used"]
    for col_idx, h in enumerate(headers_dept, 1):
        cell = ws.cell(row=section_row + 1, column=col_idx, value=h)
        cell.font = _HEADER_FONT
        cell.fill = _HEADER_FILL

    all_items: list[tuple[CostItem, str]] = []  # (item, dept_name)
    row = section_row + 2
    total_budget = Decimal(0)
    total_committed = Decimal(0)

    for dept in departments:
        budget = dept.budget_total or Decimal(0)
        committed = sum(
            item.current_amount
            for wa in dept.work_areas
            for item in wa.cost_items
        )
        remaining = budget - committed
        pct = float(committed / budget * 100) if budget else 0

        ws.cell(row=row, column=1, value=dept.name)
        ws.cell(row=row, column=2, value=float(budget)).number_format = _NUM_FMT
        ws.cell(row=row, column=3, value=float(committed)).number_format = _NUM_FMT
        ws.cell(row=row, column=4, value=float(remaining)).number_format = _NUM_FMT
        pct_cell = ws.cell(row=row, column=5, value=pct / 100)
        pct_cell.number_format = '0.0%'

        total_budget += budget
        total_committed += committed

        for wa in dept.work_areas:
            for item in wa.cost_items:
                all_items.append((item, dept.name))

        row += 1

    # Total row
    ws.cell(row=row, column=1, value="TOTAL").font = Font(bold=True)
    ws.cell(row=row, column=2, value=float(total_budget)).number_format = _NUM_FMT
    ws.cell(row=row, column=2).font = Font(bold=True)
    ws.cell(row=row, column=3, value=float(total_committed)).number_format = _NUM_FMT
    ws.cell(row=row, column=3).font = Font(bold=True)
    ws.cell(row=row, column=4, value=float(total_budget - total_committed)).number_format = _NUM_FMT
    ws.cell(row=row, column=4).font = Font(bold=True)
    if total_budget:
        pct_cell = ws.cell(row=row, column=5, value=float(total_committed / total_budget))
        pct_cell.number_format = '0.0%'
        pct_cell.font = Font(bold=True)

    row += 2

    # ======================================================================
    # Section 2: Top 10 Largest Open Items
    # ======================================================================
    ws.cell(row=row, column=1, value="Top 10 Largest Open Items").font = Font(bold=True, size=13, color="2F5496")
    row += 1

    top10_headers = ["#", "Department", "Description", "Amount", "Status", "Cash Out"]
    for col_idx, h in enumerate(top10_headers, 1):
        cell = ws.cell(row=row, column=col_idx, value=h)
        cell.font = _HEADER_FONT
        cell.fill = _HEADER_FILL
    row += 1

    open_statuses = {ApprovalStatus.OPEN, ApprovalStatus.SUBMITTED_FOR_APPROVAL,
                     ApprovalStatus.ON_HOLD, ApprovalStatus.PENDING_SUPPLIER_NEGOTIATION,
                     ApprovalStatus.PENDING_TECHNICAL_CLARIFICATION}
    open_items = [(i, dn) for i, dn in all_items if i.approval_status in open_statuses]
    open_items.sort(key=lambda x: x[0].current_amount, reverse=True)

    for rank, (item, dept_name) in enumerate(open_items[:10], 1):
        ws.cell(row=row, column=1, value=rank)
        ws.cell(row=row, column=2, value=dept_name)
        ws.cell(row=row, column=3, value=item.description)
        ws.cell(row=row, column=4, value=float(item.current_amount)).number_format = _NUM_FMT
        ws.cell(row=row, column=5, value=_enum_display(item.approval_status))
        ws.cell(row=row, column=6, value=_date_str(item.expected_cash_out))
        row += 1

    row += 1

    # ======================================================================
    # Section 3: Top 5 Risk Items
    # ======================================================================
    ws.cell(row=row, column=1, value="Top 5 Risk Items").font = Font(bold=True, size=13, color="2F5496")
    ws.cell(row=row, column=3, value="(No supplier offer + high amount)").font = Font(italic=True, color="808080", size=9)
    row += 1

    risk_headers = ["#", "Department", "Description", "Amount", "Cost Basis", "Status"]
    for col_idx, h in enumerate(risk_headers, 1):
        cell = ws.cell(row=row, column=col_idx, value=h)
        cell.font = _HEADER_FONT
        cell.fill = PatternFill(start_color="C00000", end_color="C00000", fill_type="solid")
    row += 1

    # Risk = cost_estimation basis (no supplier offer) + in open statuses
    risk_items = [
        (i, dn) for i, dn in all_items
        if i.cost_basis == CostBasis.COST_ESTIMATION and i.approval_status in open_statuses
    ]
    risk_items.sort(key=lambda x: x[0].current_amount, reverse=True)

    for rank, (item, dept_name) in enumerate(risk_items[:5], 1):
        ws.cell(row=row, column=1, value=rank)
        ws.cell(row=row, column=2, value=dept_name)
        ws.cell(row=row, column=3, value=item.description)
        ws.cell(row=row, column=4, value=float(item.current_amount)).number_format = _NUM_FMT
        ws.cell(row=row, column=5, value=_enum_display(item.cost_basis))
        ws.cell(row=row, column=6, value=_enum_display(item.approval_status))
        row += 1

    row += 1

    # ======================================================================
    # Section 4: Cash-Out Next 3 Months
    # ======================================================================
    ws.cell(row=row, column=1, value="Cash-Out — Next 3 Months").font = Font(bold=True, size=13, color="2F5496")
    row += 1

    # Determine next 3 months
    next_months: list[date] = []
    current_month = date(today.year, today.month, 1)
    for _ in range(3):
        next_months.append(current_month)
        if current_month.month == 12:
            current_month = date(current_month.year + 1, 1, 1)
        else:
            current_month = date(current_month.year, current_month.month + 1, 1)

    cashout_headers = ["Department"] + [m.strftime("%b %Y") for m in next_months] + ["Total"]
    for col_idx, h in enumerate(cashout_headers, 1):
        cell = ws.cell(row=row, column=col_idx, value=h)
        cell.font = _HEADER_FONT
        cell.fill = _HEADER_FILL
    row += 1

    month_keys_next = [_month_key(m) for m in next_months]
    grand_totals = [Decimal(0)] * len(next_months)

    for dept in departments:
        ws.cell(row=row, column=1, value=dept.name)
        dept_month_totals = [Decimal(0)] * len(next_months)

        for wa in dept.work_areas:
            for item in wa.cost_items:
                if item.expected_cash_out:
                    item_mk = _month_key(item.expected_cash_out)
                    for mi, mk in enumerate(month_keys_next):
                        if item_mk == mk:
                            dept_month_totals[mi] += item.current_amount

        dept_total = Decimal(0)
        for mi, val in enumerate(dept_month_totals):
            ws.cell(row=row, column=2 + mi, value=float(val)).number_format = _NUM_FMT
            grand_totals[mi] += val
            dept_total += val

        ws.cell(row=row, column=2 + len(next_months), value=float(dept_total)).number_format = _NUM_FMT
        row += 1

    # Grand total row
    ws.cell(row=row, column=1, value="TOTAL").font = Font(bold=True)
    grand_sum = Decimal(0)
    for mi, val in enumerate(grand_totals):
        ws.cell(row=row, column=2 + mi, value=float(val)).number_format = _NUM_FMT
        ws.cell(row=row, column=2 + mi).font = Font(bold=True)
        grand_sum += val
    ws.cell(row=row, column=2 + len(next_months), value=float(grand_sum)).number_format = _NUM_FMT
    ws.cell(row=row, column=2 + len(next_months)).font = Font(bold=True)

    # Column widths
    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["C"].width = 40
    for c in range(4, 8):
        ws.column_dimensions[get_column_letter(c)].width = 16

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
