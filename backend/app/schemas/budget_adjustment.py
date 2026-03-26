"""Pydantic schemas for BudgetAdjustment (Zielanpassung).

Only Create and Read — no Update schema, because adjustments are immutable.
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AdjustmentCategory


class BudgetAdjustmentCreate(BaseModel):
    """POST body for creating a new budget adjustment."""

    functional_area_id: UUID
    amount: Decimal = Field(..., description="Positive = budget increase, negative = decrease")
    reason: str = Field(..., min_length=1, description="Mandatory justification")
    category: AdjustmentCategory
    created_by: str | None = None


class BudgetAdjustmentRead(BaseModel):
    """GET response for a budget adjustment."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    functional_area_id: UUID
    amount: Decimal
    reason: str
    category: AdjustmentCategory
    created_by: str | None = None
    created_at: datetime
