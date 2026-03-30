from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func as sqlfunc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import UserDep, require_facility_access, require_role
from app.db import get_session
from app.models import FunctionalArea, WorkArea, CostItem
from app.schemas.work_area import WorkAreaCreate, WorkAreaRead, WorkAreaUpdate, WorkAreaWithItems
from app.services.audit import build_changes, log_change

router = APIRouter(prefix="/api/v1/work-areas", tags=["work-areas"])


@router.get("/", response_model=list[WorkAreaRead])
async def list_work_areas(
    user: UserDep,
    functional_area_id: UUID | None = None,
    facility_id: UUID | None = None,
    session: AsyncSession = Depends(get_session),
):
    if facility_id:
        await require_facility_access(facility_id, user, session)
    stmt = select(WorkArea).order_by(WorkArea.name)
    if functional_area_id:
        stmt = stmt.where(WorkArea.functional_area_id == functional_area_id)
    if facility_id:
        fa_ids = select(FunctionalArea.id).where(FunctionalArea.facility_id == facility_id)
        stmt = stmt.where(WorkArea.functional_area_id.in_(fa_ids))
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{work_area_id}", response_model=WorkAreaWithItems)
async def get_work_area(work_area_id: UUID, user: UserDep, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(WorkArea)
        .where(WorkArea.id == work_area_id)
        .options(selectinload(WorkArea.cost_items))
    )
    result = await session.execute(stmt)
    work_area = result.scalar_one_or_none()
    if not work_area:
        raise HTTPException(status_code=404, detail="Work area not found")
    fa = await session.get(FunctionalArea, work_area.functional_area_id)
    if fa:
        await require_facility_access(fa.facility_id, user, session)
    return work_area


@router.post("/", response_model=WorkAreaRead, status_code=201, dependencies=[Depends(require_role("admin", "editor"))])
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


@router.put("/{work_area_id}", response_model=WorkAreaRead, dependencies=[Depends(require_role("admin", "editor"))])
async def update_work_area(
    work_area_id: UUID,
    data: WorkAreaUpdate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    work_area = await session.get(WorkArea, work_area_id)
    if not work_area:
        raise HTTPException(status_code=404, detail="Work area not found")
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return work_area
    old_values = {k: getattr(work_area, k) for k in update_data}
    for key, value in update_data.items():
        setattr(work_area, key, value)
    changes = build_changes(old_values, update_data)
    if changes:
        await log_change(session, "work_area", work_area.id, "updated", changes=changes, user_id=user.email)
    await session.commit()
    await session.refresh(work_area)
    return work_area


@router.delete("/{work_area_id}", status_code=204, dependencies=[Depends(require_role("admin", "editor"))])
async def delete_work_area(
    work_area_id: UUID,
    user: UserDep,
    force: bool = Query(False, description="Force deletion even if work area has cost items"),
    session: AsyncSession = Depends(get_session),
):
    work_area = await session.get(WorkArea, work_area_id)
    if not work_area:
        raise HTTPException(status_code=404, detail="Work area not found")
    if not force:
        item_count_result = await session.execute(
            select(sqlfunc.count(CostItem.id)).where(CostItem.work_area_id == work_area_id)
        )
        item_count = item_count_result.scalar_one()
        if item_count > 0:
            raise HTTPException(
                status_code=409,
                detail=f"Work area contains {item_count} cost item(s). Pass force=true to confirm deletion.",
            )
    work_area_id_copy = work_area.id
    await session.delete(work_area)
    await log_change(session, "work_area", work_area_id_copy, "deleted", user_id=user.email)
    await session.commit()
