"""API router for budget adjustments (Zielanpassungen).

Adjustments are immutable: only POST (create) and GET (list/detail) are
exposed.  There are deliberately no PUT or DELETE endpoints.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.budget_adjustment import BudgetAdjustment
from app.models.department import Department
from app.schemas.budget_adjustment import BudgetAdjustmentCreate, BudgetAdjustmentRead

router = APIRouter(prefix="/api/v1/budget-adjustments", tags=["budget-adjustments"])


@router.get("/", response_model=list[BudgetAdjustmentRead])
async def list_budget_adjustments(
    department_id: UUID | None = None,
    session: AsyncSession = Depends(get_session),
):
    """List all budget adjustments, optionally filtered by department."""
    stmt = select(BudgetAdjustment).order_by(BudgetAdjustment.created_at)
    if department_id:
        stmt = stmt.where(BudgetAdjustment.department_id == department_id)
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


@router.post("/", response_model=BudgetAdjustmentRead, status_code=201)
async def create_budget_adjustment(
    data: BudgetAdjustmentCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new budget adjustment.

    The adjustment is immutable once created — there is no update or delete
    endpoint.
    """
    # Verify department exists
    dept = await session.get(Department, data.department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    adjustment = BudgetAdjustment(**data.model_dump())
    session.add(adjustment)
    await session.commit()
    await session.refresh(adjustment)
    return adjustment
