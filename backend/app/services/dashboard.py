"""Dashboard service — single async function that computes all KPIs in minimal queries.

KPI definitions are imported from the canonical aggregation module to ensure
consistency.  See ``app.services.aggregation`` for the source-of-truth
definitions of Committed, Forecast, Budget, Remaining, and CoC.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    AuditLog,
    BudgetAdjustment,
    CostItem,
    FunctionalArea,
    Facility,
    WorkArea,
)
from app.models.enums import ApprovalStatus
from app.schemas.dashboard import (
    CashOutTimelineEntry,
    DashboardFunctionalArea,
    DashboardFacility,
    DashboardKPIs,
    DashboardPhase,
    DashboardResponse,
    DashboardWorkArea,
    RecentChange,
    StatusEntry,
)
from app.services.aggregation import COMMITTED_STATUSES, EXCLUDED_STATUSES

ZERO = Decimal(0)

# Statuses considered "pending" (in-progress, not yet approved or dead)
_PENDING_STATUSES = {
    ApprovalStatus.OPEN,
    ApprovalStatus.SUBMITTED_FOR_APPROVAL,
    ApprovalStatus.ON_HOLD,
    ApprovalStatus.PENDING_SUPPLIER_NEGOTIATION,
    ApprovalStatus.PENDING_TECHNICAL_CLARIFICATION,
}


async def get_dashboard(
    session: AsyncSession,
    facility_id: uuid.UUID,
) -> DashboardResponse:
    """Compute the full dashboard payload for a facility in as few queries as possible."""

    # ── 1. Facility + FunctionalAreas + WorkAreas (eager load) ───────────────
    facility_stmt = (
        select(Facility)
        .where(Facility.id == facility_id)
        .options(
            selectinload(Facility.functional_areas)
            .selectinload(FunctionalArea.work_areas),
            selectinload(Facility.functional_areas)
            .selectinload(FunctionalArea.budget_adjustments),
        )
    )
    facility_result = await session.execute(facility_stmt)
    facility: Facility | None = facility_result.scalar_one_or_none()
    if facility is None:
        raise ValueError(f"Facility {facility_id} not found")

    fa_ids = [d.id for d in facility.functional_areas]

    # ── 2. Aggregated cost-item stats per functional area ─────────────────────
    # Single query: group by functional area, compute committed/forecast/counts
    if fa_ids:
        agg_stmt = (
            select(
                WorkArea.functional_area_id,
                func.count(CostItem.id).label("total_items"),
                func.coalesce(func.sum(CostItem.total_amount), ZERO).label("total_amount"),
                func.coalesce(
                    func.sum(
                        case(
                            (CostItem.approval_status.in_(COMMITTED_STATUSES), CostItem.total_amount),
                            else_=Decimal(0),
                        )
                    ),
                    ZERO,
                ).label("committed"),
                func.coalesce(
                    func.sum(
                        case(
                            (CostItem.approval_status.notin_(EXCLUDED_STATUSES), CostItem.total_amount),
                            else_=Decimal(0),
                        )
                    ),
                    ZERO,
                ).label("forecast"),
                func.count(
                    case(
                        (CostItem.approval_status.in_(COMMITTED_STATUSES), CostItem.id),
                    )
                ).label("approved_items"),
                func.count(
                    case(
                        (CostItem.approval_status.in_(_PENDING_STATUSES), CostItem.id),
                    )
                ).label("pending_items"),
                func.count(
                    case(
                        (CostItem.approval_status == ApprovalStatus.REJECTED, CostItem.id),
                    )
                ).label("rejected_items"),
            )
            .join(WorkArea, CostItem.work_area_id == WorkArea.id)
            .where(WorkArea.functional_area_id.in_(fa_ids))
            .group_by(WorkArea.functional_area_id)
        )
        agg_result = await session.execute(agg_stmt)
        fa_agg = {row.functional_area_id: row for row in agg_result.all()}
    else:
        fa_agg = {}

    # ── 3. Work-area level aggregation ───────────────────────────────────
    if fa_ids:
        wa_stmt = (
            select(
                WorkArea.id,
                WorkArea.functional_area_id,
                WorkArea.name,
                func.count(CostItem.id).label("item_count"),
                func.coalesce(func.sum(CostItem.total_amount), ZERO).label("total"),
            )
            .outerjoin(CostItem, CostItem.work_area_id == WorkArea.id)
            .where(WorkArea.functional_area_id.in_(fa_ids))
            .group_by(WorkArea.id, WorkArea.functional_area_id, WorkArea.name)
            .order_by(WorkArea.name)
        )
        wa_result = await session.execute(wa_stmt)
        wa_rows = wa_result.all()
        wa_by_fa: dict[uuid.UUID, list] = defaultdict(list)
        for row in wa_rows:
            wa_by_fa[row.functional_area_id].append(
                DashboardWorkArea(
                    id=row.id,
                    name=row.name,
                    item_count=row.item_count,
                    total=row.total,
                )
            )
    else:
        wa_by_fa = {}

    # ── 4. Build functional area list + accumulate facility totals ────────────
    total_budget = ZERO
    total_adjustments = ZERO
    total_committed = ZERO
    total_forecast = ZERO
    total_items = 0
    total_approved = 0
    total_pending = 0
    total_rejected = 0

    functional_areas_out: list[DashboardFunctionalArea] = []

    for fa in sorted(facility.functional_areas, key=lambda d: d.name):
        fa_budget = fa.budget_total or ZERO
        fa_adj = sum((a.amount or ZERO) for a in fa.budget_adjustments)
        agg = fa_agg.get(fa.id)

        committed = agg.committed if agg else ZERO
        forecast = agg.forecast if agg else ZERO
        items_total = agg.total_items if agg else 0
        items_approved = agg.approved_items if agg else 0

        effective = fa_budget + fa_adj
        remaining = effective - forecast

        functional_areas_out.append(
            DashboardFunctionalArea(
                id=fa.id,
                name=fa.name,
                budget=fa_budget,
                adjustments=fa_adj,
                committed=committed,
                forecast=forecast,
                remaining=remaining,
                items_total=items_total,
                items_approved=items_approved,
                work_areas=wa_by_fa.get(fa.id, []),
            )
        )

        total_budget += fa_budget
        total_adjustments += fa_adj
        total_committed += committed
        total_forecast += forecast
        total_items += items_total
        total_approved += items_approved
        total_pending += agg.pending_items if agg else 0
        total_rejected += agg.rejected_items if agg else 0

    budget_effective = total_budget + total_adjustments
    remaining = budget_effective - total_forecast
    remaining_pct = (
        (remaining / budget_effective * 100).quantize(Decimal("0.1"))
        if budget_effective
        else ZERO
    )

    kpis = DashboardKPIs(
        budget=total_budget,
        budget_adjustments=total_adjustments,
        budget_effective=budget_effective,
        committed=total_committed,
        forecast=total_forecast,
        remaining=remaining,
        remaining_pct=remaining_pct,
        total_items=total_items,
        approved_items=total_approved,
        pending_items=total_pending,
        rejected_items=total_rejected,
    )

    # ── 5. Cash-out timeline (by month & functional area) ─────────────────
    if fa_ids:
        cashout_stmt = (
            select(
                func.to_char(
                    func.date_trunc("month", CostItem.expected_cash_out), "YYYY-MM"
                ).label("month"),
                WorkArea.functional_area_id,
                func.coalesce(func.sum(CostItem.total_amount), ZERO).label("amount"),
            )
            .join(WorkArea, CostItem.work_area_id == WorkArea.id)
            .where(
                WorkArea.functional_area_id.in_(fa_ids),
                CostItem.expected_cash_out.is_not(None),
                CostItem.approval_status.notin_(EXCLUDED_STATUSES),
            )
            .group_by(
                func.to_char(func.date_trunc("month", CostItem.expected_cash_out), "YYYY-MM"),
                WorkArea.functional_area_id,
            )
            .order_by("month")
        )
        cashout_result = await session.execute(cashout_stmt)
        cashout_rows = cashout_result.all()

        # Pivot: month -> {fa_id: amount}
        month_data: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(lambda: ZERO))
        month_totals: dict[str, Decimal] = defaultdict(lambda: ZERO)
        for row in cashout_rows:
            month_data[row.month][str(row.functional_area_id)] += row.amount
            month_totals[row.month] += row.amount

        cash_out_timeline = [
            CashOutTimelineEntry(
                month=month,
                total=month_totals[month],
                by_functional_area=dict(month_data[month]),
            )
            for month in sorted(month_totals)
        ]
    else:
        cash_out_timeline = []

    # ── 6. Breakdown by phase ────────────────────────────────────────────
    if fa_ids:
        phase_stmt = (
            select(
                CostItem.project_phase,
                func.coalesce(
                    func.sum(
                        case(
                            (CostItem.approval_status.in_(COMMITTED_STATUSES), CostItem.total_amount),
                            else_=Decimal(0),
                        )
                    ),
                    ZERO,
                ).label("committed"),
                func.coalesce(
                    func.sum(
                        case(
                            (CostItem.approval_status.notin_(EXCLUDED_STATUSES), CostItem.total_amount),
                            else_=Decimal(0),
                        )
                    ),
                    ZERO,
                ).label("forecast"),
                func.count(CostItem.id).label("items"),
            )
            .join(WorkArea, CostItem.work_area_id == WorkArea.id)
            .where(
                WorkArea.functional_area_id.in_(fa_ids),
                CostItem.project_phase.is_not(None),
            )
            .group_by(CostItem.project_phase)
            .order_by(CostItem.project_phase)
        )
        phase_result = await session.execute(phase_stmt)
        by_phase = [
            DashboardPhase(
                phase=row.project_phase if row.project_phase else "UNASSIGNED",
                committed=row.committed,
                forecast=row.forecast,
                items=row.items,
            )
            for row in phase_result.all()
        ]
    else:
        by_phase = []

    # ── 7. Breakdown by status ───────────────────────────────────────────
    if fa_ids:
        status_stmt = (
            select(
                CostItem.approval_status,
                func.count(CostItem.id).label("count"),
                func.coalesce(func.sum(CostItem.total_amount), ZERO).label("amount"),
            )
            .join(WorkArea, CostItem.work_area_id == WorkArea.id)
            .where(WorkArea.functional_area_id.in_(fa_ids))
            .group_by(CostItem.approval_status)
        )
        status_result = await session.execute(status_stmt)
        by_status = {
            row.approval_status.value: StatusEntry(count=row.count, amount=row.amount)
            for row in status_result.all()
        }
    else:
        by_status = {}

    # ── 8. Recent changes (last 20 audit log entries for cost items) ─────
    if fa_ids:
        # Get all work_area IDs for this facility
        wa_ids_stmt = select(WorkArea.id).where(WorkArea.functional_area_id.in_(fa_ids))
        wa_ids_result = await session.execute(wa_ids_stmt)
        wa_ids = [row[0] for row in wa_ids_result.all()]

        if wa_ids:
            # Get cost item IDs belonging to this facility
            ci_ids_stmt = select(CostItem.id).where(CostItem.work_area_id.in_(wa_ids))
            ci_ids_result = await session.execute(ci_ids_stmt)
            ci_ids = [row[0] for row in ci_ids_result.all()]

            if ci_ids:
                audit_stmt = (
                    select(
                        AuditLog.entity_id,
                        AuditLog.field_name,
                        AuditLog.old_value,
                        AuditLog.new_value,
                        AuditLog.created_at,
                    )
                    .where(
                        AuditLog.entity_type == "cost_item",
                        AuditLog.entity_id.in_(ci_ids),
                    )
                    .order_by(AuditLog.created_at.desc())
                    .limit(20)
                )
                audit_result = await session.execute(audit_stmt)
                audit_rows = audit_result.all()

                # Build a description lookup for referenced cost items
                desc_stmt = (
                    select(CostItem.id, CostItem.description)
                    .where(CostItem.id.in_([r.entity_id for r in audit_rows]))
                )
                desc_result = await session.execute(desc_stmt)
                desc_map = {row.id: row.description for row in desc_result.all()}

                recent_changes = [
                    RecentChange(
                        item_id=row.entity_id,
                        description=desc_map.get(row.entity_id, ""),
                        change=_format_change(row.field_name, row.old_value, row.new_value),
                        date=row.created_at.strftime("%Y-%m-%d"),
                    )
                    for row in audit_rows
                ]
            else:
                recent_changes = []
        else:
            recent_changes = []
    else:
        recent_changes = []

    # ── Assemble response ────────────────────────────────────────────────
    return DashboardResponse(
        facility=DashboardFacility(
            id=facility.id,
            name=facility.name,
            location=facility.location,
        ),
        kpis=kpis,
        functional_areas=functional_areas_out,
        cash_out_timeline=cash_out_timeline,
        by_phase=by_phase,
        by_status=by_status,
        recent_changes=recent_changes,
    )


def _format_change(field: str | None, old: str | None, new: str | None) -> str:
    """Format an audit log entry into a human-readable change description."""
    field_label = (field or "value").replace("_", " ").title()
    if old and new:
        return f"{field_label}: {old} \u2192 {new}"
    if new:
        return f"{field_label} \u2192 {new}"
    return f"{field_label} changed"
