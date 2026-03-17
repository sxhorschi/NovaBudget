import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Facility, Department, WorkArea, CostItem, BudgetAdjustment } from '../types/budget';
import {
  mockFacility,
  mockDepartments,
  mockWorkAreas,
  mockCostItems,
  mockBudgetAdjustments,
} from '../mocks/data';

// ---------------------------------------------------------------------------
// localStorage key for department budget overrides
// ---------------------------------------------------------------------------

const BUDGET_OVERRIDES_KEY = 'budget-tool:department-budget-overrides';
const DATA_STATE_KEY = 'budget-tool:data-state';

type PersistedDataState = {
  departments: Department[];
  workAreas: WorkArea[];
  costItems: CostItem[];
};

function normalizeCostItem(item: Partial<CostItem>): CostItem | null {
  if (
    item.id == null ||
    item.work_area_id == null ||
    item.description == null ||
    item.original_amount == null ||
    item.current_amount == null ||
    item.expected_cash_out == null ||
    item.cost_basis == null ||
    item.cost_driver == null ||
    item.approval_status == null ||
    item.project_phase == null ||
    item.product == null ||
    item.created_at == null ||
    item.updated_at == null
  ) {
    return null;
  }

  return {
    id: Number(item.id),
    work_area_id: Number(item.work_area_id),
    description: String(item.description),
    original_amount: Number(item.original_amount),
    current_amount: Number(item.current_amount),
    expected_cash_out: String(item.expected_cash_out),
    cost_basis: item.cost_basis,
    cost_driver: item.cost_driver,
    basis_description: String(item.basis_description ?? ''),
    assumptions: String(item.assumptions ?? ''),
    approval_status: item.approval_status,
    approval_date: item.approval_date ?? null,
    project_phase: item.project_phase,
    product: item.product,
    zielanpassung: Boolean(item.zielanpassung),
    zielanpassung_reason: String(item.zielanpassung_reason ?? ''),
    comments: String(item.comments ?? ''),
    requester: item.requester ?? null,
    created_at: String(item.created_at),
    updated_at: String(item.updated_at),
  } as CostItem;
}

function loadBudgetOverrides(): Record<number, number> {
  try {
    const raw = localStorage.getItem(BUDGET_OVERRIDES_KEY);
    if (raw) return JSON.parse(raw) as Record<number, number>;
  } catch {
    // ignore corrupt data
  }
  return {};
}

function saveBudgetOverrides(overrides: Record<number, number>): void {
  localStorage.setItem(BUDGET_OVERRIDES_KEY, JSON.stringify(overrides));
}

function applyOverrides(departments: Department[]): Department[] {
  const overrides = loadBudgetOverrides();
  if (Object.keys(overrides).length === 0) return departments;
  return departments.map((d) =>
    overrides[d.id] !== undefined ? { ...d, budget_total: overrides[d.id] } : d,
  );
}

function loadDataState(): PersistedDataState {
  try {
    const raw = localStorage.getItem(DATA_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedDataState;
      if (
        Array.isArray(parsed?.departments) &&
        Array.isArray(parsed?.workAreas) &&
        Array.isArray(parsed?.costItems)
      ) {
        const normalizedItems = parsed.costItems
          .map((it) => normalizeCostItem(it as Partial<CostItem>))
          .filter((it): it is CostItem => it !== null);

        const normalizedDepartments = parsed.departments.filter(
          (d): d is Department =>
            d != null &&
            typeof d.id === 'number' &&
            typeof d.facility_id === 'number' &&
            typeof d.name === 'string' &&
            typeof d.budget_total === 'number',
        );

        const normalizedWorkAreas = parsed.workAreas.filter(
          (wa): wa is WorkArea =>
            wa != null &&
            typeof wa.id === 'number' &&
            typeof wa.department_id === 'number' &&
            typeof wa.name === 'string',
        );

        if (
          normalizedDepartments.length > 0 &&
          normalizedWorkAreas.length > 0
        ) {
          return {
            departments: normalizedDepartments,
            workAreas: normalizedWorkAreas,
            costItems: normalizedItems,
          };
        }

        localStorage.removeItem(DATA_STATE_KEY);
      }
    }
  } catch {
    // ignore corrupt data
    try {
      localStorage.removeItem(DATA_STATE_KEY);
    } catch {
      // ignore
    }
  }
  return {
    departments: mockDepartments,
    workAreas: mockWorkAreas,
    costItems: mockCostItems,
  };
}

function saveDataState(data: PersistedDataState): void {
  try {
    localStorage.setItem(DATA_STATE_KEY, JSON.stringify(data));
  } catch {
    // Do not crash UI if storage quota is exceeded.
  }
}

