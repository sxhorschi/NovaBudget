import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Facility, Department, WorkArea, CostItem, BudgetAdjustment } from '../types/budget';
import { useFacility } from './FacilityContext';
import * as deptApi from '../api/departments';
import * as waApi from '../api/workAreas';
import * as ciApi from '../api/costItems';
import { changeStatus as ciChangeStatus } from '../api/costItems';
import * as adjApi from '../api/budgetAdjustments';
import { dispatchToastEvent } from '../components/common/ToastProvider';

// ---------------------------------------------------------------------------
// Context value interface
// ---------------------------------------------------------------------------

export interface BudgetDataContextValue {
  facility: Facility;
  departments: Department[];
  workAreas: WorkArea[];
  costItems: CostItem[];
  budgetAdjustments: BudgetAdjustment[];

  // CRUD Mutations — all async, backend-first
  updateCostItem: (id: string, data: Partial<CostItem>) => void;
  deleteCostItem: (id: string) => void;
  createCostItem: (workAreaId: string, data: Partial<CostItem>) => Promise<CostItem | null>;
  createWorkArea: (departmentId: string, name: string) => Promise<WorkArea | null>;
  updateWorkArea: (workAreaId: string, data: Partial<Pick<WorkArea, 'name'>>) => void;
  deleteWorkArea: (workAreaId: string) => void;
  createDepartment: (name: string, budgetTotal?: number) => Promise<Department | null>;
  updateDepartment: (departmentId: string, data: Partial<Pick<Department, 'name' | 'budget_total'>>) => void;
  deleteDepartment: (departmentId: string) => void;
  updateDepartmentBudget: (deptId: string, newBudget: number) => void;
  addBudgetAdjustment: (departmentId: string, amount: number, reason: string, category?: string) => void;

