"""Pydantic schemas for transfer operations."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ── Request schemas ─────────────────────────────────────────────────────


class CloneFacilityRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    include_amounts: bool = True
    reset_statuses: bool = True


class TransferCostItemsRequest(BaseModel):
    source_facility_id: UUID
    target_facility_id: UUID
    cost_item_ids: list[UUID] = Field(min_length=1)
    target_work_area_id: UUID
    mode: Literal["copy", "move"]
    reset_status: bool = True
    reset_amounts: bool = False
    notes: str | None = None


class TransferWorkAreasRequest(BaseModel):
    source_facility_id: UUID
    target_facility_id: UUID
    work_area_ids: list[UUID] = Field(min_length=1)
    target_functional_area_id: UUID
    mode: Literal["copy", "move"]
    reset_status: bool = True
    reset_amounts: bool = False
    notes: str | None = None


class TransferFunctionalAreasRequest(BaseModel):
    source_facility_id: UUID
    target_facility_id: UUID
    functional_area_ids: list[UUID] = Field(min_length=1)
    mode: Literal["copy", "move"]
    reset_status: bool = True
    reset_amounts: bool = False
    notes: str | None = None


# ── Response schemas ────────────────────────────────────────────────────


class TransferLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    entity_type: str
    source_entity_id: UUID
    target_entity_id: UUID
    source_facility_id: UUID
    target_facility_id: UUID
    transfer_mode: str
    created_by: str | None = None
    notes: str | None = None
    created_at: datetime


class TransferResult(BaseModel):
    """Summary returned after a transfer operation."""
    transferred_count: int
    transfer_mode: str
    entity_type: str
    logs: list[TransferLogRead]
