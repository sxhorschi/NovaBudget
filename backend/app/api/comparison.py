"""Comparison API — side-by-side KPIs for multiple facilities and departments."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep
from app.db import get_session
from app.models import Facility
from app.services.aggregation import get_department_kpis, get_facility_kpis

router = APIRouter(prefix="/api/v1/compare", tags=["comparison"])


# ── Response schemas ────────────────────────────────────────────────────


class FacilityComparisonEntry(BaseModel):
    """Flat KPI summary for one facility in a comparison view."""

    model_config = ConfigDict(from_attributes=True)

    facility_id: UUID
    name: str
    budget: Decimal
    committed: Decimal
    forecast: Decimal
    remaining: Decimal
    department_count: int
    item_count: int


class FacilityComparisonResponse(BaseModel):
    facilities: list[FacilityComparisonEntry]


class DepartmentComparisonEntry(BaseModel):
    """KPIs for one department within a specific facility."""

    model_config = ConfigDict(from_attributes=True)

    facility_id: UUID
    facility_name: str
    department_name: str
    budget: Decimal
    committed: Decimal
    forecast: Decimal
    remaining: Decimal
    item_count: int


class DepartmentComparisonResponse(BaseModel):
    departments: list[DepartmentComparisonEntry]


# ── Endpoints ───────────────────────────────────────────────────────────


@router.get("/facilities", response_model=FacilityComparisonResponse)
async def compare_facilities(
    ids: str = Query(
        ...,
        description="Comma-separated facility UUIDs to compare",
        examples=["uuid1,uuid2"],
    ),
    session: AsyncSession = Depends(get_session),
    *,
    user: UserDep,
) -> FacilityComparisonResponse:
    """Return side-by-side KPIs for the requested facilities."""

    raw_ids = [s.strip() for s in ids.split(",") if s.strip()]
    if len(raw_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two facility IDs are required for comparison.",
        )

    # Validate UUIDs
    try:
        facility_ids = [UUID(fid) for fid in raw_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="One or more IDs are not valid UUIDs.")

    # Fetch facilities to get names/status
    result = await session.execute(
        select(Facility).where(Facility.id.in_(facility_ids))
    )
    facilities_by_id = {f.id: f for f in result.scalars().all()}

    # Check that all requested facilities exist
    missing = [str(fid) for fid in facility_ids if fid not in facilities_by_id]
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Facilities not found: {', '.join(missing)}",
        )

    # Compute KPIs for each facility
    entries: list[FacilityComparisonEntry] = []
    for fid in facility_ids:
        facility = facilities_by_id[fid]
        kpi = await get_facility_kpis(fid, session)
        entries.append(
            FacilityComparisonEntry(
                facility_id=fid,
                name=facility.name,
                budget=kpi.budget,
                committed=kpi.committed,
                forecast=kpi.forecast,
                remaining=kpi.remaining,
                department_count=kpi.department_count,
                item_count=kpi.item_count,
            )
        )

    return FacilityComparisonResponse(facilities=entries)


@router.get("/departments", response_model=DepartmentComparisonResponse)
async def compare_departments(
    facility_ids: str = Query(
        ...,
        description="Comma-separated facility UUIDs",
        examples=["uuid1,uuid2"],
    ),
    names: str = Query(
        ...,
        description="Comma-separated department names to match across facilities",
        examples=["Assembly,Testing"],
    ),
    session: AsyncSession = Depends(get_session),
    *,
    user: UserDep,
) -> DepartmentComparisonResponse:
    """Match departments by name across facilities and return per-department KPIs."""

    raw_ids = [s.strip() for s in facility_ids.split(",") if s.strip()]
    if len(raw_ids) < 1:
        raise HTTPException(
            status_code=400,
            detail="At least one facility ID is required.",
        )

    dept_names = [n.strip() for n in names.split(",") if n.strip()]
    if not dept_names:
        raise HTTPException(
            status_code=400,
            detail="At least one department name is required.",
        )

    # Validate UUIDs
    try:
        parsed_ids = [UUID(fid) for fid in raw_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="One or more IDs are not valid UUIDs.")

    # Fetch facilities
    result = await session.execute(
        select(Facility).where(Facility.id.in_(parsed_ids))
    )
    facilities_by_id = {f.id: f for f in result.scalars().all()}

    missing = [str(fid) for fid in parsed_ids if fid not in facilities_by_id]
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Facilities not found: {', '.join(missing)}",
        )

    # Normalize requested names for case-insensitive matching
    names_lower = {n.lower() for n in dept_names}

    entries: list[DepartmentComparisonEntry] = []
    for fid in parsed_ids:
        facility = facilities_by_id[fid]
        dept_kpis = await get_department_kpis(fid, session)

        for dk in dept_kpis:
            if dk.department_name.lower() in names_lower:
                entries.append(
                    DepartmentComparisonEntry(
                        facility_id=fid,
                        facility_name=facility.name,
                        department_name=dk.department_name,
                        budget=dk.budget,
                        committed=dk.committed,
                        forecast=dk.forecast,
                        remaining=dk.remaining,
                        item_count=dk.item_count,
                    )
                )

    return DepartmentComparisonResponse(departments=entries)
