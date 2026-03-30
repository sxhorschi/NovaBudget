import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowUp, ArrowDown, SearchX, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import type { FunctionalArea, WorkAreaWithItems, CostItem, ApprovalStatus } from '../../types/budget';
import { COMMITTED_STATUSES } from '../../types/budget';
import { getFAColor } from '../../styles/design-tokens';
import FunctionalAreaRow from './FunctionalAreaRow';
import WorkAreaRow from './WorkAreaRow';
import CostItemRow from './CostItemRow';
import TableFooter from './TableFooter';

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

type SortField = 'description' | 'amount' | 'phase' | 'product' | 'status' | 'cashout' | 'requester';
type SortDir = 'asc' | 'desc';

interface SortState {
  field: SortField;
  dir: SortDir;
}

function compareCostItems(a: CostItem, b: CostItem, sort: SortState): number {
  const dir = sort.dir === 'asc' ? 1 : -1;
  switch (sort.field) {
    case 'description':
      return a.description.localeCompare(b.description) * dir;
    case 'amount':
      return (a.total_amount - b.total_amount) * dir;
    case 'phase':
      return a.project_phase.localeCompare(b.project_phase) * dir;
    case 'product':
      return a.product.localeCompare(b.product) * dir;
    case 'status':
      return a.approval_status.localeCompare(b.approval_status) * dir;
    case 'cashout':
      return a.expected_cash_out.localeCompare(b.expected_cash_out) * dir;
    case 'requester':
      return (a.requester ?? '').localeCompare(b.requester ?? '') * dir;
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Column definitions for header rendering
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: SortField;
  label: string;
  width: string;
  align: 'left' | 'right';
  sortable: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'description', label: 'Description', width: '',      align: 'left',  sortable: true },
  { key: 'phase',       label: 'Phase',       width: '96px',  align: 'left',  sortable: true },
  { key: 'product',     label: 'Product',     width: '110px', align: 'left',  sortable: true },
  { key: 'status',      label: 'Status',      width: '160px', align: 'left',  sortable: true },
  { key: 'requester',   label: 'Requester',   width: '130px', align: 'left',  sortable: true },
  { key: 'cashout',     label: 'Cash-Out',    width: '110px', align: 'left',  sortable: true },
  { key: 'amount',      label: 'Amount',      width: '160px', align: 'right', sortable: true },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CostbookTableProps {
  functionalAreas: FunctionalArea[];
  workAreas: WorkAreaWithItems[];
  functionalAreaCommittedTotals?: Record<string, number>;
  selectedYear?: number | null;
  onSelectItem: (item: CostItem) => void;
  selectedItemId: string | null;
  onStatusChange: (item: CostItem, newStatus: ApprovalStatus) => void;
  onDeleteItem?: (item: CostItem) => void;
  onOpenFunctionalAreaContext?: (functionalAreaId: string) => void;
  onOpenWorkAreaContext?: (workAreaId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CostbookTable({
  functionalAreas,
  workAreas,
  functionalAreaCommittedTotals,
  selectedYear,
  onSelectItem,
  selectedItemId,
  onStatusChange,
  onDeleteItem,
  onOpenFunctionalAreaContext,
  onOpenWorkAreaContext,
}: CostbookTableProps) {
  // -- Expansion state: all expanded by default --------------------------------
  const [expandedFAs, setExpandedDepts] = useState<Set<string>>(
    () => new Set(functionalAreas.map((d) => d.id)),
  );
  const [expandedWAs, setExpandedWAs] = useState<Set<string>>(
    () => new Set(workAreas.map((wa) => wa.id)),
  );

  useEffect(() => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const d of functionalAreas) {
        if (!next.has(d.id)) {
          next.add(d.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [functionalAreas]);

  useEffect(() => {
    setExpandedWAs((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const wa of workAreas) {
        if (!next.has(wa.id)) {
          next.add(wa.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [workAreas]);

  // -- Sorting state -----------------------------------------------------------
  const [sort, setSort] = useState<SortState>({ field: 'description', dir: 'asc' });

  const toggleSort = useCallback((field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' },
    );
  }, []);

  // -- Toggle helpers ----------------------------------------------------------
  const toggleFA = useCallback((faId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(faId)) next.delete(faId);
      else next.add(faId);
      return next;
    });
  }, []);

  const toggleWA = useCallback((waId: string) => {
    setExpandedWAs((prev) => {
      const next = new Set(prev);
      if (next.has(waId)) next.delete(waId);
      else next.add(waId);
      return next;
    });
  }, []);

  // -- Precompute: group work areas by functional area ------------------------------
  const waByFA = useMemo(() => {
    const map = new Map<string, WorkAreaWithItems[]>();
    for (const wa of workAreas) {
      const list = map.get(wa.functional_area_id) ?? [];
      list.push(wa);
      map.set(wa.functional_area_id, list);
    }
    return map;
  }, [workAreas]);

  // -- Expand / Collapse All ---------------------------------------------------
  const allFAIds = useMemo(() => functionalAreas.map((d) => d.id), [functionalAreas]);
  const allWAIds = useMemo(() => workAreas.map((wa) => wa.id), [workAreas]);

  const allFAsExpanded = useMemo(
    () => allFAIds.length > 0 && allFAIds.every((id) => expandedFAs.has(id)),
    [allFAIds, expandedFAs],
  );
  const allWAsExpanded = useMemo(
    () => allWAIds.length > 0 && allWAIds.every((id) => expandedWAs.has(id)),
    [allWAIds, expandedWAs],
  );

  const allExpanded = allFAsExpanded && allWAsExpanded;

  const expandAll = useCallback(() => {
    setExpandedDepts(new Set(allFAIds));
    setExpandedWAs(new Set(allWAIds));
  }, [allFAIds, allWAIds]);

  const collapseAll = useCallback(() => {
    setExpandedDepts(new Set());
    setExpandedWAs(new Set());
  }, []);

  // -- Collect all items for grand total ---------------------------------------
  const allItems = useMemo(() => {
    const items: CostItem[] = [];
    for (const wa of workAreas) {
      items.push(...wa.cost_items);
    }
    return items;
  }, [workAreas]);

  const grandTotal = useMemo(
    () => allItems.reduce((sum, ci) => sum + ci.total_amount, 0),
    [allItems],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Toolbar: Expand/Collapse All */}
      {functionalAreas.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-2">
          <button
            type="button"
            onClick={allExpanded ? collapseAll : expandAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp size={14} />
                Collapse all
              </>
            ) : (
              <>
                <ChevronsUpDown size={14} />
                Expand all
              </>
            )}
          </button>
        </div>
      )}

    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
      <div className="overflow-auto scroll-smooth">
      <table className="w-full border-collapse">
        {/* ------------------------------------------------------------------ */}
        {/* Table Header                                                        */}
        {/* ------------------------------------------------------------------ */}
        <thead>
          <tr className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-50/80 border-b backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderColor: 'var(--border-default)' }}>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                className={[
                  'px-4 py-3 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap select-none transition-colors duration-150',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.sortable ? 'cursor-pointer hover:text-gray-600 hover:bg-gray-100/60' : '',
                ].join(' ')}
                style={{
                  color: 'var(--text-tertiary)',
                  width: col.width || undefined,
                  minWidth: col.key === 'description' ? '300px' : undefined,
                }}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sort.field === col.key && (
                    sort.dir === 'asc'
                      ? <ArrowUp size={12} />
                      : <ArrowDown size={12} />
                  )}
                </span>
              </th>
            ))}
            {/* Actions column header */}
            <th
              className="px-4 py-3"
              style={{ width: '110px', color: 'var(--text-tertiary)' }}
            />
          </tr>
        </thead>

        {/* ------------------------------------------------------------------ */}
        {/* Table Body — 3-level hierarchy                                      */}
        {/* ------------------------------------------------------------------ */}
        <tbody>
          {functionalAreas.map((fa) => {
            const faWAs = waByFA.get(fa.id) ?? [];
            const faItems: CostItem[] = [];
            for (const wa of faWAs) {
              faItems.push(...wa.cost_items);
            }
            // Committed = approved + PO sent + PO confirmed (consistent with useFilteredData)
            const visibleCommitted = faItems
              .filter((ci) => COMMITTED_STATUSES.has(ci.approval_status))
              .reduce((s, ci) => s + ci.total_amount, 0);
            const committed = functionalAreaCommittedTotals?.[fa.id] ?? visibleCommitted;
            const isFAExpanded = expandedFAs.has(fa.id);
            const color = getFAColor(fa.id);

            return (
              <FunctionalAreaGroup key={fa.id}>
                {/* Functional Area row */}
                <FunctionalAreaRow
                  name={fa.name}
                  committed={committed}
                  budget={(() => {
                    const budgets = fa.budgets ?? [];
                    if (selectedYear != null) {
                      return budgets.filter((b) => b.year === selectedYear).reduce((s, b) => s + b.amount, 0);
                    }
                    return budgets.reduce((s, b) => s + b.amount, 0);
                  })()}
                  itemCount={faItems.length}
                  expanded={isFAExpanded}
                  onToggle={() => toggleFA(fa.id)}
                  onOpenContext={
                    onOpenFunctionalAreaContext
                      ? () => onOpenFunctionalAreaContext(fa.id)
                      : undefined
                  }
                  accentColor={color}
                />

                {/* Work areas (visible when functional area expanded) */}
                {isFAExpanded &&
                  faWAs.map((wa) => {
                    const items = wa.cost_items;
                    const waTotal = items.reduce((s, ci) => s + ci.total_amount, 0);
                    const isWAExpanded = expandedWAs.has(wa.id);
                    const sortedItems = [...items].sort((a, b) => compareCostItems(a, b, sort));

                    return (
                      <WorkAreaGroup key={wa.id}>
                        <WorkAreaRow
                          name={wa.name}
                          total={waTotal}
                          itemCount={items.length}
                          expanded={isWAExpanded}
                          onToggle={() => toggleWA(wa.id)}
                          onOpenContext={
                            onOpenWorkAreaContext
                              ? () => onOpenWorkAreaContext(wa.id)
                              : undefined
                          }
                          accentColor={color}
                        />

                        {/* Cost items (visible when work area expanded) */}
                        {isWAExpanded &&
                          sortedItems.map((item) => (
                            <CostItemRow
                              key={item.id}
                              item={item}
                              selected={item.id === selectedItemId}
                              onClick={() => onSelectItem(item)}
                              onStatusChange={(newStatus) => onStatusChange(item, newStatus)}
                              onDelete={onDeleteItem ? () => onDeleteItem(item) : undefined}
                            />
                          ))}
                      </WorkAreaGroup>
                    );
                  })}
              </FunctionalAreaGroup>
            );
          })}

          {/* Empty state */}
          {functionalAreas.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <SearchX size={28} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      No cost items found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Adjust or reset the filters to see results.
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>

        {/* ------------------------------------------------------------------ */}
        {/* Table Footer                                                        */}
        {/* ------------------------------------------------------------------ */}
        <TableFooter totalAmount={grandTotal} itemCount={allItems.length} />
      </table>
      </div>
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightweight wrapper fragments for semantic grouping (no extra DOM nodes)
// ---------------------------------------------------------------------------

function FunctionalAreaGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function WorkAreaGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
