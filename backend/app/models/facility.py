"""Facility model — top-level organizational unit."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.functional_area import FunctionalArea


class Facility(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "facilities"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relationships ──────────────────────────────────────────────────
    functional_areas: Mapped[list[FunctionalArea]] = relationship(
        back_populates="facility",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Facility id={self.id} name={self.name!r}>"
