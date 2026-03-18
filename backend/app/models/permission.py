"""FacilityPermission model — per-facility role assignments for users."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FacilityPermission(Base):
    __tablename__ = "facility_permissions"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=True,
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False,
    )  # admin, editor, viewer

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "facility_id", name="uq_user_facility_perm"),
    )

    def __repr__(self) -> str:
        return f"<FacilityPermission user={self.user_id} facility={self.facility_id} role={self.role}>"
