"""Dashboard API — single endpoint that delivers all KPIs for a facility."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep
from app.db import get_session
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard import get_dashboard

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/{facility_id}", response_model=DashboardResponse)
async def dashboard(
    facility_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
) -> DashboardResponse:
    """Return all KPIs, department breakdowns, cash-out timeline, phase/status
    breakdowns, and recent changes for a facility — in a single call."""
    try:
        return await get_dashboard(session, facility_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
