from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_facility_access, require_role
from app.db import get_session
from app.models import AuditLog, CostItem, WorkArea
from app.models.enums import ApprovalStatus
from app.models.price_history import PriceHistory
from app.schemas.approval import AuditLogRead, StatusChangeRequest, StatusChangeWithComment
from app.schemas.cost_item import (
    CostItemCreate,
    CostItemRead,
    CostItemSearchResult,
    CostItemUpdate,
)
from app.services.approval import change_status
from app.services.audit import build_changes, log_change
from app.services.search import CostItemSearchParams, search_cost_items

router = APIRouter(prefix="/api/v1/cost-items", tags=["cost-items"])


# ── Helpers for comma-separated multi-value query params ─────────────────

def _parse_uuids(raw: str | None) -> list[UUID]:
    if not raw:
        return []

    values: list[UUID] = []
    for token in raw.split(","):
        cleaned = token.strip()
        if not cleaned:
            continue
        try:
            values.append(UUID(cleaned))
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid UUID value: {cleaned}",
            ) from exc
    return values


def _parse_csv(raw: str | None) -> list[str]:
    """Split a comma-separated string into a list of non-empty stripped strings."""
    if not raw:
        return []
    return [token.strip() for token in raw.split(",") if token.strip()]


def _parse_enums(raw: str | None, enum_cls: type) -> list:
    if not raw:
        return []

    values: list = []
    for token in raw.split(","):
        cleaned = token.strip()
        if not cleaned:
            continue
        try:
            values.append(enum_cls(cleaned))
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid {enum_cls.__name__} value: {cleaned}",
            ) from exc
    return values


# ── Search / List ────────────────────────────────────────────────────────

@router.get("/", response_model=CostItemSearchResult)
async def list_cost_items(
    user: UserDep,
    facility_id: UUID,
    functional_area_id: str | None = Query(None, description="Comma-separated UUIDs"),
    work_area_id: UUID | None = None,
    phase: str | None = Query(None, description="Comma-separated: PHASE_1,PHASE_2"),
    product: str | None = Query(None, description="Comma-separated: ATLAS,ORION"),
    status: str | None = Query(None, description="Comma-separated: APPROVED,OPEN"),
    cost_basis: str | None = Query(None, description="Comma-separated cost bases"),
    q: str | None = Query(None, description="Free-text search in description, assumptions"),
    min_amount: Decimal | None = None,
    max_amount: Decimal | None = None,
    cash_out_from: date | None = None,
    cash_out_to: date | None = None,
    sort_by: Literal["amount", "description", "status", "cash_out", "created_at"] | None = None,
    sort_dir: Literal["asc", "desc"] | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
):
    await require_facility_access(facility_id, user, session)
    params = CostItemSearchParams(
        facility_id=facility_id,
        functional_area_ids=_parse_uuids(functional_area_id),
        work_area_id=work_area_id,
        phases=_parse_csv(phase),
        products=_parse_csv(product),
        statuses=_parse_enums(status, ApprovalStatus),
        cost_bases=_parse_csv(cost_basis),
        q=q,
        min_amount=min_amount,
        max_amount=max_amount,
        cash_out_from=cash_out_from,
        cash_out_to=cash_out_to,
        sort_by=sort_by or "created_at",
        sort_dir=sort_dir or "asc",
        page=page,
        page_size=page_size,
    )
    return await search_cost_items(session, params)


# ── Single Item CRUD ─────────────────────────────────────────────────────

@router.get("/{item_id}", response_model=CostItemRead)
async def get_cost_item(item_id: UUID, user: UserDep, session: AsyncSession = Depends(get_session)):
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")
    from app.models import FunctionalArea
    wa = await session.get(WorkArea, item.work_area_id)
    if wa:
        fa = await session.get(FunctionalArea, wa.functional_area_id)
        if fa:
            await require_facility_access(fa.facility_id, user, session)
    return item


