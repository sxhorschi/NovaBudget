"""FunctionalArea model — belongs to a Facility, has many WorkAreas."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.change_cost import ChangeCost
    from app.models.facility import Facility
    from app.models.functional_area_budget import FunctionalAreaBudget
    from app.models.work_area import WorkArea


class FunctionalArea(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "functional_areas"

    facility_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    budget_total: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
        default=Decimal("0"),
        server_default="0",
    )

    # relationships
    facility: Mapped[Facility] = relationship(back_populates="functional_areas")
    work_areas: Mapped[list[WorkArea]] = relationship(
        back_populates="functional_area",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    change_costs: Mapped[list[ChangeCost]] = relationship(
        back_populates="functional_area",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    budgets: Mapped[list[FunctionalAreaBudget]] = relationship(
        back_populates="functional_area",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<FunctionalArea id={self.id} name={self.name!r}>"
