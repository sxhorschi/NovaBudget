"""Pydantic schemas for permissions and group mappings."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# FacilityPermission
# ---------------------------------------------------------------------------


class PermissionCreate(BaseModel):
    """Assign a permission to a user."""

    user_id: UUID
    facility_id: UUID | None = None
    role: str  # admin, editor, viewer


class PermissionRead(BaseModel):
    """Full permission record returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    facility_id: UUID | None = None
    role: str
    created_at: datetime


# ---------------------------------------------------------------------------
# EntraGroupMapping
# ---------------------------------------------------------------------------


class GroupMappingCreate(BaseModel):
    """Create a new Entra group mapping."""

    entra_group_name: str
    app_role: str  # admin, editor, viewer
    facility_id: UUID | None = None


class GroupMappingRead(BaseModel):
    """Full group mapping record returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    entra_group_name: str
    app_role: str
    facility_id: UUID | None = None
    created_at: datetime
