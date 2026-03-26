from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.cost_item import CostItemRead


class WorkAreaCreate(BaseModel):
    name: str
    functional_area_id: UUID


class WorkAreaUpdate(BaseModel):
    name: str | None = None


class WorkAreaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    functional_area_id: UUID
    created_at: datetime
    updated_at: datetime


class WorkAreaWithItems(WorkAreaRead):
    cost_items: list[CostItemRead] = []
