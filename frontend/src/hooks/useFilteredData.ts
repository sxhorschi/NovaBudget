import { useMemo } from 'react';
import type { FilterState } from './useFilterState';
import type { Department, WorkArea, CostItem } from '../types/budget';
import { useBudgetData } from '../context/BudgetDataContext';

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('de-DE')
    .replace(/\u00e4/g, 'ae')
    .replace(/\u00f6/g, 'oe')
    .replace(/\u00fc/g, 'ue')
    .replace(/\u00df/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilteredSummary {
  budget: number;
  committed: number;
  forecast: number;
  remaining: number;
  delta: number;
  itemCount: number;
  totalItemCount: number;
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
  const {
    departments: allDepartments,
    workAreas: allWorkAreas,
    costItems: allCostItems,
    budgetAdjustments,
  } = useBudgetData();

  const searchIndex = useMemo(() => {
    const index = new Map<number, string>();
    for (const ci of allCostItems) {
      index.set(
        ci.id,
        normalizeSearchText(`${ci.description} ${ci.assumptions ?? ''} ${ci.comments ?? ''}`),
      );
    }
    return index;
  }, [allCostItems]);

  return useMemo(() => {
    // ---- Step 1: Determine which departments are in scope ----
    const departments =
      filters.departments.length > 0
        ? allDepartments.filter((d) => filters.departments.includes(d.id))
        : allDepartments;

    const hasItemLevelFilters =
      filters.phases.length > 0 ||
      filters.products.length > 0 ||
      filters.statuses.length > 0 ||
      filters.search.trim().length > 0 ||
      filters.overBudget;

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
      const q = normalizeSearchText(filters.search.trim());
      items = items.filter(
        (ci) => (searchIndex.get(ci.id) ?? '').includes(q),
      );
    }

    // ---- Step 4: Filter work areas to those that still have items ----
    const itemWorkAreaIds = new Set(items.map((ci) => ci.work_area_id));
    let filteredWorkAreas = hasItemLevelFilters
      ? workAreasInDepts.filter((wa) => itemWorkAreaIds.has(wa.id))
      : workAreasInDepts;

    // ---- Step 5: Filter departments to those that still have work areas ----
    const filteredWaDeptIds = new Set(
      filteredWorkAreas.map((wa) => wa.department_id),
    );
    let filteredDepartments = hasItemLevelFilters
      ? departments.filter((d) => filteredWaDeptIds.has(d.id))
      : departments;

    // ---- Step 5b: Apply overBudget filter ----
    if (filters.overBudget) {
      const overBudgetDeptIds = new Set<number>();
      for (const dept of filteredDepartments) {
        const deptWAs = workAreasInDepts.filter((wa) => wa.department_id === dept.id);
        const deptWAIds = new Set(deptWAs.map((wa) => wa.id));
        // Use forecast logic (exclude rejected/obsolete) for over-budget check,
        // consistent with remaining = budget - forecast
        const deptTotal = items
          .filter((ci) =>
            deptWAIds.has(ci.work_area_id) &&
            ci.approval_status !== 'rejected' &&
            ci.approval_status !== 'obsolete',
          )
          .reduce((s, ci) => s + ci.current_amount, 0);
        const deptAdjustments = budgetAdjustments
          .filter((adj) => adj.department_id === dept.id)
          .reduce((sum, adj) => sum + adj.amount, 0);
        const deptBudget = dept.budget_total + deptAdjustments;
        if (deptTotal > deptBudget) {
          overBudgetDeptIds.add(dept.id);
        }
      }
      filteredDepartments = filteredDepartments.filter((d) => overBudgetDeptIds.has(d.id));
      // Also restrict work areas and items to matching departments
      const obd = new Set(filteredDepartments.map((d) => d.id));
      filteredWorkAreas = filteredWorkAreas.filter((wa) => obd.has(wa.department_id));
      const obWAIds = new Set(filteredWorkAreas.map((wa) => wa.id));
      items = items.filter((ci) => obWAIds.has(ci.work_area_id));
    }

    // ---- Step 6: Compute summary ----

    // Committed = nur freigegebene (approved) Items
    const committed = items
      .filter((ci) => ci.approval_status === 'approved')
      .reduce((sum, ci) => sum + ci.current_amount, 0);

    // Forecast = alle Items die nicht rejected oder obsolete sind
    const forecast = items
      .filter(
        (ci) =>
          ci.approval_status !== 'rejected' &&
          ci.approval_status !== 'obsolete',
      )
      .reduce((sum, ci) => sum + ci.current_amount, 0);

    // Budget = Basis-Budget + Zielanpassungen fuer sichtbare Departments
    const filteredDeptIds = new Set(filteredDepartments.map((d) => d.id));
    const baseBudget = filteredDepartments.reduce(
      (sum, d) => sum + d.budget_total,
      0,
    );
    const adjustmentTotal = budgetAdjustments
      .filter((adj) => filteredDeptIds.has(adj.department_id))
      .reduce((sum, adj) => sum + adj.amount, 0);
    const budget = baseBudget + adjustmentTotal;

    // Remaining = Budget - Forecast
    const remaining = budget - forecast;

    // Delta = Summe (original - current) fuer alle sichtbaren Items
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
        forecast,
        remaining,
        delta,
        itemCount: items.length,
        totalItemCount: allCostItems.length,
      },
    };
  }, [
    filters,
    allDepartments,
    allWorkAreas,
    allCostItems,
    budgetAdjustments,
    searchIndex,
  ]);
}
