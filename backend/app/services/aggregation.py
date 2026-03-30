"""Aggregation service — correct business logic per Otto v4 + Phase 4.

Definitions:
- Committed   = SUM(total_amount) WHERE status IN (APPROVED, PURCHASE_ORDER_SENT, PURCHASE_ORDER_CONFIRMED, DELIVERED)
- Spent       = SUM(total_amount) WHERE status = DELIVERED
- Forecast    = SUM(total_amount) WHERE status NOT IN (REJECTED, OBSOLETE, DELIVERED)
- Budget      = SUM(FunctionalAreaBudget.amount) + SUM(change_costs.amount WHERE budget_relevant=true)
- Remaining   = Budget - Forecast
- Cost of Completion (CoC) = Forecast  (same metric, different label)
- Variance    = 0 for now (will use PriceHistory delta later)
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ChangeCost, CostItem, FunctionalArea, FunctionalAreaBudget, WorkArea
from app.models.enums import ApprovalStatus
from app.schemas.summary import (
    ApprovalPipelineEntry,
    BudgetSummary,
    CashOutFunctionalArea,
    CashOutEntry,
    CashOutMonth,
    FunctionalAreaKPI,
    FunctionalAreaSummary,
    FacilityKPI,
    PhaseBreakdown,
)

# ── Constants ────────────────────────────────────────────────────────────

ZERO = Decimal("0.00")

# Statuses excluded from forecast / cost-of-completion (rejected, obsolete, AND delivered)
EXCLUDED_STATUSES = {ApprovalStatus.REJECTED, ApprovalStatus.OBSOLETE}

# Additional exclusion for forecast: delivered items are spent, not forecast
FORECAST_EXCLUDED_STATUSES = {ApprovalStatus.REJECTED, ApprovalStatus.OBSOLETE, ApprovalStatus.DELIVERED}

# Statuses that count as committed (approved or later in procurement lifecycle)
COMMITTED_STATUSES = {
    ApprovalStatus.APPROVED,
    ApprovalStatus.PURCHASE_ORDER_SENT,
    ApprovalStatus.PURCHASE_ORDER_CONFIRMED,
    ApprovalStatus.DELIVERED,
}

# Only delivered items count as spent
SPENT_STATUSES = {ApprovalStatus.DELIVERED}


def _pct(numerator: Decimal, denominator: Decimal) -> Decimal:
    """Calculate percentage, returning 0 if denominator is zero."""
    if not denominator:
        return ZERO
    return (numerator / denominator * 100).quantize(Decimal("0.01"))


# ═══════════════════════════════════════════════════════════════════════════
# NEW KPI Functions (Otto v4)
# ═══════════════════════════════════════════════════════════════════════════


async def get_functional_area_kpis(
    facility_id: uuid.UUID, session: AsyncSession
) -> list[FunctionalAreaKPI]:
    """Compute KPIs per functional area for a given facility.

    All monetary values use Decimal. Single query with conditional aggregation.
    """

    # Subquery: SUM of all FunctionalAreaBudget.amount per functional area (all years)
    budget_sub = (
        select(
            FunctionalAreaBudget.functional_area_id,
            func.coalesce(func.sum(FunctionalAreaBudget.amount), ZERO).label("budget_amount"),
        )
        .group_by(FunctionalAreaBudget.functional_area_id)
        .subquery("budget_sub")
    )

    # Subquery: change cost totals per functional area (only budget_relevant ones)
    adj_sub = (
        select(
            ChangeCost.functional_area_id,
            func.coalesce(func.sum(ChangeCost.amount), ZERO).label(
                "adj_total"
            ),
        )
        .where(ChangeCost.budget_relevant.is_(True))
        .group_by(ChangeCost.functional_area_id)
        .subquery("adj_sub")
    )

    # Main query: aggregate cost items per functional area
    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)
    is_forecast = CostItem.approval_status.notin_(FORECAST_EXCLUDED_STATUSES)
    is_committed = CostItem.approval_status.in_(COMMITTED_STATUSES)
    is_spent = CostItem.approval_status.in_(SPENT_STATUSES)

    stmt = (
        select(
            FunctionalArea.id.label("functional_area_id"),
            FunctionalArea.name.label("functional_area_name"),
            func.coalesce(budget_sub.c.budget_amount, ZERO).label("budget_base"),
            func.coalesce(adj_sub.c.adj_total, ZERO).label("adjustment_total"),
            # committed = approved + po_sent + po_confirmed + delivered
            func.coalesce(
                func.sum(
                    case((is_committed, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("committed"),
            # forecast = all except rejected/obsolete/delivered
            func.coalesce(
                func.sum(
                    case((is_forecast, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("forecast"),
            # spent = delivered only
            func.coalesce(
                func.sum(
                    case((is_spent, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("spent"),
            # item count (active only, excl. rejected/obsolete)
            func.count(case((is_active, CostItem.id))).label("item_count"),
        )
        .select_from(FunctionalArea)
        .outerjoin(WorkArea, WorkArea.functional_area_id == FunctionalArea.id)
        .outerjoin(CostItem, CostItem.work_area_id == WorkArea.id)
        .outerjoin(budget_sub, budget_sub.c.functional_area_id == FunctionalArea.id)
        .outerjoin(adj_sub, adj_sub.c.functional_area_id == FunctionalArea.id)
        .where(FunctionalArea.facility_id == facility_id)
        .group_by(
            FunctionalArea.id,
            FunctionalArea.name,
            budget_sub.c.budget_amount,
            adj_sub.c.adj_total,
        )
        .order_by(FunctionalArea.name)
    )

    result = await session.execute(stmt)
    rows = result.all()

    kpis: list[FunctionalAreaKPI] = []
    for row in rows:
        budget_base = Decimal(str(row.budget_base))
        adj_total = Decimal(str(row.adjustment_total))
        budget = budget_base + adj_total
        committed = Decimal(str(row.committed))
        forecast = Decimal(str(row.forecast))
        spent = Decimal(str(row.spent))
        remaining = budget - forecast
        cost_of_completion = forecast  # CoC = Forecast (same metric, different label)
        utilization = _pct(committed, budget)

        kpis.append(
            FunctionalAreaKPI(
                functional_area_id=row.functional_area_id,
                functional_area_name=row.functional_area_name,
                budget=budget,
                budget_base=budget_base,
                adjustment_total=adj_total,
                committed=committed,
                spent=spent,
                forecast=forecast,
                remaining=remaining,
                cost_of_completion=cost_of_completion,
                variance=ZERO,
                item_count=row.item_count,
                budget_utilization_pct=utilization,
            )
        )

    return kpis


async def get_functional_area_kpis_by_year(
    facility_id: uuid.UUID, year: int, session: AsyncSession
) -> list[FunctionalAreaKPI]:
    """Compute KPIs per functional area for a given facility and budget year.

    Budget base comes from FunctionalAreaBudget entries for the year.
    Items are assigned to a year based on their expected_cash_out date;
    items without expected_cash_out fall back to the requested year.
    """
    current_year = year

    # Subquery: FunctionalAreaBudget amounts for the requested year
    budget_sub = (
        select(
            FunctionalAreaBudget.functional_area_id,
            func.coalesce(func.sum(FunctionalAreaBudget.amount), ZERO).label("budget_amount"),
        )
        .where(FunctionalAreaBudget.year == year)
        .group_by(FunctionalAreaBudget.functional_area_id)
        .subquery("budget_sub")
    )

    # Subquery: change cost totals per functional area for the year (only budget_relevant)
    adj_sub = (
        select(
            ChangeCost.functional_area_id,
            func.coalesce(func.sum(ChangeCost.amount), ZERO).label("adj_total"),
        )
        .where(ChangeCost.budget_relevant.is_(True), ChangeCost.year == year)
        .group_by(ChangeCost.functional_area_id)
        .subquery("adj_sub")
    )

    # Filter items by year: extract year from expected_cash_out, fallback to current year
    item_year = func.coalesce(
        func.extract("year", CostItem.expected_cash_out),
        current_year,
    )

    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)
    is_forecast = CostItem.approval_status.notin_(FORECAST_EXCLUDED_STATUSES)
    is_committed = CostItem.approval_status.in_(COMMITTED_STATUSES)
    is_spent = CostItem.approval_status.in_(SPENT_STATUSES)
    in_year = item_year == year

    stmt = (
        select(
            FunctionalArea.id.label("functional_area_id"),
            FunctionalArea.name.label("functional_area_name"),
            func.coalesce(budget_sub.c.budget_amount, ZERO).label("budget_base"),
            func.coalesce(adj_sub.c.adj_total, ZERO).label("adjustment_total"),
            func.coalesce(
                func.sum(case((is_committed & in_year, CostItem.total_amount), else_=ZERO)),
                ZERO,
            ).label("committed"),
            func.coalesce(
                func.sum(case((is_forecast & in_year, CostItem.total_amount), else_=ZERO)),
                ZERO,
            ).label("forecast"),
            func.coalesce(
                func.sum(case((is_spent & in_year, CostItem.total_amount), else_=ZERO)),
                ZERO,
            ).label("spent"),
            func.count(case((is_active & in_year, CostItem.id))).label("item_count"),
        )
        .select_from(FunctionalArea)
        .outerjoin(WorkArea, WorkArea.functional_area_id == FunctionalArea.id)
        .outerjoin(CostItem, CostItem.work_area_id == WorkArea.id)
        .outerjoin(budget_sub, budget_sub.c.functional_area_id == FunctionalArea.id)
        .outerjoin(adj_sub, adj_sub.c.functional_area_id == FunctionalArea.id)
        .where(FunctionalArea.facility_id == facility_id)
        .group_by(
            FunctionalArea.id,
            FunctionalArea.name,
            budget_sub.c.budget_amount,
            adj_sub.c.adj_total,
        )
        .order_by(FunctionalArea.name)
    )

    result = await session.execute(stmt)
    rows = result.all()

    kpis: list[FunctionalAreaKPI] = []
    for row in rows:
        budget_base = Decimal(str(row.budget_base))
        adj_total = Decimal(str(row.adjustment_total))
        budget = budget_base + adj_total
        committed = Decimal(str(row.committed))
        forecast = Decimal(str(row.forecast))
        remaining = budget - forecast
        cost_of_completion = forecast
        utilization = _pct(committed, budget)

        kpis.append(
            FunctionalAreaKPI(
                functional_area_id=row.functional_area_id,
                functional_area_name=row.functional_area_name,
                year=year,
                budget=budget,
                budget_base=budget_base,
                adjustment_total=adj_total,
                committed=committed,
                spent=Decimal(str(row.spent)),
                forecast=forecast,
                remaining=remaining,
                cost_of_completion=cost_of_completion,
                variance=ZERO,
                item_count=row.item_count,
                budget_utilization_pct=utilization,
            )
        )

    return kpis


async def get_facility_kpis(
    facility_id: uuid.UUID, session: AsyncSession
) -> FacilityKPI:
    """Aggregate KPIs across all functional areas in a facility."""

    fa_kpis = await get_functional_area_kpis(facility_id, session)

    budget = sum((d.budget for d in fa_kpis), ZERO)
    budget_base = sum((d.budget_base for d in fa_kpis), ZERO)
    adj_total = sum((d.adjustment_total for d in fa_kpis), ZERO)
    committed = sum((d.committed for d in fa_kpis), ZERO)
    spent = sum((d.spent for d in fa_kpis), ZERO)
    forecast = sum((d.forecast for d in fa_kpis), ZERO)
    remaining = budget - forecast
    cost_of_completion = forecast  # CoC = Forecast (same metric, different label)
    variance = sum((d.variance for d in fa_kpis), ZERO)
    item_count = sum(d.item_count for d in fa_kpis)
    utilization = _pct(committed, budget)

    return FacilityKPI(
        facility_id=facility_id,
        budget=budget,
        budget_base=budget_base,
        adjustment_total=adj_total,
        committed=committed,
        spent=spent,
        forecast=forecast,
        remaining=remaining,
        cost_of_completion=cost_of_completion,
        variance=variance,
        item_count=item_count,
        budget_utilization_pct=utilization,
        functional_area_count=len(fa_kpis),
        functional_areas=fa_kpis,
    )


async def get_cash_out_forecast(
    facility_id: uuid.UUID, session: AsyncSession
) -> list[CashOutMonth]:
    """Monthly cash-out forecast, split by functional area.

    Only includes active items (not rejected/obsolete) that have an
    expected_cash_out date.
    """

    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)

    stmt = (
        select(
            func.date_trunc("month", CostItem.expected_cash_out).label("month"),
            FunctionalArea.id.label("functional_area_id"),
            FunctionalArea.name.label("functional_area_name"),
            func.coalesce(func.sum(CostItem.total_amount), ZERO).label("amount"),
        )
        .select_from(CostItem)
        .join(WorkArea, CostItem.work_area_id == WorkArea.id)
        .join(FunctionalArea, WorkArea.functional_area_id == FunctionalArea.id)
        .where(
            FunctionalArea.facility_id == facility_id,
            CostItem.expected_cash_out.is_not(None),
            is_active,
        )
        .group_by(
            func.date_trunc("month", CostItem.expected_cash_out),
            FunctionalArea.id,
            FunctionalArea.name,
        )
        .order_by(
            func.date_trunc("month", CostItem.expected_cash_out),
            FunctionalArea.name,
        )
    )

    result = await session.execute(stmt)
    rows = result.all()

    # Group by month
    months_map: dict[object, list] = defaultdict(list)
    for row in rows:
        month_date = row.month.date() if hasattr(row.month, "date") else row.month
        months_map[month_date].append(
            CashOutFunctionalArea(
                functional_area_id=row.functional_area_id,
                functional_area_name=row.functional_area_name,
                amount=Decimal(str(row.amount)),
            )
        )

    return [
        CashOutMonth(
            month=month,
            total=sum((d.amount for d in fas), ZERO),
            functional_areas=fas,
        )
        for month, fas in sorted(months_map.items())
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
                    case((is_committed, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("committed"),
            func.coalesce(
                func.sum(
                    case((is_active, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("forecast"),
            func.count(case((is_active, CostItem.id))).label("item_count"),
        )
        .select_from(CostItem)
        .join(WorkArea, CostItem.work_area_id == WorkArea.id)
        .join(FunctionalArea, WorkArea.functional_area_id == FunctionalArea.id)
        .where(FunctionalArea.facility_id == facility_id)
        .group_by(CostItem.project_phase)
        .order_by(CostItem.project_phase)
    )

    result = await session.execute(stmt)
    rows = result.all()

    return [
        PhaseBreakdown(
            phase=row.phase if row.phase else "UNASSIGNED",
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
            func.coalesce(func.sum(CostItem.total_amount), ZERO).label(
                "total_amount"
            ),
            func.count(CostItem.id).label("item_count"),
        )
        .select_from(CostItem)
        .join(WorkArea, CostItem.work_area_id == WorkArea.id)
        .join(FunctionalArea, WorkArea.functional_area_id == FunctionalArea.id)
        .where(FunctionalArea.facility_id == facility_id)
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
    """DEPRECATED — global summary across ALL facilities/functional areas.

    Uses correct Otto v4 definitions.
    """

    # Budget = SUM(FunctionalAreaBudget.amount) + SUM(adjustments)
    budget_result = await session.execute(
        select(func.coalesce(func.sum(FunctionalAreaBudget.amount), ZERO))
    )
    base_budget = Decimal(str(budget_result.scalar_one()))

    adj_result = await session.execute(
        select(func.coalesce(func.sum(ChangeCost.amount), ZERO)).where(
            ChangeCost.budget_relevant.is_(True)
        )
    )
    adj_total = Decimal(str(adj_result.scalar_one()))
    total_budget = base_budget + adj_total

    # Committed = approved only
    committed_result = await session.execute(
        select(func.coalesce(func.sum(CostItem.total_amount), ZERO)).where(
            CostItem.approval_status.in_(COMMITTED_STATUSES)
        )
    )
    total_committed = Decimal(str(committed_result.scalar_one()))

    # Approved (same as committed for now)
    total_approved = total_committed

    # Forecast = all except rejected/obsolete/delivered
    forecast_result = await session.execute(
        select(func.coalesce(func.sum(CostItem.total_amount), ZERO)).where(
            CostItem.approval_status.notin_(FORECAST_EXCLUDED_STATUSES)
        )
    )
    forecast = Decimal(str(forecast_result.scalar_one()))

    remaining = total_budget - forecast
    cost_of_completion = forecast  # CoC = Forecast (same metric, different label)

    return BudgetSummary(
        total_budget=total_budget,
        total_committed=total_committed,
        total_approved=total_approved,
        remaining=remaining,
        forecast=forecast,
        cost_of_completion=cost_of_completion,
    )


async def get_functional_area_summaries(
    session: AsyncSession,
) -> list[FunctionalAreaSummary]:
    """DEPRECATED — use get_functional_area_kpis instead."""

    # Subquery: SUM of all FunctionalAreaBudget.amount per functional area (all years)
    budget_sub = (
        select(
            FunctionalAreaBudget.functional_area_id,
            func.coalesce(func.sum(FunctionalAreaBudget.amount), ZERO).label("budget_amount"),
        )
        .group_by(FunctionalAreaBudget.functional_area_id)
        .subquery("budget_sub")
    )

    adj_sub = (
        select(
            ChangeCost.functional_area_id,
            func.coalesce(func.sum(ChangeCost.amount), ZERO).label(
                "adj_total"
            ),
        )
        .where(ChangeCost.budget_relevant.is_(True))
        .group_by(ChangeCost.functional_area_id)
        .subquery("adj_sub")
    )

    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)
    is_committed = CostItem.approval_status.in_(COMMITTED_STATUSES)

    stmt = (
        select(
            FunctionalArea.name.label("functional_area_name"),
            func.coalesce(budget_sub.c.budget_amount, ZERO).label("budget_base"),
            func.coalesce(adj_sub.c.adj_total, ZERO).label("adj_total"),
            func.coalesce(
                func.sum(
                    case((is_committed, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("committed"),
            func.coalesce(
                func.sum(
                    case((is_active, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("forecast"),
        )
        .select_from(FunctionalArea)
        .outerjoin(WorkArea, WorkArea.functional_area_id == FunctionalArea.id)
        .outerjoin(CostItem, CostItem.work_area_id == WorkArea.id)
        .outerjoin(budget_sub, budget_sub.c.functional_area_id == FunctionalArea.id)
        .outerjoin(adj_sub, adj_sub.c.functional_area_id == FunctionalArea.id)
        .group_by(
            FunctionalArea.name,
            budget_sub.c.budget_amount,
            adj_sub.c.adj_total,
        )
        .order_by(FunctionalArea.name)
    )

    result = await session.execute(stmt)
    rows = result.all()

    summaries: list[FunctionalAreaSummary] = []
    for row in rows:
        budget_base = Decimal(str(row.budget_base))
        adj = Decimal(str(row.adj_total))
        budget = budget_base + adj
        committed = Decimal(str(row.committed))
        forecast = Decimal(str(row.forecast))
        remaining = budget - forecast

        summaries.append(
            FunctionalAreaSummary(
                functional_area_name=row.functional_area_name,
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
            func.sum(CostItem.total_amount).label("amount"),
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
