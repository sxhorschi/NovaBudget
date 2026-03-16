"""Pydantic schemas for the approval workflow endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import ApprovalStatus


class StatusChangeRequest(BaseModel):
    """Body für den allgemeinen Status-Übergangs-Endpoint (PATCH)."""

    status: ApprovalStatus
    comment: str | None = None


class StatusChangeWithComment(BaseModel):
    """Optionaler Body für die Shortcut-Endpoints (approve/reject/submit)."""

    comment: str | None = None


class AuditLogRead(BaseModel):
    """Response-Schema für AuditLog-Einträge."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    entity_type: str
    entity_id: UUID
    action: str
    field_name: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    user_id: str | None = None
    comment: str | None = None
    required_approver: str | None = None
    created_at: datetime