// ---------------------------------------------------------------------------
// Context value interface
// ---------------------------------------------------------------------------

export interface BudgetDataContextValue {
  facility: Facility;
  departments: Department[];
  workAreas: WorkArea[];
  costItems: CostItem[];
  budgetAdjustments: BudgetAdjustment[];

  // CRUD Mutations (optimistic updates)
  updateCostItem: (id: number, data: Partial<CostItem>) => void;
  deleteCostItem: (id: number) => void;
  createCostItem: (workAreaId: number, data: Partial<CostItem>) => CostItem;
  createWorkArea: (departmentId: number, name: string) => WorkArea | null;
  updateWorkArea: (workAreaId: number, data: Partial<Pick<WorkArea, 'name'>>) => void;
  deleteWorkArea: (workAreaId: number) => void;
  createDepartment: (name: string, budgetTotal?: number) => Department | null;
  updateDepartment: (departmentId: number, data: Partial<Pick<Department, 'name' | 'budget_total'>>) => void;
  deleteDepartment: (departmentId: number) => void;
  updateDepartmentBudget: (deptId: number, newBudget: number) => void;

  // Bulk import (replaces all data with imported data)
  bulkImport: (data: {
    departments: Department[];
    workAreas: WorkArea[];
    costItems: CostItem[];
  }) => void;