@router.post("/", response_model=CostItemRead, status_code=201, dependencies=[Depends(require_role("admin", "editor"))])
async def create_cost_item(
    data: CostItemCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    work_area = await session.get(WorkArea, data.work_area_id)
    if not work_area:
        raise HTTPException(status_code=404, detail="Work area not found")
    total_amount = data.unit_price * data.quantity
    item = CostItem(**data.model_dump(), total_amount=total_amount)
    session.add(item)
    await session.flush()

    # Create initial PriceHistory entry
    initial_history = PriceHistory(
        cost_item_id=item.id,
        unit_price=item.unit_price,
        quantity=item.quantity,
        total_amount=item.total_amount,
        cost_basis=item.cost_basis or "cost_estimation",
        comment="Initial price at creation",
        created_by=user.email,
    )
    session.add(initial_history)

    await log_change(session, "cost_item", item.id, "created", user_id=user.email)
    await session.commit()
    await session.refresh(item)
    return item


@router.put("/{item_id}", response_model=CostItemRead, dependencies=[Depends(require_role("admin", "editor"))])
async def update_cost_item(
    item_id: UUID,
    data: CostItemUpdate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")

    # Optimistic locking: reject if item was modified since the client last read it
    if data.expected_updated_at and item.updated_at != data.expected_updated_at:
        raise HTTPException(
            status_code=409,
            detail="This item was modified by another user. Please refresh and try again.",
        )

    update_data = data.model_dump(exclude_unset=True)
    # Statusänderungen nur über den Approval-Workflow erlauben
    if "approval_status" in update_data:
        raise HTTPException(
            status_code=409,
            detail=(
                "Der Approval-Status kann nicht direkt geändert werden. "
                "Bitte nutze die Workflow-Endpoints: "
                "POST .../submit, .../approve, .../reject oder PATCH .../status."
            ),
        )
    # Extract non-model fields before applying updates
    price_change_basis = update_data.pop("price_change_basis", None)
    update_data.pop("expected_updated_at", None)

    # Detect if price/quantity/total is changing (before mutation)
    price_changing = (
        ("unit_price" in update_data and update_data["unit_price"] != item.unit_price)
        or ("quantity" in update_data and update_data["quantity"] != item.quantity)
        or ("total_amount" in update_data and update_data["total_amount"] != item.total_amount)
    )

    # Capture old values before mutation
    old_values = {k: getattr(item, k) for k in update_data}

    for key, value in update_data.items():
        setattr(item, key, value)

    # Reconcile total_amount vs unit_price × quantity
    if "total_amount" in update_data and "unit_price" not in update_data:
        # Total was changed directly — back-compute unit_price
        if item.quantity > 0:
            item.unit_price = item.total_amount / item.quantity
        else:
            item.unit_price = item.total_amount
    elif "unit_price" in update_data or "quantity" in update_data:
        # Unit breakdown changed — recompute total
        item.total_amount = item.unit_price * item.quantity

    changes = build_changes(old_values, update_data)
    if changes:
        await log_change(session, "cost_item", item.id, "updated", changes=changes, user_id=user.email)

    # Create PriceHistory entry when price or quantity changed
    if price_changing:
        history_entry = PriceHistory(
            cost_item_id=item.id,
            unit_price=item.unit_price,
            quantity=item.quantity,
            total_amount=item.total_amount,
            cost_basis=price_change_basis or "revised_supplier_offer",
            comment=None,
            created_by=user.email,
        )
        session.add(history_entry)

    await session.commit()
    await session.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204, dependencies=[Depends(require_role("admin", "editor"))])
async def delete_cost_item(
    item_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")
    item_id_copy = item.id
    await session.delete(item)
    await log_change(session, "cost_item", item_id_copy, "deleted", user_id=user.email)
    await session.commit()


# ── Approval Workflow ────────────────────────────────────────────────────

@router.post("/{item_id}/submit", response_model=CostItemRead, tags=["approval"], dependencies=[Depends(require_role("admin", "editor"))])
async def submit_for_approval(
    item_id: UUID,
    user: UserDep,
    body: StatusChangeWithComment | None = None,
    session: AsyncSession = Depends(get_session),
):
    """Shortcut: Setzt den Status auf SUBMITTED_FOR_APPROVAL."""
    comment = body.comment if body else None
    return await change_status(
        session,
        cost_item_id=item_id,
        new_status=ApprovalStatus.SUBMITTED_FOR_APPROVAL,
        comment=comment,
        user_id=user.email,
    )


@router.post("/{item_id}/approve", response_model=CostItemRead, tags=["approval"], dependencies=[Depends(require_role("admin", "editor"))])
async def approve_cost_item(
    item_id: UUID,
    user: UserDep,
    body: StatusChangeWithComment | None = None,
    session: AsyncSession = Depends(get_session),
):
    """Shortcut: Setzt den Status auf APPROVED und setzt das approval_date."""
    comment = body.comment if body else None
    return await change_status(
        session,
        cost_item_id=item_id,
        new_status=ApprovalStatus.APPROVED,
        comment=comment,
        user_id=user.email,
    )


@router.post("/{item_id}/reject", response_model=CostItemRead, tags=["approval"], dependencies=[Depends(require_role("admin", "editor"))])
async def reject_cost_item(
    item_id: UUID,
    user: UserDep,
    body: StatusChangeWithComment | None = None,
    session: AsyncSession = Depends(get_session),
):
    """Shortcut: Setzt den Status auf REJECTED."""
    comment = body.comment if body else None
    return await change_status(
        session,
        cost_item_id=item_id,
        new_status=ApprovalStatus.REJECTED,
        comment=comment,
        user_id=user.email,
    )


@router.patch("/{item_id}/status", response_model=CostItemRead, tags=["approval"], dependencies=[Depends(require_role("admin", "editor"))])
async def change_cost_item_status(
    item_id: UUID,
    body: StatusChangeRequest,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Allgemeiner Status-Übergang. Prüft ob der Übergang erlaubt ist."""
    return await change_status(
        session,
        cost_item_id=item_id,
        new_status=body.status,
        comment=body.comment,
        user_id=user.email,
    )


@router.get(
    "/{item_id}/audit-log",
    response_model=list[AuditLogRead],
    tags=["approval"],
)
async def get_cost_item_audit_log(
    item_id: UUID,
    _user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Gibt die Statusänderungs-Historie eines Cost Items zurück."""
    # Prüfen ob Item existiert
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"Cost Item mit ID {item_id} nicht gefunden.",
        )

    stmt = (
        select(AuditLog)
        .where(AuditLog.entity_type == "cost_item")
        .where(AuditLog.entity_id == item_id)
        .order_by(AuditLog.created_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()
