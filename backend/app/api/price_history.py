"""Price history endpoints — read-only listing of price changes for a cost item."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_facility_access
from app.db import get_session
from app.models import CostItem, FunctionalArea, WorkArea
from app.models.price_history import PriceHistory
from app.schemas.price_history import PriceHistoryCreate, PriceHistoryRead

router = APIRouter(prefix="/api/v1/cost-items", tags=["price-history"])


@router.get(
    "/{item_id}/price-history",
    response_model=list[PriceHistoryRead],
)
async def list_price_history(
    item_id: UUID,
    user: UserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    """Return all price history entries for a cost item, ordered chronologically."""
    # Verify item exists
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")
    # Facility access check
    wa = await session.get(WorkArea, item.work_area_id)
    if wa:
        fa = await session.get(FunctionalArea, wa.functional_area_id)
        if fa:
            await require_facility_access(fa.facility_id, user, session)

    stmt = (
        select(PriceHistory)
        .where(PriceHistory.cost_item_id == item_id)
        .order_by(PriceHistory.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post(
    "/{item_id}/price-history",
    response_model=PriceHistoryRead,
    status_code=201,
)
async def create_price_history(
    item_id: UUID,
    body: PriceHistoryCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Create a new price history entry and update the cost item's amounts."""
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")

    # Create price history entry
    entry = PriceHistory(
        cost_item_id=item_id,
        unit_price=body.unit_price,
        quantity=body.quantity,
        total_amount=body.total_amount,
        cost_basis=body.cost_basis,
        comment=body.comment,
        created_by=user.email,
    )
    session.add(entry)

    # Update the cost item's amounts
    item.unit_price = body.unit_price
    item.quantity = body.quantity
    item.total_amount = body.total_amount

    await session.commit()
    await session.refresh(entry)
    return entry
