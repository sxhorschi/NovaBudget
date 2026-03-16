import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X as XIcon, Bookmark } from 'lucide-react';
import type { FilterState } from '../../hooks/useFilterState';
import { EMPTY_FILTER } from '../../hooks/useFilterState';
import type { ApprovalStatus, ProjectPhase } from '../../types/budget';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavedView {
  id: string;
  label: string;
  filters: FilterState;
  isCustom: boolean;
}

interface SavedViewsProps {
  currentFilters: FilterState;
  onApplyView: (filters: FilterState) => void;
}

// ---------------------------------------------------------------------------
// Predefined views
// ---------------------------------------------------------------------------

const PREDEFINED_VIEWS: SavedView[] = [
  {
    id: 'all',
    label: 'Alle Positionen',
    filters: { ...EMPTY_FILTER },
    isCustom: false,
  },
  {
    id: 'open-approvals',
    label: 'Offene Freigaben',
    filters: {
      ...EMPTY_FILTER,
      statuses: ['open', 'submitted_for_approval'] as ApprovalStatus[],
    },
    isCustom: false,
  },
  {
    id: 'phase-1',
    label: 'Phase 1 — Bryan Start',
    filters: {
      ...EMPTY_FILTER,
      phases: ['phase_1'] as ProjectPhase[],
    },
    isCustom: false,
  },
  {
    id: 'phase-2',
    label: 'Phase 2 — Günther Ramp-Up',
    filters: {
      ...EMPTY_FILTER,
      phases: ['phase_2'] as ProjectPhase[],
    },
    isCustom: false,
  },
  {
    id: 'over-budget',
    label: 'Über Budget',
    filters: { ...EMPTY_FILTER },
    isCustom: false,
  },
  {
    id: 'assembly',
    label: 'Assembly Equipment',
    filters: {
      ...EMPTY_FILTER,
      departments: [1],
    },
    isCustom: false,
  },
  {
    id: 'testing',
    label: 'Testing',
    filters: {
      ...EMPTY_FILTER,
      departments: [2],
    },
    isCustom: false,
  },
];

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'budget-tool-custom-views';

function loadCustomViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedView[];
  } catch {
    return [];
  }
}

function persistCustomViews(views: SavedView[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersMatch(a: FilterState, b: FilterState): boolean {
  return (
    arraysEqual(a.departments, b.departments) &&
    arraysEqual(a.phases, b.phases) &&
    arraysEqual(a.products, b.products) &&
    arraysEqual(a.statuses, b.statuses) &&
    a.search === b.search
  );
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SavedViews: React.FC<SavedViewsProps> = ({ currentFilters, onApplyView }) => {
  const [customViews, setCustomViews] = useState<SavedView[]>(loadCustomViews);
  const [showNameInput, setShowNameInput] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Persist custom views to localStorage whenever they change
  useEffect(() => {
    persistCustomViews(customViews);
  }, [customViews]);

  const allViews = [...PREDEFINED_VIEWS, ...customViews];

  // Determine active view: find the first view whose filters match current
  const activeViewId = allViews.find((v) => {
    // Special handling: "Über Budget" is a virtual filter — it has no URL-representable filter
    if (v.id === 'over-budget') return false;
    return filtersMatch(v.filters, currentFilters);
  })?.id ?? null;

  const handleApply = useCallback(
    (view: SavedView) => {
      // "Über Budget" is a special view — we signal it through search to hint the table
      // In practice this sets empty filters since it relies on item-level comparison
      // The parent page can check for this special tag
      if (view.id === 'over-budget') {
        onApplyView({ ...EMPTY_FILTER, search: '__over_budget__' });
        return;
      }
      onApplyView(view.filters);
    },
    [onApplyView],
  );

  const handleSaveView = useCallback(() => {
    const name = newViewName.trim();
    if (!name) return;

    const view: SavedView = {
      id: `custom-${Date.now()}`,
      label: name,
      filters: { ...currentFilters },
      isCustom: true,
    };

    setCustomViews((prev) => [...prev, view]);
    setNewViewName('');
    setShowNameInput(false);
  }, [newViewName, currentFilters]);

  const handleRemoveCustomView = useCallback((id: string) => {
    setCustomViews((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSaveView();
      } else if (e.key === 'Escape') {
        setShowNameInput(false);
        setNewViewName('');
      }
    },
    [handleSaveView],
  );

  return (
    <div className="px-6 pt-3 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <Bookmark size={14} className="text-gray-400 flex-shrink-0" />

        {allViews.map((view) => {
          const isActive = view.id === activeViewId;
          return (
            <button
              key={view.id}
              onClick={() => handleApply(view)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                isActive
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {view.label}
              {isActive && view.id !== 'all' && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (view.isCustom) {
                      handleRemoveCustomView(view.id);
                    }
                    // Reset to "Alle Positionen" (empty filters)
                    onApplyView({ ...EMPTY_FILTER });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      if (view.isCustom) {
                        handleRemoveCustomView(view.id);
                      }
                      onApplyView({ ...EMPTY_FILTER });
                    }
                  }}
                  className="ml-1 rounded-full hover:bg-gray-300 p-0.5"
                >
                  <XIcon size={10} />
                </span>
              )}
            </button>
          );
        })}

        {/* Save current view */}
        {showNameInput ? (
          <div className="inline-flex items-center gap-1.5 flex-shrink-0">
            <input
              autoFocus
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newViewName.trim()) {
                  setShowNameInput(false);
                }
              }}
              placeholder="Name der Ansicht..."
              className="px-2 py-1 text-xs rounded-lg border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
            />
            <button
              onClick={handleSaveView}
              disabled={!newViewName.trim()}
              className="px-2 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              OK
            </button>
            <button
              onClick={() => {
                setShowNameInput(false);
                setNewViewName('');
              }}
              className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <XIcon size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNameInput(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-gray-50 text-gray-500 hover:bg-gray-100 border border-dashed border-gray-300 transition-colors flex-shrink-0"
          >
            <Plus size={12} />
            Ansicht speichern
          </button>
        )}
      </div>
    </div>
  );
};

export default SavedViews;
