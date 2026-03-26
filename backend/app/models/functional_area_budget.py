"""FunctionalAreaBudget model — yearly budget entries for functional areas."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.functional_area import FunctionalArea


class FunctionalAreaBudget(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Yearly budget entry for a functional area.

    Budget for a year = FunctionalAreaBudget.amount
        + SUM(change_costs WHERE functional_area_id AND year AND budget_relevant)
    """

    __tablename__ = "functional_area_budgets"

    functional_area_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("functional_areas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    year: Mapped[int] = mapped_column(Integer, nullable=False)

    amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
    )

    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "functional_area_id", "year", name="uq_fa_budget_year"
        ),
    )

    # relationships
    functional_area: Mapped[FunctionalArea] = relationship(
        back_populates="budgets"
    )

    def __repr__(self) -> str:
        return (
            f"<FunctionalAreaBudget id={self.id} "
            f"functional_area_id={self.functional_area_id} "
            f"year={self.year} amount={self.amount}>"
        )
