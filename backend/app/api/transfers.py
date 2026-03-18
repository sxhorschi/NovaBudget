"""Transfer API — move/copy entities between facilities."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models.transfer_log import TransferLog
from app.schemas.transfer import (
    TransferCostItemsRequest,
    TransferDepartmentsRequest,
    TransferLogRead,
    TransferResult,
    TransferWorkAreasRequest,
)
from app.services.transfer import (
    transfer_cost_items,
    transfer_departments,
    transfer_work_areas,
)

router = APIRouter(prefix="/api/v1/transfers", tags=["transfers"])


# ── Transfer cost items ─────────────────────────────────────────────────


@router.post("/cost-items", response_model=TransferResult, status_code=201, dependencies=[Depends(require_role("admin", "editor"))])
async def transfer_cost_items_endpoint(
    data: TransferCostItemsRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Copy or move cost items to a target work area in another facility."""
    try:
        items = await transfer_cost_items(
            session=session,
            source_facility_id=data.source_facility_id,
            target_facility_id=data.target_facility_id,
            cost_item_ids=data.cost_item_ids,
            target_work_area_id=data.target_work_area_id,
            mode=data.mode,
            reset_status=data.reset_status,
            reset_amounts=data.reset_amounts,
            user=user.email,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await session.commit()

    # Fetch the logs we just created for this transfer
    logs = await _fetch_recent_logs(session, data.source_facility_id, data.target_facility_id, "cost_item", len(items))

    return TransferResult(
        transferred_count=len(items),
        transfer_mode=data.mode,
        entity_type="cost_item",
        logs=logs,
    )


# ── Transfer work areas ─────────────────────────────────────────────────


@router.post("/work-areas", response_model=TransferResult, status_code=201, dependencies=[Depends(require_role("admin", "editor"))])
async def transfer_work_areas_endpoint(
    data: TransferWorkAreasRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Copy or move work areas (with cost items) to a target department."""
    try:
        work_areas = await transfer_work_areas(
            session=session,
            source_facility_id=data.source_facility_id,
            target_facility_id=data.target_facility_id,
            work_area_ids=data.work_area_ids,
            target_department_id=data.target_department_id,
            mode=data.mode,
            reset_status=data.reset_status,
            reset_amounts=data.reset_amounts,
            user=user.email,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await session.commit()

    logs = await _fetch_recent_logs(session, data.source_facility_id, data.target_facility_id, "work_area", len(work_areas))

    return TransferResult(
        transferred_count=len(work_areas),
        transfer_mode=data.mode,
        entity_type="work_area",
        logs=logs,
    )


# ── Transfer departments ────────────────────────────────────────────────


@router.post("/departments", response_model=TransferResult, status_code=201, dependencies=[Depends(require_role("admin", "editor"))])
async def transfer_departments_endpoint(
    data: TransferDepartmentsRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Copy or move departments (with full hierarchy) to a target facility."""
    try:
        departments = await transfer_departments(
            session=session,
            source_facility_id=data.source_facility_id,
            target_facility_id=data.target_facility_id,
            department_ids=data.department_ids,
            mode=data.mode,
            reset_status=data.reset_status,
            reset_amounts=data.reset_amounts,
            user=user.email,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    await session.commit()

    logs = await _fetch_recent_logs(session, data.source_facility_id, data.target_facility_id, "department", len(departments))

    return TransferResult(
        transferred_count=len(departments),
        transfer_mode=data.mode,
        entity_type="department",
        logs=logs,
    )


# ── Transfer log (audit trail) ──────────────────────────────────────────


@router.get("/log", response_model=list[TransferLogRead])
async def get_transfer_log(
    source_facility_id: UUID | None = Query(None),
    target_facility_id: UUID | None = Query(None),
    entity_type: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """Retrieve transfer audit log, optionally filtered."""
    stmt = select(TransferLog).order_by(TransferLog.created_at.desc())

    if source_facility_id:
        stmt = stmt.where(TransferLog.source_facility_id == source_facility_id)
    if target_facility_id:
        stmt = stmt.where(TransferLog.target_facility_id == target_facility_id)
    if entity_type:
        stmt = stmt.where(TransferLog.entity_type == entity_type)

    stmt = stmt.offset(offset).limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()


# ── Helpers ──────────────────────────────────────────────────────────────


async def _fetch_recent_logs(
    session: AsyncSession,
    source_facility_id: UUID,
    target_facility_id: UUID,
    entity_type: str,
    limit: int,
) -> list[TransferLog]:
    """Fetch the most recent transfer log entries for a given transfer."""
    stmt = (
        select(TransferLog)
        .where(
            TransferLog.source_facility_id == source_facility_id,
            TransferLog.target_facility_id == target_facility_id,
            TransferLog.entity_type == entity_type,
        )
        .order_by(TransferLog.created_at.desc())
        .limit(max(limit, 1))
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
