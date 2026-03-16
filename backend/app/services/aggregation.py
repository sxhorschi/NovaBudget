"""Aggregation service — correct business logic per Otto v4.

Definitions:
- Committed   = SUM(current_amount) WHERE status = APPROVED
- Forecast    = SUM(current_amount) WHERE status NOT IN (REJECTED, OBSOLETE)
- Budget      = department.budget_total + SUM(budget_adjustments.amount)
- Remaining   = Budget - Forecast
- Cost of Completion = Forecast - Committed  (what still needs to be ordered/paid)
- Variance    = SUM(original_amount - current_amount) for active items
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BudgetAdjustment, CostItem, Department, WorkArea
from app.models.enums import ApprovalStatus
from app.schemas.summary import (
    ApprovalPipelineEntry,
    BudgetSummary,
    CashOutDepartment,
    CashOutEntry,
    CashOutMonth,
    DepartmentKPI,
    DepartmentSummary,
    FacilityKPI,
    PhaseBreakdown,
)

# ── Constants ────────────────────────────────────────────────────────────

ZERO = Decimal("0.00")

# Statuses excluded from forecast / cost-of-completion
EXCLUDED_STATUSES = {ApprovalStatus.REJECTED, ApprovalStatus.OBSOLETE}

# Status that counts as committed (approved = binding)
COMMITTED_STATUSES = {ApprovalStatus.APPROVED}


def _pct(numerator: Decimal, denominator: Decimal) -> Decimal:
    """Calculate percentage, returning 0 if denominator is zero."""
    if not denominator:
        return ZERO
    return (numerator / denominator * 100).quantize(Decimal("0.01"))


# ═══════════════════════════════════════════════════════════════════════════
# NEW KPI Functions (Otto v4)
# ═══════════════════════════════════════════════════════════════════════════


async def get_department_kpis(
    facility_id: uuid.UUID, session: AsyncSession
) -> list[DepartmentKPI]:
    """Compute KPIs per department for a given facility.

    All monetary values use Decimal. Single query with conditional aggregation.
    """

    # Subquery: adjustment totals per department
    adj_sub = (
        select(
            BudgetAdjustment.department_id,
            func.coalesce(func.sum(BudgetAdjustment.amount), ZERO).label(
                "adj_total"
            ),
        )
        .group_by(BudgetAdjustment.department_id)
        .subquery("adj_sub")
    )

    # Main query: aggregate cost items per department
    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)
    is_committed = CostItem.approval_status.in_(COMMITTED_STATUSES)

    stmt = (
        select(
            Department.id.label("department_id"),
            Department.name.label("department_name"),
            func.coalesce(Department.budget_total, ZERO).label("budget_base"),
            func.coalesce(adj_sub.c.adj_total, ZERO).label("adjustment_total"),
            # committed = approved items only
            func.coalesce(
                func.sum(
                    case((is_committed, CostItem.current_amount), else_=ZERO)
                ),
                ZERO,
            ).label("committed"),
            # forecast = all except rejected/obsolete
            func.coalesce(
                func.sum(
                    case((is_active, CostItem.current_amount), else_=ZERO)
                ),
                ZERO,
            ).label("forecast"),
            # variance = SUM(original - current) for active items
            func.coalesce(
                func.sum(
                    case(
                        (
                            is_active,
                            CostItem.original_amount - CostItem.current_amount,
                        ),
                        else_=ZERO,
                    )
                ),
                ZERO,
            ).label("variance"),
            # item count (active only)
            func.count(case((is_active, CostItem.id))).label("item_count"),
        )
        .select_from(Department)
        .outerjoin(WorkArea, WorkArea.department_id == Department.id)
        .outerjoin(CostItem, CostItem.work_area_id == WorkArea.id)
        .outerjoin(adj_sub, adj_sub.c.department_id == Department.id)
        .where(Department.facility_id == facility_id)
        .group_by(
            Department.id,
            Department.name,
            Department.budget_total,
            adj_sub.c.adj_total,
        )
        .order_by(Department.name)
    )

    result = await session.execute(stmt)
    rows = result.all()

    kpis: list[DepartmentKPI] = []
    for row in rows:
        budget_base = Decimal(str(row.budget_base))
        adj_total = Decimal(str(row.adjustment_total))
        budget = budget_base + adj_total
        committed = Decimal(str(row.committed))
        forecast = Decimal(str(row.forecast))
        remaining = budget - forecast
        cost_of_completion = forecast - committed
        variance = Decimal(str(row.variance))
        utilization = _pct(committed, budget)

        kpis.append(
            DepartmentKPI(
                department_id=row.department_id,
                department_name=row.department_name,
                budget=budget,
                budget_base=budget_base,
                adjustment_total=adj_total,
                committed=committed,
                forecast=forecast,
                remaining=remaining,
                cost_of_completion=cost_of_completion,
                variance=variance,
                item_count=row.item_count,
                budget_utilization_pct=utilization,
            )
        )

    return kpis


async def get_facility_kpis(
    facility_id: uuid.UUID, session: AsyncSession
) -> FacilityKPI:
    """Aggregate KPIs across all departments in a facility."""

    dept_kpis = await get_department_kpis(facility_id, session)

    budget = sum((d.budget for d in dept_kpis), ZERO)
    budget_base = sum((d.budget_base for d in dept_kpis), ZERO)
    adj_total = sum((d.adjustment_total for d in dept_kpis), ZERO)
    committed = sum((d.committed for d in dept_kpis), ZERO)
    forecast = sum((d.forecast for d in dept_kpis), ZERO)
    remaining = budget - forecast
    cost_of_completion = forecast - committed
    variance = sum((d.variance for d in dept_kpis), ZERO)
    item_count = sum(d.item_count for d in dept_kpis)
    utilization = _pct(committed, budget)

    return FacilityKPI(
        facility_id=facility_id,
        budget=budget,
        budget_base=budget_base,
        adjustment_total=adj_total,
        committed=committed,
        forecast=forecast,
        remaining=remaining,
        cost_of_completion=cost_of_completion,
        variance=variance,
        item_count=item_count,
        budget_utilization_pct=utilization,
        department_count=len(dept_kpis),
        departments=dept_kpis,
    )


async def get_cash_out_forecast(
    facility_id: uuid.UUID, session: AsyncSession
) -> list[CashOutMonth]:
    """Monthly cash-out forecast, split by department.

    Only includes active items (not rejected/obsolete) that have an
    expected_cash_out date.
    """

    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)

    stmt = (
        select(
            func.date_trunc("month", CostItem.expected_cash_out).label("month"),
            Department.id.label("department_id"),
            Department.name.label("department_name"),
            func.coalesce(func.sum(CostItem.current_amount), ZERO).label("amount"),
        )
        .select_from(CostItem)
        .join(WorkArea, CostItem.work_area_id == WorkArea.id)
        .join(Department, WorkArea.department_id == Department.id)
        .where(
            Department.facility_id == facility_id,
            CostItem.expected_cash_out.is_not(None),
            is_active,
        )
        .group_by(
            func.date_trunc("month", CostItem.expected_cash_out),
            Department.id,
            Department.name,
        )
        .order_by(
            func.date_trunc("month", CostItem.expected_cash_out),
            Department.name,
        )
    )

    result = await session.execute(stmt)
    rows = result.all()

    # Group by month
    months_map: dict[object, list] = defaultdict(list)
    for row in rows:
        month_date = row.month.date() if hasattr(row.month, "date") else row.month
        months_map[month_date].append(
            CashOutDepartment(
                department_id=row.department_id,
                department_name=row.department_name,
                amount=Decimal(str(row.amount)),
            )
        )

    return [
        CashOutMonth(
            month=month,
            total=sum((d.amount for d in depts), ZERO),
            departments=depts,
        )
        for month, depts in sorted(months_map.items())
    ]


async def get_phase_breakdown(
    facility_id: uuid.UUID, session: AsyncSession
) -> list[PhaseBreakdown]:
    """KPIs grouped by project phase for a facility."""

    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)
    is_committed = CostItem.approval_status.in_(COMMITTED_STATUSES)

    stmt = (
        select(
            CostItem.project_phase.label("phase"),
            func.coalesce(
                func.sum(
                    case((is_committed, CostItem.current_amount), else_=ZERO)
                ),
                ZERO,
            ).label("committed"),
            func.coalesce(
                func.sum(
                    case((is_active, CostItem.current_amount), else_=ZERO)
                ),
                ZERO,
            ).label("forecast"),
            func.count(case((is_active, CostItem.id))).label("item_count"),
        )
        .select_from(CostItem)
        .join(WorkArea, CostItem.work_area_id == WorkArea.id)
        .join(Department, WorkArea.department_id == Department.id)
        .where(Department.facility_id == facility_id)
        .group_by(CostItem.project_phase)
        .order_by(CostItem.project_phase)
    )

    result = await session.execute(stmt)
    rows = result.all()

    return [
        PhaseBreakdown(
            phase=row.phase.value if row.phase else "UNASSIGNED",
            committed=Decimal(str(row.committed)),
            forecast=Decimal(str(row.forecast)),
            item_count=row.item_count,
        )
        for row in rows
    ]


async def get_approval_pipeline(
    facility_id: uuid.UUID, session: AsyncSession
) -> list[ApprovalPipelineEntry]:
    """Value (EUR) and count per approval status for a facility."""

    stmt = (
        select(
            CostItem.approval_status.label("status"),
            func.coalesce(func.sum(CostItem.current_amount), ZERO).label(
                "total_amount"
            ),
            func.count(CostItem.id).label("item_count"),
        )
        .select_from(CostItem)
        .join(WorkArea, CostItem.work_area_id == WorkArea.id)
        .join(Department, WorkArea.department_id == Department.id)
        .where(Department.facility_id == facility_id)
        .group_by(CostItem.approval_status)
        .order_by(CostItem.approval_status)
    )

    result = await session.execute(stmt)
    rows = result.all()

    return [
        ApprovalPipelineEntry(
            status=row.status.value if row.status else "UNKNOWN",
            total_amount=Decimal(str(row.total_amount)),
            item_count=row.item_count,
        )
        for row in rows
    ]


# ═══════════════════════════════════════════════════════════════════════════
# Legacy functions (kept for backward compat, use new KPI functions instead)
# ═══════════════════════════════════════════════════════════════════════════


async def get_budget_summary(session: AsyncSession) -> BudgetSummary:
    """DEPRECATED — global summary across ALL facilities/departments.

    Uses correct Otto v4 definitions.
    """

    # Budget = SUM(budget_total) + SUM(adjustments)
    budget_result = await session.execute(
        select(func.coalesce(func.sum(Department.budget_total), ZERO))
    )
    base_budget = Decimal(str(budget_result.scalar_one()))

    adj_result = await session.execute(
        select(func.coalesce(func.sum(BudgetAdjustment.amount), ZERO))
    )
    adj_total = Decimal(str(adj_result.scalar_one()))
    total_budget = base_budget + adj_total

    # Committed = approved only
    committed_result = await session.execute(
        select(func.coalesce(func.sum(CostItem.current_amount), ZERO)).where(
            CostItem.approval_status.in_(COMMITTED_STATUSES)
        )
    )
    total_committed = Decimal(str(committed_result.scalar_one()))

    # Approved (same as committed for now)
    total_approved = total_committed

    # Forecast = all except rejected/obsolete
    forecast_result = await session.execute(
        select(func.coalesce(func.sum(CostItem.current_amount), ZERO)).where(
            CostItem.approval_status.notin_(EXCLUDED_STATUSES)
        )
    )
    forecast = Decimal(str(forecast_result.scalar_one()))

    remaining = total_budget - forecast
    cost_of_completion = forecast - total_committed

    return BudgetSummary(
        total_budget=total_budget,
        total_committed=total_committed,
        total_approved=total_approved,
        remaining=remaining,
        forecast=forecast,
        cost_of_completion=cost_of_completion,
    )


async def get_department_summaries(
    session: AsyncSession,
) -> list[DepartmentSummary]:
    """DEPRECATED — use get_department_kpis instead."""

    adj_sub = (
        select(
            BudgetAdjustment.department_id,
            func.coalesce(func.sum(BudgetAdjustment.amount), ZERO).label(
                "adj_total"
            ),
        )
        .group_by(BudgetAdjustment.department_id)
        .subquery("adj_sub")
    )

    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)
    is_committed = CostItem.approval_status.in_(COMMITTED_STATUSES)

    stmt = (
        select(
            Department.name.label("department_name"),
            func.coalesce(Department.budget_total, ZERO).label("budget_base"),
            func.coalesce(adj_sub.c.adj_total, ZERO).label("adj_total"),
            func.coalesce(
                func.sum(
                    case((is_committed, CostItem.current_amount), else_=ZERO)
                ),
                ZERO,
            ).label("committed"),
            func.coalesce(
                func.sum(
                    case((is_active, CostItem.current_amount), else_=ZERO)
                ),
                ZERO,
            ).label("forecast"),
        )
        .select_from(Department)
        .outerjoin(WorkArea, WorkArea.department_id == Department.id)
        .outerjoin(CostItem, CostItem.work_area_id == WorkArea.id)
        .outerjoin(adj_sub, adj_sub.c.department_id == Department.id)
        .group_by(
            Department.name,
            Department.budget_total,
            adj_sub.c.adj_total,
        )
        .order_by(Department.name)
    )

    result = await session.execute(stmt)
    rows = result.all()

    summaries: list[DepartmentSummary] = []
    for row in rows:
        budget_base = Decimal(str(row.budget_base))
        adj = Decimal(str(row.adj_total))
        budget = budget_base + adj
        committed = Decimal(str(row.committed))
        forecast = Decimal(str(row.forecast))
        remaining = budget - forecast

        summaries.append(
            DepartmentSummary(
                department_name=row.department_name,
                budget_total=budget,
                total_committed=committed,
                total_approved=committed,
                remaining=remaining,
            )
        )

    return summaries


async def get_cash_out_timeline(session: AsyncSession) -> list[CashOutEntry]:
    """DEPRECATED — use get_cash_out_forecast instead.

    Only includes active items (not rejected/obsolete).
    """

    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)

    stmt = (
        select(
            func.date_trunc("month", CostItem.expected_cash_out).label("month"),
            func.sum(CostItem.current_amount).label("amount"),
        )
        .where(
            CostItem.expected_cash_out.is_not(None),
            is_active,
        )
        .group_by(func.date_trunc("month", CostItem.expected_cash_out))
        .order_by(func.date_trunc("month", CostItem.expected_cash_out))
    )
    result = await session.execute(stmt)
    rows = result.all()

    return [
        CashOutEntry(
            month=row.month.date() if hasattr(row.month, "date") else row.month,
            amount=Decimal(str(row.amount)),
        )
        for row in rows
    ]
