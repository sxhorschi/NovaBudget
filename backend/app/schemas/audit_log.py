"""Pydantic schemas for audit log responses."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    entity_type: str
    entity_id: UUID
    action: str
    field_name: str | None
    old_value: str | None
    new_value: str | None
    user_id: str | None
    created_at: datetime
