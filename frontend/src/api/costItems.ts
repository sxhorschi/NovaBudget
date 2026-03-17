import client from './client';
import type { CostItem, WorkArea } from '../types/budget';

export type CostItemCreate = Omit<CostItem, 'id' | 'created_at' | 'updated_at' | 'approval_date'>;

export async function getCostItems(filters?: {
  department_id?: string;
  project_phase?: string;
  product?: string;
  approval_status?: string;
}): Promise<CostItem[]> {
  const response = await client.get<CostItem[]>('/cost-items', { params: filters });
  return response.data;
}

export async function getCostItemsByDepartment(departmentId: string): Promise<WorkArea[]> {
  const response = await client.get<WorkArea[]>(`/departments/${departmentId}/work-areas`);
  return response.data;
}

export async function createCostItem(data: CostItemCreate): Promise<CostItem> {
  const response = await client.post<CostItem>('/cost-items', data);
  return response.data;
}

export async function updateCostItem(id: string, data: Partial<CostItem>): Promise<CostItem> {
  const response = await client.put<CostItem>(`/cost-items/${id}`, data);
  return response.data;
}

export async function deleteCostItem(id: string): Promise<void> {
  await client.delete(`/cost-items/${id}`);
}
