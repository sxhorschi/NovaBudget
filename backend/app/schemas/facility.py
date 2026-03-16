from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FacilityCreate(BaseModel):
    name: str
    location: str | None = None
    description: str | None = None


class FacilityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    location: str | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime
