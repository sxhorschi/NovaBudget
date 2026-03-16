"""Export API endpoints for standard, finance, and steering committee Excel reports."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.enums import ProjectPhase
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
async def export_standard(
    facility_id: UUID,
    dept: str | None = Query(None, description="Comma-separated department UUIDs"),
    phase: str | None = Query(None, description="Project phase filter, e.g. PHASE_1"),
    session: AsyncSession = Depends(get_session),
):
    """Export filtered cost items as Excel with one sheet per department."""

    dept_ids: list[UUID] | None = None
    if dept:
        try:
            dept_ids = [UUID(d.strip()) for d in dept.split(",") if d.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid department UUID(s)")

    phase_filter: ProjectPhase | None = None
    if phase:
        try:
            phase_filter = ProjectPhase(phase.strip().upper())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid phase: {phase}")

    content = await generate_standard_export(
        session, facility_id, department_ids=dept_ids, phase=phase_filter,
    )

    today = date.today().strftime("%Y%m%d")
    return _xlsx_response(content, f"costbook_export_{today}.xlsx")


@router.get("/finance")
async def export_finance(
    facility_id: UUID,
    budget_factor: float = Query(0.85, description="Budget reserve factor (default 0.85)"),
    session: AsyncSession = Depends(get_session),
):
    """Export BudgetTemplate-format Excel for Finance."""

    content = await generate_finance_export(
        session, facility_id, budget_factor=Decimal(str(budget_factor)),
    )

    today = date.today().strftime("%Y%m%d")
    return _xlsx_response(content, f"budget_template_{today}.xlsx")


@router.get("/steering-committee")
async def export_steering_committee(
    facility_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Export one-page steering committee summary."""

    content = await generate_steering_committee_export(session, facility_id)

    today = date.today().strftime("%Y%m%d")
    return _xlsx_response(content, f"steering_committee_{today}.xlsx")
