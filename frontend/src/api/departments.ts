import client from './client';
import { mapDepartmentFromApi } from './mappers';
import type { Department } from '../types/budget';

export async function listDepartments(facilityId: string): Promise<Department[]> {
  const { data } = await client.get('/departments/', {
    params: { facility_id: facilityId },
  });
  return (data as any[]).map(mapDepartmentFromApi);
}

export async function createDepartment(
  params: { facility_id: string; name: string; budget_total?: number },
): Promise<Department> {
  const { data } = await client.post('/departments/', {
    facility_id: params.facility_id,
    name: params.name,
    budget_total: params.budget_total ?? 0,
  });
  return mapDepartmentFromApi(data);
}

export async function updateDepartment(
  id: string,
  params: { name?: string; budget_total?: number },
): Promise<Department> {
  const { data } = await client.put(`/departments/${id}`, params);
  return mapDepartmentFromApi(data);
}

export async function deleteDepartment(id: string): Promise<void> {
  await client.delete(`/departments/${id}`);
}
