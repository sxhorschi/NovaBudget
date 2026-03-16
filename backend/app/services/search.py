"""Server-side search, filter, sort, and pagination for CostItems."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any, Sequence

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cost_item import CostItem
from app.models.department import Department
from app.models.enums import ApprovalStatus, CostBasis, Product, ProjectPhase
from app.models.work_area import WorkArea


# ── Filter Parameters ────────────────────────────────────────────────────

@dataclass
class CostItemSearchParams:
    """Validated search/filter parameters coming from the API layer."""

    facility_id: uuid.UUID

    # multi-value filters (comma-separated → list)
    department_ids: list[uuid.UUID] = field(default_factory=list)
    work_area_id: uuid.UUID | None = None
    phases: list[ProjectPhase] = field(default_factory=list)
    products: list[Product] = field(default_factory=list)
    statuses: list[ApprovalStatus] = field(default_factory=list)
    cost_bases: list[CostBasis] = field(default_factory=list)

    # free-text search
    q: str | None = None

    # amount range
    min_amount: Decimal | None = None
    max_amount: Decimal | None = None

    # cash-out date range
    cash_out_from: date | None = None
    cash_out_to: date | None = None

    # boolean flags
    zielanpassung: bool | None = None

    # sorting
    sort_by: str = "created_at"
    sort_dir: str = "asc"

    # pagination
    page: int = 1
    page_size: int = 50


# ── Allowed sort columns (whitelist to prevent injection) ────────────────

_SORT_COLUMNS: dict[str, Any] = {
    "amount": CostItem.current_amount,
    "description": CostItem.description,
    "status": CostItem.approval_status,
    "cash_out": CostItem.expected_cash_out,
    "created_at": CostItem.created_at,
}


# ── Query Builder ────────────────────────────────────────────────────────

def _build_base_query(params: CostItemSearchParams) -> Select:
    """Build a filtered SELECT for CostItem rows (no pagination/sort)."""

    # Always join through WorkArea → Department so we can filter by facility
    stmt = (
        select(CostItem)
        .join(WorkArea, CostItem.work_area_id == WorkArea.id)
        .join(Department, WorkArea.department_id == Department.id)
        .where(Department.facility_id == params.facility_id)
    )

    # -- multi-value filters --
    if params.department_ids:
        stmt = stmt.where(Department.id.in_(params.department_ids))

    if params.work_area_id is not None:
        stmt = stmt.where(CostItem.work_area_id == params.work_area_id)

    if params.phases:
        stmt = stmt.where(CostItem.project_phase.in_(params.phases))

    if params.products:
        stmt = stmt.where(CostItem.product.in_(params.products))

    if params.statuses:
        stmt = stmt.where(CostItem.approval_status.in_(params.statuses))

    if params.cost_bases:
        stmt = stmt.where(CostItem.cost_basis.in_(params.cost_bases))

    # -- free-text search (ilike is case-insensitive, fully parametrised) --
    if params.q:
        term = f"%{params.q}%"
        stmt = stmt.where(
            or_(
                CostItem.description.ilike(term),
                CostItem.assumptions.ilike(term),
                CostItem.comments.ilike(term),
            )
        )

    # -- amount range --
    if params.min_amount is not None:
        stmt = stmt.where(CostItem.current_amount >= params.min_amount)

    if params.max_amount is not None:
        stmt = stmt.where(CostItem.current_amount <= params.max_amount)

    # -- cash-out date range --
    if params.cash_out_from is not None:
        stmt = stmt.where(CostItem.expected_cash_out >= params.cash_out_from)

    if params.cash_out_to is not None:
        stmt = stmt.where(CostItem.expected_cash_out <= params.cash_out_to)

    # -- boolean: only items with Zielanpassung --
    if params.zielanpassung is True:
        stmt = stmt.where(CostItem.zielanpassung.isnot(None))
        stmt = stmt.where(CostItem.zielanpassung != Decimal("0"))
    elif params.zielanpassung is False:
        stmt = stmt.where(
            or_(
                CostItem.zielanpassung.is_(None),
                CostItem.zielanpassung == Decimal("0"),
            )
        )

    return stmt


def _apply_sorting(stmt: Select, params: CostItemSearchParams) -> Select:
    """Apply ORDER BY based on whitelisted column name + direction."""
    col = _SORT_COLUMNS.get(params.sort_by, CostItem.created_at)
    if params.sort_dir.lower() == "desc":
        stmt = stmt.order_by(col.desc().nulls_last())
    else:
        stmt = stmt.order_by(col.asc().nulls_last())
    return stmt


def _apply_pagination(stmt: Select, params: CostItemSearchParams) -> Select:
    """Apply OFFSET / LIMIT for pagination."""
    offset = (params.page - 1) * params.page_size
    return stmt.offset(offset).limit(params.page_size)


# ── Aggregation Queries ──────────────────────────────────────────────────

async def _compute_aggregations(
    session: AsyncSession,
    params: CostItemSearchParams,
) -> dict[str, Any]:
    """Run aggregation queries on the filtered set (ignoring pagination)."""

    # Re-use the same base filter but select aggregation expressions instead
    base_where = _build_base_query(params).whereclause

    # We need to re-create the FROM clause with joins for every agg query
    from_clause = (
        CostItem.__table__
        .join(WorkArea.__table__, CostItem.work_area_id == WorkArea.id)
        .join(Department.__table__, WorkArea.department_id == Department.id)
    )

    # -- total amount --
    total_stmt = (
        select(func.coalesce(func.sum(CostItem.current_amount), Decimal("0")))
        .select_from(from_clause)
        .where(base_where)
    )
    total_result = await session.execute(total_stmt)
    total_amount = total_result.scalar_one()

    # -- by status --
    status_stmt = (
        select(
            CostItem.approval_status,
            func.coalesce(func.sum(CostItem.current_amount), Decimal("0")),
        )
        .select_from(from_clause)
        .where(base_where)
        .group_by(CostItem.approval_status)
    )
    status_result = await session.execute(status_stmt)
    by_status = {row[0].value: row[1] for row in status_result.all()}

    # -- by phase --
    phase_stmt = (
        select(
            CostItem.project_phase,
            func.coalesce(func.sum(CostItem.current_amount), Decimal("0")),
        )
        .select_from(from_clause)
        .where(base_where)
        .group_by(CostItem.project_phase)
    )
    phase_result = await session.execute(phase_stmt)
    by_phase = {
        (row[0].value if row[0] else "UNASSIGNED"): row[1]
        for row in phase_result.all()
    }

    # -- by department --
    dept_stmt = (
        select(
            Department.id,
            func.coalesce(func.sum(CostItem.current_amount), Decimal("0")),
        )
        .select_from(from_clause)
        .where(base_where)
        .group_by(Department.id)
    )
    dept_result = await session.execute(dept_stmt)
    by_department = {str(row[0]): row[1] for row in dept_result.all()}

    return {
        "total_amount": total_amount,
        "by_status": by_status,
        "by_phase": by_phase,
        "by_department": by_department,
    }


# ── Main Search Entry Point ──────────────────────────────────────────────

async def search_cost_items(
    session: AsyncSession,
    params: CostItemSearchParams,
) -> dict[str, Any]:
    """
    Execute a filtered, sorted, paginated search for cost items.

    Returns a dict with keys: items, total, page, page_size, aggregations.
    """

    # 1. Build filtered base query
    base_stmt = _build_base_query(params)

    # 2. Count total matching rows (without pagination)
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    count_result = await session.execute(count_stmt)
    total = count_result.scalar_one()

    # 3. Apply sorting + pagination and fetch items
    items_stmt = _apply_sorting(base_stmt, params)
    items_stmt = _apply_pagination(items_stmt, params)
    items_result = await session.execute(items_stmt)
    items: Sequence[CostItem] = items_result.scalars().all()

    # 4. Compute aggregations on the full filtered set
    aggregations = await _compute_aggregations(session, params)

    return {
        "items": items,
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
        "aggregations": aggregations,
    }
