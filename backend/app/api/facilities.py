from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models import Facility
from app.schemas.facility import FacilityCreate, FacilityRead
from app.services.audit import build_changes, log_change

router = APIRouter(prefix="/api/v1/facilities", tags=["facilities"])


@router.get("/", response_model=list[FacilityRead])
async def list_facilities(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Facility).order_by(Facility.name))
    return result.scalars().all()


@router.get("/{facility_id}", response_model=FacilityRead)
async def get_facility(facility_id: UUID, session: AsyncSession = Depends(get_session)):
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


@router.post("/", response_model=FacilityRead, status_code=201)
async def create_facility(
    data: FacilityCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    facility = Facility(**data.model_dump())
    session.add(facility)
    await session.flush()
    await log_change(session, "facility", facility.id, "created", user_id=user.email)
    await session.commit()
    await session.refresh(facility)
    return facility


@router.put("/{facility_id}", response_model=FacilityRead)
async def update_facility(
    facility_id: UUID,
    data: FacilityCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    update_data = data.model_dump()
    old_values = {k: getattr(facility, k) for k in update_data}
    for key, value in update_data.items():
        setattr(facility, key, value)
    changes = build_changes(old_values, update_data)
    if changes:
        await log_change(session, "facility", facility.id, "updated", changes=changes, user_id=user.email)
    await session.commit()
    await session.refresh(facility)
    return facility


@router.delete("/{facility_id}", status_code=204)
async def delete_facility(
    facility_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    facility_id_copy = facility.id
    await session.delete(facility)
    await log_change(session, "facility", facility_id_copy, "deleted", user_id=user.email)
    await session.commit()
