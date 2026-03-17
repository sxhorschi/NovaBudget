import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowUp, ArrowDown, SearchX, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import type { Department, WorkArea, CostItem, ApprovalStatus } from '../../types/budget';
import { getDeptColor } from '../../styles/design-tokens';
import DepartmentRow from './DepartmentRow';
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
      return (a.current_amount - b.current_amount) * dir;
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
  departments: Department[];
  workAreas: WorkArea[];
  departmentCommittedTotals?: Record<string, number>;
  onSelectItem: (item: CostItem) => void;
  selectedItemId: string | null;
  onStatusChange: (item: CostItem, newStatus: ApprovalStatus) => void;
  onDeleteItem: (item: CostItem) => void;
  onOpenDepartmentContext?: (departmentId: string) => void;
  onOpenWorkAreaContext?: (workAreaId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CostbookTable({
  departments,
  workAreas,
  departmentCommittedTotals,
  onSelectItem,
  selectedItemId,
  onStatusChange,
  onDeleteItem,
  onOpenDepartmentContext,
  onOpenWorkAreaContext,
}: CostbookTableProps) {
  // -- Expansion state: all expanded by default --------------------------------
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(
    () => new Set(departments.map((d) => d.id)),
  );
  const [expandedWAs, setExpandedWAs] = useState<Set<string>>(
    () => new Set(workAreas.map((wa) => wa.id)),
  );

  useEffect(() => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const d of departments) {
        if (!next.has(d.id)) {
          next.add(d.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [departments]);

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
  const toggleDept = useCallback((deptId: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
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

  // -- Precompute: group work areas by department ------------------------------
  const waByDept = useMemo(() => {
    const map = new Map<string, WorkArea[]>();
    for (const wa of workAreas) {
      const list = map.get(wa.department_id) ?? [];
      list.push(wa);
      map.set(wa.department_id, list);
    }
    return map;
  }, [workAreas]);

  // -- Expand / Collapse All ---------------------------------------------------
  const allDeptIds = useMemo(() => departments.map((d) => d.id), [departments]);
  const allWAIds = useMemo(() => workAreas.map((wa) => wa.id), [workAreas]);

  const allDeptsExpanded = useMemo(
    () => allDeptIds.length > 0 && allDeptIds.every((id) => expandedDepts.has(id)),
    [allDeptIds, expandedDepts],
  );
  const allWAsExpanded = useMemo(
    () => allWAIds.length > 0 && allWAIds.every((id) => expandedWAs.has(id)),
    [allWAIds, expandedWAs],
  );

  const allExpanded = allDeptsExpanded && allWAsExpanded;

  const expandAll = useCallback(() => {
    setExpandedDepts(new Set(allDeptIds));
    setExpandedWAs(new Set(allWAIds));
  }, [allDeptIds, allWAIds]);

  const collapseAll = useCallback(() => {
    setExpandedDepts(new Set());
    setExpandedWAs(new Set());
  }, []);

  // -- Collect all items for grand total ---------------------------------------
  const allItems = useMemo(() => {
    const items: CostItem[] = [];
    for (const wa of workAreas) {
      if (wa.cost_items) items.push(...wa.cost_items);
    }
    return items;
  }, [workAreas]);

  const grandTotal = useMemo(
    () => allItems.reduce((sum, ci) => sum + ci.current_amount, 0),
    [allItems],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Toolbar: Expand/Collapse All */}
      {departments.length > 0 && (
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
          {departments.map((dept) => {
            const deptWAs = waByDept.get(dept.id) ?? [];
            const deptItems: CostItem[] = [];
            for (const wa of deptWAs) {
              if (wa.cost_items) deptItems.push(...wa.cost_items);
            }
            // Committed = only approved items (consistent with useFilteredData source of truth)
            const visibleCommitted = deptItems
              .filter((ci) => ci.approval_status === 'approved')
              .reduce((s, ci) => s + ci.current_amount, 0);
            const committed = departmentCommittedTotals?.[dept.id] ?? visibleCommitted;
            const isDeptExpanded = expandedDepts.has(dept.id);
            const color = getDeptColor(dept.id);

            return (
              <DepartmentGroup key={dept.id}>
                {/* Department row */}
                <DepartmentRow
                  name={dept.name}
                  committed={committed}
                  budget={dept.budget_total}
                  itemCount={deptItems.length}
                  expanded={isDeptExpanded}
                  onToggle={() => toggleDept(dept.id)}
                  onOpenContext={
                    onOpenDepartmentContext
                      ? () => onOpenDepartmentContext(dept.id)
                      : undefined
                  }
                  accentColor={color}
                />

                {/* Work areas (visible when department expanded) */}
                {isDeptExpanded &&
                  deptWAs.map((wa) => {
                    const items = wa.cost_items ?? [];
                    const waTotal = items.reduce((s, ci) => s + ci.current_amount, 0);
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
                              onDelete={() => onDeleteItem(item)}
                            />
                          ))}
                      </WorkAreaGroup>
                    );
                  })}
              </DepartmentGroup>
            );
          })}

          {/* Empty state */}
          {departments.length === 0 && (
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

function DepartmentGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function WorkAreaGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
