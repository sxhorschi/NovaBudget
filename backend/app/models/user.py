"""User model — authentication and role-based access control.

Stores both local fields and data synced from Microsoft Entra ID
(Azure AD) via the Microsoft Graph API.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="viewer",
    )  # admin, editor, viewer

    # ── Entra ID / Microsoft Graph profile fields ─────────────────────────
    job_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    department: Mapped[str | None] = mapped_column(String(200), nullable=True)
    office_location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    employee_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    manager_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    manager_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    entra_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True, index=True,
    )  # Azure AD object ID
    entra_groups: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of group names
    last_synced_at: Mapped[datetime | None] = mapped_column(nullable=True)  # last Entra profile sync

    # ── Invitation tracking ─────────────────────────────────────────────
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    invited_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # ── App-level fields ──────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    last_login: Mapped[datetime | None] = mapped_column(nullable=True)

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role}>"
