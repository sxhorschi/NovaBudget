"""TransferLog model — tracks cross-facility entity transfers."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TransferLog(Base):
    __tablename__ = "transfer_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
    )  # "cost_item", "work_area", "department"
    source_entity_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), nullable=False,
    )
    target_entity_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), nullable=False,
    )
    source_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="SET NULL"),
        nullable=True,
    )
    transfer_mode: Mapped[str] = mapped_column(
        String(10), nullable=False,
    )  # "copy" or "move"
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<TransferLog {self.transfer_mode} {self.entity_type} "
            f"src={self.source_entity_id} -> tgt={self.target_entity_id}>"
        )
