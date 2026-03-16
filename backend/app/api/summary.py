from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.summary import BudgetSummary, CashOutEntry, DepartmentSummary
from app.services.aggregation import (
    get_budget_summary,
    get_cash_out_timeline,
    get_department_summaries,
)

router = APIRouter(prefix="/api/v1/summary", tags=["summary"])


@router.get("/budget", response_model=BudgetSummary)
async def budget_summary(session: AsyncSession = Depends(get_session)):
    return await get_budget_summary(session)


@router.get("/departments", response_model=list[DepartmentSummary])
async def department_summaries(session: AsyncSession = Depends(get_session)):
    return await get_department_summaries(session)


@router.get("/cash-out", response_model=list[CashOutEntry])
async def cash_out_timeline(session: AsyncSession = Depends(get_session)):
    return await get_cash_out_timeline(session)
