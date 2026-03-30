from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import UserDep, require_role
from app.db import get_session
from app.models import FunctionalArea, WorkArea
from app.schemas.functional_area import FunctionalAreaCreate, FunctionalAreaRead, FunctionalAreaUpdate, FunctionalAreaWithWorkAreas
from app.services.audit import build_changes, log_change

router = APIRouter(prefix="/api/v1/functional-areas", tags=["functional-areas"])


@router.get("/", response_model=list[FunctionalAreaRead])
async def list_functional_areas(
    _user: UserDep, facility_id: UUID | None = None, session: AsyncSession = Depends(get_session)
):
    stmt = select(FunctionalArea).order_by(FunctionalArea.name)
    if facility_id:
        stmt = stmt.where(FunctionalArea.facility_id == facility_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{functional_area_id}", response_model=FunctionalAreaWithWorkAreas)
async def get_functional_area(functional_area_id: UUID, _user: UserDep, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(FunctionalArea)
        .where(FunctionalArea.id == functional_area_id)
        .options(selectinload(FunctionalArea.work_areas))
    )
    result = await session.execute(stmt)
    functional_area = result.scalar_one_or_none()
    if not functional_area:
        raise HTTPException(status_code=404, detail="Functional area not found")
    return functional_area


@router.post("/", response_model=FunctionalAreaRead, status_code=201, dependencies=[Depends(require_role("admin", "editor"))])
async def create_functional_area(
    data: FunctionalAreaCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    functional_area = FunctionalArea(**data.model_dump())
    session.add(functional_area)
    await session.flush()
    await log_change(session, "functional_area", functional_area.id, "created", user_id=user.email)
    await session.commit()
    await session.refresh(functional_area)
    return functional_area


@router.put("/{functional_area_id}", response_model=FunctionalAreaRead, dependencies=[Depends(require_role("admin", "editor"))])
async def update_functional_area(
    functional_area_id: UUID,
    data: FunctionalAreaUpdate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    functional_area = await session.get(FunctionalArea, functional_area_id)
    if not functional_area:
        raise HTTPException(status_code=404, detail="Functional area not found")
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return functional_area
    old_values = {k: getattr(functional_area, k) for k in update_data}
    for key, value in update_data.items():
        setattr(functional_area, key, value)
    changes = build_changes(old_values, update_data)
    if changes:
        await log_change(session, "functional_area", functional_area.id, "updated", changes=changes, user_id=user.email)
    await session.commit()
    await session.refresh(functional_area)
    return functional_area


@router.delete("/{functional_area_id}", status_code=204, dependencies=[Depends(require_role("admin", "editor"))])
async def delete_functional_area(
    functional_area_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    functional_area = await session.get(FunctionalArea, functional_area_id)
    if not functional_area:
        raise HTTPException(status_code=404, detail="Functional area not found")
    functional_area_id_copy = functional_area.id
    await session.delete(functional_area)
    await log_change(session, "functional_area", functional_area_id_copy, "deleted", user_id=user.email)
    await session.commit()
