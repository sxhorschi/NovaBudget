"""API router for change costs (formerly budget adjustments).

Change costs are immutable: only POST (create) and GET (list/detail) are
exposed.  There are deliberately no PUT or DELETE endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models.change_cost import ChangeCost
from app.models.functional_area import FunctionalArea
from app.schemas.change_cost import ChangeCostCreate, ChangeCostRead
from app.services.audit import log_change

router = APIRouter(prefix="/api/v1/change-costs", tags=["change-costs"])


@router.get("/", response_model=list[ChangeCostRead])
async def list_change_costs(
    _user: UserDep,
    functional_area_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
):
    """List all change costs, optionally filtered by functional area."""
    stmt = select(ChangeCost).order_by(ChangeCost.created_at)
    if functional_area_id:
        stmt = stmt.where(ChangeCost.functional_area_id == functional_area_id)
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{change_cost_id}", response_model=ChangeCostRead)
async def get_change_cost(
    change_cost_id: UUID,
    _user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Get a single change cost by ID."""
    item = await session.get(ChangeCost, change_cost_id)
    if not item:
        raise HTTPException(status_code=404, detail="Change cost not found")
    return item


@router.post("/", response_model=ChangeCostRead, status_code=201, dependencies=[Depends(require_role("admin", "editor"))])
async def create_change_cost(
    data: ChangeCostCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Create a new change cost.

    The change cost is immutable once created — there is no update or delete
    endpoint.
    """
    # Verify functional area exists
    fa = await session.get(FunctionalArea, data.functional_area_id)
    if not fa:
        raise HTTPException(status_code=404, detail="Functional area not found")

    change_cost = ChangeCost(**data.model_dump())
    session.add(change_cost)
    await session.flush()
    await log_change(session, "change_cost", change_cost.id, "created", user_id=user.email)
    await session.commit()
    await session.refresh(change_cost)
    return change_cost
