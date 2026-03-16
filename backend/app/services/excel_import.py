import io
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CostItem, Department, WorkArea
from app.models.enums import ApprovalStatus, CostBasis, CostDriver, Product, ProjectPhase

DEPARTMENT_SHEETS = {
    "Assembly_Equipment": "Assembly Equipment",
    "Testing": "Testing",
    "Logistics": "Logistics",
    "Facility": "Facility",
    "Prototyping": "Prototyping",
}

HEADER_ROW = 5
DATA_START_ROW = 6

# Column mapping (1-indexed): matches Excel layout
COL_WORK_AREA = 2      # B
COL_PHASE = 3           # C
COL_PRODUCT = 4         # D
COL_DESCRIPTION = 5     # E
COL_AMOUNT = 6          # F
COL_CASH_OUT = 7        # G
COL_COST_BASIS = 8      # H
COL_COST_DRIVER = 9     # I
COL_BASIS_DESC = 10     # J
COL_ASSUMPTIONS = 11    # K
COL_APPROVAL = 12       # L
COL_APPROVAL_DATE = 13  # M
COL_ZIELANPASSUNG = 14  # N
COL_COMMENTS = 15       # O


def _safe_decimal(value) -> Decimal:
    if value is None:
        return Decimal(0)
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return Decimal(0)


def _safe_str(value) -> str | None:
    if value is None:
        return None
    return str(value).strip() or None


def _parse_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _parse_enum(enum_class, value, default=None):
    if value is None:
        return default
    str_val = str(value).strip().upper().replace(" ", "_")

    # Legacy product name mapping (old Excel files used Bryan/Guenther/Gin-Tonic)
    if enum_class is Product:
        _LEGACY_PRODUCT_MAP = {
            "BRYAN": Product.ATLAS,
            "GUENTHER": Product.ORION,
            "GIN_TONIC": Product.VEGA,
            "GIN-TONIC": Product.VEGA,
        }
        if str_val in _LEGACY_PRODUCT_MAP:
            return _LEGACY_PRODUCT_MAP[str_val]

    for member in enum_class:
        if member.value.upper().replace(" ", "_") == str_val or member.name == str_val:
            return member
    # Try partial match
    for member in enum_class:
        if str_val in member.value.upper().replace(" ", "_") or str_val in member.name:
            return member
    return default


def _is_subtotal_row(ws, row: int) -> bool:
    """Subtotal rows have only col B (work area name) and col F (amount) filled."""
    has_b = ws.cell(row=row, column=COL_WORK_AREA).value is not None
    has_f = ws.cell(row=row, column=COL_AMOUNT).value is not None
    has_description = ws.cell(row=row, column=COL_DESCRIPTION).value is not None
    has_phase = ws.cell(row=row, column=COL_PHASE).value is not None
    return has_b and has_f and not has_description and not has_phase


def _is_data_row(ws, row: int) -> bool:
    """Data rows have description and amount filled."""
    has_description = ws.cell(row=row, column=COL_DESCRIPTION).value is not None
    has_amount = ws.cell(row=row, column=COL_AMOUNT).value is not None
    return has_description and has_amount


