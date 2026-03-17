from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import UserDep
from app.db import get_session
from app.models import WorkArea, CostItem
from app.schemas.work_area import WorkAreaCreate, WorkAreaRead, WorkAreaWithItems
from app.services.audit import build_changes, log_change

router = APIRouter(prefix="/api/v1/work-areas", tags=["work-areas"])


@router.get("/", response_model=list[WorkAreaRead])
async def list_work_areas(
    department_id: UUID | None = None, session: AsyncSession = Depends(get_session)
):
    stmt = select(WorkArea).order_by(WorkArea.name)
    if department_id:
        stmt = stmt.where(WorkArea.department_id == department_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{work_area_id}", response_model=WorkAreaWithItems)
async def get_work_area(work_area_id: UUID, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(WorkArea)
        .where(WorkArea.id == work_area_id)
        .options(selectinload(WorkArea.cost_items))
    )
    result = await session.execute(stmt)
    work_area = result.scalar_one_or_none()
    if not work_area:
        raise HTTPException(status_code=404, detail="Work area not found")
    return work_area


@router.post("/", response_model=WorkAreaRead, status_code=201)
async def create_work_area(
    data: WorkAreaCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    work_area = WorkArea(**data.model_dump())
    session.add(work_area)
    await session.flush()
    await log_change(session, "work_area", work_area.id, "created", user_id=user.email)
    await session.commit()
    await session.refresh(work_area)
    return work_area


@router.put("/{work_area_id}", response_model=WorkAreaRead)
async def update_work_area(
    work_area_id: UUID,
    data: WorkAreaCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    work_area = await session.get(WorkArea, work_area_id)
    if not work_area:
        raise HTTPException(status_code=404, detail="Work area not found")
    update_data = data.model_dump()
    old_values = {k: getattr(work_area, k) for k in update_data}
    for key, value in update_data.items():
        setattr(work_area, key, value)
    changes = build_changes(old_values, update_data)
    if changes:
        await log_change(session, "work_area", work_area.id, "updated", changes=changes, user_id=user.email)
    await session.commit()
    await session.refresh(work_area)
    return work_area


@router.delete("/{work_area_id}", status_code=204)
async def delete_work_area(
    work_area_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    work_area = await session.get(WorkArea, work_area_id)
    if not work_area:
        raise HTTPException(status_code=404, detail="Work area not found")
    work_area_id_copy = work_area.id
    await session.delete(work_area)
    await log_change(session, "work_area", work_area_id_copy, "deleted", user_id=user.email)
    await session.commit()
