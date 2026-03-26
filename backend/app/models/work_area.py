"""WorkArea model — belongs to a FunctionalArea, has many CostItems."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.cost_item import CostItem
    from app.models.functional_area import FunctionalArea


class WorkArea(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "work_areas"

    functional_area_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("functional_areas.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # relationships
    functional_area: Mapped[FunctionalArea] = relationship(back_populates="work_areas")
    cost_items: Mapped[list[CostItem]] = relationship(
        back_populates="work_area",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<WorkArea id={self.id} name={self.name!r}>"
