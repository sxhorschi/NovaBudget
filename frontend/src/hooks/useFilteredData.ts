import { useMemo } from 'react';
import type { FilterState } from './useFilterState';
import type { Department, WorkArea, CostItem } from '../types/budget';
import { useBudgetData } from '../context/BudgetDataContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilteredSummary {
  budget: number;
  committed: number;
  remaining: number;
  delta: number;
  itemCount: number;
}

export interface FilteredData {
  filteredDepartments: Department[];
  filteredWorkAreas: WorkArea[];
  filteredItems: CostItem[];
  summary: FilteredSummary;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFilteredData(filters: FilterState): FilteredData {
  const { departments: allDepartments, workAreas: allWorkAreas, costItems: allCostItems } =
    useBudgetData();

  return useMemo(() => {
    // ---- Step 1: Determine which departments are in scope ----
    const departments =
      filters.departments.length > 0
        ? allDepartments.filter((d) => filters.departments.includes(d.id))
        : allDepartments;

    const departmentIds = new Set(departments.map((d) => d.id));

    // ---- Step 2: Work areas in those departments ----
    const workAreasInDepts = allWorkAreas.filter((wa) =>
      departmentIds.has(wa.department_id),
    );
    const workAreaIds = new Set(workAreasInDepts.map((wa) => wa.id));

    // ---- Step 3: Filter cost items ----
    let items = allCostItems.filter((ci) => workAreaIds.has(ci.work_area_id));

    if (filters.phases.length > 0) {
      const phaseSet = new Set(filters.phases);
      items = items.filter((ci) => phaseSet.has(ci.project_phase));
    }

    if (filters.products.length > 0) {
      const productSet = new Set(filters.products);
      items = items.filter((ci) => productSet.has(ci.product));
    }

    if (filters.statuses.length > 0) {
      const statusSet = new Set(filters.statuses);
      items = items.filter((ci) => statusSet.has(ci.approval_status));
    }

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (ci) =>
          ci.description.toLowerCase().includes(q) ||
          ci.assumptions.toLowerCase().includes(q) ||
          ci.comments.toLowerCase().includes(q),
      );
    }

    // ---- Step 4: Filter work areas to those that still have items ----
    const itemWorkAreaIds = new Set(items.map((ci) => ci.work_area_id));
    const filteredWorkAreas = workAreasInDepts.filter((wa) =>
      itemWorkAreaIds.has(wa.id),
    );

    // ---- Step 5: Filter departments to those that still have work areas ----
    const filteredWaDeptIds = new Set(
      filteredWorkAreas.map((wa) => wa.department_id),
    );
    const filteredDepartments = departments.filter((d) =>
      filteredWaDeptIds.has(d.id),
    );

    // ---- Step 6: Compute summary ----
    const committed = items.reduce((sum, ci) => sum + ci.current_amount, 0);

    // Budget = sum of budget_total for departments that have filtered items
    const budget = filteredDepartments.reduce(
      (sum, d) => sum + d.budget_total,
      0,
    );

    const remaining = budget - committed;

    // Delta = sum of (original - current) for all filtered items
    // Positive delta = under budget, negative = over budget
    const delta = items.reduce(
      (sum, ci) => sum + (ci.original_amount - ci.current_amount),
      0,
    );

    return {
      filteredDepartments,
      filteredWorkAreas,
      filteredItems: items,
      summary: {
        budget,
        committed,
        remaining,
        delta,
        itemCount: items.length,
      },
    };
  }, [filters, allDepartments, allWorkAreas, allCostItems]);
}