  // Loading state (for future API mode)
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const BudgetDataContext = createContext<BudgetDataContextValue | null>(null);

export function useBudgetData(): BudgetDataContextValue {
  const ctx = useContext(BudgetDataContext);
  if (!ctx) {
    throw new Error(
      'useBudgetData() must be used within a <BudgetDataProvider>.',
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider (Mock mode — local state)
// ---------------------------------------------------------------------------

export const BudgetDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialData = loadDataState();
  const [departments, setDepartments] = useState<Department[]>(() =>
    applyOverrides(initialData.departments),
  );
  const [workAreas, setWorkAreas] = useState<WorkArea[]>(initialData.workAreas);
  const [costItems, setCostItems] = useState<CostItem[]>(initialData.costItems);

  useEffect(() => {
    saveDataState({ departments, workAreas, costItems });
  }, [departments, workAreas, costItems]);

  const nextId = useCallback((arr: Array<{ id: number }>): number => {
    return arr.reduce((m, it) => Math.max(m, it.id), 0) + 1;
  }, []);

  // --- updateCostItem ---
  const updateCostItem = useCallback(
    (id: number, data: Partial<CostItem>) => {
      setCostItems((prev) =>
        prev.map((ci) =>
          ci.id === id
            ? { ...ci, ...data, updated_at: new Date().toISOString().split('T')[0] }
            : ci,
        ),
      );
    },
    [],
  );

  // --- deleteCostItem ---
  const deleteCostItem = useCallback((id: number) => {
    setCostItems((prev) => prev.filter((ci) => ci.id !== id));
  }, []);

  // --- createCostItem ---
  const createCostItem = useCallback(
    (workAreaId: number, data: Partial<CostItem>): CostItem => {
      const now = new Date().toISOString().split('T')[0];
      let newItem!: CostItem;

      setCostItems((prev) => {
        const newId = nextId(prev);
        newItem = {
          id: newId,
          work_area_id: workAreaId,
          description: data.description ?? '',
          original_amount: data.original_amount ?? 0,
          current_amount: data.current_amount ?? 0,
          expected_cash_out: data.expected_cash_out ?? now,
          cost_basis: data.cost_basis ?? 'cost_estimation',
          cost_driver: data.cost_driver ?? 'product',
          basis_description: data.basis_description ?? '',
          assumptions: data.assumptions ?? '',
          approval_status: data.approval_status ?? 'open',
          approval_date: data.approval_date ?? null,
          project_phase: data.project_phase ?? 'phase_1',
          product: data.product ?? 'atlas',
          zielanpassung: data.zielanpassung ?? false,
          zielanpassung_reason: data.zielanpassung_reason ?? '',
          comments: data.comments ?? '',
          requester: data.requester ?? null,
          created_at: now,
          updated_at: now,
        };
        return [...prev, newItem];
      });

      return newItem;
    },
    [nextId],
  );

  // --- createWorkArea ---
  const createWorkArea = useCallback(
    (departmentId: number, name: string): WorkArea | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      const departmentExists = departments.some((d) => d.id === departmentId);
      if (!departmentExists) return null;

      const duplicate = workAreas.find(
        (wa) => wa.department_id === departmentId && wa.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (duplicate) return null;

      let newWA!: WorkArea;

      setWorkAreas((prev) => {
        newWA = {
          id: nextId(prev),
          department_id: departmentId,
          name: trimmed,
        };
        return [...prev, newWA];
      });

      return newWA;
    },
    [departments, workAreas, nextId],
  );

  // --- updateWorkArea ---
  const updateWorkArea = useCallback(
    (workAreaId: number, data: Partial<Pick<WorkArea, 'name'>>) => {
      setWorkAreas((prev) =>
        prev.map((wa) => {
          if (wa.id !== workAreaId) return wa;
          const nextName = data.name?.trim();
          return {
            ...wa,
            ...(nextName ? { name: nextName } : {}),
          };
        }),
      );
    },
    [],
  );

  // --- deleteWorkArea ---
  const deleteWorkArea = useCallback((workAreaId: number) => {
    setWorkAreas((prev) => prev.filter((wa) => wa.id !== workAreaId));
    setCostItems((prev) => prev.filter((ci) => ci.work_area_id !== workAreaId));
  }, []);

  // --- createDepartment ---
  const createDepartment = useCallback(
    (name: string, budgetTotal: number = 0): Department | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      const duplicate = departments.find((d) => d.name.toLowerCase() === trimmed.toLowerCase());
      if (duplicate) return null;

      let newDept!: Department;

      setDepartments((prev) => {
        newDept = {
          id: nextId(prev),
          facility_id: mockFacility.id,
          name: trimmed,
          budget_total: Math.max(0, Number(budgetTotal) || 0),
        };
        return [...prev, newDept];
      });

      return newDept;
    },
    [departments, nextId],
  );

  // --- updateDepartment ---
  const updateDepartment = useCallback(
    (departmentId: number, data: Partial<Pick<Department, 'name' | 'budget_total'>>) => {
      setDepartments((prev) =>
        prev.map((d) => {
          if (d.id !== departmentId) return d;
          const nextName = data.name?.trim();
          const nextBudget = data.budget_total;
          return {
            ...d,
            ...(nextName ? { name: nextName } : {}),
            ...(typeof nextBudget === 'number' && !Number.isNaN(nextBudget)
              ? { budget_total: Math.max(0, nextBudget) }
              : {}),
          };
        }),
      );
    },
    [],
  );

  // --- deleteDepartment ---
  const deleteDepartment = useCallback(
    (departmentId: number) => {
      const removedWorkAreaIds = new Set(
        workAreas
          .filter((wa) => wa.department_id === departmentId)
          .map((wa) => wa.id),
      );

      setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
      setWorkAreas((prev) => prev.filter((wa) => wa.department_id !== departmentId));
      setCostItems((prev) =>
        prev.filter((ci) => !removedWorkAreaIds.has(ci.work_area_id)),
      );
    },
    [workAreas],
  );

  // --- updateDepartmentBudget ---
  const updateDepartmentBudget = useCallback(
    (deptId: number, newBudget: number) => {
      setDepartments((prev) =>
        prev.map((d) => (d.id === deptId ? { ...d, budget_total: newBudget } : d)),
      );
      const overrides = loadBudgetOverrides();
      overrides[deptId] = newBudget;
      saveBudgetOverrides(overrides);
    },
    [],
  );

  // --- bulkImport ---
  const bulkImport = useCallback(
    (data: { departments: Department[]; workAreas: WorkArea[]; costItems: CostItem[] }) => {
      setDepartments(data.departments);
      setWorkAreas(data.workAreas);
      setCostItems(data.costItems);
    },
    [],
  );

  // --- stable value object ---
  const value = useMemo<BudgetDataContextValue>(
    () => ({
      facility: mockFacility,
      departments,
      workAreas,
      costItems,
      budgetAdjustments: mockBudgetAdjustments,
      updateCostItem,
      deleteCostItem,
      createCostItem,
      createWorkArea,
      updateWorkArea,
      deleteWorkArea,
      createDepartment,
      updateDepartment,
      deleteDepartment,
      updateDepartmentBudget,
      bulkImport,
      isLoading: false,
    }),
    [
      costItems,
      departments,
      workAreas,
      updateCostItem,
      deleteCostItem,
      createCostItem,
      createWorkArea,
      updateWorkArea,
      deleteWorkArea,
      createDepartment,
      updateDepartment,
      deleteDepartment,
      updateDepartmentBudget,
      bulkImport,
    ],
  );

  return (
    <BudgetDataContext.Provider value={value}>
      {children}
    </BudgetDataContext.Provider>
  );
};

export default BudgetDataContext;
