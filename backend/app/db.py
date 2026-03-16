"""Async SQLAlchemy engine, session factory, and FastAPI dependency."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.models.base import Base

# ── Configuration ────────────────────────────────────────────────────────

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── FastAPI dependency ───────────────────────────────────────────────────

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async session and ensure it is closed after the request."""
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# Convenience type alias for dependency injection in route signatures.
SessionDep = Annotated[AsyncSession, Depends(get_session)]


# ── Table creation helper (useful for dev / testing) ─────────────────────

async def create_tables() -> None:
    """Create all tables defined on Base.metadata."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
