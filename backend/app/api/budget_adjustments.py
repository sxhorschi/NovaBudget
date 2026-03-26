"""API router for budget adjustments (Zielanpassungen).

Adjustments are immutable: only POST (create) and GET (list/detail) are
exposed.  There are deliberately no PUT or DELETE endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models.budget_adjustment import BudgetAdjustment
from app.models.functional_area import FunctionalArea
from app.schemas.budget_adjustment import BudgetAdjustmentCreate, BudgetAdjustmentRead
from app.services.audit import log_change

router = APIRouter(prefix="/api/v1/budget-adjustments", tags=["budget-adjustments"])


@router.get("/", response_model=list[BudgetAdjustmentRead])
async def list_budget_adjustments(
    functional_area_id: UUID | None = None,
    session: AsyncSession = Depends(get_session),
):
    """List all budget adjustments, optionally filtered by functional area."""
    stmt = select(BudgetAdjustment).order_by(BudgetAdjustment.created_at)
    if functional_area_id:
        stmt = stmt.where(BudgetAdjustment.functional_area_id == functional_area_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{adjustment_id}", response_model=BudgetAdjustmentRead)
async def get_budget_adjustment(
    adjustment_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Get a single budget adjustment by ID."""
    item = await session.get(BudgetAdjustment, adjustment_id)
    if not item:
        raise HTTPException(status_code=404, detail="Budget adjustment not found")
    return item


@router.post("/", response_model=BudgetAdjustmentRead, status_code=201, dependencies=[Depends(require_role("admin", "editor"))])
async def create_budget_adjustment(
    data: BudgetAdjustmentCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Create a new budget adjustment.

    The adjustment is immutable once created — there is no update or delete
    endpoint.
    """
    # Verify functional area exists
    fa = await session.get(FunctionalArea, data.functional_area_id)
    if not fa:
        raise HTTPException(status_code=404, detail="Functional area not found")

    adjustment = BudgetAdjustment(**data.model_dump())
    session.add(adjustment)
    await session.flush()
    await log_change(session, "budget_adjustment", adjustment.id, "created", user_id=user.email)
    await session.commit()
    await session.refresh(adjustment)
    return adjustment
