import type {
  Facility,
  Department,
  WorkArea,
  CostItem,
  ApprovalStatus,
  BudgetAdjustment,
  AdjustmentCategory,
} from '../types/budget';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Backend UPPER_CASE enum -> frontend lowercase */
const toLower = (v: string | null | undefined): string => (v ?? '').toLowerCase();

/** Frontend lowercase enum -> backend UPPER_CASE */
const toUpper = (v: string | null | undefined): string => (v ?? '').toUpperCase();

// ---------------------------------------------------------------------------
// From API
// ---------------------------------------------------------------------------

export function mapFacilityFromApi(data: any): Facility {
  return {
    id: data.id,
    name: data.name,
    location: data.location ?? '',
    description: data.description ?? '',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export function mapDepartmentFromApi(data: any): Department {
  return {
    id: data.id,
    facility_id: data.facility_id,
    name: data.name,
    budget_total: Number(data.budget_total ?? 0),
  };
}

export function mapWorkAreaFromApi(data: any): WorkArea {
  return {
    id: data.id,
    department_id: data.department_id,
    name: data.name,
  };
}

export function mapCostItemFromApi(data: any): CostItem {
  return {
    id: data.id,
    work_area_id: data.work_area_id,
    description: data.description ?? '',
    original_amount: Number(data.original_amount ?? 0),
    current_amount: Number(data.current_amount ?? 0),
    expected_cash_out: (data.expected_cash_out ?? '').slice(0, 7),
    cost_basis: data.cost_basis ?? '',
    cost_driver: data.cost_driver ?? '',
    basis_description: data.basis_description ?? '',
    assumptions: data.assumptions ?? '',
    approval_status: toLower(data.approval_status) as ApprovalStatus,
    approval_date: data.approval_date ?? null,
    project_phase: data.project_phase ?? '',
    product: data.product ?? '',
    zielanpassung: data.zielanpassung != null ? Number(data.zielanpassung) : null,
    zielanpassung_reason: data.zielanpassung_reason ?? '',
    comments: data.comments ?? '',
    requester: data.requester ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export function mapBudgetAdjustmentFromApi(data: any): BudgetAdjustment {
  return {
    id: data.id,
    department_id: data.department_id,
    amount: Number(data.amount ?? 0),
    reason: data.reason ?? '',
    category: toLower(data.category) as AdjustmentCategory,
    created_at: data.created_at,
    created_by: data.created_by ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// To API
// ---------------------------------------------------------------------------

export function mapCostItemToApi(item: Partial<CostItem>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (item.work_area_id !== undefined) payload.work_area_id = item.work_area_id;
  if (item.description !== undefined) payload.description = item.description;
  if (item.original_amount !== undefined) payload.original_amount = item.original_amount;
  if (item.current_amount !== undefined) payload.current_amount = item.current_amount;
  if (item.expected_cash_out !== undefined) {
    let cashOut = item.expected_cash_out || null;
    // Backend expects YYYY-MM-DD; frontend may send YYYY-MM
    if (cashOut && /^\d{4}-\d{2}$/.test(cashOut)) cashOut = `${cashOut}-01`;
    payload.expected_cash_out = cashOut;
  }
  if (item.cost_basis !== undefined) payload.cost_basis = item.cost_basis || null;
  if (item.cost_driver !== undefined) payload.cost_driver = item.cost_driver || null;
  if (item.basis_description !== undefined) payload.basis_description = item.basis_description || null;
  if (item.assumptions !== undefined) payload.assumptions = item.assumptions || null;
  if (item.approval_status !== undefined)
    payload.approval_status = toUpper(item.approval_status);
  if (item.approval_date !== undefined) payload.approval_date = item.approval_date || null;
  if (item.project_phase !== undefined) payload.project_phase = item.project_phase || null;
  if (item.product !== undefined) payload.product = item.product || null;
  if (item.zielanpassung !== undefined)
    payload.zielanpassung = item.zielanpassung;
  if (item.zielanpassung_reason !== undefined)
    payload.zielanpassung_reason = item.zielanpassung_reason || null;
  if (item.comments !== undefined) payload.comments = item.comments || null;
  if (item.requester !== undefined) payload.requester = item.requester || null;

  return payload;
}
