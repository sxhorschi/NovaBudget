"""CostItem model — the core budget line item."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    ApprovalStatus,
    ApprovalStatusType,
)

if TYPE_CHECKING:
    from app.models.price_history import PriceHistory
    from app.models.work_area import WorkArea


class CostItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cost_items"
    __table_args__ = (
        Index("ix_cost_items_work_area_id", "work_area_id"),
        Index("ix_cost_items_approval_status", "approval_status"),
        Index("ix_cost_items_project_phase", "project_phase"),
        Index("ix_cost_items_product", "product"),
        Index("ix_cost_items_expected_cash_out", "expected_cash_out"),
        Index("ix_cost_items_total_amount", "total_amount"),
        Index("ix_cost_items_created_at", "created_at"),
    )

    work_area_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("work_areas.id", ondelete="CASCADE"),
        nullable=False,
    )

    # descriptive fields
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # financial
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
        default=Decimal("1"),
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
    )
    expected_cash_out: Mapped[date | None] = mapped_column(Date, nullable=True)

    # classification (flexible strings from config)
    cost_basis: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    cost_driver: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    basis_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    assumptions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # approval workflow
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        ApprovalStatusType,
        nullable=False,
        server_default=ApprovalStatus.OPEN.value,
    )
    approval_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # project context (flexible strings from config)
    project_phase: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    product: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # target adjustments (Zielanpassung)
    zielanpassung: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=True,
    )
    zielanpassung_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # requester (person who requested/created this item)
    requester: Mapped[str | None] = mapped_column(String(200), nullable=True, default=None)

    # general notes
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # relationships
    work_area: Mapped[WorkArea] = relationship(back_populates="cost_items")
    price_history: Mapped[list[PriceHistory]] = relationship(
        back_populates="cost_item",
        cascade="all, delete-orphan",
        order_by="PriceHistory.created_at",
    )

    def __repr__(self) -> str:
        return (
            f"<CostItem id={self.id} description={self.description!r} "
            f"total_amount={self.total_amount}>"
        )
