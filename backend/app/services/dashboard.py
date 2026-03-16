"""Dashboard service — single async function that computes all KPIs in minimal queries."""

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
    Department,
    Facility,
    WorkArea,
)
from app.models.enums import ApprovalStatus
from app.schemas.dashboard import (
    CashOutTimelineEntry,
    DashboardDepartment,
    DashboardFacility,
    DashboardKPIs,
    DashboardPhase,
    DashboardResponse,
    DashboardWorkArea,
    RecentChange,
    StatusEntry,
)

ZERO = Decimal(0)

# Statuses considered "active" (not dead)
_INACTIVE_STATUSES = {ApprovalStatus.REJECTED, ApprovalStatus.OBSOLETE}

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

    # ── 1. Facility + Departments + WorkAreas (eager load) ───────────────
    facility_stmt = (
        select(Facility)
        .where(Facility.id == facility_id)
        .options(
            selectinload(Facility.departments)
            .selectinload(Department.work_areas),
            selectinload(Facility.departments)
            .selectinload(Department.budget_adjustments),
        )
    )
    facility_result = await session.execute(facility_stmt)
    facility: Facility | None = facility_result.scalar_one_or_none()
    if facility is None:
        raise ValueError(f"Facility {facility_id} not found")

    dept_ids = [d.id for d in facility.departments]

    # ── 2. Aggregated cost-item stats per department ─────────────────────
    # Single query: group by department, compute committed/forecast/counts
    if dept_ids:
        agg_stmt = (
            select(
                WorkArea.department_id,
                func.count(CostItem.id).label("total_items"),
                func.coalesce(func.sum(CostItem.current_amount), ZERO).label("total_amount"),
                func.coalesce(
                    func.sum(
                        case(
                            (CostItem.approval_status == ApprovalStatus.APPROVED, CostItem.current_amount),
                            else_=Decimal(0),
                        )
                    ),
                    ZERO,
                ).label("committed"),
                func.coalesce(
                    func.sum(
                        case(
                            (CostItem.approval_status.notin_(_INACTIVE_STATUSES), CostItem.current_amount),
                            else_=Decimal(0),
                        )
                    ),
                    ZERO,
                ).label("forecast"),
                func.count(
                    case(
                        (CostItem.approval_status == ApprovalStatus.APPROVED, CostItem.id),
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
            .where(WorkArea.department_id.in_(dept_ids))
            .group_by(WorkArea.department_id)
        )
        agg_result = await session.execute(agg_stmt)
        dept_agg = {row.department_id: row for row in agg_result.all()}
    else:
        dept_agg = {}

    # ── 3. Work-area level aggregation ───────────────────────────────────
    if dept_ids:
        wa_stmt = (
            select(
                WorkArea.id,
                WorkArea.department_id,
                WorkArea.name,
                func.count(CostItem.id).label("item_count"),
                func.coalesce(func.sum(CostItem.current_amount), ZERO).label("total"),
            )
            .outerjoin(CostItem, CostItem.work_area_id == WorkArea.id)
            .where(WorkArea.department_id.in_(dept_ids))
            .group_by(WorkArea.id, WorkArea.department_id, WorkArea.name)
            .order_by(WorkArea.name)
        )
        wa_result = await session.execute(wa_stmt)
        wa_rows = wa_result.all()
        wa_by_dept: dict[uuid.UUID, list] = defaultdict(list)
        for row in wa_rows:
            wa_by_dept[row.department_id].append(
                DashboardWorkArea(
                    id=row.id,
                    name=row.name,
                    item_count=row.item_count,
                    total=row.total,
                )
            )
    else:
        wa_by_dept = {}

    # ── 4. Build department list + accumulate facility totals ────────────
    total_budget = ZERO
    total_adjustments = ZERO
    total_committed = ZERO
    total_forecast = ZERO
    total_items = 0
    total_approved = 0
    total_pending = 0
    total_rejected = 0

    departments_out: list[DashboardDepartment] = []

    for dept in sorted(facility.departments, key=lambda d: d.name):
        dept_budget = dept.budget_total or ZERO
        dept_adj = sum((a.amount or ZERO) for a in dept.budget_adjustments)
        agg = dept_agg.get(dept.id)

        committed = agg.committed if agg else ZERO
        forecast = agg.forecast if agg else ZERO
        items_total = agg.total_items if agg else 0
        items_approved = agg.approved_items if agg else 0

        effective = dept_budget + dept_adj
        remaining = effective - forecast

        departments_out.append(
            DashboardDepartment(
                id=dept.id,
                name=dept.name,
                budget=dept_budget,
                adjustments=dept_adj,
                committed=committed,
                forecast=forecast,
                remaining=remaining,
                items_total=items_total,
                items_approved=items_approved,
                work_areas=wa_by_dept.get(dept.id, []),
            )
        )

        total_budget += dept_budget
        total_adjustments += dept_adj
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

    # ── 5. Cash-out timeline (by month & department) ─────────────────────
    if dept_ids:
        cashout_stmt = (
            select(
                func.to_char(
                    func.date_trunc("month", CostItem.expected_cash_out), "YYYY-MM"
                ).label("month"),
                WorkArea.department_id,
                func.coalesce(func.sum(CostItem.current_amount), ZERO).label("amount"),
            )
            .join(WorkArea, CostItem.work_area_id == WorkArea.id)
            .where(
                WorkArea.department_id.in_(dept_ids),
                CostItem.expected_cash_out.is_not(None),
            )
            .group_by(
                func.to_char(func.date_trunc("month", CostItem.expected_cash_out), "YYYY-MM"),
                WorkArea.department_id,
            )
            .order_by("month")
        )
        cashout_result = await session.execute(cashout_stmt)
        cashout_rows = cashout_result.all()

        # Pivot: month -> {dept_id: amount}
        month_data: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(lambda: ZERO))
        month_totals: dict[str, Decimal] = defaultdict(lambda: ZERO)
        for row in cashout_rows:
            month_data[row.month][str(row.department_id)] += row.amount
            month_totals[row.month] += row.amount

        cash_out_timeline = [
            CashOutTimelineEntry(
                month=month,
                total=month_totals[month],
                by_department=dict(month_data[month]),
            )
            for month in sorted(month_totals)
        ]
    else:
        cash_out_timeline = []

    # ── 6. Breakdown by phase ────────────────────────────────────────────
    if dept_ids:
        phase_stmt = (
            select(
                CostItem.project_phase,
                func.coalesce(
                    func.sum(
                        case(
                            (CostItem.approval_status == ApprovalStatus.APPROVED, CostItem.current_amount),
                            else_=Decimal(0),
                        )
                    ),
                    ZERO,
                ).label("committed"),
                func.coalesce(
                    func.sum(
                        case(
                            (CostItem.approval_status.notin_(_INACTIVE_STATUSES), CostItem.current_amount),
                            else_=Decimal(0),
                        )
                    ),
                    ZERO,
                ).label("forecast"),
                func.count(CostItem.id).label("items"),
            )
            .join(WorkArea, CostItem.work_area_id == WorkArea.id)
            .where(
                WorkArea.department_id.in_(dept_ids),
                CostItem.project_phase.is_not(None),
            )
            .group_by(CostItem.project_phase)
            .order_by(CostItem.project_phase)
        )
        phase_result = await session.execute(phase_stmt)
        by_phase = [
            DashboardPhase(
                phase=row.project_phase.value if row.project_phase else "UNASSIGNED",
                committed=row.committed,
                forecast=row.forecast,
                items=row.items,
            )
            for row in phase_result.all()
        ]
    else:
        by_phase = []

    # ── 7. Breakdown by status ───────────────────────────────────────────
    if dept_ids:
        status_stmt = (
            select(
                CostItem.approval_status,
                func.count(CostItem.id).label("count"),
                func.coalesce(func.sum(CostItem.current_amount), ZERO).label("amount"),
            )
            .join(WorkArea, CostItem.work_area_id == WorkArea.id)
            .where(WorkArea.department_id.in_(dept_ids))
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
    if dept_ids:
        # Get all work_area IDs for this facility
        wa_ids_stmt = select(WorkArea.id).where(WorkArea.department_id.in_(dept_ids))
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
                        AuditLog.entity_type == "CostItem",
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
        departments=departments_out,
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
