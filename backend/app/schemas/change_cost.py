"""Pydantic schemas for ChangeCost (formerly BudgetAdjustment).

Only Create and Read — no Update schema, because change costs are immutable.
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AdjustmentCategory


class ChangeCostCreate(BaseModel):
    """POST body for creating a new change cost."""

    functional_area_id: UUID
    amount: Decimal = Field(..., description="Positive = budget increase, negative = decrease")
    reason: str = Field(..., min_length=1, description="Mandatory justification")
    category: AdjustmentCategory
    cost_driver: str = Field(..., min_length=1, max_length=50, description="Cost driver from config")
    budget_relevant: bool = Field(default=False, description="Whether this change cost affects budget calculation")
    year: int = Field(..., ge=2000, le=2100, description="Budget year this change cost affects")
    created_by: str | None = None


class ChangeCostRead(BaseModel):
    """GET response for a change cost."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    functional_area_id: UUID
    amount: Decimal
    reason: str
    category: AdjustmentCategory
    cost_driver: str
    budget_relevant: bool
    year: int
    created_by: str | None = None
    created_at: datetime
