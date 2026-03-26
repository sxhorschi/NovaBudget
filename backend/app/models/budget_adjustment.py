"""BudgetAdjustment model — immutable budget target adjustments (Zielanpassungen)."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin
from app.models.enums import AdjustmentCategory, AdjustmentCategoryType

if TYPE_CHECKING:
    from app.models.functional_area import FunctionalArea


class BudgetAdjustment(UUIDPrimaryKeyMixin, Base):
    """Immutable budget adjustment record.

    Each row represents a single, auditable change to a functional area's budget
    target.  Rows are append-only — no updates or deletes are allowed by the
    API layer.
    """

    __tablename__ = "budget_adjustments"

    functional_area_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("functional_areas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Financial: positive = budget increase, negative = budget decrease
    amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(Text, nullable=False)

    category: Mapped[AdjustmentCategory] = mapped_column(
        AdjustmentCategoryType,
        nullable=False,
    )

    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Only created_at — no updated_at (immutable!)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )

    # relationships
    functional_area: Mapped[FunctionalArea] = relationship(back_populates="budget_adjustments")

    def __repr__(self) -> str:
        return (
            f"<BudgetAdjustment id={self.id} functional_area_id={self.functional_area_id} "
            f"amount={self.amount} category={self.category.value}>"
        )
