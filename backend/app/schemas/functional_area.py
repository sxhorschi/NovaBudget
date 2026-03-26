from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.work_area import WorkAreaRead


class FunctionalAreaCreate(BaseModel):
    name: str
    facility_id: UUID
    budget_total: Decimal = Decimal("0")


class FunctionalAreaUpdate(BaseModel):
    name: str | None = None
    budget_total: Decimal | None = None


class FunctionalAreaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    facility_id: UUID
    budget_total: Decimal | None = None
    created_at: datetime
    updated_at: datetime


class FunctionalAreaWithWorkAreas(FunctionalAreaRead):
    work_areas: list[WorkAreaRead] = []
