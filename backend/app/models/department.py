"""Department model — belongs to a Facility, has many WorkAreas."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.budget_adjustment import BudgetAdjustment
    from app.models.facility import Facility
    from app.models.work_area import WorkArea


class Department(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "departments"

    facility_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    budget_total: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=True,
    )

    # relationships
    facility: Mapped[Facility] = relationship(back_populates="departments")
    work_areas: Mapped[list[WorkArea]] = relationship(
        back_populates="department",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    budget_adjustments: Mapped[list[BudgetAdjustment]] = relationship(
        back_populates="department",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Department id={self.id} name={self.name!r}>"
