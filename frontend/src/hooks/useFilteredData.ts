import { useMemo } from 'react';
import type { FilterState } from './useFilterState';
import type { FunctionalArea, WorkArea, CostItem } from '../types/budget';
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
  filteredFunctionalAreas: FunctionalArea[];
  filteredWorkAreas: WorkArea[];
  filteredItems: CostItem[];
  summary: FilteredSummary;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFilteredData(filters: FilterState): FilteredData {
  const {
    functionalAreas: allFunctionalAreas,
    workAreas: allWorkAreas,
    costItems: allCostItems,
    changeCosts,
  } = useBudgetData();

  const searchIndex = useMemo(() => {
    const index = new Map<string, string>();
    for (const ci of allCostItems) {
      index.set(
        ci.id,
        normalizeSearchText(`${ci.description} ${ci.assumptions ?? ''}`),
      );
    }
    return index;
  }, [allCostItems]);

  return useMemo(() => {
    // ---- Step 1: Determine which functional areas are in scope ----
    const functionalAreas =
      filters.functionalAreas.length > 0
        ? allFunctionalAreas.filter((d) => filters.functionalAreas.includes(d.id))
        : allFunctionalAreas;

    const hasItemLevelFilters =
      filters.phases.length > 0 ||
      filters.products.length > 0 ||
      filters.statuses.length > 0 ||
      filters.search.trim().length > 0 ||
      filters.overBudget;

    const functionalAreaIds = new Set(functionalAreas.map((d) => d.id));

    // ---- Step 2: Work areas in those functional areas ----
    const workAreasInFAs = allWorkAreas.filter((wa) =>
      functionalAreaIds.has(wa.functional_area_id),
    );
    const workAreaIds = new Set(workAreasInFAs.map((wa) => wa.id));

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
      ? workAreasInFAs.filter((wa) => itemWorkAreaIds.has(wa.id))
      : workAreasInFAs;

    // ---- Step 5: Filter functional areas to those that still have work areas ----
    const filteredWaFaIds = new Set(
      filteredWorkAreas.map((wa) => wa.functional_area_id),
    );
    let filteredFunctionalAreas = hasItemLevelFilters
      ? functionalAreas.filter((d) => filteredWaFaIds.has(d.id))
      : functionalAreas;

    // ---- Step 5b: Apply overBudget filter ----
    if (filters.overBudget) {
      const overBudgetFaIds = new Set<string>();
      for (const fa of filteredFunctionalAreas) {
        const faWAs = workAreasInFAs.filter((wa) => wa.functional_area_id === fa.id);
        const faWAIds = new Set(faWAs.map((wa) => wa.id));
        // Use forecast logic (exclude rejected/obsolete) for over-budget check,
        // consistent with remaining = budget - forecast
        const faTotal = items
          .filter((ci) =>
            faWAIds.has(ci.work_area_id) &&
            ci.approval_status !== 'rejected' &&
            ci.approval_status !== 'obsolete',
          )
          .reduce((s, ci) => s + ci.total_amount, 0);
        const faAdjustments = changeCosts
          .filter((cc) => cc.functional_area_id === fa.id && cc.budget_relevant)
          .reduce((sum, cc) => sum + cc.amount, 0);
        const faYearlyTotal = (fa.budgets ?? []).reduce((s, b) => s + b.amount, 0);
        const faBudget = (faYearlyTotal > 0 ? faYearlyTotal : fa.budget_total) + faAdjustments;
        if (faTotal > faBudget) {
          overBudgetFaIds.add(fa.id);
        }
      }
      filteredFunctionalAreas = filteredFunctionalAreas.filter((d) => overBudgetFaIds.has(d.id));
      // Also restrict work areas and items to matching functionalAreas
      const obd = new Set(filteredFunctionalAreas.map((d) => d.id));
      filteredWorkAreas = filteredWorkAreas.filter((wa) => obd.has(wa.functional_area_id));
      const obWAIds = new Set(filteredWorkAreas.map((wa) => wa.id));
      items = items.filter((ci) => obWAIds.has(ci.work_area_id));
    }

    // ---- Step 6: Compute summary ----

    // Committed = nur freigegebene (approved) Items
    const committed = items
      .filter((ci) => ci.approval_status === 'approved')
      .reduce((sum, ci) => sum + ci.total_amount, 0);

    // Forecast = alle Items die nicht rejected oder obsolete sind
    const forecast = items
      .filter(
        (ci) =>
          ci.approval_status !== 'rejected' &&
          ci.approval_status !== 'obsolete',
      )
      .reduce((sum, ci) => sum + ci.total_amount, 0);

    // Budget = Yearly budgets sum (if available) or budget_total + change costs
    const filteredFaIds = new Set(filteredFunctionalAreas.map((d) => d.id));
    const baseBudget = filteredFunctionalAreas.reduce(
      (sum, d) => {
        // If yearly budgets exist, use their total; otherwise fall back to budget_total
        const yearlyTotal = (d.budgets ?? []).reduce((s, b) => s + b.amount, 0);
        return sum + (yearlyTotal > 0 ? yearlyTotal : d.budget_total);
      },
      0,
    );
    const adjustmentTotal = changeCosts
      .filter((cc) => filteredFaIds.has(cc.functional_area_id) && cc.budget_relevant)
      .reduce((sum, cc) => sum + cc.amount, 0);
    const budget = baseBudget + adjustmentTotal;

    // Remaining = Budget - Forecast
    const remaining = budget - forecast;

    // Delta: placeholder — will be replaced by PriceHistory in Phase 4
    const delta = 0;

    return {
      filteredFunctionalAreas,
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
    allFunctionalAreas,
    allWorkAreas,
    allCostItems,
    changeCosts,
    searchIndex,
  ]);
}
