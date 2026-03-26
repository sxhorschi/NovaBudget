import client from './client';
import type { FunctionalAreaBudget } from '../types/budget';

function mapFromApi(data: any): FunctionalAreaBudget {
  return {
    id: data.id,
    functional_area_id: data.functional_area_id,
    year: Number(data.year),
    amount: Number(data.amount ?? 0),
    comment: data.comment ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function listFunctionalAreaBudgets(
  functionalAreaId: string,
): Promise<FunctionalAreaBudget[]> {
  const { data } = await client.get(
    `/functional-areas/${functionalAreaId}/budgets/`,
  );
  return (data as any[]).map(mapFromApi);
}

export async function createFunctionalAreaBudget(
  functionalAreaId: string,
  params: { year: number; amount: number; comment?: string | null },
): Promise<FunctionalAreaBudget> {
  const { data } = await client.post(
    `/functional-areas/${functionalAreaId}/budgets/`,
    {
      year: params.year,
      amount: params.amount,
      comment: params.comment ?? null,
    },
  );
  return mapFromApi(data);
}

export async function updateFunctionalAreaBudget(
  functionalAreaId: string,
  budgetId: string,
  params: { year?: number; amount?: number; comment?: string | null },
): Promise<FunctionalAreaBudget> {
  const { data } = await client.put(
    `/functional-areas/${functionalAreaId}/budgets/${budgetId}`,
    params,
  );
  return mapFromApi(data);
}

export async function deleteFunctionalAreaBudget(
  functionalAreaId: string,
  budgetId: string,
): Promise<void> {
  await client.delete(
    `/functional-areas/${functionalAreaId}/budgets/${budgetId}`,
  );
}
