"""CRUD endpoints for FunctionalAreaBudget (yearly budget entries)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models import FunctionalArea, FunctionalAreaBudget
from app.schemas.functional_area_budget import (
    FunctionalAreaBudgetCreate,
    FunctionalAreaBudgetRead,
    FunctionalAreaBudgetUpdate,
)
from app.services.audit import build_changes, log_change

router = APIRouter(
    prefix="/api/v1/functional-areas/{fa_id}/budgets",
    tags=["functional-area-budgets"],
)


async def _get_fa_or_404(
    fa_id: UUID, session: AsyncSession
) -> FunctionalArea:
    fa = await session.get(FunctionalArea, fa_id)
    if not fa:
        raise HTTPException(status_code=404, detail="Functional area not found")
    return fa


@router.get("/", response_model=list[FunctionalAreaBudgetRead])
async def list_budgets(
    fa_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    await _get_fa_or_404(fa_id, session)
    stmt = (
        select(FunctionalAreaBudget)
        .where(FunctionalAreaBudget.functional_area_id == fa_id)
        .order_by(FunctionalAreaBudget.year)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post(
    "/",
    response_model=FunctionalAreaBudgetRead,
    status_code=201,
    dependencies=[Depends(require_role("admin", "editor"))],
)
async def create_budget(
    fa_id: UUID,
    data: FunctionalAreaBudgetCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    await _get_fa_or_404(fa_id, session)

    budget = FunctionalAreaBudget(
        functional_area_id=fa_id,
        **data.model_dump(),
    )
    session.add(budget)
    try:
        await session.flush()
    except Exception:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Budget for year {data.year} already exists for this functional area.",
        )
    await log_change(
        session,
        "functional_area_budget",
        budget.id,
        "created",
        user_id=user.email,
    )
    await session.commit()
    await session.refresh(budget)
    return budget


@router.put(
    "/{budget_id}",
    response_model=FunctionalAreaBudgetRead,
    dependencies=[Depends(require_role("admin", "editor"))],
)
async def update_budget(
    fa_id: UUID,
    budget_id: UUID,
    data: FunctionalAreaBudgetUpdate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    budget = await session.get(FunctionalAreaBudget, budget_id)
    if not budget or budget.functional_area_id != fa_id:
        raise HTTPException(status_code=404, detail="Budget entry not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return budget

    old_values = {k: getattr(budget, k) for k in update_data}
    for key, value in update_data.items():
        setattr(budget, key, value)

    changes = build_changes(old_values, update_data)
    if changes:
        await log_change(
            session,
            "functional_area_budget",
            budget.id,
            "updated",
            changes=changes,
            user_id=user.email,
        )
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Budget for year {data.year} already exists for this functional area.",
        )
    await session.refresh(budget)
    return budget


@router.delete(
    "/{budget_id}",
    status_code=204,
    dependencies=[Depends(require_role("admin", "editor"))],
)
async def delete_budget(
    fa_id: UUID,
    budget_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    budget = await session.get(FunctionalAreaBudget, budget_id)
    if not budget or budget.functional_area_id != fa_id:
        raise HTTPException(status_code=404, detail="Budget entry not found")

    budget_id_copy = budget.id
    await session.delete(budget)
    await log_change(
        session,
        "functional_area_budget",
        budget_id_copy,
        "deleted",
        user_id=user.email,
    )
    await session.commit()
