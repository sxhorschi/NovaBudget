import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Facility, FunctionalArea, FunctionalAreaBudget, WorkArea, CostItem, ChangeCost } from '../types/budget';
import { useFacility } from './FacilityContext';
import * as faApi from '../api/functionalAreas';
import * as faBudgetApi from '../api/functionalAreaBudgets';
import * as waApi from '../api/workAreas';
import * as ciApi from '../api/costItems';
import { changeStatus as ciChangeStatus } from '../api/costItems';
import * as ccApi from '../api/budgetAdjustments';
import { dispatchToastEvent } from '../components/common/ToastProvider';

// ---------------------------------------------------------------------------
// Context value interface
// ---------------------------------------------------------------------------

export interface BudgetDataContextValue {
  facility: Facility;
  functionalAreas: FunctionalArea[];
  workAreas: WorkArea[];
  costItems: CostItem[];
  changeCosts: ChangeCost[];
  /** @deprecated Use changeCosts */
  budgetAdjustments: ChangeCost[];

  // CRUD Mutations — all async, backend-first
  updateCostItem: (id: string, data: Partial<CostItem>) => void;
  deleteCostItem: (id: string) => void;
  createCostItem: (workAreaId: string, data: Partial<CostItem>) => Promise<CostItem | null>;
  createWorkArea: (functionalAreaId: string, name: string) => Promise<WorkArea | null>;
  updateWorkArea: (workAreaId: string, data: Partial<Pick<WorkArea, 'name'>>) => void;
  deleteWorkArea: (workAreaId: string) => void;
  createFunctionalArea: (name: string, budgetTotal?: number) => Promise<FunctionalArea | null>;
  updateFunctionalArea: (functionalAreaId: string, data: Partial<Pick<FunctionalArea, 'name' | 'budget_total'>>) => void;
  deleteFunctionalArea: (functionalAreaId: string) => void;
  updateFunctionalAreaBudget: (faId: string, newBudget: number) => void;
  addChangeCost: (functionalAreaId: string, amount: number, reason: string, category?: string, costDriver?: string, budgetRelevant?: boolean, year?: number) => void;
  /** @deprecated Use addChangeCost */
  addBudgetAdjustment: (functionalAreaId: string, amount: number, reason: string, category?: string) => void;

  // Yearly budget CRUD
  createYearlyBudget: (faId: string, year: number, amount: number, comment?: string | null) => Promise<FunctionalAreaBudget | null>;
  updateYearlyBudget: (faId: string, budgetId: string, data: { year?: number; amount?: number; comment?: string | null }) => Promise<void>;
  deleteYearlyBudget: (faId: string, budgetId: string) => Promise<void>;

