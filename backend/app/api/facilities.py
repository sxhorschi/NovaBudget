from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Facility
from app.schemas.facility import FacilityCreate, FacilityRead

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
async def create_facility(data: FacilityCreate, session: AsyncSession = Depends(get_session)):
    facility = Facility(**data.model_dump())
    session.add(facility)
    await session.commit()
    await session.refresh(facility)
    return facility


@router.put("/{facility_id}", response_model=FacilityRead)
async def update_facility(
    facility_id: UUID, data: FacilityCreate, session: AsyncSession = Depends(get_session)
):
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    for key, value in data.model_dump().items():
        setattr(facility, key, value)
    await session.commit()
    await session.refresh(facility)
    return facility


@router.delete("/{facility_id}", status_code=204)
async def delete_facility(facility_id: UUID, session: AsyncSession = Depends(get_session)):
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    await session.delete(facility)
    await session.commit()
