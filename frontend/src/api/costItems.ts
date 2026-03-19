import client from './client';
import { mapCostItemFromApi, mapCostItemToApi } from './mappers';
import type { CostItem } from '../types/budget';

const PAGE_SIZE = 500;

/**
 * Fetches all cost items for a facility, handling pagination automatically.
 */
export async function listCostItems(facilityId: string): Promise<CostItem[]> {
  const items: CostItem[] = [];
  let page = 1;

  while (true) {
    const { data } = await client.get('/cost-items/', {
      params: { facility_id: facilityId, page, page_size: PAGE_SIZE },
    });

    const mapped = (data.items as any[]).map(mapCostItemFromApi);
    items.push(...mapped);

    if (items.length >= data.total || mapped.length < PAGE_SIZE) break;
    page++;
  }

  return items;
}

export async function createCostItem(
  item: Omit<CostItem, 'id' | 'created_at' | 'updated_at'>,
): Promise<CostItem> {
  const { data } = await client.post('/cost-items/', mapCostItemToApi(item));
  return mapCostItemFromApi(data);
}

export async function updateCostItem(
  id: string,
  item: Partial<CostItem>,
): Promise<CostItem> {
  const { data } = await client.put(`/cost-items/${id}`, mapCostItemToApi(item));
  return mapCostItemFromApi(data);
}

export async function deleteCostItem(id: string): Promise<void> {
  await client.delete(`/cost-items/${id}`);
}

/** Change approval status via the workflow endpoint (PUT rejects status changes). */
export async function changeStatus(
  id: string,
  newStatus: string,
): Promise<CostItem> {
  const { data } = await client.patch(`/cost-items/${id}/status`, {
    status: newStatus.toUpperCase(),
  });
  return mapCostItemFromApi(data);
}
