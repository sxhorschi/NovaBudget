"""Pydantic response schemas for summary / KPI endpoints."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── Department KPIs ──────────────────────────────────────────────────────

class DepartmentKPI(BaseModel):
    """KPIs for a single department (Otto v4 business logic)."""

    model_config = ConfigDict(from_attributes=True)

    department_id: UUID
    department_name: str
    budget: Decimal              # budget_total + SUM(budget_adjustments)
    budget_base: Decimal         # department.budget_total (original)
    adjustment_total: Decimal    # SUM(budget_adjustments.amount)
    committed: Decimal           # SUM(current_amount) WHERE status = APPROVED
    forecast: Decimal            # SUM(current_amount) WHERE status NOT IN (REJECTED, OBSOLETE)
    remaining: Decimal           # budget - forecast
    cost_of_completion: Decimal  # = forecast (same metric, different label)
    variance: Decimal            # SUM(original_amount - current_amount) for active items
    item_count: int              # number of active items (excl. rejected/obsolete)
    budget_utilization_pct: Decimal  # committed / budget * 100


# ── Facility KPIs (aggregate over all departments) ───────────────────────

class FacilityKPI(BaseModel):
    """Aggregated KPIs across all departments in a facility."""

    model_config = ConfigDict(from_attributes=True)

    facility_id: UUID
    budget: Decimal
    budget_base: Decimal
    adjustment_total: Decimal
    committed: Decimal
    forecast: Decimal
    remaining: Decimal
    cost_of_completion: Decimal
    variance: Decimal
    item_count: int
    budget_utilization_pct: Decimal
    department_count: int
    departments: list[DepartmentKPI]


# ── Cash-Out Forecast ────────────────────────────────────────────────────

class CashOutDepartment(BaseModel):
    """Cash-out for one department in a given month."""

    department_id: UUID
    department_name: str
    amount: Decimal


class CashOutMonth(BaseModel):
    """Monthly cash-out forecast, broken down by department."""

    month: date
    total: Decimal
    departments: list[CashOutDepartment]


# ── Phase Breakdown ──────────────────────────────────────────────────────

class PhaseBreakdown(BaseModel):
    """KPIs grouped by project phase."""

    phase: str
    committed: Decimal
    forecast: Decimal
    item_count: int


# ── Approval Pipeline ────────────────────────────────────────────────────

class ApprovalPipelineEntry(BaseModel):
    """Value (EUR) and count per approval status."""

    status: str
    total_amount: Decimal
    item_count: int


# ── Legacy compat (kept for backward compat, deprecated) ─────────────────

class BudgetSummary(BaseModel):
    """DEPRECATED — use FacilityKPI instead."""

    total_budget: Decimal
    total_committed: Decimal
    total_approved: Decimal
    remaining: Decimal
    forecast: Decimal
    cost_of_completion: Decimal


class DepartmentSummary(BaseModel):
    """DEPRECATED — use DepartmentKPI instead."""

    department_name: str
    budget_total: Decimal | None = None
    total_committed: Decimal
    total_approved: Decimal
    remaining: Decimal


class CashOutEntry(BaseModel):
    month: date
    amount: Decimal
