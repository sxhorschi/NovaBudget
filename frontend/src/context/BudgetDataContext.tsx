import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Facility, Department, WorkArea, CostItem } from '../types/budget';
import {
  mockFacility,
  mockDepartments,
  mockWorkAreas,
  mockCostItems,
} from '../mocks/data';

// ---------------------------------------------------------------------------
// Context value interface
// ---------------------------------------------------------------------------

export interface BudgetDataContextValue {
  facility: Facility;
  departments: Department[];
  workAreas: WorkArea[];
  costItems: CostItem[];

  // CRUD Mutations (optimistic updates)
  updateCostItem: (id: number, data: Partial<CostItem>) => void;
  deleteCostItem: (id: number) => void;
  createCostItem: (workAreaId: number, data: Partial<CostItem>) => CostItem;

  // Loading state (fuer zukuenftigen API-Modus)
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
      'useBudgetData() muss innerhalb eines <BudgetDataProvider> verwendet werden.',
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider (Mock-Modus — lokaler State)
// ---------------------------------------------------------------------------

export const BudgetDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [costItems, setCostItems] = useState<CostItem[]>(mockCostItems);

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
      // Compute next id synchronously from current state
      let maxId = 0;
      setCostItems((prev) => {
        maxId = prev.reduce((m, ci) => Math.max(m, ci.id), 0);
        return prev;
      });

      const newItem: CostItem = {
        id: maxId + 1,
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
        created_at: now,
        updated_at: now,
      };

      setCostItems((prev) => [...prev, newItem]);
      return newItem;
    },
    [],
  );

  // --- stable value object ---
  const value = useMemo<BudgetDataContextValue>(
    () => ({
      facility: mockFacility,
      departments: mockDepartments,
      workAreas: mockWorkAreas,
      costItems,
      updateCostItem,
      deleteCostItem,
      createCostItem,
      isLoading: false,
    }),
    [costItems, updateCostItem, deleteCostItem, createCostItem],
  );

  return (
    <BudgetDataContext.Provider value={value}>
      {children}
    </BudgetDataContext.Provider>
  );
};

export default BudgetDataContext;
