"""CostItem model — the core budget line item."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    ApprovalStatus,
    ApprovalStatusType,
    CostBasis,
    CostBasisType,
    CostDriver,
    CostDriverType,
    Product,
    ProductType,
    ProjectPhase,
    ProjectPhaseType,
)

if TYPE_CHECKING:
    from app.models.work_area import WorkArea


class CostItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cost_items"

    work_area_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("work_areas.id", ondelete="CASCADE"),
        nullable=False,
    )

    # descriptive fields
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # financial
    original_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
    )
    current_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=False,
    )
    expected_cash_out: Mapped[date | None] = mapped_column(Date, nullable=True)

    # classification enums
    cost_basis: Mapped[CostBasis | None] = mapped_column(
        CostBasisType,
        nullable=True,
    )
    cost_driver: Mapped[CostDriver | None] = mapped_column(
        CostDriverType,
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

    # project context
    project_phase: Mapped[ProjectPhase | None] = mapped_column(
        ProjectPhaseType,
        nullable=True,
    )
    product: Mapped[Product | None] = mapped_column(
        ProductType,
        nullable=True,
    )

    # target adjustments (Zielanpassung)
    zielanpassung: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=15, scale=2),
        nullable=True,
    )
    zielanpassung_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # general notes
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    # relationships
    work_area: Mapped[WorkArea] = relationship(back_populates="cost_items")

    def __repr__(self) -> str:
        return (
            f"<CostItem id={self.id} description={self.description!r} "
            f"current_amount={self.current_amount}>"
        )