async def import_excel_file(
    file_contents: bytes, facility_id: UUID, session: AsyncSession
) -> dict:
    wb = load_workbook(io.BytesIO(file_contents), read_only=True, data_only=True)

    stats = {"departments_created": 0, "work_areas_created": 0, "cost_items_created": 0, "errors": []}

    for sheet_name, dept_display_name in DEPARTMENT_SHEETS.items():
        if sheet_name not in wb.sheetnames:
            stats["errors"].append(f"Sheet '{sheet_name}' not found, skipping")
            continue

        ws = wb[sheet_name]

        # Find or create department
        dept_stmt = select(Department).where(
            Department.facility_id == facility_id,
            Department.name == dept_display_name,
        )
        dept_result = await session.execute(dept_stmt)
        department = dept_result.scalar_one_or_none()

        if not department:
            department = Department(
                name=dept_display_name,
                facility_id=facility_id,
                budget_total=Decimal(0),
            )
            session.add(department)
            await session.flush()
            stats["departments_created"] += 1

        current_work_area = None

        for row in range(DATA_START_ROW, ws.max_row + 1):
            # Check if row is completely empty
            row_values = [ws.cell(row=row, column=c).value for c in range(2, 16)]
            if all(v is None for v in row_values):
                continue

            # Subtotal row -> extract work area name
            if _is_subtotal_row(ws, row):
                wa_name = str(ws.cell(row=row, column=COL_WORK_AREA).value).strip()
                if wa_name:
                    wa_stmt = select(WorkArea).where(
                        WorkArea.department_id == department.id,
                        WorkArea.name == wa_name,
                    )
                    wa_result = await session.execute(wa_stmt)
                    current_work_area = wa_result.scalar_one_or_none()

                    if not current_work_area:
                        current_work_area = WorkArea(
                            name=wa_name,
                            department_id=department.id,
                        )
                        session.add(current_work_area)
                        await session.flush()
                        stats["work_areas_created"] += 1
                continue

            # Data row
            if _is_data_row(ws, row):
                # If we encounter a work area name in col B on a data row, update current
                wa_cell = _safe_str(ws.cell(row=row, column=COL_WORK_AREA).value)
                if wa_cell and current_work_area is None:
                    wa_stmt = select(WorkArea).where(
                        WorkArea.department_id == department.id,
                        WorkArea.name == wa_cell,
                    )
                    wa_result = await session.execute(wa_stmt)
                    current_work_area = wa_result.scalar_one_or_none()

                    if not current_work_area:
                        current_work_area = WorkArea(
                            name=wa_cell,
                            department_id=department.id,
                        )
                        session.add(current_work_area)
                        await session.flush()
                        stats["work_areas_created"] += 1

                if current_work_area is None:
                    # Create a default work area
                    current_work_area = WorkArea(
                        name="General",
                        department_id=department.id,
                    )
                    session.add(current_work_area)
                    await session.flush()
                    stats["work_areas_created"] += 1

                amount = _safe_decimal(ws.cell(row=row, column=COL_AMOUNT).value)

                ziel_val = _safe_decimal(ws.cell(row=row, column=COL_ZIELANPASSUNG).value)
                cost_item = CostItem(
                    work_area_id=current_work_area.id,
                    description=str(ws.cell(row=row, column=COL_DESCRIPTION).value).strip(),
                    original_amount=amount,
                    current_amount=amount,
                    expected_cash_out=_parse_date(ws.cell(row=row, column=COL_CASH_OUT).value),
                    cost_basis=_parse_enum(CostBasis, ws.cell(row=row, column=COL_COST_BASIS).value, CostBasis.COST_ESTIMATION),
                    cost_driver=_parse_enum(CostDriver, ws.cell(row=row, column=COL_COST_DRIVER).value, CostDriver.INITIAL_SETUP),
                    basis_description=_safe_str(ws.cell(row=row, column=COL_BASIS_DESC).value),
                    assumptions=_safe_str(ws.cell(row=row, column=COL_ASSUMPTIONS).value),
                    approval_status=_parse_enum(
                        ApprovalStatus,
                        ws.cell(row=row, column=COL_APPROVAL).value,
                        ApprovalStatus.OPEN,
                    ),
                    approval_date=_parse_date(ws.cell(row=row, column=COL_APPROVAL_DATE).value),
                    project_phase=_parse_enum(
                        ProjectPhase,
                        ws.cell(row=row, column=COL_PHASE).value,
                        ProjectPhase.PHASE_1,
                    ),
                    product=_parse_enum(
                        Product,
                        ws.cell(row=row, column=COL_PRODUCT).value,
                        Product.OVERALL,
                    ),
                    zielanpassung=ziel_val if ziel_val != Decimal(0) else None,
                    comments=_safe_str(ws.cell(row=row, column=COL_COMMENTS).value),
                )
                session.add(cost_item)
                stats["cost_items_created"] += 1

    await session.commit()
    wb.close()

    return {
        "status": "success",
        "departments_created": stats["departments_created"],
        "work_areas_created": stats["work_areas_created"],
        "cost_items_created": stats["cost_items_created"],
        "errors": stats["errors"],
    }
