"""Pydantic schemas for the User resource."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    """Create a new user (admin only)."""

    email: str
    name: str | None = None
    role: str = "viewer"
    department: str | None = None
    job_title: str | None = None


class UserRead(BaseModel):
    """Full user profile returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    role: str
    job_title: str | None = None
    department: str | None = None
    office_location: str | None = None
    phone: str | None = None
    employee_id: str | None = None
    company_name: str | None = None
    manager_email: str | None = None
    manager_name: str | None = None
    photo_url: str | None = None
    invited_by: UUID | None = None
    invited_at: datetime | None = None
    is_active: bool
    last_login: datetime | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    """Admin-editable fields on a user record."""

    role: str | None = None
    department: str | None = None
    is_active: bool | None = None


class UserBrief(BaseModel):
    """Lightweight user record for dropdowns (e.g. Requester picker)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    department: str | None = None
    job_title: str | None = None
    photo_url: str | None = None
