"""Export API endpoints for standard, finance, and steering committee Excel reports."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_facility_access
from app.db import get_session
from app.rate_limit import limiter
from app.services.excel_export import (
    DEFAULT_BUDGET_FACTOR,
    generate_finance_export,
    generate_standard_export,
    generate_steering_committee_export,
)

router = APIRouter(prefix="/api/v1/export", tags=["export"])

_XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _xlsx_response(content: bytes, filename: str) -> Response:
    return Response(
        content=content,
        media_type=_XLSX_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/standard")
@limiter.limit("10/minute")
async def export_standard(
    request: Request,
    facility_id: UUID,
    user: UserDep,
    fa: str | None = Query(None, description="Comma-separated functional area UUIDs"),
    phase: str | None = Query(None, description="Project phase filter, e.g. PHASE_1"),
    session: AsyncSession = Depends(get_session),
):
    """Export filtered cost items as Excel with one sheet per functional area."""
    await require_facility_access(facility_id, user, session)

    fa_ids: list[UUID] | None = None
    if fa:
        try:
            fa_ids = [UUID(d.strip()) for d in fa.split(",") if d.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid functional area UUID(s)")

    phase_filter: str | None = None
    if phase:
        phase_filter = phase.strip()

    try:
        content, filename = await generate_standard_export(
            session, facility_id, functional_area_ids=fa_ids, phase=phase_filter,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return _xlsx_response(content, filename)


@router.get("/finance")
@limiter.limit("10/minute")
async def export_finance(
    request: Request,
    facility_id: UUID,
    user: UserDep,
    budget_factor: float = Query(0.85, description="Budget reserve factor (default 0.85)"),
    session: AsyncSession = Depends(get_session),
):
    """Export BudgetTemplate-format Excel for Finance."""
    await require_facility_access(facility_id, user, session)

    try:
        content, filename = await generate_finance_export(
            session, facility_id, budget_factor=Decimal(str(budget_factor)),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return _xlsx_response(content, filename)


@router.get("/steering-committee")
@limiter.limit("10/minute")
async def export_steering_committee(
    request: Request,
    facility_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Export one-page steering committee summary."""
    await require_facility_access(facility_id, user, session)

    try:
        content, filename = await generate_steering_committee_export(session, facility_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return _xlsx_response(content, filename)
