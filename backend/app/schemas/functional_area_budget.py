"""Pydantic schemas for FunctionalAreaBudget CRUD."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FunctionalAreaBudgetCreate(BaseModel):
    year: int
    amount: Decimal
    comment: str | None = None


class FunctionalAreaBudgetUpdate(BaseModel):
    year: int | None = None
    amount: Decimal | None = None
    comment: str | None = None


class FunctionalAreaBudgetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    functional_area_id: UUID
    year: int
    amount: Decimal
    comment: str | None = None
    created_at: datetime
    updated_at: datetime
