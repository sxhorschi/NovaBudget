import client from './client';
import { mapWorkAreaFromApi } from './mappers';
import type { WorkArea } from '../types/budget';

export async function listWorkAreas(
  params: { facility_id?: string; department_id?: string },
): Promise<WorkArea[]> {
  const { data } = await client.get('/work-areas/', { params });
  return (data as any[]).map(mapWorkAreaFromApi);
}

export async function createWorkArea(
  params: { department_id: string; name: string },
): Promise<WorkArea> {
  const { data } = await client.post('/work-areas/', params);
  return mapWorkAreaFromApi(data);
}

export async function updateWorkArea(
  id: string,
  params: { name?: string },
): Promise<WorkArea> {
  const { data } = await client.put(`/work-areas/${id}`, params);
  return mapWorkAreaFromApi(data);
}

export async function deleteWorkArea(id: string): Promise<void> {
  await client.delete(`/work-areas/${id}`);
}
