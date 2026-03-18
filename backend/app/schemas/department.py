from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.work_area import WorkAreaRead


class DepartmentCreate(BaseModel):
    name: str
    facility_id: UUID
    budget_total: Decimal = Decimal("0")


class DepartmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    facility_id: UUID
    budget_total: Decimal | None = None
    created_at: datetime
    updated_at: datetime


class DepartmentWithWorkAreas(DepartmentRead):
    work_areas: list[WorkAreaRead] = []
