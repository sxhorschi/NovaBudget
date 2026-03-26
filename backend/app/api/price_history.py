"""Price history endpoints — read-only listing of price changes for a cost item."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import CostItem
from app.models.price_history import PriceHistory
from app.schemas.price_history import PriceHistoryRead

router = APIRouter(prefix="/api/v1/cost-items", tags=["price-history"])


@router.get(
    "/{item_id}/price-history",
    response_model=list[PriceHistoryRead],
)
async def list_price_history(
    item_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Return all price history entries for a cost item, ordered chronologically."""
    # Verify item exists
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")

    stmt = (
        select(PriceHistory)
        .where(PriceHistory.cost_item_id == item_id)
        .order_by(PriceHistory.created_at.asc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()
