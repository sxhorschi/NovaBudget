"""Shared test fixtures — SQLite in-memory database, async session, sample data."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import String, event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# SQLite compatibility: PostgreSQL UUID -> CHAR(32)
# ---------------------------------------------------------------------------
# Models use PG_UUID(as_uuid=True) which is PostgreSQL-specific.
# We register a dialect-level impl for SQLite so that create_all works.

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import CHAR, TypeDecorator

# Patch PG_UUID so it renders as CHAR(32) on non-PostgreSQL dialects.
# This must happen before any model metadata is reflected.
_original_pg_uuid_get_dbapi_type = getattr(PG_UUID, "get_dbapi_type", None)


class _SQLiteUUID(TypeDecorator):
    """Store Python uuid.UUID as a 32-char hex string in SQLite."""

    impl = CHAR(32)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid.UUID):
                return value.hex
            return uuid.UUID(value).hex
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return uuid.UUID(value)
        return value


# Monkey-patch: make PG_UUID load_dialect_impl return CHAR(32) for sqlite
_original_load_dialect_impl = PG_UUID.load_dialect_impl


def _patched_load_dialect_impl(self, dialect):
    if dialect.name == "sqlite":
        return _SQLiteUUID().dialect_impl(dialect)
    return _original_load_dialect_impl(self, dialect)


PG_UUID.load_dialect_impl = _patched_load_dialect_impl

# Now import models (after the patch)
from app.models.base import Base
from app.models.facility import Facility
from app.models.department import Department
from app.models.work_area import WorkArea
from app.models.cost_item import CostItem
from app.models.budget_adjustment import BudgetAdjustment
from app.models.enums import (
    AdjustmentCategory,
    ApprovalStatus,
    CostBasis,
    CostDriver,
    Product,
    ProjectPhase,
)

# ---------------------------------------------------------------------------
# Engine & session fixtures
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest_asyncio.fixture(scope="function")
async def engine():
    """Create a fresh in-memory SQLite engine per test."""
    eng = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield eng

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture(scope="function")
async def session(engine):
    """Provide an async session bound to the test engine."""
    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as sess:
        yield sess


# ---------------------------------------------------------------------------
# FastAPI TestClient (uses the same in-memory DB)
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(scope="function")
async def client(engine):
    """HTTPX AsyncClient wired to the FastAPI app with the test database."""
    from app.main import app
    from app.db import get_session

    factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async def _override_session():
        async with factory() as sess:
            yield sess

    app.dependency_overrides[get_session] = _override_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Sample data factory
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime(2026, 3, 16, 12, 0, 0)


@pytest_asyncio.fixture()
async def sample_data(session: AsyncSession):
    """Create a realistic data set and return a dict of references.

    Hierarchy:
        Facility
        -> 5 Departments (Assembly Equipment, Testing, Logistics, Facility, Prototyping)
           -> 2 Work Areas each (10 total)
              -> 3 CostItems each (30 total)

    Items are spread across various approval statuses so that aggregation
    tests can verify filtering logic.
    """
    now = _utcnow()

    # -- Facility --
    facility = Facility(
        id=uuid.uuid4(),
        name="Munich Plant",
        location="Munich, DE",
        description="Main production facility",
        created_at=now,
        updated_at=now,
    )
    session.add(facility)

    dept_names = [
        "Assembly Equipment",
        "Testing",
        "Logistics",
        "Facility",
        "Prototyping",
    ]
    budgets = [
        Decimal("500000"),
        Decimal("300000"),
        Decimal("200000"),
        Decimal("400000"),
        Decimal("150000"),
    ]

    departments: list[Department] = []
    work_areas: list[WorkArea] = []
    cost_items: list[CostItem] = []

    # Statuses to cycle through (6 items per department = 30 total)
    status_cycle = [
        ApprovalStatus.APPROVED,
        ApprovalStatus.OPEN,
        ApprovalStatus.SUBMITTED_FOR_APPROVAL,
        ApprovalStatus.REJECTED,
        ApprovalStatus.ON_HOLD,
        ApprovalStatus.OBSOLETE,
    ]

    phases = [ProjectPhase.PHASE_1, ProjectPhase.PHASE_2]
    products = [Product.ATLAS, Product.ORION, Product.VEGA]
    cost_bases = [CostBasis.COST_ESTIMATION, CostBasis.INITIAL_SUPPLIER_OFFER]
    cash_out_dates = [
        date(2026, 4, 15),
        date(2026, 5, 20),
        date(2026, 4, 10),
        date(2026, 6, 1),
        date(2026, 7, 15),
        None,
    ]

    item_idx = 0
    for d_idx, (dept_name, budget) in enumerate(zip(dept_names, budgets)):
        dept = Department(
            id=uuid.uuid4(),
            facility_id=facility.id,
            name=dept_name,
            budget_total=budget,
            created_at=now,
            updated_at=now,
        )
        session.add(dept)
        departments.append(dept)

        for wa_idx in range(2):
            wa = WorkArea(
                id=uuid.uuid4(),
                department_id=dept.id,
                name=f"{dept_name} WA-{wa_idx + 1}",
                created_at=now,
                updated_at=now,
            )
            session.add(wa)
            work_areas.append(wa)

            for ci_idx in range(3):
                status = status_cycle[item_idx % len(status_cycle)]
                amount = Decimal("10000") + Decimal(str((item_idx + 1) * 1000))
                item = CostItem(
                    id=uuid.uuid4(),
                    work_area_id=wa.id,
                    description=f"Item {item_idx + 1}: {dept_name} equipment",
                    original_amount=amount,
                    current_amount=amount,
                    expected_cash_out=cash_out_dates[item_idx % len(cash_out_dates)],
                    cost_basis=cost_bases[item_idx % len(cost_bases)],
                    cost_driver=CostDriver.INITIAL_SETUP,
                    approval_status=status,
                    approval_date=date(2026, 3, 1) if status == ApprovalStatus.APPROVED else None,
                    project_phase=phases[item_idx % len(phases)],
                    product=products[item_idx % len(products)],
                    zielanpassung=None,
                    comments=None,
                    created_at=now,
                    updated_at=now,
                )
                session.add(item)
                cost_items.append(item)
                item_idx += 1

    await session.commit()

    return {
        "facility": facility,
        "departments": departments,
        "work_areas": work_areas,
        "cost_items": cost_items,
    }
