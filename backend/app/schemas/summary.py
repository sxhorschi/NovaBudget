from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class BudgetSummary(BaseModel):
    total_budget: Decimal
    total_spent: Decimal
    total_approved: Decimal
    total_delta: Decimal
    cost_of_completion: Decimal


class DepartmentSummary(BaseModel):
    department_name: str
    budget_total: Decimal | None = None
    total_spent: Decimal
    total_approved: Decimal
    total_delta: Decimal


class CashOutEntry(BaseModel):
    month: date
    amount: Decimal
