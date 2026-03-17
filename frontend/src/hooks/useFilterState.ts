import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProjectPhase, Product, ApprovalStatus } from '../types/budget';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterState {
  departments: string[];
  phases: ProjectPhase[];
  products: Product[];
  statuses: ApprovalStatus[];
  search: string;
  overBudget: boolean;
}

type FilterField = keyof FilterState;

const EMPTY_FILTER: FilterState = {
  departments: [],
  phases: [],
  products: [],
  statuses: [],
  search: '',
  overBudget: false,
};

// ---------------------------------------------------------------------------
// Param key mapping
// ---------------------------------------------------------------------------

const PARAM_KEYS: Record<string, string> = {
  departments: 'dept',
  phases: 'phase',
  products: 'product',
  statuses: 'status',
  search: 'q',
  overBudget: 'ob',
};

// ---------------------------------------------------------------------------
// Serialisation helpers
// ---------------------------------------------------------------------------

function parseDepartmentIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseStringArray<T extends string>(raw: string | null): T[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as T[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Deserialise URL -> FilterState (memoised on searchParams string) ---
  const filters: FilterState = useMemo(() => {
    return {
      departments: parseDepartmentIds(searchParams.get(PARAM_KEYS.departments)),
      phases: parseStringArray<ProjectPhase>(searchParams.get(PARAM_KEYS.phases)),
      products: parseStringArray<Product>(searchParams.get(PARAM_KEYS.products)),
      statuses: parseStringArray<ApprovalStatus>(searchParams.get(PARAM_KEYS.statuses)),
      search: searchParams.get(PARAM_KEYS.search) ?? '',
      overBudget: searchParams.get(PARAM_KEYS.overBudget) === '1',
    };
  }, [searchParams]);

  // --- Set a single filter field ---
  const setFilter = useCallback(
    <K extends FilterField>(field: K, values: FilterState[K]) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const paramKey = PARAM_KEYS[field];

        if (field === 'search') {
          const str = values as string;
          if (str) {
            next.set(paramKey, str);
          } else {
            next.delete(paramKey);
          }
        } else if (field === 'overBudget') {
          const v = values as boolean;
          if (v) {
            next.set(paramKey, '1');
          } else {
            next.delete(paramKey);
          }
        } else {
          const arr = values as string[];
          if (arr.length > 0) {
            next.set(paramKey, arr.join(','));
          } else {
            next.delete(paramKey);
          }
        }

        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  // --- Set all filters at once ---
  const setAllFilters = useCallback(
    (newFilters: FilterState) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        // Clear existing filter params first
        Object.values(PARAM_KEYS).forEach((key) => next.delete(key));

        // Set departments
        if (newFilters.departments.length > 0) {
          next.set(PARAM_KEYS.departments, newFilters.departments.join(','));
        }
        // Set phases
        if (newFilters.phases.length > 0) {
          next.set(PARAM_KEYS.phases, newFilters.phases.join(','));
        }
        // Set products
        if (newFilters.products.length > 0) {
          next.set(PARAM_KEYS.products, newFilters.products.join(','));
        }
        // Set statuses
        if (newFilters.statuses.length > 0) {
          next.set(PARAM_KEYS.statuses, newFilters.statuses.join(','));
        }
        // Set search
        if (newFilters.search) {
          next.set(PARAM_KEYS.search, newFilters.search);
        }
        // Set overBudget
        if (newFilters.overBudget) {
          next.set(PARAM_KEYS.overBudget, '1');
        }

        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  // --- Reset all filters ---
  const resetFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.values(PARAM_KEYS).forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // --- Convenience: is any filter active? ---
  const hasActiveFilters = useMemo(() => {
    return (
      filters.departments.length > 0 ||
      filters.phases.length > 0 ||
      filters.products.length > 0 ||
      filters.statuses.length > 0 ||
      filters.search.length > 0 ||
      filters.overBudget
    );
  }, [filters]);

  return { filters, setFilter, setAllFilters, resetFilters, hasActiveFilters } as const;
}

export { EMPTY_FILTER };
