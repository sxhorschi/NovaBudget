"""Pydantic schemas for the unified dashboard endpoint."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── Facility Info ────────────────────────────────────────────────────────

class DashboardFacility(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    location: str | None = None


# ── Top-Level KPIs ───────────────────────────────────────────────────────

class DashboardKPIs(BaseModel):
    budget: Decimal
    budget_adjustments: Decimal
    budget_effective: Decimal
    committed: Decimal
    forecast: Decimal
    remaining: Decimal
    remaining_pct: Decimal
    total_items: int
    approved_items: int
    pending_items: int
    rejected_items: int


# ── Work Area (nested under FunctionalArea) ──────────────────────────────

class DashboardWorkArea(BaseModel):
    id: UUID
    name: str
    item_count: int
    total: Decimal


# ── FunctionalArea Breakdown ─────────────────────────────────────────────

class DashboardFunctionalArea(BaseModel):
    id: UUID
    name: str
    budget: Decimal
    adjustments: Decimal
    committed: Decimal
    forecast: Decimal
    remaining: Decimal
    items_total: int
    items_approved: int
    work_areas: list[DashboardWorkArea]


# ── Cash-Out Timeline ───────────────────────────────────────────────────

class CashOutTimelineEntry(BaseModel):
    month: str  # "2026-02" format
    total: Decimal
    by_functional_area: dict[str, Decimal]  # functional_area_id (str) -> amount


# ── Phase Breakdown ─────────────────────────────────────────────────────

class DashboardPhase(BaseModel):
    phase: str
    committed: Decimal
    forecast: Decimal
    items: int


# ── Status Breakdown ────────────────────────────────────────────────────

class StatusEntry(BaseModel):
    count: int
    amount: Decimal


# ── Recent Changes ──────────────────────────────────────────────────────

class RecentChange(BaseModel):
    item_id: UUID
    description: str
    change: str
    date: str  # ISO date string


# ── Full Dashboard Response ─────────────────────────────────────────────

class DashboardResponse(BaseModel):
    facility: DashboardFacility
    kpis: DashboardKPIs
    functional_areas: list[DashboardFunctionalArea]
    cash_out_timeline: list[CashOutTimelineEntry]
    by_phase: list[DashboardPhase]
    by_status: dict[str, StatusEntry]
    recent_changes: list[RecentChange]
