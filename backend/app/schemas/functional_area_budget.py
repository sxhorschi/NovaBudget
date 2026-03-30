"""Pydantic schemas for FunctionalAreaBudget CRUD."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FunctionalAreaBudgetCreate(BaseModel):
    year: int = Field(ge=2000, le=2100)
    amount: Decimal = Field(ge=0)
    comment: str | None = None


class FunctionalAreaBudgetUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, ge=0)
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
