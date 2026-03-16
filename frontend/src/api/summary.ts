import client from './client';
import type { BudgetSummary, DepartmentSummary, CashOutEntry } from '../types/budget';

export async function getBudgetSummary(): Promise<BudgetSummary> {
  const response = await client.get<BudgetSummary>('/summary/budget');
  return response.data;
}

export async function getDepartmentSummaries(): Promise<DepartmentSummary[]> {
  const response = await client.get<DepartmentSummary[]>('/summary/departments');
  return response.data;
}

export async function getCashOutTimeline(): Promise<CashOutEntry[]> {
  const response = await client.get<CashOutEntry[]>('/summary/cash-out');
  return response.data;
}
