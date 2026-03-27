"""Seed script — idempotent base data for NovaBudget.

Creates:
  - Default admin user (if no users exist)
  - Base facilities, functional areas, and work areas (if none exist)

Edit SEED_DATA below to configure the initial structure.

Usage:
    python -m app.seed
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import func, select

from app.db import async_session_factory, engine
from app.models.base import Base
from app.models.facility import Facility
from app.models.functional_area import FunctionalArea
from app.models.user import User
from app.models.work_area import WorkArea

logger = logging.getLogger(__name__)

# ── Seed Data ──────────────────────────────────────────────────────────────────
# Edit this to match your real structure.
# Work areas are listed under each functional area they belong to.
# Budget totals can be set later via the UI.

SEED_DATA: list[dict] = [
    {
        "facility": {
            "name": "3k Factory",
            "location": "",
            "description": "",
        },
        "functional_areas": [
            # Example — uncomment and edit to add your real structure:
            # {
            #     "name": "Assembly",
            #     "work_areas": ["Line 1", "Line 2", "Tooling"],
            # },
            # {
            #     "name": "Logistics",
            #     "work_areas": ["Inbound", "Outbound", "Warehouse"],
            # },
        ],
    },
]


# ── Seed Logic ─────────────────────────────────────────────────────────────────

async def seed_users() -> None:
    from app.config import settings

    async with async_session_factory() as session:
        count = (await session.execute(select(func.count()).select_from(User))).scalar_one()
        if count > 0:
            logger.info("Users already exist (%d) — skipping.", count)
            return

        admin = User(
            email=settings.ADMIN_EMAIL,
            name=settings.ADMIN_NAME,
            role="admin",
        )
        session.add(admin)
        await session.commit()
        logger.info("Created admin user: %s <%s>", settings.ADMIN_NAME, settings.ADMIN_EMAIL)


async def seed_structure() -> None:
    if not SEED_DATA:
        return

    async with async_session_factory() as session:
        facility_count = (
            await session.execute(select(func.count()).select_from(Facility))
        ).scalar_one()

        if facility_count > 0:
            logger.info("Facilities already exist (%d) — skipping structure seed.", facility_count)
            return

        for entry in SEED_DATA:
            fac_data = entry["facility"]
            facility = Facility(
                name=fac_data["name"],
                location=fac_data.get("location") or None,
                description=fac_data.get("description") or None,
            )
            session.add(facility)
            await session.flush()

            for fa_data in entry.get("functional_areas", []):
                fa = FunctionalArea(
                    facility_id=facility.id,
                    name=fa_data["name"],
                )
                session.add(fa)
                await session.flush()

                for wa_name in fa_data.get("work_areas", []):
                    session.add(WorkArea(functional_area_id=fa.id, name=wa_name))

        await session.commit()
        logger.info("Seeded structure from SEED_DATA.")


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await seed_users()
    await seed_structure()
    await engine.dispose()

    print("Seeding complete.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
