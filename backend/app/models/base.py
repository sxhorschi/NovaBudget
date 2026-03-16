"""SQLAlchemy 2.0 DeclarativeBase and mixins."""

import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


class UUIDPrimaryKeyMixin:
    """Mixin that provides a UUID primary key."""

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


class TimestampMixin:
    """Mixin that adds created_at and updated_at columns with server defaults."""

    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
