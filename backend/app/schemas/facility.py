from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import FacilityStatus, FacilityType


class FacilityCreate(BaseModel):
    name: str
    location: str | None = None
    description: str | None = None
    status: FacilityStatus = FacilityStatus.PLANNING
    facility_type: FacilityType = FacilityType.PRODUCTION
    source_facility_id: UUID | None = None
    start_date: date | None = None
    completion_date: date | None = None
    sort_order: int = 0


class FacilityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    location: str | None = None
    description: str | None = None
    status: FacilityStatus
    facility_type: FacilityType
    source_facility_id: UUID | None = None
    start_date: date | None = None
    completion_date: date | None = None
    archived_at: datetime | None = None
    sort_order: int
    created_at: datetime
    updated_at: datetime


class FacilityUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    description: str | None = None
    facility_type: FacilityType | None = None
    start_date: date | None = None
    completion_date: date | None = None
    sort_order: int | None = None


class FacilityStatusChange(BaseModel):
    """Request body for PATCH /facilities/{id}/status."""
    status: FacilityStatus
