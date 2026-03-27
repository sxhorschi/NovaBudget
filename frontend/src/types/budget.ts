// --- Enums as string union types ---

export type ApprovalStatus =
  | 'open'
  | 'reviewed'
  | 'submitted_for_approval'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'pending_supplier_negotiation'
  | 'pending_technical_clarification'
  | 'purchase_order_sent'
  | 'purchase_order_confirmed'
  | 'delivered'
  | 'obsolete';

// Classification types are now plain strings driven by config.
// Kept as type aliases for readability — they accept any string value.
export type ProjectPhase = string;
export type Product = string;
export type CostBasis = string;
export type CostDriver = string;

// --- Interfaces ---

export interface Facility {
  id: string;
  name: string;
  location: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface FunctionalAreaBudget {
  id: string;
  functional_area_id: string;
  year: number;
  amount: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface FunctionalArea {
  id: string;
  facility_id: string;
  name: string;
  budget_total: number;
  budgets: FunctionalAreaBudget[];
}


export interface WorkArea {
  id: string;
  functional_area_id: string;
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
  unit_price: number;
  quantity: number;
  total_amount: number;
  expected_cash_out: string;
  cost_basis: CostBasis;
  cost_driver: CostDriver;
  basis_description: string;
  assumptions: string;
  approval_status: ApprovalStatus;
  approval_date: string | null;
  project_phase: ProjectPhase;
  product: Product;
  requester?: string | null;
  created_at: string;
  updated_at: string;
}

// --- Comment types ---

export interface Comment {
  id: string;
  cost_item_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

// --- Price History ---

export interface PriceHistory {
  id: string;
  cost_item_id: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  cost_basis: string;
  comment: string | null;
  created_by: string | null;
  created_at: string;
}

// --- Change Cost (formerly BudgetAdjustment / Zielanpassung) ---

export type AdjustmentCategory =
  | 'product_change'
  | 'supplier_change'
  | 'scope_change'
  | 'optimization'
  | 'other';

export interface ChangeCost {
  id: string;
  functional_area_id: string;
  amount: number; // +80000 oder -20000
  reason: string; // "Produktaenderung CR-2026-042"
  category: AdjustmentCategory;
  cost_driver: string;
  budget_relevant: boolean;
  year: number;
  created_at: string;
  created_by?: string;
}

/** @deprecated Use ChangeCost instead */
export type BudgetAdjustment = ChangeCost;

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
  functional_area_id: string | null;
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

export interface FunctionalAreaSummary {
  functional_area_name: string;
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
// PHASE_LABELS, PRODUCT_LABELS, COST_BASIS_LABELS, COST_DRIVER_LABELS
// have been removed. Use useConfig().getLabel(config.phases, id) instead.

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  open: 'Open',
  reviewed: 'Reviewed',
  submitted_for_approval: 'Submitted for Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  on_hold: 'On Hold',
  pending_supplier_negotiation: 'Pending Supplier Negotiation',
  pending_technical_clarification: 'Pending Technical Clarification',
  purchase_order_sent: 'PO Sent',
  purchase_order_confirmed: 'PO Confirmed',
  delivered: 'Delivered',
  obsolete: 'Obsolete',
};

export const STATUS_COLORS: Record<ApprovalStatus, string> = {
  open: 'bg-gray-200 text-gray-800',
  reviewed: 'bg-cyan-200 text-cyan-800',
  submitted_for_approval: 'bg-yellow-200 text-yellow-800',
  approved: 'bg-green-200 text-green-800',
  rejected: 'bg-red-200 text-red-800',
  on_hold: 'bg-orange-200 text-orange-800',
  pending_supplier_negotiation: 'bg-blue-200 text-blue-800',
  pending_technical_clarification: 'bg-blue-100 text-blue-700',
  purchase_order_sent: 'bg-indigo-200 text-indigo-800',
  purchase_order_confirmed: 'bg-violet-200 text-violet-800',
  delivered: 'bg-emerald-200 text-emerald-800',
  obsolete: 'bg-gray-300 text-gray-600',
};

/** Dot colors for status indicator in dropdowns / badges */
export const STATUS_DOT_COLORS: Record<ApprovalStatus, string> = {
  open: '#9ca3af',
  reviewed: '#06b6d4',
  submitted_for_approval: '#eab308',
  approved: '#22c55e',
  rejected: '#ef4444',
  on_hold: '#f97316',
  pending_supplier_negotiation: '#3b82f6',
  pending_technical_clarification: '#60a5fa',
  purchase_order_sent: '#6366f1',
  purchase_order_confirmed: '#8b5cf6',
  delivered: '#10b981',
  obsolete: '#6b7280',
};


