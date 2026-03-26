"""Pydantic schemas for the Attachment model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.attachment import AttachmentType


class AttachmentCreate(BaseModel):
    """Metadata sent alongside the file upload (as form fields)."""

    cost_item_id: UUID | None = None
    work_area_id: UUID | None = None
    functional_area_id: UUID | None = None
    description: str | None = None
    attachment_type: AttachmentType = AttachmentType.OTHER


class AttachmentRead(BaseModel):
    """Full attachment record returned from the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cost_item_id: UUID | None = None
    work_area_id: UUID | None = None
    functional_area_id: UUID | None = None
    filename: str
    original_filename: str
    content_type: str
    file_size: int
    storage_path: str
    description: str | None = None
    attachment_type: AttachmentType
    created_at: datetime
    updated_at: datetime


class AttachmentList(BaseModel):
    """Paginated list wrapper for attachments."""

    items: list[AttachmentRead]
    total: int
