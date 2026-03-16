from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import ApprovalStatus, CostBasis, CostDriver, Product, ProjectPhase


class CostItemCreate(BaseModel):
    work_area_id: UUID
    description: str
    original_amount: Decimal
    current_amount: Decimal
    expected_cash_out: date | None = None
    cost_basis: CostBasis
    cost_driver: CostDriver
    basis_description: str | None = None
    assumptions: str | None = None
    approval_status: ApprovalStatus = ApprovalStatus.OPEN
    approval_date: date | None = None
    project_phase: ProjectPhase
    product: Product
    zielanpassung: Decimal | None = None
    zielanpassung_reason: str | None = None
    comments: str | None = None


class CostItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_area_id: UUID
    description: str
    original_amount: Decimal
    current_amount: Decimal
    expected_cash_out: date | None = None
    cost_basis: CostBasis
    cost_driver: CostDriver
    basis_description: str | None = None
    assumptions: str | None = None
    approval_status: ApprovalStatus
    approval_date: date | None = None
    project_phase: ProjectPhase
    product: Product
    zielanpassung: Decimal | None = None
    zielanpassung_reason: str | None = None
    comments: str | None = None
    created_at: datetime
    updated_at: datetime


class CostItemAggregations(BaseModel):
    total_amount: Decimal
    by_status: dict[str, Decimal] = {}
    by_phase: dict[str, Decimal] = {}
    by_department: dict[str, Decimal] = {}


class CostItemSearchResult(BaseModel):
    items: list[CostItemRead]
    total: int
    page: int
    page_size: int
    aggregations: CostItemAggregations


class CostItemUpdate(BaseModel):
    description: str | None = None
    original_amount: Decimal | None = None
    current_amount: Decimal | None = None
    expected_cash_out: date | None = None
    cost_basis: CostBasis | None = None
    cost_driver: CostDriver | None = None
    basis_description: str | None = None
    assumptions: str | None = None
    approval_status: ApprovalStatus | None = None
    approval_date: date | None = None
    project_phase: ProjectPhase | None = None
    product: Product | None = None
    zielanpassung: Decimal | None = None
    zielanpassung_reason: str | None = None
    comments: str | None = None
