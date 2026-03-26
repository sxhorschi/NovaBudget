"""Pydantic response schemas for summary / KPI endpoints."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── FunctionalArea KPIs ──────────────────────────────────────────────────────

class FunctionalAreaKPI(BaseModel):
    """KPIs for a single functional area (Otto v4 business logic)."""

    model_config = ConfigDict(from_attributes=True)

    functional_area_id: UUID
    functional_area_name: str
    year: int | None = None      # budget year (None = all years aggregated)
    budget: Decimal              # budget_total + SUM(budget_adjustments)
    budget_base: Decimal         # functional_area.budget_total (original)
    adjustment_total: Decimal    # SUM(budget_adjustments.amount)
    committed: Decimal           # SUM(total_amount) WHERE status = APPROVED
    spent: Decimal               # SUM(total_amount) WHERE status = DELIVERED
    forecast: Decimal            # SUM(total_amount) WHERE status NOT IN (REJECTED, OBSOLETE)
    remaining: Decimal           # budget - forecast
    cost_of_completion: Decimal  # = forecast (same metric, different label)
    variance: Decimal            # 0 for now (will use PriceHistory delta in Phase 4)
    item_count: int              # number of active items (excl. rejected/obsolete)
    budget_utilization_pct: Decimal  # committed / budget * 100


# ── Facility KPIs (aggregate over all functional areas) ───────────────────────

class FacilityKPI(BaseModel):
    """Aggregated KPIs across all functional areas in a facility."""

    model_config = ConfigDict(from_attributes=True)

    facility_id: UUID
    budget: Decimal
    budget_base: Decimal
    adjustment_total: Decimal
    committed: Decimal
    spent: Decimal
    forecast: Decimal
    remaining: Decimal
    cost_of_completion: Decimal
    variance: Decimal
    item_count: int
    budget_utilization_pct: Decimal
    functional_area_count: int
    functional_areas: list[FunctionalAreaKPI]


# ── Cash-Out Forecast ────────────────────────────────────────────────────

class CashOutFunctionalArea(BaseModel):
    """Cash-out for one functional area in a given month."""

    functional_area_id: UUID
    functional_area_name: str
    amount: Decimal


class CashOutMonth(BaseModel):
    """Monthly cash-out forecast, broken down by functional area."""

    month: date
    total: Decimal
    functional_areas: list[CashOutFunctionalArea]


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


class FunctionalAreaSummary(BaseModel):
    """DEPRECATED — use FunctionalAreaKPI instead."""

    functional_area_name: str
    budget_total: Decimal | None = None
    total_committed: Decimal
    total_approved: Decimal
    remaining: Decimal


class CashOutEntry(BaseModel):
    month: date
    amount: Decimal
