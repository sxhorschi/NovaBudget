import client from './client';

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface TransferCostItemsParams {
  source_facility_id: string;
  target_facility_id: string;
  cost_item_ids: string[];
  target_work_area_id: string;
  mode: 'copy' | 'move';
  reset_status: boolean;
  reset_amounts: boolean;
  notes?: string;
}

export interface TransferWorkAreasParams {
  source_facility_id: string;
  target_facility_id: string;
  work_area_ids: string[];
  target_department_id: string;
  mode: 'copy' | 'move';
  reset_status: boolean;
  reset_amounts: boolean;
  notes?: string;
}

export interface TransferDepartmentsParams {
  source_facility_id: string;
  target_facility_id: string;
  department_ids: string[];
  mode: 'copy' | 'move';
  reset_status: boolean;
  reset_amounts: boolean;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface TransferLogEntry {
  id: string;
  entity_type: string;
  source_entity_id: string;
  target_entity_id: string;
  source_facility_id: string;
  target_facility_id: string;
  transfer_mode: string;
  created_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface TransferResult {
  transferred_count: number;
  transfer_mode: string;
  entity_type: string;
  logs: TransferLogEntry[];
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function transferCostItems(params: TransferCostItemsParams): Promise<TransferResult> {
  const response = await client.post<TransferResult>('/transfers/cost-items', params);
  return response.data;
}

export async function transferWorkAreas(params: TransferWorkAreasParams): Promise<TransferResult> {
  const response = await client.post<TransferResult>('/transfers/work-areas', params);
  return response.data;
}

export async function transferDepartments(params: TransferDepartmentsParams): Promise<TransferResult> {
  const response = await client.post<TransferResult>('/transfers/departments', params);
  return response.data;
}

export async function getTransferLog(filters?: {
  facilityId?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}): Promise<TransferLogEntry[]> {
  const params: Record<string, string | number> = {};
  if (filters?.facilityId) params.source_facility_id = filters.facilityId;
  if (filters?.entityType) params.entity_type = filters.entityType;
  if (filters?.limit != null) params.limit = filters.limit;
  if (filters?.offset != null) params.offset = filters.offset;

  const response = await client.get<TransferLogEntry[]>('/transfers/log', { params });
  return response.data;
}
