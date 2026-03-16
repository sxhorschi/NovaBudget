"""Tests for approval status transitions and workflow rules.

The CAPEX tool uses ApprovalStatus enum values. These tests verify
that status changes follow the expected business rules:
- Certain transitions are valid (OPEN -> SUBMITTED_FOR_APPROVAL -> APPROVED)
- OBSOLETE is a terminal state
- REJECTED items can be resubmitted
- APPROVED sets an approval_date
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import ApprovalStatus
from app.services.approval import ALLOWED_TRANSITIONS, change_status, is_transition_allowed


pytestmark = pytest.mark.asyncio(loop_scope="function")


# ---------------------------------------------------------------------------
# Pure logic tests (no DB needed)
# ---------------------------------------------------------------------------


def test_allowed_transition_open_to_submitted():
    """OPEN -> SUBMITTED_FOR_APPROVAL is a standard valid transition."""
    assert is_transition_allowed(ApprovalStatus.OPEN, ApprovalStatus.SUBMITTED_FOR_APPROVAL), (
        "Transition OPEN -> SUBMITTED_FOR_APPROVAL must be allowed"
    )


def test_allowed_transition_submitted_to_approved():
    """SUBMITTED_FOR_APPROVAL -> APPROVED is the standard approval path."""
    assert is_transition_allowed(
        ApprovalStatus.SUBMITTED_FOR_APPROVAL, ApprovalStatus.APPROVED
    ), "Transition SUBMITTED_FOR_APPROVAL -> APPROVED must be allowed"


def test_forbidden_transition_open_to_approved():
    """OPEN -> APPROVED is forbidden -- items must go through submission first."""
    assert not is_transition_allowed(ApprovalStatus.OPEN, ApprovalStatus.APPROVED), (
        "Transition OPEN -> APPROVED must be forbidden (skip submission)"
    )


def test_forbidden_transition_approved_to_open():
    """APPROVED -> OPEN is forbidden -- approved items cannot go back to open."""
    assert not is_transition_allowed(ApprovalStatus.APPROVED, ApprovalStatus.OPEN), (
        "Transition APPROVED -> OPEN must be forbidden"
    )


def test_rejected_can_be_resubmitted():
    """REJECTED -> SUBMITTED_FOR_APPROVAL is allowed (resubmission)."""
    assert is_transition_allowed(
        ApprovalStatus.REJECTED, ApprovalStatus.SUBMITTED_FOR_APPROVAL
    ), "Rejected items must be allowed to be resubmitted"


def test_rejected_can_go_back_to_open():
    """REJECTED -> OPEN is allowed (rework before resubmission)."""
    assert is_transition_allowed(ApprovalStatus.REJECTED, ApprovalStatus.OPEN), (
        "Rejected items must be allowed to go back to OPEN for rework"
    )


def test_obsolete_is_terminal():
    """OBSOLETE is a terminal state -- no further transitions should be allowed."""
    allowed_from_obsolete = ALLOWED_TRANSITIONS[ApprovalStatus.OBSOLETE]
    assert len(allowed_from_obsolete) == 0, (
        f"OBSOLETE should be terminal but allows transitions to: {allowed_from_obsolete}"
    )


def test_every_status_can_reach_obsolete():
    """Every non-OBSOLETE status should allow transition to OBSOLETE (cancellation)."""
    for status in ApprovalStatus:
        if status == ApprovalStatus.OBSOLETE:
            continue
        assert is_transition_allowed(status, ApprovalStatus.OBSOLETE), (
            f"Status {status.value} should allow transition to OBSOLETE"
        )


# ---------------------------------------------------------------------------
# Tests using sample data (DB-backed)
# ---------------------------------------------------------------------------


async def test_approve_sets_approval_date(session: AsyncSession, sample_data):
    """When an item is APPROVED, its approval_date should be set."""
    for item in sample_data["cost_items"]:
        if item.approval_status == ApprovalStatus.APPROVED:
            assert item.approval_date is not None, (
                f"Item '{item.description}' is APPROVED but has no approval_date"
            )


async def test_non_approved_items_have_no_approval_date(session: AsyncSession, sample_data):
    """Items that are not APPROVED should not have an approval_date."""
    for item in sample_data["cost_items"]:
        if item.approval_status != ApprovalStatus.APPROVED:
            assert item.approval_date is None, (
                f"Item '{item.description}' with status {item.approval_status.value} "
                f"should not have an approval_date, but has {item.approval_date}"
            )


async def test_change_status_open_to_submitted(session: AsyncSession, sample_data):
    """Service should allow OPEN -> SUBMITTED_FOR_APPROVAL."""
    item = next(
        i for i in sample_data["cost_items"] if i.approval_status == ApprovalStatus.OPEN
    )

    updated = await change_status(
        session,
        cost_item_id=item.id,
        new_status=ApprovalStatus.SUBMITTED_FOR_APPROVAL,
    )

    assert updated.approval_status == ApprovalStatus.SUBMITTED_FOR_APPROVAL
    assert updated.approval_date is None


async def test_change_status_submitted_to_approved_sets_date(
    session: AsyncSession,
    sample_data,
):
    """Service should set approval_date when moving to APPROVED."""
    item = next(
        i
        for i in sample_data["cost_items"]
        if i.approval_status == ApprovalStatus.SUBMITTED_FOR_APPROVAL
    )

    updated = await change_status(
        session,
        cost_item_id=item.id,
        new_status=ApprovalStatus.APPROVED,
    )

    assert updated.approval_status == ApprovalStatus.APPROVED
    assert updated.approval_date is not None


async def test_change_status_from_approved_clears_date_when_on_hold(
    session: AsyncSession,
    sample_data,
):
    """When leaving APPROVED, approval_date should be cleared."""
    item = next(
        i for i in sample_data["cost_items"] if i.approval_status == ApprovalStatus.APPROVED
    )
    assert item.approval_date is not None

    updated = await change_status(
        session,
        cost_item_id=item.id,
        new_status=ApprovalStatus.ON_HOLD,
    )

    assert updated.approval_status == ApprovalStatus.ON_HOLD
    assert updated.approval_date is None


async def test_change_status_rejects_invalid_transition(
    session: AsyncSession,
    sample_data,
):
    """OPEN -> APPROVED should raise HTTP 409 due to workflow constraints."""
    item = next(
        i for i in sample_data["cost_items"] if i.approval_status == ApprovalStatus.OPEN
    )

    with pytest.raises(HTTPException) as exc:
        await change_status(
            session,
            cost_item_id=item.id,
            new_status=ApprovalStatus.APPROVED,
        )

    assert exc.value.status_code == 409
