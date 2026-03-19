import client from './client';
import { mapBudgetAdjustmentFromApi } from './mappers';
import type { AdjustmentCategory, BudgetAdjustment } from '../types/budget';

export interface CreateBudgetAdjustmentParams {
  department_id: string;
  amount: number;
  reason: string;
  category: AdjustmentCategory;
}

/** Map frontend lowercase categories to backend UPPER_CASE enum values. */
const CATEGORY_TO_BACKEND: Record<AdjustmentCategory, string> = {
  product_change: 'PRODUCT_CHANGE',
  supplier_change: 'SUPPLIER_CHANGE',
  scope_change: 'SCOPE_CHANGE',
  optimization: 'OPTIMIZATION',
  other: 'OTHER',
};

export async function listBudgetAdjustments(departmentId: string): Promise<BudgetAdjustment[]> {
  const { data } = await client.get('/budget-adjustments/', {
    params: { department_id: departmentId },
  });
  return (data as any[]).map(mapBudgetAdjustmentFromApi);
}

export async function createBudgetAdjustment(
  params: CreateBudgetAdjustmentParams,
): Promise<void> {
  await client.post('/budget-adjustments/', {
    department_id: params.department_id,
    amount: params.amount,
    reason: params.reason,
    category: CATEGORY_TO_BACKEND[params.category] ?? 'OTHER',
  });
}
