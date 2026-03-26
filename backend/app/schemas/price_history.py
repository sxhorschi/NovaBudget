"""Pydantic schemas for PriceHistory entries."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PriceHistoryRead(BaseModel):
    """Response schema for a single price history entry."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cost_item_id: UUID
    unit_price: Decimal
    quantity: Decimal
    total_amount: Decimal
    cost_basis: str
    comment: str | None = None
    created_by: str | None = None
    created_at: datetime


class PriceHistoryCreate(BaseModel):
    """Manual creation of a price history entry (internal use)."""

    unit_price: Decimal = Field(ge=0, max_digits=15, decimal_places=2)
    quantity: Decimal = Field(ge=0, max_digits=15, decimal_places=2)
    total_amount: Decimal = Field(ge=0, max_digits=15, decimal_places=2)
    cost_basis: str = Field(max_length=50)
    comment: str | None = Field(default=None, max_length=2000)
    created_by: str | None = Field(default=None, max_length=255)
