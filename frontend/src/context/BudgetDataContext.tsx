import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Facility, Department, WorkArea, CostItem, BudgetAdjustment } from '../types/budget';
import { useFacility } from './FacilityContext';
import { mockFacilityDataMap, mockFacility } from '../mocks/data';

// ---------------------------------------------------------------------------
// localStorage helpers — scoped per facility
// ---------------------------------------------------------------------------

function budgetOverridesKey(facilityId: string): string {
  return `budget-tool:department-budget-overrides:${facilityId}`;
}

function dataStateKey(facilityId: string): string {
  return `budget-tool:data-state:${facilityId}`;
}

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
    id: String(item.id),
    work_area_id: String(item.work_area_id),
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

function loadBudgetOverrides(facilityId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(budgetOverridesKey(facilityId));
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch {
    // ignore corrupt data
  }
  return {};
}

function saveBudgetOverrides(facilityId: string, overrides: Record<string, number>): void {
  localStorage.setItem(budgetOverridesKey(facilityId), JSON.stringify(overrides));
}

function applyOverrides(facilityId: string, departments: Department[]): Department[] {
  const overrides = loadBudgetOverrides(facilityId);
  if (Object.keys(overrides).length === 0) return departments;
  return departments.map((d) =>
    overrides[d.id] !== undefined ? { ...d, budget_total: overrides[d.id] } : d,
  );
}

function getDefaultDataForFacility(facilityId: string): PersistedDataState {
  const dataSet = mockFacilityDataMap[facilityId];
  if (dataSet) {
    return {
      departments: dataSet.departments,
      workAreas: dataSet.workAreas,
      costItems: dataSet.costItems,
    };
  }
  // Fallback for dynamically-created facilities — start empty
  return { departments: [], workAreas: [], costItems: [] };
}

