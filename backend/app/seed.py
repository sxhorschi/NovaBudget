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
    {
        "email": "georg.weis@tytan.tech",
        "name": "Georg Weis",
        "role": "admin",
        "job_title": "Industrial Engineer",
        "department": "Engineering",
        "office_location": "Augsburg HQ",
        "company_name": "TYTAN Technologies",
        "employee_id": "EMP-001",
    },
    {
        "email": "anna.schmidt@tytan.tech",
        "name": "Anna Schmidt",
        "role": "editor",
        "job_title": "Project Manager",
        "department": "Project Management",
        "office_location": "Augsburg HQ",
        "company_name": "TYTAN Technologies",
        "employee_id": "EMP-002",
    },
    {
        "email": "thomas.mueller@tytan.tech",
        "name": "Thomas Müller",
        "role": "editor",
        "job_title": "Finance Controller",
        "department": "Finance",
        "office_location": "Munich Office",
        "company_name": "TYTAN Technologies",
        "employee_id": "EMP-003",
        "manager_email": "georg.weis@tytan.tech",
        "manager_name": "Georg Weis",
    },
    {
        "email": "lisa.berger@tytan.tech",
        "name": "Lisa Berger",
        "role": "viewer",
        "job_title": "Procurement Specialist",
        "department": "Procurement",
        "office_location": "Augsburg HQ",
        "company_name": "TYTAN Technologies",
        "employee_id": "EMP-004",
        "manager_email": "anna.schmidt@tytan.tech",
        "manager_name": "Anna Schmidt",
    },
    {
        "email": "markus.weber@tytan.tech",
        "name": "Markus Weber",
        "role": "editor",
        "job_title": "Technical Lead",
        "department": "Engineering",
        "office_location": "Augsburg HQ",
        "company_name": "TYTAN Technologies",
        "employee_id": "EMP-005",
        "manager_email": "georg.weis@tytan.tech",
        "manager_name": "Georg Weis",
    },
]


async def seed_users() -> None:
    """Insert default users if they do not already exist.

    If a user already exists, update their profile fields to match the
    seed data (so re-running the seed always brings records up to date).
    """
    # Fields that get updated on existing users during re-seed
    _PROFILE_FIELDS = [
        "name", "role", "job_title", "department", "office_location",
        "company_name", "employee_id", "manager_email", "manager_name",
    ]

    async with async_session_factory() as session:
        for user_data in DEFAULT_USERS:
            stmt = select(User).where(User.email == user_data["email"])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                # Update profile fields on existing users
                updated = False
                for field in _PROFILE_FIELDS:
                    if field in user_data and getattr(existing, field) != user_data[field]:
                        setattr(existing, field, user_data[field])
                        updated = True
                if updated:
                    logger.info("Updated user profile: %s", user_data["email"])
                else:
                    logger.info("User already up to date: %s", user_data["email"])
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
