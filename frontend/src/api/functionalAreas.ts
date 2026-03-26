import client from './client';
import { mapFunctionalAreaFromApi } from './mappers';
import type { FunctionalArea } from '../types/budget';

export async function listFunctionalAreas(facilityId: string): Promise<FunctionalArea[]> {
  const { data } = await client.get('/functional-areas/', {
    params: { facility_id: facilityId },
  });
  return (data as any[]).map(mapFunctionalAreaFromApi);
}

export async function createFunctionalArea(
  params: { facility_id: string; name: string; budget_total?: number },
): Promise<FunctionalArea> {
  const { data } = await client.post('/functional-areas/', {
    facility_id: params.facility_id,
    name: params.name,
    budget_total: params.budget_total ?? 0,
  });
  return mapFunctionalAreaFromApi(data);
}

export async function updateFunctionalArea(
  id: string,
  params: { name?: string; budget_total?: number },
): Promise<FunctionalArea> {
  const { data } = await client.put(`/functional-areas/${id}`, params);
  return mapFunctionalAreaFromApi(data);
}

export async function deleteFunctionalArea(id: string): Promise<void> {
  await client.delete(`/functional-areas/${id}`);
}