  // Bulk operations
  bulkImport: (data: {
    functionalAreas: FunctionalArea[];
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

  const [functionalAreas, setFunctionalAreas] = useState<FunctionalArea[]>([]);
  const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [changeCosts, setChangeCosts] = useState<ChangeCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AbortController to cancel stale requests on facility switch
  const abortRef = useRef<AbortController | null>(null);

  // --- Load all data for the current facility from backend ---
  const loadFacilityData = useCallback(async (fId: string) => {
    if (!fId) {
      setFunctionalAreas([]);
      setWorkAreas([]);
      setCostItems([]);
      setChangeCosts([]);
      setIsLoading(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const [fas, was, cis] = await Promise.all([
        faApi.listFunctionalAreas(fId),
        waApi.listWorkAreas({ facility_id: fId }),
        ciApi.listCostItems(fId),
      ]);

      if (controller.signal.aborted) return;

      setFunctionalAreas(fas);
      setWorkAreas(was);
      setCostItems(cis);

      // Load change costs per functional area
      const allCC: ChangeCost[] = [];
      for (const fa of fas) {
        try {
          const cc = await ccApi.listChangeCosts(fa.id);
          allCC.push(...cc);
        } catch {
          // Individual functional area fetch failure is non-critical
        }
      }
      if (!controller.signal.aborted) {
        setChangeCosts(allCC);
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
          unit_price: data.unit_price ?? 0,
          quantity: data.quantity ?? 1,
          total_amount: data.total_amount ?? 0,
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
    async (functionalAreaId: string, name: string): Promise<WorkArea | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const newWA = await waApi.createWorkArea({ functional_area_id: functionalAreaId, name: trimmed });
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

  // --- CRUD: Functional Areas ---

  const createFunctionalArea = useCallback(
    async (name: string, budgetTotal: number = 0): Promise<FunctionalArea | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const newFA = await faApi.createFunctionalArea({
          facility_id: facilityId,
          name: trimmed,
          budget_total: Math.max(0, Number(budgetTotal) || 0),
        });
        setFunctionalAreas((prev) => [...prev, newFA]);
        return newFA;
      } catch {
        dispatchToastEvent('error', 'Failed to create functional area.');
        return null;
      }
    },
    [facilityId],
  );

  const updateFunctionalArea = useCallback(
    (functionalAreaId: string, data: Partial<Pick<FunctionalArea, 'name' | 'budget_total'>>) => {
      const payload: { name?: string; budget_total?: number } = {};
      if (data.name?.trim()) payload.name = data.name.trim();
      if (typeof data.budget_total === 'number' && !Number.isNaN(data.budget_total)) {
        payload.budget_total = Math.max(0, data.budget_total);
      }
      // Optimistic
      setFunctionalAreas((prev) => prev.map((d) => (d.id === functionalAreaId ? { ...d, ...payload } : d)));
      faApi.updateFunctionalArea(functionalAreaId, payload).catch(() => {
        dispatchToastEvent('error', 'Failed to update functional area.');
      });
    },
    [],
  );

  const deleteFunctionalArea = useCallback((functionalAreaId: string) => {
    faApi.deleteFunctionalArea(functionalAreaId).then(() => {
      setFunctionalAreas((prev) => prev.filter((d) => d.id !== functionalAreaId));
      setWorkAreas((prev) => prev.filter((wa) => wa.functional_area_id !== functionalAreaId));
      setCostItems((prev) => {
        const removedWAs = new Set(
          workAreas.filter((wa) => wa.functional_area_id === functionalAreaId).map((wa) => wa.id),
        );
        return prev.filter((ci) => !removedWAs.has(ci.work_area_id));
      });
    }).catch(() => {
      dispatchToastEvent('error', 'Failed to delete functional area.');
    });
  }, [workAreas]);

  const updateFunctionalAreaBudget = useCallback((faId: string, newBudget: number) => {
    setFunctionalAreas((prev) => prev.map((d) => (d.id === faId ? { ...d, budget_total: newBudget } : d)));
    faApi.updateFunctionalArea(faId, { budget_total: newBudget }).catch(() => {
      dispatchToastEvent('error', 'Failed to update functional area budget.');
    });
  }, []);

  // --- Change Costs ---

  const addChangeCost = useCallback(
    (functionalAreaId: string, amount: number, reason: string, category?: string, costDriver?: string, budgetRelevant?: boolean, year?: number) => {
      const resolvedCategory = (category as ChangeCost['category']) ?? 'other';
      ccApi.createChangeCost({
        functional_area_id: functionalAreaId,
        amount,
        reason,
        category: resolvedCategory,
        cost_driver: costDriver ?? 'product',
        budget_relevant: budgetRelevant ?? false,
        year: year ?? new Date().getFullYear(),
      }).then(() => {
        // Reload change costs for this functional area
        ccApi.listChangeCosts(functionalAreaId).then((cc) => {
          setChangeCosts((prev) => {
            const other = prev.filter((a) => a.functional_area_id !== functionalAreaId);
            return [...other, ...cc];
          });
        }).catch(() => {});
      }).catch(() => {
        dispatchToastEvent('error', 'Failed to create change cost.');
      });
    },
    [],
  );

  /** @deprecated Use addChangeCost */
  const addBudgetAdjustment = useCallback(
    (functionalAreaId: string, amount: number, reason: string, category?: string) => {
      addChangeCost(functionalAreaId, amount, reason, category);
    },
    [addChangeCost],
  );

  // --- Yearly Budget CRUD ---

  const createYearlyBudget = useCallback(
    async (faId: string, year: number, amount: number, comment?: string | null): Promise<FunctionalAreaBudget | null> => {
      try {
        const newBudget = await faBudgetApi.createFunctionalAreaBudget(faId, { year, amount, comment });
        setFunctionalAreas((prev) =>
          prev.map((fa) =>
            fa.id === faId
              ? { ...fa, budgets: [...fa.budgets, newBudget] }
              : fa,
          ),
        );
        return newBudget;
      } catch {
        dispatchToastEvent('error', 'Failed to create yearly budget.');
        return null;
      }
    },
    [],
  );

  const updateYearlyBudget = useCallback(
    async (faId: string, budgetId: string, data: { year?: number; amount?: number; comment?: string | null }) => {
      try {
        const updated = await faBudgetApi.updateFunctionalAreaBudget(faId, budgetId, data);
        setFunctionalAreas((prev) =>
          prev.map((fa) =>
            fa.id === faId
              ? { ...fa, budgets: fa.budgets.map((b) => (b.id === budgetId ? updated : b)) }
              : fa,
          ),
        );
      } catch {
        dispatchToastEvent('error', 'Failed to update yearly budget.');
      }
    },
    [],
  );

  const deleteYearlyBudget = useCallback(
    async (faId: string, budgetId: string) => {
      try {
        await faBudgetApi.deleteFunctionalAreaBudget(faId, budgetId);
        setFunctionalAreas((prev) =>
          prev.map((fa) =>
            fa.id === faId
              ? { ...fa, budgets: fa.budgets.filter((b) => b.id !== budgetId) }
              : fa,
          ),
        );
      } catch {
        dispatchToastEvent('error', 'Failed to delete yearly budget.');
      }
    },
    [],
  );

  // --- Bulk import (after backend import, reload all data) ---

  const bulkImport = useCallback(
    (data: { functionalAreas: FunctionalArea[]; workAreas: WorkArea[]; costItems: CostItem[] }) => {
      // After a backend import, just reload everything from the API
      loadFacilityData(facilityId);
    },
    [facilityId, loadFacilityData],
  );

  // --- Stable value object ---

  const value = useMemo<BudgetDataContextValue>(
    () => ({
      facility,
      functionalAreas,
      workAreas,
      costItems,
      changeCosts,
      budgetAdjustments: changeCosts,
      updateCostItem,
      deleteCostItem,
      createCostItem,
      createWorkArea,
      updateWorkArea,
      deleteWorkArea,
      createFunctionalArea,
      updateFunctionalArea,
      deleteFunctionalArea,
      updateFunctionalAreaBudget,
      addChangeCost,
      addBudgetAdjustment,
      createYearlyBudget,
      updateYearlyBudget,
      deleteYearlyBudget,
      bulkImport,
      reloadData: () => loadFacilityData(facilityId),
      isLoading,
    }),
    [
      facility, functionalAreas, workAreas, costItems, changeCosts,
      updateCostItem, deleteCostItem, createCostItem,
      createWorkArea, updateWorkArea, deleteWorkArea,
      createFunctionalArea, updateFunctionalArea, deleteFunctionalArea,
      updateFunctionalAreaBudget, addChangeCost, addBudgetAdjustment,
      createYearlyBudget, updateYearlyBudget, deleteYearlyBudget,
      bulkImport,
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
