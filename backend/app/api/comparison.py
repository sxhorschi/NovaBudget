"""Comparison API — side-by-side KPIs for multiple facilities and functional areas."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_facility_access
from app.db import get_session
from app.models import Facility
from app.services.aggregation import get_functional_area_kpis, get_facility_kpis

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
    functional_area_count: int
    item_count: int


class FacilityComparisonResponse(BaseModel):
    facilities: list[FacilityComparisonEntry]


class FunctionalAreaComparisonEntry(BaseModel):
    """KPIs for one functional area within a specific facility."""

    model_config = ConfigDict(from_attributes=True)

    facility_id: UUID
    facility_name: str
    functional_area_name: str
    budget: Decimal
    committed: Decimal
    forecast: Decimal
    remaining: Decimal
    item_count: int


class FunctionalAreaComparisonResponse(BaseModel):
    functional_areas: list[FunctionalAreaComparisonEntry]


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

    # Check facility access for each requested facility
    for fid in facility_ids:
        await require_facility_access(fid, user, session)

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
                functional_area_count=kpi.functional_area_count,
                item_count=kpi.item_count,
            )
        )

    return FacilityComparisonResponse(facilities=entries)


@router.get("/functional-areas", response_model=FunctionalAreaComparisonResponse)
async def compare_functional_areas(
    facility_ids: str = Query(
        ...,
        description="Comma-separated facility UUIDs",
        examples=["uuid1,uuid2"],
    ),
    names: str = Query(
        ...,
        description="Comma-separated functional area names to match across facilities",
        examples=["Assembly,Testing"],
    ),
    session: AsyncSession = Depends(get_session),
    *,
    user: UserDep,
) -> FunctionalAreaComparisonResponse:
    """Match functional areas by name across facilities and return per-functional-area KPIs."""

    raw_ids = [s.strip() for s in facility_ids.split(",") if s.strip()]
    if len(raw_ids) < 1:
        raise HTTPException(
            status_code=400,
            detail="At least one facility ID is required.",
        )

    fa_names = [n.strip() for n in names.split(",") if n.strip()]
    if not fa_names:
        raise HTTPException(
            status_code=400,
            detail="At least one functional area name is required.",
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

    # Check facility access for each requested facility
    for fid in parsed_ids:
        await require_facility_access(fid, user, session)

    # Normalize requested names for case-insensitive matching
    names_lower = {n.lower() for n in fa_names}

    entries: list[FunctionalAreaComparisonEntry] = []
    for fid in parsed_ids:
        facility = facilities_by_id[fid]
        fa_kpis = await get_functional_area_kpis(fid, session)

        for fk in fa_kpis:
            if fk.functional_area_name.lower() in names_lower:
                entries.append(
                    FunctionalAreaComparisonEntry(
                        facility_id=fid,
                        facility_name=facility.name,
                        functional_area_name=fk.functional_area_name,
                        budget=fk.budget,
                        committed=fk.committed,
                        forecast=fk.forecast,
                        remaining=fk.remaining,
                        item_count=fk.item_count,
                    )
                )

    return FunctionalAreaComparisonResponse(functional_areas=entries)
