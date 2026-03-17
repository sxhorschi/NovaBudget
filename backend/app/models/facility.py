"""Facility model — top-level organizational unit."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    FacilityStatus,
    FacilityStatusType,
    FacilityType,
    FacilityTypeType,
)

if TYPE_CHECKING:
    from app.models.department import Department


class Facility(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "facilities"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Lifecycle & classification fields ──────────────────────────────
    status: Mapped[FacilityStatus] = mapped_column(
        FacilityStatusType,
        nullable=False,
        default=FacilityStatus.PLANNING,
        server_default=FacilityStatus.PLANNING.value,
    )
    facility_type: Mapped[FacilityType] = mapped_column(
        FacilityTypeType,
        nullable=False,
        default=FacilityType.PRODUCTION,
        server_default=FacilityType.PRODUCTION.value,
    )
    source_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="SET NULL"),
        nullable=True,
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completion_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    # ── Relationships ──────────────────────────────────────────────────
    departments: Mapped[list[Department]] = relationship(
        back_populates="facility",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    source_facility: Mapped[Facility | None] = relationship(
        remote_side="Facility.id",
        foreign_keys=[source_facility_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Facility id={self.id} name={self.name!r} status={self.status.value}>"
