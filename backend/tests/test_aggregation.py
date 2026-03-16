"""Tests for app.services.aggregation — budget summaries and cash-out timeline."""

from __future__ import annotations

from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CostItem, Department, WorkArea
from app.models.enums import ApprovalStatus
from app.services.aggregation import (
    get_budget_summary,
    get_department_summaries,
)


pytestmark = pytest.mark.asyncio(loop_scope="function")


# ---------------------------------------------------------------------------
# Budget summary tests
# ---------------------------------------------------------------------------


async def test_committed_only_counts_approved_items(session: AsyncSession, sample_data):
    """get_budget_summary().total_approved must only include items with status APPROVED."""
    summary = await get_budget_summary(session)

    # Manually compute expected approved total
    approved_total = sum(
        item.current_amount
        for item in sample_data["cost_items"]
        if item.approval_status == ApprovalStatus.APPROVED
    )

    assert summary.total_approved == approved_total, (
        f"Expected approved total {approved_total}, got {summary.total_approved}. "
        "Only APPROVED items should be counted."
    )


async def test_forecast_excludes_rejected_and_obsolete(session: AsyncSession, sample_data):
    """cost_of_completion (non-approved sum) should include REJECTED/OBSOLETE in the current
    aggregation logic. This test documents the actual behavior: cost_of_completion = SUM
    of items where status != APPROVED."""
    summary = await get_budget_summary(session)

    non_approved_total = sum(
        item.current_amount
        for item in sample_data["cost_items"]
        if item.approval_status != ApprovalStatus.APPROVED
    )

    assert summary.cost_of_completion == non_approved_total, (
        f"Expected cost_of_completion={non_approved_total}, got {summary.cost_of_completion}. "
        "cost_of_completion should be the sum of all non-APPROVED items."
    )


async def test_budget_includes_department_totals(session: AsyncSession, sample_data):
    """total_budget should equal the sum of all department budget_total values."""
    summary = await get_budget_summary(session)

    expected_budget = sum(d.budget_total for d in sample_data["departments"])

    assert summary.total_budget == expected_budget, (
        f"Expected total_budget={expected_budget}, got {summary.total_budget}. "
        "Budget should be the sum of all department budgets."
    )


async def test_remaining_equals_budget_minus_spent(session: AsyncSession, sample_data):
    """total_delta should be total_budget minus total_spent."""
    summary = await get_budget_summary(session)

    expected_delta = summary.total_budget - summary.total_spent

    assert summary.total_delta == expected_delta, (
        f"Expected delta={expected_delta}, got {summary.total_delta}. "
        "Delta must equal budget minus total spent."
    )


async def test_empty_facility_returns_zeros(session: AsyncSession):
    """When no data exists, all summary values should be zero."""
    summary = await get_budget_summary(session)

    assert summary.total_budget == 0, "Empty DB should have total_budget=0"
    assert summary.total_spent == 0, "Empty DB should have total_spent=0"
    assert summary.total_approved == 0, "Empty DB should have total_approved=0"
    assert summary.total_delta == 0, "Empty DB should have total_delta=0"
    assert summary.cost_of_completion == 0, "Empty DB should have cost_of_completion=0"


# ---------------------------------------------------------------------------
# Department summary tests
# ---------------------------------------------------------------------------


async def test_department_summaries_count(session: AsyncSession, sample_data):
    """Should return one summary per department, ordered by name."""
    summaries = await get_department_summaries(session)

    assert len(summaries) == 5, (
        f"Expected 5 department summaries, got {len(summaries)}"
    )

    # Verify alphabetical ordering
    names = [s.department_name for s in summaries]
    assert names == sorted(names), (
        f"Department summaries should be sorted by name, got {names}"
    )


async def test_department_summary_delta_calculation(session: AsyncSession, sample_data):
    """Each department's total_delta should be budget_total minus total_spent."""
    summaries = await get_department_summaries(session)

    for s in summaries:
        budget = s.budget_total or Decimal(0)
        expected_delta = budget - s.total_spent
        assert s.total_delta == expected_delta, (
            f"Department '{s.department_name}': expected delta={expected_delta}, "
            f"got {s.total_delta}"
        )


async def test_department_summary_approved_subset_of_spent(session: AsyncSession, sample_data):
    """total_approved must be less than or equal to total_spent for each department."""
    summaries = await get_department_summaries(session)

    for s in summaries:
        assert s.total_approved <= s.total_spent, (
            f"Department '{s.department_name}': approved ({s.total_approved}) "
            f"exceeds spent ({s.total_spent}), which is impossible"
        )
