from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models import Facility
from app.schemas.facility import (
    FacilityCreate,
    FacilityRead,
    FacilityUpdate,
)
from app.schemas.transfer import CloneFacilityRequest
from app.services.audit import build_changes, log_change
from app.services.facility_ops import clone_facility

router = APIRouter(prefix="/api/v1/facilities", tags=["facilities"])


@router.get("/", response_model=list[FacilityRead])
async def list_facilities(
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Facility).order_by(Facility.name)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{facility_id}", response_model=FacilityRead)
async def get_facility(facility_id: UUID, user: UserDep, session: AsyncSession = Depends(get_session)):
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


@router.post(
    "/",
    response_model=FacilityRead,
    status_code=201,
    dependencies=[Depends(require_role("admin", "editor"))],
)
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


@router.put(
    "/{facility_id}",
    response_model=FacilityRead,
    dependencies=[Depends(require_role("admin", "editor"))],
)
async def update_facility(
    facility_id: UUID,
    data: FacilityUpdate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return facility
    old_values = {k: getattr(facility, k) for k in update_data}
    for key, value in update_data.items():
        setattr(facility, key, value)
    changes = build_changes(old_values, update_data)
    if changes:
        await log_change(session, "facility", facility.id, "updated", changes=changes, user_id=user.email)
    await session.commit()
    await session.refresh(facility)
    return facility


@router.delete(
    "/{facility_id}",
    status_code=204,
    dependencies=[Depends(require_role("admin"))],
)
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


# ── Clone facility ─────────────────────────────────────────────────────

@router.post(
    "/{facility_id}/clone",
    response_model=FacilityRead,
    status_code=201,
    dependencies=[Depends(require_role("admin", "editor"))],
)
async def clone_facility_endpoint(
    facility_id: UUID,
    body: CloneFacilityRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Deep-clone a facility with all functional areas, work areas, and cost items."""
    try:
        new_facility = await clone_facility(
            session=session,
            source_id=facility_id,
            name=body.name,
            include_amounts=body.include_amounts,
            reset_statuses=body.reset_statuses,
            user_id=user.email,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    await log_change(
        session, "facility", new_facility.id, "cloned",
        changes={"source_facility_id": {"old": None, "new": str(facility_id)}},
        user_id=user.email,
    )
    await session.commit()
    await session.refresh(new_facility)
    return new_facility
