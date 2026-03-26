"""Attachment model — file attachments for cost items, work areas, or functional areas."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.cost_item import CostItem
    from app.models.functional_area import FunctionalArea
    from app.models.work_area import WorkArea


class AttachmentType(str, enum.Enum):
    """Type classification for attachments."""

    OFFER = "OFFER"
    INVOICE = "INVOICE"
    SPECIFICATION = "SPECIFICATION"
    PHOTO = "PHOTO"
    OTHER = "OTHER"


AttachmentTypeColumn = SAEnum(
    AttachmentType,
    name="attachment_type",
    create_constraint=True,
    native_enum=True,
)


class Attachment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "attachments"
    __table_args__ = (
        CheckConstraint(
            "((cost_item_id IS NOT NULL AND work_area_id IS NULL AND functional_area_id IS NULL) "
            "OR (cost_item_id IS NULL AND work_area_id IS NOT NULL AND functional_area_id IS NULL) "
            "OR (cost_item_id IS NULL AND work_area_id IS NULL AND functional_area_id IS NOT NULL))",
            name="ck_attachment_exactly_one_parent",
        ),
    )

    # Polymorphic parent — exactly ONE of these must be set
    cost_item_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("cost_items.id", ondelete="CASCADE"),
        nullable=True,
    )
    work_area_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("work_areas.id", ondelete="CASCADE"),
        nullable=True,
    )
    functional_area_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("functional_areas.id", ondelete="CASCADE"),
        nullable=True,
    )

    # File metadata
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)

    # Optional description
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Classification
    attachment_type: Mapped[AttachmentType] = mapped_column(
        AttachmentTypeColumn,
        nullable=False,
        server_default=AttachmentType.OTHER.value,
    )

    # Relationships
    cost_item: Mapped[CostItem | None] = relationship(
        foreign_keys=[cost_item_id],
        lazy="selectin",
    )
    work_area: Mapped[WorkArea | None] = relationship(
        foreign_keys=[work_area_id],
        lazy="selectin",
    )
    functional_area: Mapped[FunctionalArea | None] = relationship(
        foreign_keys=[functional_area_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Attachment id={self.id} filename={self.original_filename!r} "
            f"type={self.attachment_type.value}>"
        )
