"""EntraGroupMapping model — maps Microsoft Entra ID groups to app roles."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EntraGroupMapping(Base):
    __tablename__ = "entra_group_mappings"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    entra_group_name: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False,
    )
    app_role: Mapped[str] = mapped_column(
        String(20), nullable=False,
    )  # admin, editor, viewer
    facility_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="CASCADE"),
        nullable=True,
    )  # null = global / all facilities

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"<EntraGroupMapping group={self.entra_group_name!r} role={self.app_role}>"
