import React, { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import FilterChip from './FilterChip';
import SearchInput from './SearchInput';
import HelpTooltip from '../help/HelpTooltip';
import type { FilterState } from '../../hooks/useFilterState';
import { useBudgetData } from '../../context/BudgetDataContext';
import {
  PHASE_LABELS,
  PRODUCT_LABELS,
  STATUS_LABELS,
  type ProjectPhase,
  type Product,
  type ApprovalStatus,
} from '../../types/budget';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(
    field: K,
    values: FilterState[K],
  ) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  /** Filtered / total item counts for counter display */
  filteredCount?: number;
  totalCount?: number;
}

// ---------------------------------------------------------------------------
// Option builders (stable)
// ---------------------------------------------------------------------------

function buildPhaseOptions() {
  return (Object.entries(PHASE_LABELS) as [ProjectPhase, string][]).map(
    ([value, label]) => ({ value, label }),
  );
}

function buildProductOptions() {
  return (Object.entries(PRODUCT_LABELS) as [Product, string][]).map(
    ([value, label]) => ({ value, label }),
  );
}

function buildStatusOptions() {
  return (Object.entries(STATUS_LABELS) as [ApprovalStatus, string][]).map(
    ([value, label]) => ({ value, label }),
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  filteredCount,
  totalCount,
}) => {
  const { departments } = useBudgetData();
  const deptOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.id), label: d.name })),
    [departments],
  );
  const phaseOptions = useMemo(buildPhaseOptions, []);
  const productOptions = useMemo(buildProductOptions, []);
  const statusOptions = useMemo(buildStatusOptions, []);

  return (
    <div className="px-6 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Department */}
        <FilterChip
          label="Department"
          options={deptOptions}
          selected={filters.departments.map(String)}
          onChange={(vals) =>
            onFilterChange('departments', vals.map(Number))
          }
        />

        {/* Phase */}
        <FilterChip
          label="Phase"
          options={phaseOptions}
          selected={filters.phases}
          onChange={(vals) =>
            onFilterChange('phases', vals as ProjectPhase[])
          }
        />

        {/* Product */}
        <FilterChip
          label="Product"
          options={productOptions}
          selected={filters.products}
          onChange={(vals) =>
            onFilterChange('products', vals as Product[])
          }
        />

        {/* Status */}
        <FilterChip
          label="Status"
          options={statusOptions}
          selected={filters.statuses}
          onChange={(vals) =>
            onFilterChange('statuses', vals as ApprovalStatus[])
          }
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reset button */}
        {hasActiveFilters && (
          <span className="inline-flex items-center gap-1.5">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Zurücksetzen
            </button>
            <HelpTooltip text="Setzt alle Filter zurück und zeigt alle Positionen" />
          </span>
        )}

        {/* Search */}
        <SearchInput
          value={filters.search}
          onChange={(v) => onFilterChange('search', v)}
        />

        {/* Filter counter */}
        {filteredCount != null && totalCount != null && (
          <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
            {filteredCount === totalCount
              ? `${totalCount} Positionen`
              : `${filteredCount} von ${totalCount} Positionen`}
          </span>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