function loadDataState(facilityId: string): PersistedDataState {
  try {
    const raw = localStorage.getItem(dataStateKey(facilityId));
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
            d.id != null &&
            d.facility_id != null &&
            typeof d.name === 'string' &&
            typeof d.budget_total === 'number',
        );

        const normalizedWorkAreas = parsed.workAreas.filter(
          (wa): wa is WorkArea =>
            wa != null &&
            wa.id != null &&
            wa.department_id != null &&
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

        localStorage.removeItem(dataStateKey(facilityId));
      }
    }
  } catch {
    // ignore corrupt data
    try {
      localStorage.removeItem(dataStateKey(facilityId));
    } catch {
      // ignore
    }
  }

  // Also try the old non-facility-scoped key for backwards compat (only for default mock facility)
  if (facilityId === mockFacility.id) {
    try {
      const legacyRaw = localStorage.getItem('budget-tool:data-state');
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw) as PersistedDataState;
        if (
          Array.isArray(parsed?.departments) &&
          Array.isArray(parsed?.workAreas) &&
          Array.isArray(parsed?.costItems) &&
          parsed.departments.length > 0
        ) {
          // Migrate: save under new key and remove old
          localStorage.setItem(dataStateKey(facilityId), legacyRaw);
          localStorage.removeItem('budget-tool:data-state');
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return getDefaultDataForFacility(facilityId);
}

function saveDataState(facilityId: string, data: PersistedDataState): void {
  try {
    localStorage.setItem(dataStateKey(facilityId), JSON.stringify(data));
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
  updateCostItem: (id: string, data: Partial<CostItem>) => void;
  deleteCostItem: (id: string) => void;
  createCostItem: (workAreaId: string, data: Partial<CostItem>) => CostItem;
  createWorkArea: (departmentId: string, name: string) => WorkArea | null;
  updateWorkArea: (workAreaId: string, data: Partial<Pick<WorkArea, 'name'>>) => void;
  deleteWorkArea: (workAreaId: string) => void;
  createDepartment: (name: string, budgetTotal?: number) => Department | null;
  updateDepartment: (departmentId: string, data: Partial<Pick<Department, 'name' | 'budget_total'>>) => void;
  deleteDepartment: (departmentId: string) => void;
  updateDepartmentBudget: (deptId: string, newBudget: number) => void;

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
// ID generator (string-based)
// ---------------------------------------------------------------------------

let idCounter = Date.now();

function nextStringId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// ---------------------------------------------------------------------------
// Provider (Mock mode — local state, facility-aware)
// ---------------------------------------------------------------------------

export const BudgetDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentFacility } = useFacility();
  const facilityId = currentFacility?.id ?? mockFacility.id;
  const prevFacilityIdRef = useRef(facilityId);

  // Load initial data for the current facility
  const [departments, setDepartments] = useState<Department[]>(() => {
    const data = loadDataState(facilityId);
    return applyOverrides(facilityId, data.departments);
  });
  const [workAreas, setWorkAreas] = useState<WorkArea[]>(() => loadDataState(facilityId).workAreas);
  const [costItems, setCostItems] = useState<CostItem[]>(() => loadDataState(facilityId).costItems);

  // When facility changes, save current data and load new facility's data
  useEffect(() => {
    if (prevFacilityIdRef.current !== facilityId) {
      // Load new facility data
      const newData = loadDataState(facilityId);
      setDepartments(applyOverrides(facilityId, newData.departments));
      setWorkAreas(newData.workAreas);
      setCostItems(newData.costItems);
      prevFacilityIdRef.current = facilityId;
    }
  }, [facilityId]);

  // Persist data on change
  useEffect(() => {
    saveDataState(facilityId, { departments, workAreas, costItems });
  }, [facilityId, departments, workAreas, costItems]);

  // Get the current facility's budget adjustments
  const currentBudgetAdjustments = useMemo(() => {
    const dataSet = mockFacilityDataMap[facilityId];
    return dataSet?.budgetAdjustments ?? [];
  }, [facilityId]);

  // Resolve facility object
  const facility = currentFacility ?? mockFacility;

  // --- updateCostItem ---
  const updateCostItem = useCallback(
    (id: string, data: Partial<CostItem>) => {
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
  const deleteCostItem = useCallback((id: string) => {
    setCostItems((prev) => prev.filter((ci) => ci.id !== id));
  }, []);

  // --- createCostItem ---
  const createCostItem = useCallback(
    (workAreaId: string, data: Partial<CostItem>): CostItem => {
      const now = new Date().toISOString().split('T')[0];
      let newItem!: CostItem;

      setCostItems((prev) => {
        const newId = nextStringId('ci');
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
    [],
  );

  // --- createWorkArea ---
  const createWorkArea = useCallback(
    (departmentId: string, name: string): WorkArea | null => {
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
          id: nextStringId('wa'),
          department_id: departmentId,
          name: trimmed,
        };
        return [...prev, newWA];
      });

      return newWA;
    },
    [departments, workAreas],
  );

  // --- updateWorkArea ---
  const updateWorkArea = useCallback(
    (workAreaId: string, data: Partial<Pick<WorkArea, 'name'>>) => {
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
  const deleteWorkArea = useCallback((workAreaId: string) => {
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
          id: nextStringId('d'),
          facility_id: facilityId,
          name: trimmed,
          budget_total: Math.max(0, Number(budgetTotal) || 0),
        };
        return [...prev, newDept];
      });

      return newDept;
    },
    [departments, facilityId],
  );

  // --- updateDepartment ---
  const updateDepartment = useCallback(
    (departmentId: string, data: Partial<Pick<Department, 'name' | 'budget_total'>>) => {
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
    (departmentId: string) => {
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
    (deptId: string, newBudget: number) => {
      setDepartments((prev) =>
        prev.map((d) => (d.id === deptId ? { ...d, budget_total: newBudget } : d)),
      );
      const overrides = loadBudgetOverrides(facilityId);
      overrides[deptId] = newBudget;
      saveBudgetOverrides(facilityId, overrides);
    },
    [facilityId],
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
      facility,
      departments,
      workAreas,
      costItems,
      budgetAdjustments: currentBudgetAdjustments,
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
      facility,
      costItems,
      departments,
      workAreas,
      currentBudgetAdjustments,
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
