from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ApprovalStatus


class CostItemCreate(BaseModel):
    work_area_id: UUID
    description: str = Field(min_length=1, max_length=500)
    unit_price: Decimal = Field(ge=0, max_digits=15, decimal_places=2)
    quantity: Decimal = Field(default=Decimal("1"), ge=0, max_digits=15, decimal_places=2)
    total_amount: Decimal = Field(ge=0, max_digits=15, decimal_places=2)
    expected_cash_out: date | None = None
    cost_basis: str = Field(min_length=1, max_length=200)
    cost_driver: str | None = None
    basis_description: str | None = Field(default=None, max_length=1000)
    assumptions: str | None = Field(default=None, max_length=2000)
    approval_status: ApprovalStatus = ApprovalStatus.OPEN
    approval_date: date | None = None
    project_phase: str = Field(min_length=1, max_length=200)
    product: str = Field(min_length=1, max_length=200)
    requester: str | None = Field(default=None, max_length=200)


class CostItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_area_id: UUID
    description: str
    unit_price: Decimal
    quantity: Decimal
    total_amount: Decimal
    expected_cash_out: date | None = None
    cost_basis: str | None = None
    cost_driver: str | None = None
    basis_description: str | None = None
    assumptions: str | None = None
    approval_status: ApprovalStatus
    approval_date: date | None = None
    project_phase: str | None = None
    product: str | None = None
    requester: str | None = None
    created_at: datetime
    updated_at: datetime


class CostItemAggregations(BaseModel):
    total_amount: Decimal
    by_status: dict[str, Decimal] = Field(default_factory=dict)
    by_phase: dict[str, Decimal] = Field(default_factory=dict)
    by_functional_area: dict[str, Decimal] = Field(default_factory=dict)


class CostItemSearchResult(BaseModel):
    items: list[CostItemRead]
    total: int
    page: int
    page_size: int
    aggregations: CostItemAggregations


class CostItemUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=500)
    unit_price: Decimal | None = Field(default=None, ge=0, max_digits=15, decimal_places=2)
    quantity: Decimal | None = Field(default=None, ge=0, max_digits=15, decimal_places=2)
    total_amount: Decimal | None = Field(default=None, ge=0, max_digits=15, decimal_places=2)
    expected_cash_out: date | None = None
    cost_basis: str | None = None
    cost_driver: str | None = None
    basis_description: str | None = Field(default=None, max_length=1000)
    assumptions: str | None = Field(default=None, max_length=2000)
    approval_status: ApprovalStatus | None = None
    approval_date: date | None = None
    project_phase: str | None = None
    product: str | None = None
    requester: str | None = Field(default=None, max_length=200)
    # When unit_price or quantity changes, frontend should provide the reason
    price_change_basis: str | None = Field(
        default=None,
        max_length=50,
        description="Required when unit_price or quantity changes. One of: cost_estimation, initial_supplier_offer, revised_supplier_offer, final",
    )
