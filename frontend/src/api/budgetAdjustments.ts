import client from './client';
import { mapChangeCostFromApi } from './mappers';
import type { AdjustmentCategory, ChangeCost } from '../types/budget';

export interface CreateChangeCostParams {
  functional_area_id: string;
  amount: number;
  reason: string;
  category: AdjustmentCategory;
  cost_driver: string;
  budget_relevant: boolean;
  year: number;
}

/** Map frontend lowercase categories to backend UPPER_CASE enum values. */
const CATEGORY_TO_BACKEND: Record<AdjustmentCategory, string> = {
  product_change: 'PRODUCT_CHANGE',
  supplier_change: 'SUPPLIER_CHANGE',
  scope_change: 'SCOPE_CHANGE',
  optimization: 'OPTIMIZATION',
  other: 'OTHER',
};

export async function listChangeCosts(functionalAreaId: string): Promise<ChangeCost[]> {
  const { data } = await client.get('/change-costs/', {
    params: { functional_area_id: functionalAreaId },
  });
  return (data as any[]).map(mapChangeCostFromApi);
}

export async function createChangeCost(
  params: CreateChangeCostParams,
): Promise<ChangeCost> {
  const { data } = await client.post('/change-costs/', {
    functional_area_id: params.functional_area_id,
    amount: params.amount,
    reason: params.reason,
    category: CATEGORY_TO_BACKEND[params.category] ?? 'OTHER',
    cost_driver: params.cost_driver,
    budget_relevant: params.budget_relevant,
    year: params.year,
  });
  return mapChangeCostFromApi(data);
}
