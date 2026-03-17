from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ApprovalStatus, CostBasis, CostDriver, Product, ProjectPhase


class CostItemCreate(BaseModel):
    work_area_id: UUID
    description: str = Field(min_length=1, max_length=500)
    original_amount: Decimal = Field(ge=0, max_digits=15, decimal_places=2)
    current_amount: Decimal = Field(ge=0, max_digits=15, decimal_places=2)
    expected_cash_out: date | None = None
    cost_basis: CostBasis | None = None
    cost_driver: CostDriver | None = None
    basis_description: str | None = Field(default=None, max_length=1000)
    assumptions: str | None = Field(default=None, max_length=2000)
    approval_status: ApprovalStatus = ApprovalStatus.OPEN
    approval_date: date | None = None
    project_phase: ProjectPhase | None = None
    product: Product | None = None
    zielanpassung: Decimal | None = Field(default=None, max_digits=15, decimal_places=2)
    zielanpassung_reason: str | None = Field(default=None, max_length=2000)
    comments: str | None = Field(default=None, max_length=4000)
    requester: str | None = Field(default=None, max_length=200)


class CostItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_area_id: UUID
    description: str
    original_amount: Decimal
    current_amount: Decimal
    expected_cash_out: date | None = None
    cost_basis: CostBasis | None = None
    cost_driver: CostDriver | None = None
    basis_description: str | None = None
    assumptions: str | None = None
    approval_status: ApprovalStatus
    approval_date: date | None = None
    project_phase: ProjectPhase | None = None
    product: Product | None = None
    zielanpassung: Decimal | None = None
    zielanpassung_reason: str | None = None
    comments: str | None = None
    requester: str | None = None
    created_at: datetime
    updated_at: datetime


class CostItemAggregations(BaseModel):
    total_amount: Decimal
    by_status: dict[str, Decimal] = Field(default_factory=dict)
    by_phase: dict[str, Decimal] = Field(default_factory=dict)
    by_department: dict[str, Decimal] = Field(default_factory=dict)


class CostItemSearchResult(BaseModel):
    items: list[CostItemRead]
    total: int
    page: int
    page_size: int
    aggregations: CostItemAggregations


class CostItemUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=500)
    original_amount: Decimal | None = Field(default=None, ge=0, max_digits=15, decimal_places=2)
    current_amount: Decimal | None = Field(default=None, ge=0, max_digits=15, decimal_places=2)
    expected_cash_out: date | None = None
    cost_basis: CostBasis | None = None
    cost_driver: CostDriver | None = None
    basis_description: str | None = Field(default=None, max_length=1000)
    assumptions: str | None = Field(default=None, max_length=2000)
    approval_status: ApprovalStatus | None = None
    approval_date: date | None = None
    project_phase: ProjectPhase | None = None
    product: Product | None = None
    zielanpassung: Decimal | None = Field(default=None, max_digits=15, decimal_places=2)
    zielanpassung_reason: str | None = Field(default=None, max_length=2000)
    comments: str | None = Field(default=None, max_length=4000)
    requester: str | None = Field(default=None, max_length=200)
