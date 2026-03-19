import client from './client';
import { mapFacilityFromApi } from './mappers';
import type { Facility } from '../types/budget';

export async function listFacilities(): Promise<Facility[]> {
  const { data } = await client.get('/facilities/');
  return (data as any[]).map(mapFacilityFromApi);
}

export async function createFacility(
  params: { name: string; location?: string; description?: string },
): Promise<Facility> {
  const { data } = await client.post('/facilities/', params);
  return mapFacilityFromApi(data);
}

export async function updateFacility(
  id: string,
  params: { name?: string; location?: string; description?: string },
): Promise<Facility> {
  const { data } = await client.put(`/facilities/${id}`, params);
  return mapFacilityFromApi(data);
}

export async function deleteFacility(id: string): Promise<void> {
  await client.delete(`/facilities/${id}`);
}
