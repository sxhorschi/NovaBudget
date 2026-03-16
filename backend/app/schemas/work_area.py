from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.cost_item import CostItemRead


class WorkAreaCreate(BaseModel):
    name: str
    department_id: UUID


class WorkAreaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    department_id: UUID
    created_at: datetime
    updated_at: datetime


class WorkAreaWithItems(WorkAreaRead):
    cost_items: list[CostItemRead] = []
