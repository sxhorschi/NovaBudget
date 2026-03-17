"""Shared guard utilities for API endpoints.

Provides helpers to enforce business rules like facility read-only status.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.models.enums import FacilityStatus
from app.models.facility import Facility
from app.models.work_area import WorkArea

_READ_ONLY_STATUSES = {FacilityStatus.COMPLETED, FacilityStatus.ARCHIVED}


async def ensure_facility_writable(session: AsyncSession, facility_id: UUID) -> None:
    """Raise 403 if the facility is COMPLETED or ARCHIVED (read-only)."""
    facility = await session.get(Facility, facility_id)
    if facility is None:
        raise HTTPException(status_code=404, detail="Facility not found")
    if facility.status in _READ_ONLY_STATUSES:
        raise HTTPException(
            status_code=403,
            detail=f"This facility is {facility.status.value.lower()} and read-only. "
            "Modifications are not allowed.",
        )


async def ensure_facility_writable_for_department(
    session: AsyncSession, department_id: UUID
) -> None:
    """Look up the facility via department and raise 403 if read-only."""
    stmt = (
        select(Department.facility_id)
        .where(Department.id == department_id)
    )
    result = await session.execute(stmt)
    facility_id = result.scalar_one_or_none()
    if facility_id is None:
        raise HTTPException(status_code=404, detail="Department not found")
    await ensure_facility_writable(session, facility_id)


async def ensure_facility_writable_for_work_area(
    session: AsyncSession, work_area_id: UUID
) -> None:
    """Look up the facility via work_area -> department and raise 403 if read-only."""
    stmt = (
        select(Department.facility_id)
        .join(WorkArea, WorkArea.department_id == Department.id)
        .where(WorkArea.id == work_area_id)
    )
    result = await session.execute(stmt)
    facility_id = result.scalar_one_or_none()
    if facility_id is None:
        raise HTTPException(status_code=404, detail="Work area not found")
    await ensure_facility_writable(session, facility_id)


async def ensure_facility_writable_for_cost_item_by_work_area(
    session: AsyncSession, work_area_id: UUID
) -> None:
    """Check facility writability given a cost item's work_area_id."""
    await ensure_facility_writable_for_work_area(session, work_area_id)
