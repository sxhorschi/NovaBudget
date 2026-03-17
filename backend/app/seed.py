"""Seed script — create a default admin user if no users exist.

Usage:
    python -m app.seed
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select, func

from app.db import async_session_factory, engine
from app.models.base import Base
from app.models.user import User

logger = logging.getLogger(__name__)


async def seed_users() -> None:
    """Create a default admin user only if the users table is empty.

    Reads ADMIN_EMAIL and ADMIN_NAME from environment variables
    (falling back to config defaults).  Does NOT invent fake employees —
    real user provisioning is handled by Entra ID sync.
    """
    from app.config import settings

    async with async_session_factory() as session:
        # Check if ANY users exist
        count_stmt = select(func.count()).select_from(User)
        result = await session.execute(count_stmt)
        user_count = result.scalar_one()

        if user_count > 0:
            logger.info(
                "Database already contains %d user(s) — skipping admin seed.",
                user_count,
            )
            return

        admin_email = settings.ADMIN_EMAIL
        admin_name = settings.ADMIN_NAME

        admin = User(
            email=admin_email,
            name=admin_name,
            role="admin",
        )
        session.add(admin)
        await session.commit()

        logger.info(
            "Created default admin user: %s <%s>",
            admin_name,
            admin_email,
        )


async def main() -> None:
    """Ensure tables exist and seed default data."""
    # Create tables if they don't exist (useful for dev/testing)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_users()
    await engine.dispose()

    print("Seeding complete.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
