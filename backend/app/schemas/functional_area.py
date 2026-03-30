from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.functional_area_budget import FunctionalAreaBudgetRead
from app.schemas.work_area import WorkAreaRead


class FunctionalAreaCreate(BaseModel):
    name: str
    facility_id: UUID


class FunctionalAreaUpdate(BaseModel):
    name: str | None = None


class FunctionalAreaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    facility_id: UUID
    budgets: list[FunctionalAreaBudgetRead] = []
    created_at: datetime
    updated_at: datetime


class FunctionalAreaWithWorkAreas(FunctionalAreaRead):
    work_areas: list[WorkAreaRead] = []
