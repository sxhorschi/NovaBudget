// --- Enums as string union types ---

export type ApprovalStatus =
  | 'open'
  | 'submitted_for_approval'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'pending_supplier_negotiation'
  | 'pending_technical_clarification'
  | 'obsolete';

export type ProjectPhase = 'phase_1' | 'phase_2' | 'phase_3' | 'phase_4';

export type Product = 'atlas' | 'orion' | 'vega' | 'overall';

export type CostBasis =
  | 'cost_estimation'
  | 'initial_supplier_offer'
  | 'revised_supplier_offer'
  | 'change_cost';

export type CostDriver =
  | 'product'
  | 'process'
  | 'new_req_assembly'
  | 'new_req_testing'
  | 'initial_setup';

// --- Interfaces ---

export interface Facility {
  id: string;
  name: string;
  location: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  facility_id: string;
  name: string;
  budget_total: number;
}

export interface WorkArea {
  id: string;
  department_id: string;
  name: string;
}

/** WorkArea with cost_items populated (used by CostbookTable). */
export interface WorkAreaWithItems extends WorkArea {
  cost_items: CostItem[];
}

export interface CostItem {
  id: string;
  work_area_id: string;
  description: string;
  original_amount: number;
  current_amount: number;
  expected_cash_out: string;
  cost_basis: CostBasis;
  cost_driver: CostDriver;
  basis_description: string;
  assumptions: string;
  approval_status: ApprovalStatus;
  approval_date: string | null;
  project_phase: ProjectPhase;
  product: Product;
  zielanpassung: boolean;
  zielanpassung_reason: string;
  comments: string;
  requester?: string | null;
  created_at: string;
  updated_at: string;
}

// --- Budget Adjustment (Zielanpassung) ---

export type AdjustmentCategory =
  | 'product_change'
  | 'supplier_change'
  | 'scope_change'
  | 'optimization'
  | 'other';

export interface BudgetAdjustment {
  id: string;
  department_id: string;
  amount: number; // +80000 oder -20000
  reason: string; // "Produktaenderung CR-2026-042"
  category: AdjustmentCategory;
  created_at: string;
  created_by?: string;
}

export const ADJUSTMENT_CATEGORY_LABELS: Record<AdjustmentCategory, string> = {
  product_change: 'Product Change',
  supplier_change: 'Supplier Change',
  scope_change: 'Scope Change',
  optimization: 'Optimization',
  other: 'Other',
};

export const ADJUSTMENT_CATEGORY_COLORS: Record<AdjustmentCategory, string> = {
  product_change: 'bg-blue-100 text-blue-800',
  supplier_change: 'bg-purple-100 text-purple-800',
  scope_change: 'bg-orange-100 text-orange-800',
  optimization: 'bg-emerald-100 text-emerald-800',
  other: 'bg-gray-100 text-gray-800',
};

// --- Attachment types ---

export type AttachmentType = 'OFFER' | 'INVOICE' | 'SPECIFICATION' | 'PHOTO' | 'OTHER';

export interface Attachment {
  id: string;
  cost_item_id: string | null;
  work_area_id: string | null;
  department_id: string | null;
  filename: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  storage_path: string;
  description: string | null;
  attachment_type: AttachmentType;
  created_at: string;
  updated_at: string;
}

export interface AttachmentList {
  items: Attachment[];
  total: number;
}

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  OFFER: 'Offer',
  INVOICE: 'Invoice',
  SPECIFICATION: 'Specification',
  PHOTO: 'Photo',
  OTHER: 'Other',
};

// --- Summary types ---

export interface BudgetSummary {
  total_budget: number;
  total_spent: number;
  total_approved: number;
  total_delta: number;
  cost_of_completion: number;
}

export interface DepartmentSummary {
  department_name: string;
  budget: number;
  spent: number;
  approved: number;
  delta: number;
}

export interface CashOutEntry {
  month: string;
  amount: number;
}

// --- Display label maps ---

export const PHASE_LABELS: Record<ProjectPhase, string> = {
  phase_1: 'Phase 1',
  phase_2: 'Phase 2',
  phase_3: 'Phase 3',
  phase_4: 'Phase 4',
};

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  open: 'Open',
  submitted_for_approval: 'Submitted for Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  pending_supplier_negotiation: 'Pending Supplier Negotiation',
  pending_technical_clarification: 'Pending Technical Clarification',
  obsolete: 'Obsolete',
};

export const STATUS_COLORS: Record<ApprovalStatus, string> = {
  open: 'bg-gray-200 text-gray-800',
  submitted_for_approval: 'bg-yellow-200 text-yellow-800',
  approved: 'bg-green-200 text-green-800',
  rejected: 'bg-red-200 text-red-800',
  on_hold: 'bg-orange-200 text-orange-800',
  pending_supplier_negotiation: 'bg-blue-200 text-blue-800',
  pending_technical_clarification: 'bg-blue-100 text-blue-700',
  obsolete: 'bg-gray-300 text-gray-600',
};

/** Dot colors for status indicator in dropdowns / badges */
export const STATUS_DOT_COLORS: Record<ApprovalStatus, string> = {
  open: '#9ca3af',
  submitted_for_approval: '#eab308',
  approved: '#22c55e',
  rejected: '#ef4444',
  on_hold: '#f97316',
  pending_supplier_negotiation: '#3b82f6',
  pending_technical_clarification: '#60a5fa',
  obsolete: '#6b7280',
};

export const PRODUCT_LABELS: Record<Product, string> = {
  atlas: 'Atlas',
  orion: 'Orion',
  vega: 'Vega',
  overall: 'Overall',
};

export const COST_BASIS_LABELS: Record<CostBasis, string> = {
  cost_estimation: 'Cost Estimation',
  initial_supplier_offer: 'Initial Supplier Offer',
  revised_supplier_offer: 'Revised Supplier Offer',
  change_cost: 'Change Cost',
};

export const COST_DRIVER_LABELS: Record<CostDriver, string> = {
  product: 'Product',
  process: 'Process',
  new_req_assembly: 'Assembly Requirements',
  new_req_testing: 'Testing Requirements',
  initial_setup: 'Initial Setup',
};

