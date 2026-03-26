"""Bulk operations for cost items — update, status change, delete, move, duplicate."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models import CostItem, WorkArea
from app.models.enums import ApprovalStatus
from app.rate_limit import limiter
from app.schemas.cost_item import CostItemRead
from app.services.approval import is_transition_allowed
from app.services.audit import build_changes, log_change

router = APIRouter(prefix="/api/v1/cost-items", tags=["bulk-operations"])


# ── Request / Response schemas ──────────────────────────────────────────


class BulkUpdateRequest(BaseModel):
    item_ids: list[UUID] = Field(..., min_length=1, max_length=500)
    updates: dict[str, object]


class BulkStatusRequest(BaseModel):
    item_ids: list[UUID] = Field(..., min_length=1, max_length=500)
    new_status: ApprovalStatus


class BulkDeleteRequest(BaseModel):
    item_ids: list[UUID] = Field(..., min_length=1, max_length=500)


class BulkMoveRequest(BaseModel):
    item_ids: list[UUID] = Field(..., min_length=1, max_length=500)
    target_work_area_id: UUID


class DuplicateRequest(BaseModel):
    item_id: UUID
    target_work_area_id: UUID | None = None


class BulkItemDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    item_id: UUID
    success: bool
    error: str | None = None


class BulkResponse(BaseModel):
    updated: int = 0
    errors: int = 0
    details: list[BulkItemDetail] = []


# ── Helpers ─────────────────────────────────────────────────────────────

# Fields that are allowed in a generic bulk-update payload.
UPDATABLE_FIELDS: set[str] = {
    "description",
    "unit_price",
    "quantity",
    "total_amount",
    "expected_cash_out",
    "cost_basis",
    "cost_driver",
    "basis_description",
    "assumptions",
    "approval_status",
    "approval_date",
    "project_phase",
    "product",
    "zielanpassung",
    "zielanpassung_reason",
    "comments",
}


async def _fetch_items(
    session: AsyncSession,
    item_ids: list[UUID],
) -> tuple[dict[UUID, CostItem], list[UUID]]:
    """Fetch items by IDs. Returns (found_map, missing_ids)."""
    stmt = select(CostItem).where(CostItem.id.in_(item_ids))
    result = await session.execute(stmt)
    items = {item.id: item for item in result.scalars().all()}
    missing = [uid for uid in item_ids if uid not in items]
    return items, missing


# ── POST /bulk-update ───────────────────────────────────────────────────


@router.post(
    "/bulk-update",
    response_model=BulkResponse,
    dependencies=[Depends(require_role("admin", "editor"))],
)
@limiter.limit("20/minute")
async def bulk_update(
    request: Request,
    body: BulkUpdateRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
) -> BulkResponse:
    """Apply the same field updates to multiple cost items (transactional)."""

    # Validate update keys
    invalid_keys = set(body.updates.keys()) - UPDATABLE_FIELDS
    if invalid_keys:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid update fields: {', '.join(sorted(invalid_keys))}",
        )

    if "approval_status" in body.updates or "approval_date" in body.updates:
        raise HTTPException(
            status_code=409,
            detail=(
                "Approval status/date cannot be changed via bulk-update. "
                "Use /api/v1/cost-items/bulk-status for workflow transitions."
            ),
        )

    items_map, missing = await _fetch_items(session, body.item_ids)
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Cost items not found: {', '.join(str(m) for m in missing)}",
        )

    details: list[BulkItemDetail] = []

    try:
        for uid in body.item_ids:
            item = items_map[uid]

            # Capture old values for audit
            old_values = {k: getattr(item, k) for k in body.updates}

            # Apply updates
            for key, value in body.updates.items():
                setattr(item, key, value)

            # Build audit diff
            new_values = {k: getattr(item, k) for k in body.updates}
            changes = build_changes(old_values, new_values)
            if changes:
                await log_change(
                    session=session,
                    entity_type="cost_item",
                    entity_id=uid,
                    action="updated",
                    changes=changes,
                    user_id=user.email,
                )

            details.append(BulkItemDetail(item_id=uid, success=True))

        await session.commit()
    except HTTPException:
        raise
    except Exception:
        await session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Bulk update failed — all changes rolled back.",
        )

    return BulkResponse(
        updated=len(details),
        errors=0,
        details=details,
    )


# ── POST /bulk-status ──────────────────────────────────────────────────


@router.post(
    "/bulk-status",
    response_model=BulkResponse,
    dependencies=[Depends(require_role("admin", "editor"))],
)
@limiter.limit("20/minute")
async def bulk_status(
    request: Request,
    body: BulkStatusRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
) -> BulkResponse:
    """Transition multiple items to a new approval status using workflow rules.

    All items must allow the transition — otherwise the entire batch fails.
    """
    items_map, missing = await _fetch_items(session, body.item_ids)
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Cost items not found: {', '.join(str(m) for m in missing)}",
        )

    # Pre-validate all transitions before changing anything
    for uid in body.item_ids:
        item = items_map[uid]
        if not is_transition_allowed(item.approval_status, body.new_status):
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Item {uid}: transition from {item.approval_status.value} "
                    f"to {body.new_status.value} is not allowed."
                ),
            )

    details: list[BulkItemDetail] = []

    try:
        for uid in body.item_ids:
            item = items_map[uid]
            old_status = item.approval_status

            item.approval_status = body.new_status
            if body.new_status == ApprovalStatus.APPROVED:
                item.approval_date = date.today()
            else:
                item.approval_date = None

            await log_change(
                session=session,
                entity_type="cost_item",
                entity_id=uid,
                action="updated",
                changes={
                    "approval_status": {
                        "old": old_status.value,
                        "new": body.new_status.value,
                    }
                },
                user_id=user.email,
            )

            details.append(BulkItemDetail(item_id=uid, success=True))

        await session.commit()
    except HTTPException:
        raise
    except Exception:
        await session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Bulk status change failed — all changes rolled back.",
        )

    return BulkResponse(
        updated=len(details),
        errors=0,
        details=details,
    )


# ── DELETE /bulk-delete ─────────────────────────────────────────────────


@router.delete(
    "/bulk-delete",
    response_model=BulkResponse,
    dependencies=[Depends(require_role("admin", "editor"))],
)
@limiter.limit("20/minute")
async def bulk_delete(
    request: Request,
    body: BulkDeleteRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
) -> BulkResponse:
    """Delete multiple cost items (transactional)."""
    items_map, missing = await _fetch_items(session, body.item_ids)
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Cost items not found: {', '.join(str(m) for m in missing)}",
        )

    details: list[BulkItemDetail] = []

    try:
        for uid in body.item_ids:
            item = items_map[uid]
            await session.delete(item)

            await log_change(
                session=session,
                entity_type="cost_item",
                entity_id=uid,
                action="deleted",
                user_id=user.email,
            )

            details.append(BulkItemDetail(item_id=uid, success=True))

        await session.commit()
    except HTTPException:
        raise
    except Exception:
        await session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Bulk delete failed — all changes rolled back.",
        )

    return BulkResponse(
        updated=len(details),
        errors=0,
        details=details,
    )


# ── POST /bulk-move ─────────────────────────────────────────────────────


@router.post(
    "/bulk-move",
    response_model=BulkResponse,
    dependencies=[Depends(require_role("admin", "editor"))],
)
@limiter.limit("20/minute")
async def bulk_move(
    request: Request,
    body: BulkMoveRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
) -> BulkResponse:
    """Move multiple cost items to a different work area (transactional)."""
    # Verify target work area exists
    target_wa = await session.get(WorkArea, body.target_work_area_id)
    if not target_wa:
        raise HTTPException(
            status_code=404,
            detail=f"Target work area not found: {body.target_work_area_id}",
        )

    items_map, missing = await _fetch_items(session, body.item_ids)
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Cost items not found: {', '.join(str(m) for m in missing)}",
        )

    details: list[BulkItemDetail] = []

    try:
        for uid in body.item_ids:
            item = items_map[uid]
            old_wa_id = item.work_area_id

            item.work_area_id = body.target_work_area_id

            await log_change(
                session=session,
                entity_type="cost_item",
                entity_id=uid,
                action="updated",
                changes={
                    "work_area_id": {
                        "old": str(old_wa_id),
                        "new": str(body.target_work_area_id),
                    }
                },
                user_id=user.email,
            )

            details.append(BulkItemDetail(item_id=uid, success=True))

        await session.commit()
    except HTTPException:
        raise
    except Exception:
        await session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Bulk move failed — all changes rolled back.",
        )

    return BulkResponse(
        updated=len(details),
        errors=0,
        details=details,
    )


# ── POST /duplicate ────────────────────────────────────────────────────


@router.post(
    "/duplicate",
    response_model=CostItemRead,
    status_code=201,
    dependencies=[Depends(require_role("admin", "editor"))],
)
async def duplicate_cost_item(
    body: DuplicateRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
) -> CostItem:
    """Duplicate a cost item, resetting status to OPEN."""
    source = await session.get(CostItem, body.item_id)
    if not source:
        raise HTTPException(
            status_code=404,
            detail=f"Source cost item not found: {body.item_id}",
        )

    target_wa_id = body.target_work_area_id or source.work_area_id

    # If a different work area is specified, verify it exists
    if body.target_work_area_id and body.target_work_area_id != source.work_area_id:
        target_wa = await session.get(WorkArea, body.target_work_area_id)
        if not target_wa:
            raise HTTPException(
                status_code=404,
                detail=f"Target work area not found: {body.target_work_area_id}",
            )

    try:
        new_item = CostItem(
            work_area_id=target_wa_id,
            description=source.description,
            unit_price=source.unit_price,
            quantity=source.quantity,
            total_amount=source.total_amount,
            expected_cash_out=source.expected_cash_out,
            cost_basis=source.cost_basis,
            cost_driver=source.cost_driver,
            basis_description=source.basis_description,
            assumptions=source.assumptions,
            approval_status=ApprovalStatus.OPEN,
            approval_date=None,
            project_phase=source.project_phase,
            product=source.product,
            zielanpassung=None,
            zielanpassung_reason=None,
            comments=source.comments,
        )
        session.add(new_item)
        await session.flush()

        await log_change(
            session=session,
            entity_type="cost_item",
            entity_id=new_item.id,
            action="created",
            changes={
                "duplicated_from": {
                    "old": None,
                    "new": str(body.item_id),
                }
            },
            user_id=user.email,
        )

        await session.commit()
        await session.refresh(new_item)

        return new_item
    except HTTPException:
        raise
    except Exception:
        await session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Duplication failed.",
        )
