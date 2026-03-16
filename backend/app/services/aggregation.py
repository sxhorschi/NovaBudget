from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CostItem, Department, WorkArea
from app.models.enums import ApprovalStatus
from app.schemas.summary import BudgetSummary, CashOutEntry, DepartmentSummary


async def get_budget_summary(session: AsyncSession) -> BudgetSummary:
    # Total budget across all departments
    budget_result = await session.execute(
        select(func.coalesce(func.sum(Department.budget_total), 0))
    )
    total_budget = budget_result.scalar_one()

    # Total current amounts (spent/committed)
    spent_result = await session.execute(
        select(func.coalesce(func.sum(CostItem.current_amount), 0))
    )
    total_spent = spent_result.scalar_one()

    # Total approved amounts
    approved_result = await session.execute(
        select(func.coalesce(func.sum(CostItem.current_amount), 0)).where(
            CostItem.approval_status == ApprovalStatus.APPROVED
        )
    )
    total_approved = approved_result.scalar_one()

    # Delta: budget minus current total
    total_delta = total_budget - total_spent

    # Cost of completion: sum of items not yet approved
    coc_result = await session.execute(
        select(func.coalesce(func.sum(CostItem.current_amount), 0)).where(
            CostItem.approval_status != ApprovalStatus.APPROVED
        )
    )
    cost_of_completion = coc_result.scalar_one()

    return BudgetSummary(
        total_budget=total_budget,
        total_spent=total_spent,
        total_approved=total_approved,
        total_delta=total_delta,
        cost_of_completion=cost_of_completion,
    )


async def get_department_summaries(session: AsyncSession) -> list[DepartmentSummary]:
    stmt = select(Department).order_by(Department.name)
    result = await session.execute(stmt)
    departments = result.scalars().all()

    summaries = []
    for dept in departments:
        # Get cost items for this department via work areas
        items_stmt = (
            select(CostItem)
            .join(WorkArea)
            .where(WorkArea.department_id == dept.id)
        )
        items_result = await session.execute(items_stmt)
        items = items_result.scalars().all()

        total_spent = sum((item.current_amount or Decimal(0)) for item in items)
        total_approved = sum(
            (item.current_amount or Decimal(0))
            for item in items
            if item.approval_status == ApprovalStatus.APPROVED
        )

        budget = dept.budget_total or Decimal(0)
        summaries.append(
            DepartmentSummary(
                department_name=dept.name,
                budget_total=dept.budget_total,
                total_spent=total_spent,
                total_approved=total_approved,
                total_delta=budget - total_spent,
            )
        )

    return summaries


async def get_cash_out_timeline(session: AsyncSession) -> list[CashOutEntry]:
    stmt = (
        select(
            func.date_trunc("month", CostItem.expected_cash_out).label("month"),
            func.sum(CostItem.current_amount).label("amount"),
        )
        .where(CostItem.expected_cash_out.is_not(None))
        .group_by(func.date_trunc("month", CostItem.expected_cash_out))
        .order_by(func.date_trunc("month", CostItem.expected_cash_out))
    )
    result = await session.execute(stmt)
    rows = result.all()

    return [
        CashOutEntry(month=row.month.date() if hasattr(row.month, "date") else row.month, amount=row.amount)
        for row in rows
    ]
