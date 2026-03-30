"""Summary / KPI API endpoints.

New endpoints (Otto v4):
- GET /api/v1/summary/facilities/{id}/kpis              → FacilityKPI
- GET /api/v1/summary/facilities/{id}/functional-areas   → list[FunctionalAreaKPI]
- GET /api/v1/summary/facilities/{id}/cash-out           → list[CashOutMonth]
- GET /api/v1/summary/facilities/{id}/phases             → list[PhaseBreakdown]
- GET /api/v1/summary/facilities/{id}/pipeline           → list[ApprovalPipelineEntry]

Legacy endpoints (deprecated, kept for backward compat):
- GET /api/v1/summary/budget
- GET /api/v1/summary/functional-areas
- GET /api/v1/summary/cash-out
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_facility_access
from app.db import get_session
from app.schemas.summary import (
    ApprovalPipelineEntry,
    BudgetSummary,
    CashOutEntry,
    CashOutMonth,
    FunctionalAreaKPI,
    FunctionalAreaSummary,
    FacilityKPI,
    PhaseBreakdown,
)
from app.services.aggregation import (
    get_approval_pipeline,
    get_budget_summary,
    get_cash_out_forecast,
    get_cash_out_timeline,
    get_functional_area_kpis,
    get_functional_area_kpis_by_year,
    get_functional_area_summaries,
    get_facility_kpis,
    get_phase_breakdown,
)

router = APIRouter(prefix="/api/v1/summary", tags=["summary"])
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# New facility-scoped KPI endpoints (Otto v4)
# ═══════════════════════════════════════════════════════════════════════════


@router.get(
    "/facilities/{facility_id}/kpis",
    response_model=FacilityKPI,
    summary="Facility KPIs — budget, committed, forecast, remaining per facility",
)
async def facility_kpis(
    facility_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    await require_facility_access(facility_id, user, session)
    try:
        return await get_facility_kpis(facility_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get(
    "/facilities/{facility_id}/functional-areas",
    response_model=list[FunctionalAreaKPI],
    summary="Functional Area KPIs — per-functional-area breakdown for a facility",
)
async def functional_area_kpis(
    facility_id: UUID,
    user: UserDep,
    year: int | None = Query(default=None, ge=2000, le=2100),
    session: AsyncSession = Depends(get_session),
):
    await require_facility_access(facility_id, user, session)
    try:
        if year is not None:
            return await get_functional_area_kpis_by_year(facility_id, year, session)
        return await get_functional_area_kpis(facility_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get(
    "/facilities/{facility_id}/cash-out",
    response_model=list[CashOutMonth],
    summary="Monthly cash-out forecast, split by functional area",
)
async def cash_out_forecast(
    facility_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    await require_facility_access(facility_id, user, session)
    try:
        return await get_cash_out_forecast(facility_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get(
    "/facilities/{facility_id}/phases",
    response_model=list[PhaseBreakdown],
    summary="Phase breakdown — committed, forecast, item count per project phase",
)
async def phase_breakdown(
    facility_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    await require_facility_access(facility_id, user, session)
    try:
        return await get_phase_breakdown(facility_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get(
    "/facilities/{facility_id}/pipeline",
    response_model=list[ApprovalPipelineEntry],
    summary="Approval pipeline — EUR value and count per approval status",
)
async def approval_pipeline(
    facility_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    await require_facility_access(facility_id, user, session)
    try:
        return await get_approval_pipeline(facility_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ═══════════════════════════════════════════════════════════════════════════
# Legacy endpoints (deprecated — use facility-scoped endpoints above)
# ═══════════════════════════════════════════════════════════════════════════


@router.get(
    "/budget",
    response_model=BudgetSummary,
    summary="[DEPRECATED] Global budget summary",
    deprecated=True,
)
async def budget_summary(user: UserDep, session: AsyncSession = Depends(get_session)):
    return await get_budget_summary(session)


@router.get(
    "/functional-areas",
    response_model=list[FunctionalAreaSummary],
    summary="[DEPRECATED] Global functional area summaries",
    deprecated=True,
)
async def functional_area_summaries(user: UserDep, session: AsyncSession = Depends(get_session)):
    return await get_functional_area_summaries(session)


@router.get(
    "/cash-out",
    response_model=list[CashOutEntry],
    summary="[DEPRECATED] Global cash-out timeline",
    deprecated=True,
)
async def cash_out_timeline(user: UserDep, session: AsyncSession = Depends(get_session)):
    return await get_cash_out_timeline(session)
