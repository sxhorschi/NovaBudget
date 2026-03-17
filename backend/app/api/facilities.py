from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models import Facility
from app.models.enums import FacilityStatus
from app.schemas.facility import (
    FacilityCreate,
    FacilityRead,
    FacilityStatusChange,
    FacilityUpdate,
)
from app.schemas.transfer import CloneFacilityRequest
from app.services.audit import build_changes, log_change
from app.services.facility_ops import clone_facility

router = APIRouter(prefix="/api/v1/facilities", tags=["facilities"])

# ── Valid status transitions ────────────────────────────────────────────
_ALLOWED_TRANSITIONS: dict[FacilityStatus, set[FacilityStatus]] = {
    FacilityStatus.PLANNING: {FacilityStatus.ACTIVE},
    FacilityStatus.ACTIVE: {FacilityStatus.COMPLETED},
    FacilityStatus.COMPLETED: {FacilityStatus.ARCHIVED},
    FacilityStatus.ARCHIVED: {FacilityStatus.COMPLETED},  # unarchive
}

# Statuses that make a facility read-only
_READ_ONLY_STATUSES = {FacilityStatus.COMPLETED, FacilityStatus.ARCHIVED}


@router.get("/", response_model=list[FacilityRead])
async def list_facilities(
    status: FacilityStatus | None = Query(None, description="Filter by facility status"),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Facility).order_by(Facility.sort_order, Facility.name)
    if status is not None:
        stmt = stmt.where(Facility.status == status)
    result = await session.execute(stmt)
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


# ── Lifecycle: status transitions ───────────────────────────────────────

@router.patch("/{facility_id}/status", response_model=FacilityRead)
async def change_facility_status(
    facility_id: UUID,
    body: FacilityStatusChange,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Change facility lifecycle status with enforced transition rules.

    Valid transitions:
      PLANNING  -> ACTIVE
      ACTIVE    -> COMPLETED
      COMPLETED -> ARCHIVED
      ARCHIVED  -> COMPLETED  (unarchive)
    """
    facility = await session.get(Facility, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    current = facility.status
    target = body.status

    if target == current:
        return facility  # no-op

    allowed = _ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Invalid status transition: {current.value} -> {target.value}. "
                f"Allowed transitions from {current.value}: "
                f"{', '.join(s.value for s in sorted(allowed, key=lambda s: s.value)) if allowed else 'none'}."
            ),
        )

    old_status = facility.status

    facility.status = target

    # Set archived_at timestamp when archiving; clear when unarchiving
    if target == FacilityStatus.ARCHIVED:
        facility.archived_at = datetime.now(timezone.utc)
    elif current == FacilityStatus.ARCHIVED and target != FacilityStatus.ARCHIVED:
        facility.archived_at = None

    changes = build_changes(
        {"status": old_status},
        {"status": target},
    )
    if changes:
        await log_change(
            session, "facility", facility.id, "status_changed",
            changes=changes, user_id=user.email,
        )
    await session.commit()
    await session.refresh(facility)
    return facility


# ── Clone facility ─────────────────────────────────────────────────────

@router.post("/{facility_id}/clone", response_model=FacilityRead, status_code=201)
async def clone_facility_endpoint(
    facility_id: UUID,
    body: CloneFacilityRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Deep-clone a facility with all departments, work areas, and cost items.

    The new facility is created with status=PLANNING and a reference back
    to the source via source_facility_id.
    """
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
