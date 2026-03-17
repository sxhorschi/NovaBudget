"""Seed script — populate the database with default users.

Usage:
    python -m app.seed
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from app.db import async_session_factory, engine
from app.models.base import Base
from app.models.user import User

logger = logging.getLogger(__name__)

DEFAULT_USERS = [
    {"email": "georg.weis@tytan.tech", "name": "Georg Weis", "role": "admin"},
    {"email": "anna.schmidt@tytan.tech", "name": "Anna Schmidt", "role": "editor"},
    {"email": "thomas.mueller@tytan.tech", "name": "Thomas Müller", "role": "viewer"},
]


async def seed_users() -> None:
    """Insert default users if they do not already exist."""
    async with async_session_factory() as session:
        for user_data in DEFAULT_USERS:
            stmt = select(User).where(User.email == user_data["email"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                logger.info("User already exists: %s", user_data["email"])
                continue

            user = User(**user_data)
            session.add(user)
            logger.info("Created user: %s (%s)", user_data["name"], user_data["role"])

        await session.commit()


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
