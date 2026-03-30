import client from './client';
import type { PriceHistory } from '../types/budget';

/**
 * Fetch all price history entries for a cost item, ordered chronologically.
 */
export async function listPriceHistory(costItemId: string): Promise<PriceHistory[]> {
  const { data } = await client.get(`/cost-items/${costItemId}/price-history`);
  return (data ?? []).map((entry: any) => ({
    id: entry.id,
    cost_item_id: entry.cost_item_id,
    unit_price: Number(entry.unit_price ?? 0),
    quantity: Number(entry.quantity ?? 0),
    total_amount: Number(entry.total_amount ?? 0),
    cost_basis: entry.cost_basis ?? '',
    comment: entry.comment ?? null,
    created_by: entry.created_by ?? null,
    created_at: entry.created_at,
  }));
}

/**
 * Create a new price history entry (new offer/estimate) and update the cost item.
 */
export async function createPriceHistory(
  costItemId: string,
  data: {
    unit_price: number;
    quantity: number;
    total_amount: number;
    cost_basis: string;
    comment?: string;
  },
): Promise<PriceHistory> {
  const { data: entry } = await client.post(`/cost-items/${costItemId}/price-history`, data);
  return {
    id: entry.id,
    cost_item_id: entry.cost_item_id,
    unit_price: Number(entry.unit_price ?? 0),
    quantity: Number(entry.quantity ?? 0),
    total_amount: Number(entry.total_amount ?? 0),
    cost_basis: entry.cost_basis ?? '',
    comment: entry.comment ?? null,
    created_by: entry.created_by ?? null,
    created_at: entry.created_at,
  };
}
