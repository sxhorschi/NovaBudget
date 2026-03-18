/**
 * Mock data — loaded from /data/data.json at runtime.
 *
 * The JSON file is the single source of truth for demo/mock mode.
 * In production the data comes from the backend API (GET /api/v1/data).
 *
 * This module still exports the same symbols the rest of the frontend
 * expects (USE_MOCKS, mockFacilities, mockFacilityDataMap, etc.) but
 * they are populated asynchronously via loadMockData().
 */

import type {
  Facility,
  Department,
  WorkArea,
  CostItem,
  BudgetSummary,
  DepartmentSummary,
  CashOutEntry,
  BudgetAdjustment,
} from '../types/budget';

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

// ---------------------------------------------------------------------------
// Shape returned by /data/data.json and GET /api/v1/data
// ---------------------------------------------------------------------------

export type AllData = {
  facilities: Facility[];
  departments: Department[];
  workAreas: WorkArea[];
  costItems: CostItem[];
  budgetAdjustments: BudgetAdjustment[];
};

// ---------------------------------------------------------------------------
// Per-facility data lookup (same shape consumers already rely on)
// ---------------------------------------------------------------------------

export type FacilityDataSet = {
  facility: Facility;
  departments: Department[];
  workAreas: WorkArea[];
  costItems: CostItem[];
  budgetAdjustments: BudgetAdjustment[];
};

// ---------------------------------------------------------------------------
// Mutable module-level state — filled by loadMockData()
// ---------------------------------------------------------------------------

export let mockFacilities: Facility[] = [];
export let mockFacility: Facility = {
  id: 'f-001',
  name: '3k Factory',
  location: 'Augsburg, Germany',
  description: '',
};

export let mockFacilityDataMap: Record<string, FacilityDataSet> = {};

// Derived summaries (computed after data loads)
export let mockBudgetSummary: BudgetSummary = {
  total_budget: 0,
  total_spent: 0,
  total_approved: 0,
  total_delta: 0,
  cost_of_completion: 0,
};

export let mockDepartmentSummaries: DepartmentSummary[] = [];
export let mockCashOutEntries: CashOutEntry[] = [];

// ---------------------------------------------------------------------------
// loadMockData — call once on app boot
// ---------------------------------------------------------------------------

let _loaded = false;
let _loadPromise: Promise<AllData> | null = null;

/**
 * Load all mock data from the JSON file (or backend API if available).
 * Calling multiple times returns the same promise (idempotent).
 */
export function loadMockData(): Promise<AllData> {
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async (): Promise<AllData> => {
    let data: AllData;

    // Try backend API first, fall back to static JSON
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      if (apiBase) {
        const resp = await fetch(`${apiBase}/api/v1/data`);
        if (resp.ok) {
          data = await resp.json();
          _populate(data);
          return data;
        }
      }
    } catch {
      // backend not available — fall through to static JSON
    }

    // Fall back to public/data/data.json
    const resp = await fetch('/data/data.json');
    if (!resp.ok) {
      throw new Error(`Failed to load /data/data.json: ${resp.status}`);
    }
    data = await resp.json();
    _populate(data);
    return data;
  })();

  return _loadPromise;
}

/**
 * Returns true if loadMockData() has completed at least once.
 */
export function isMockDataLoaded(): boolean {
  return _loaded;
}

// ---------------------------------------------------------------------------
// Internal: populate module-level exports from raw data
// ---------------------------------------------------------------------------

function _populate(data: AllData) {
  const { facilities, departments, workAreas, costItems, budgetAdjustments } = data;

  // Module-level arrays
  mockFacilities = facilities;
  mockFacility = facilities[0] ?? mockFacility;

  // Build per-facility lookup map
  const map: Record<string, FacilityDataSet> = {};
  for (const fac of facilities) {
    const facDepts = departments.filter((d) => d.facility_id === fac.id);
    const facDeptIds = new Set(facDepts.map((d) => d.id));
    const facWAs = workAreas.filter((wa) => facDeptIds.has(wa.department_id));
    const facWAIds = new Set(facWAs.map((wa) => wa.id));
    const facCIs = costItems.filter((ci) => facWAIds.has(ci.work_area_id));
    const facAdj = budgetAdjustments.filter((ba) => facDeptIds.has(ba.department_id));
    map[fac.id] = {
      facility: fac,
      departments: facDepts,
      workAreas: facWAs,
      costItems: facCIs,
      budgetAdjustments: facAdj,
    };
  }
  mockFacilityDataMap = map;

  // Compute summaries for the first facility (backwards compat)
  const allItems = costItems;
  const totalBudget = departments.reduce((s, d) => s + d.budget_total, 0);
  const totalCurrent = allItems.reduce((s, i) => s + i.current_amount, 0);
  const totalApproved = allItems
    .filter((i) => i.approval_status === 'approved')
    .reduce((s, i) => s + i.current_amount, 0);

  mockBudgetSummary = {
    total_budget: totalBudget,
    total_spent: totalCurrent,
    total_approved: totalApproved,
    total_delta: totalBudget - totalCurrent,
    cost_of_completion: totalCurrent,
  };

  mockDepartmentSummaries = departments.map((dept) => {
    const dWAs = workAreas.filter((wa) => wa.department_id === dept.id);
    const dWAIds = new Set(dWAs.map((wa) => wa.id));
    const items = costItems.filter((ci) => dWAIds.has(ci.work_area_id));
    const spent = items.reduce((s, i) => s + i.current_amount, 0);
    const approved = items
      .filter((i) => i.approval_status === 'approved')
      .reduce((s, i) => s + i.current_amount, 0);
    return {
      department_name: dept.name,
      budget: dept.budget_total,
      spent,
      approved,
      delta: dept.budget_total - spent,
    };
  });

  const months = [
    '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
    '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01',
  ];
  mockCashOutEntries = months.map((month) => ({
    month,
    amount: costItems
      .filter((ci) => ci.expected_cash_out === month)
      .reduce((sum, ci) => sum + ci.current_amount, 0),
  }));

  _loaded = true;
}