  // Bulk operations
  bulkImport: (data: {
    departments: Department[];
    workAreas: WorkArea[];
    costItems: CostItem[];
  }) => void;
  reloadData: () => Promise<void>;

  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const BudgetDataContext = createContext<BudgetDataContextValue | null>(null);

export function useBudgetData(): BudgetDataContextValue {
  const ctx = useContext(BudgetDataContext);
  if (!ctx) {
    throw new Error('useBudgetData() must be used within a <BudgetDataProvider>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Placeholder facility for when none is selected
// ---------------------------------------------------------------------------

const EMPTY_FACILITY: Facility = { id: '', name: '', location: '', description: '' };

// ---------------------------------------------------------------------------
// Provider — backend API as source of truth
// ---------------------------------------------------------------------------

export const BudgetDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentFacility } = useFacility();
  const facilityId = currentFacility?.id ?? '';
  const facility = currentFacility ?? EMPTY_FACILITY;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [budgetAdjustments, setBudgetAdjustments] = useState<BudgetAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AbortController to cancel stale requests on facility switch
  const abortRef = useRef<AbortController | null>(null);

  // --- Load all data for the current facility from backend ---
  const loadFacilityData = useCallback(async (fId: string) => {
    if (!fId) {
      setDepartments([]);
      setWorkAreas([]);
      setCostItems([]);
      setBudgetAdjustments([]);
      setIsLoading(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const [depts, was, cis] = await Promise.all([
        deptApi.listDepartments(fId),
        waApi.listWorkAreas({ facility_id: fId }),
        ciApi.listCostItems(fId),
      ]);

      if (controller.signal.aborted) return;

      setDepartments(depts);
      setWorkAreas(was);
      setCostItems(cis);

      // Load budget adjustments per department
      const allAdj: BudgetAdjustment[] = [];
      for (const dept of depts) {
        try {
          const adj = await adjApi.listBudgetAdjustments(dept.id);
          allAdj.push(...adj);
        } catch {
          // Individual department fetch failure is non-critical
        }
      }
      if (!controller.signal.aborted) {
        setBudgetAdjustments(allAdj);
      }
    } catch {
      if (!controller.signal.aborted) {
        dispatchToastEvent('error', 'Failed to load data from server.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Reload when facility changes
  useEffect(() => {
    loadFacilityData(facilityId);
  }, [facilityId, loadFacilityData]);

  // --- CRUD: Cost Items ---

  const updateCostItem = useCallback((id: string, data: Partial<CostItem>) => {
    // Optimistic update
    setCostItems((prev) =>
      prev.map((ci) => (ci.id === id ? { ...ci, ...data, updated_at: new Date().toISOString() } : ci)),
    );

    // Status changes must go through the workflow endpoint (PUT returns 409)
    if (data.approval_status) {
      const { approval_status, ...rest } = data;
      // Change status via workflow endpoint
      ciChangeStatus(id, approval_status).catch(() => {
        dispatchToastEvent('error', 'Failed to change approval status.');
      });
      // Update other fields if any
      if (Object.keys(rest).length > 0) {
        ciApi.updateCostItem(id, rest).catch(() => {
          dispatchToastEvent('error', 'Failed to update cost item.');
        });
      }
    } else {
      ciApi.updateCostItem(id, data).catch(() => {
        dispatchToastEvent('error', 'Failed to update cost item.');
      });
    }
  }, []);

  const deleteCostItem = useCallback((id: string) => {
    ciApi.deleteCostItem(id).then(() => {
      setCostItems((prev) => prev.filter((ci) => ci.id !== id));
    }).catch(() => {
      dispatchToastEvent('error', 'Failed to delete cost item.');
    });
  }, []);

  const createCostItem = useCallback(
    async (workAreaId: string, data: Partial<CostItem>): Promise<CostItem | null> => {
      const now = new Date().toISOString().split('T')[0];
      try {
        const newItem = await ciApi.createCostItem({
          work_area_id: workAreaId,
          description: data.description ?? '',
          original_amount: data.original_amount ?? 0,
          current_amount: data.current_amount ?? 0,
          expected_cash_out: (() => {
            const v = data.expected_cash_out ?? now;
            // Ensure YYYY-MM-DD format (backend rejects YYYY-MM)
            return /^\d{4}-\d{2}$/.test(v) ? `${v}-01` : v;
          })(),
          cost_basis: data.cost_basis ?? '',
          cost_driver: data.cost_driver ?? '',
          basis_description: data.basis_description ?? '',
          assumptions: data.assumptions ?? '',
          approval_status: data.approval_status ?? 'open',
          approval_date: data.approval_date ?? null,
          project_phase: data.project_phase ?? '',
          product: data.product ?? '',
          zielanpassung: data.zielanpassung ?? false,
          zielanpassung_reason: data.zielanpassung_reason ?? '',
          comments: data.comments ?? '',
          requester: data.requester ?? null,
        });
        setCostItems((prev) => [...prev, newItem]);
        return newItem;
      } catch {
        dispatchToastEvent('error', 'Failed to create cost item.');
        return null;
      }
    },
    [],
  );

  // --- CRUD: Work Areas ---

  const createWorkArea = useCallback(
    async (departmentId: string, name: string): Promise<WorkArea | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const newWA = await waApi.createWorkArea({ department_id: departmentId, name: trimmed });
        setWorkAreas((prev) => [...prev, newWA]);
        return newWA;
      } catch {
        dispatchToastEvent('error', 'Failed to create category.');
        return null;
      }
    },
    [],
  );

  const updateWorkArea = useCallback((workAreaId: string, data: Partial<Pick<WorkArea, 'name'>>) => {
    const nextName = data.name?.trim();
    if (!nextName) return;
    // Optimistic
    setWorkAreas((prev) => prev.map((wa) => (wa.id === workAreaId ? { ...wa, name: nextName } : wa)));
    waApi.updateWorkArea(workAreaId, { name: nextName }).catch(() => {
      dispatchToastEvent('error', 'Failed to update category.');
    });
  }, []);

  const deleteWorkArea = useCallback((workAreaId: string) => {
    waApi.deleteWorkArea(workAreaId).then(() => {
      setWorkAreas((prev) => prev.filter((wa) => wa.id !== workAreaId));
      setCostItems((prev) => prev.filter((ci) => ci.work_area_id !== workAreaId));
    }).catch(() => {
      dispatchToastEvent('error', 'Failed to delete category.');
    });
  }, []);

  // --- CRUD: Departments ---

  const createDepartment = useCallback(
    async (name: string, budgetTotal: number = 0): Promise<Department | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const newDept = await deptApi.createDepartment({
          facility_id: facilityId,
          name: trimmed,
          budget_total: Math.max(0, Number(budgetTotal) || 0),
        });
        setDepartments((prev) => [...prev, newDept]);
        return newDept;
      } catch {
        dispatchToastEvent('error', 'Failed to create department.');
        return null;
      }
    },
    [facilityId],
  );

  const updateDepartment = useCallback(
    (departmentId: string, data: Partial<Pick<Department, 'name' | 'budget_total'>>) => {
      const payload: { name?: string; budget_total?: number } = {};
      if (data.name?.trim()) payload.name = data.name.trim();
      if (typeof data.budget_total === 'number' && !Number.isNaN(data.budget_total)) {
        payload.budget_total = Math.max(0, data.budget_total);
      }
      // Optimistic
      setDepartments((prev) => prev.map((d) => (d.id === departmentId ? { ...d, ...payload } : d)));
      deptApi.updateDepartment(departmentId, payload).catch(() => {
        dispatchToastEvent('error', 'Failed to update department.');
      });
    },
    [],
  );

  const deleteDepartment = useCallback((departmentId: string) => {
    deptApi.deleteDepartment(departmentId).then(() => {
      setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
      setWorkAreas((prev) => prev.filter((wa) => wa.department_id !== departmentId));
      setCostItems((prev) => {
        const removedWAs = new Set(
          workAreas.filter((wa) => wa.department_id === departmentId).map((wa) => wa.id),
        );
        return prev.filter((ci) => !removedWAs.has(ci.work_area_id));
      });
    }).catch(() => {
      dispatchToastEvent('error', 'Failed to delete department.');
    });
  }, [workAreas]);

  const updateDepartmentBudget = useCallback((deptId: string, newBudget: number) => {
    setDepartments((prev) => prev.map((d) => (d.id === deptId ? { ...d, budget_total: newBudget } : d)));
    deptApi.updateDepartment(deptId, { budget_total: newBudget }).catch(() => {
      dispatchToastEvent('error', 'Failed to update department budget.');
    });
  }, []);

  // --- Budget Adjustments ---

  const addBudgetAdjustment = useCallback(
    (departmentId: string, amount: number, reason: string, category?: string) => {
      const resolvedCategory = (category as BudgetAdjustment['category']) ?? 'other';
      adjApi.createBudgetAdjustment({
        department_id: departmentId,
        amount,
        reason,
        category: resolvedCategory,
      }).then(() => {
        // Reload adjustments for this department
        adjApi.listBudgetAdjustments(departmentId).then((adj) => {
          setBudgetAdjustments((prev) => {
            const other = prev.filter((a) => a.department_id !== departmentId);
            return [...other, ...adj];
          });
        }).catch(() => {});
      }).catch(() => {
        dispatchToastEvent('error', 'Failed to create budget adjustment.');
      });
    },
    [],
  );

  // --- Bulk import (after backend import, reload all data) ---

  const bulkImport = useCallback(
    (data: { departments: Department[]; workAreas: WorkArea[]; costItems: CostItem[] }) => {
      // After a backend import, just reload everything from the API
      loadFacilityData(facilityId);
    },
    [facilityId, loadFacilityData],
  );

  // --- Stable value object ---

  const value = useMemo<BudgetDataContextValue>(
    () => ({
      facility,
      departments,
      workAreas,
      costItems,
      budgetAdjustments,
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
      addBudgetAdjustment,
      bulkImport,
      reloadData: () => loadFacilityData(facilityId),
      isLoading,
    }),
    [
      facility, departments, workAreas, costItems, budgetAdjustments,
      updateCostItem, deleteCostItem, createCostItem,
      createWorkArea, updateWorkArea, deleteWorkArea,
      createDepartment, updateDepartment, deleteDepartment,
      updateDepartmentBudget, addBudgetAdjustment, bulkImport,
      loadFacilityData, facilityId, isLoading,
    ],
  );

  return (
    <BudgetDataContext.Provider value={value}>
      {children}
    </BudgetDataContext.Provider>
  );
};

export default BudgetDataContext;
