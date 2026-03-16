import React, { useState, useMemo, useCallback } from 'react';
import { ArrowUp, ArrowDown, SearchX } from 'lucide-react';
import type { Department, WorkArea, CostItem, ApprovalStatus } from '../../types/budget';
import DepartmentRow from './DepartmentRow';
import WorkAreaRow from './WorkAreaRow';
import CostItemRow from './CostItemRow';
import TableFooter from './TableFooter';

// ---------------------------------------------------------------------------
// Department accent colors (5 departments, distinguishable at a glance)
// ---------------------------------------------------------------------------

const DEPT_COLORS: Record<number, string> = {
  1: '#6366f1', // Assembly Equipment  — indigo
  2: '#f59e0b', // Testing             — amber
  3: '#3b82f6', // Logistics           — blue
  4: '#ec4899', // Facility            — pink
  5: '#a855f7', // Prototyping         — purple
};

function getDeptColor(deptId: number): string {
  return DEPT_COLORS[deptId] ?? '#64748b';
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

type SortField = 'description' | 'amount' | 'phase' | 'product' | 'status' | 'cashout';
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
  { key: 'description', label: 'Description', width: '',     align: 'left',  sortable: true },
  { key: 'amount',      label: 'Amount',      width: '140px', align: 'right', sortable: true },
  { key: 'phase',       label: 'Phase',       width: '90px',  align: 'left',  sortable: true },
  { key: 'product',     label: 'Product',     width: '100px', align: 'left',  sortable: true },
  { key: 'status',      label: 'Status',      width: '150px', align: 'left',  sortable: true },
  { key: 'cashout',     label: 'Cash-Out',    width: '90px',  align: 'left',  sortable: true },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CostbookTableProps {
  departments: Department[];
  workAreas: WorkArea[];
  onSelectItem: (item: CostItem) => void;
  selectedItemId: number | null;
  onStatusChange: (item: CostItem, newStatus: ApprovalStatus) => void;
  onDeleteItem: (item: CostItem) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CostbookTable({
  departments,
  workAreas,
  onSelectItem,
  selectedItemId,
  onStatusChange,
  onDeleteItem,
}: CostbookTableProps) {
  // -- Expansion state: all expanded by default --------------------------------
  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(
    () => new Set(departments.map((d) => d.id)),
  );
  const [expandedWAs, setExpandedWAs] = useState<Set<number>>(
    () => new Set(workAreas.map((wa) => wa.id)),
  );

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
  const toggleDept = useCallback((deptId: number) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }, []);

  const toggleWA = useCallback((waId: number) => {
    setExpandedWAs((prev) => {
      const next = new Set(prev);
      if (next.has(waId)) next.delete(waId);
      else next.add(waId);
      return next;
    });
  }, []);

  // -- Precompute: group work areas by department ------------------------------
  const waByDept = useMemo(() => {
    const map = new Map<number, WorkArea[]>();
    for (const wa of workAreas) {
      const list = map.get(wa.department_id) ?? [];
      list.push(wa);
      map.set(wa.department_id, list);
    }
    return map;
  }, [workAreas]);

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
    <div className="overflow-auto rounded-xl border shadow-sm scroll-smooth" style={{ borderColor: 'var(--border-default)' }}>
      <table className="w-full border-collapse">
        {/* ------------------------------------------------------------------ */}
        {/* Table Header                                                        */}
        {/* ------------------------------------------------------------------ */}
        <thead>
          <tr className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b shadow-[0_1px_3px_rgba(0,0,0,0.04)]" style={{ borderColor: 'var(--border-default)' }}>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                className={[
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap select-none transition-colors duration-150',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.sortable ? 'cursor-pointer hover:text-slate-700 hover:bg-slate-50/50' : '',
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
              style={{ width: '70px', color: 'var(--text-tertiary)' }}
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
            const committed = deptItems.reduce((s, ci) => s + ci.current_amount, 0);
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
                  accentColor={color}
                />

                {/* Work areas (visible when department expanded) */}
                {isDeptExpanded &&
                  deptWAs.map((wa) => {
                    const items = wa.cost_items ?? [];
                    if (items.length === 0) return null;
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
              <td colSpan={7} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <SearchX size={28} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Keine Kostenpositionen gefunden
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Passe die Filter an oder setze sie zurück, um Ergebnisse zu sehen.
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
