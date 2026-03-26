"""Aggregation service — correct business logic per Otto v4.

Definitions:
- Committed   = SUM(total_amount) WHERE status = APPROVED
- Forecast    = SUM(total_amount) WHERE status NOT IN (REJECTED, OBSOLETE)
- Budget      = functional_area.budget_total + SUM(budget_adjustments.amount)
- Remaining   = Budget - Forecast
- Cost of Completion (CoC) = Forecast  (same metric, different label)
- Variance    = 0 for now (will use PriceHistory delta in Phase 4)
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BudgetAdjustment, CostItem, FunctionalArea, WorkArea
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


async def get_functional_area_kpis(
    facility_id: uuid.UUID, session: AsyncSession
) -> list[FunctionalAreaKPI]:
    """Compute KPIs per functional area for a given facility.

    All monetary values use Decimal. Single query with conditional aggregation.
    """

    # Subquery: adjustment totals per functional area
    adj_sub = (
        select(
            BudgetAdjustment.functional_area_id,
            func.coalesce(func.sum(BudgetAdjustment.amount), ZERO).label(
                "adj_total"
            ),
        )
        .group_by(BudgetAdjustment.functional_area_id)
        .subquery("adj_sub")
    )

    # Main query: aggregate cost items per functional area
    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)
    is_committed = CostItem.approval_status.in_(COMMITTED_STATUSES)

    stmt = (
        select(
            FunctionalArea.id.label("functional_area_id"),
            FunctionalArea.name.label("functional_area_name"),
            func.coalesce(FunctionalArea.budget_total, ZERO).label("budget_base"),
            func.coalesce(adj_sub.c.adj_total, ZERO).label("adjustment_total"),
            # committed = approved items only
            func.coalesce(
                func.sum(
                    case((is_committed, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("committed"),
            # forecast = all except rejected/obsolete
            func.coalesce(
                func.sum(
                    case((is_active, CostItem.total_amount), else_=ZERO)
                ),
                ZERO,
            ).label("forecast"),
            # variance = 0 for now (will use PriceHistory delta in Phase 4)
            func.coalesce(
                func.sum(
                    case(
                        (
                            is_active,
                            ZERO,
                        ),
                        else_=ZERO,
                    )
                ),
                ZERO,
            ).label("variance"),
            # item count (active only)
            func.count(case((is_active, CostItem.id))).label("item_count"),
        )
        .select_from(FunctionalArea)
        .outerjoin(WorkArea, WorkArea.functional_area_id == FunctionalArea.id)
        .outerjoin(CostItem, CostItem.work_area_id == WorkArea.id)
        .outerjoin(adj_sub, adj_sub.c.functional_area_id == FunctionalArea.id)
        .where(FunctionalArea.facility_id == facility_id)
        .group_by(
            FunctionalArea.id,
            FunctionalArea.name,
            FunctionalArea.budget_total,
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
        cost_of_completion = forecast  # CoC = Forecast (same metric, different label)
        variance = Decimal(str(row.variance))
        utilization = _pct(committed, budget)

        kpis.append(
            FunctionalAreaKPI(
                functional_area_id=row.functional_area_id,
                functional_area_name=row.functional_area_name,
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
    """Aggregate KPIs across all functional areas in a facility."""

    fa_kpis = await get_functional_area_kpis(facility_id, session)

    budget = sum((d.budget for d in fa_kpis), ZERO)
    budget_base = sum((d.budget_base for d in fa_kpis), ZERO)
    adj_total = sum((d.adjustment_total for d in fa_kpis), ZERO)
    committed = sum((d.committed for d in fa_kpis), ZERO)
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

    # Budget = SUM(budget_total) + SUM(adjustments)
    budget_result = await session.execute(
        select(func.coalesce(func.sum(FunctionalArea.budget_total), ZERO))
    )
    base_budget = Decimal(str(budget_result.scalar_one()))

    adj_result = await session.execute(
        select(func.coalesce(func.sum(BudgetAdjustment.amount), ZERO))
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

    # Forecast = all except rejected/obsolete
    forecast_result = await session.execute(
        select(func.coalesce(func.sum(CostItem.total_amount), ZERO)).where(
            CostItem.approval_status.notin_(EXCLUDED_STATUSES)
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

    adj_sub = (
        select(
            BudgetAdjustment.functional_area_id,
            func.coalesce(func.sum(BudgetAdjustment.amount), ZERO).label(
                "adj_total"
            ),
        )
        .group_by(BudgetAdjustment.functional_area_id)
        .subquery("adj_sub")
    )

    is_active = CostItem.approval_status.notin_(EXCLUDED_STATUSES)
    is_committed = CostItem.approval_status.in_(COMMITTED_STATUSES)

    stmt = (
        select(
            FunctionalArea.name.label("functional_area_name"),
            func.coalesce(FunctionalArea.budget_total, ZERO).label("budget_base"),
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
        .outerjoin(adj_sub, adj_sub.c.functional_area_id == FunctionalArea.id)
        .group_by(
            FunctionalArea.name,
            FunctionalArea.budget_total,
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


# ── Backward-compatible aliases ──────────────────────────────────────────
# These aliases allow old code that imported the old names to keep working
# during the transition period.

get_department_kpis = get_functional_area_kpis
get_department_summaries = get_functional_area_summaries
