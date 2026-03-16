import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import type { CostItem, Department, WorkArea } from '../../types/budget';
import { useAmountFormatter } from './AmountCell';

// ---------------------------------------------------------------------------
// Formatted EUR input for budget field
// ---------------------------------------------------------------------------

function formatBudgetThousands(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  return Number(digits).toLocaleString('de-DE');
}

function parseBudgetGermanNumber(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

interface BudgetAmountInputProps {
  value: string; // raw numeric string, e.g. "500000"
  onChange: (rawNumericString: string) => void;
  className?: string;
}

const BudgetAmountInput: React.FC<BudgetAmountInputProps> = ({ value, onChange, className }) => {
  const [display, setDisplay] = useState(() => formatBudgetThousands(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(formatBudgetThousands(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, '');
    const formatted = formatBudgetThousands(raw);
    setDisplay(formatted);
    onChange(String(parseBudgetGermanNumber(formatted)));
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setDisplay(formatBudgetThousands(value));
  }, [value]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none select-none">
        EUR
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className={`pl-12 ${className ?? ''}`}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
};

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const labelClass = 'text-xs font-medium text-gray-500 block mb-1';
const inputClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors';

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full text-left group py-2 border-b border-gray-100"
      >
        {isOpen ? (
          <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        )}
        <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider group-hover:text-gray-700 transition-colors">
          {title}
        </span>
      </button>
      {isOpen && <div className="pt-3 pb-1">{children}</div>}
    </div>
  );
}

interface DepartmentContextPanelProps {
  department: Department | null;
  workAreas: WorkArea[];
  costItems: CostItem[];
  onClose: () => void;
  onSave: (departmentId: number, data: { name: string; budget_total: number }) => void;
  onDelete: (departmentId: number) => void;
}

export default function DepartmentContextPanel({
  department,
  workAreas,
  costItems,
  onClose,
  onSave,
  onDelete,
}: DepartmentContextPanelProps) {
  const format = useAmountFormatter();
  const [nameDraft, setNameDraft] = useState('');
  const [budgetDraft, setBudgetDraft] = useState('0');

  useEffect(() => {
    if (!department) return;
    setNameDraft(department.name);
    setBudgetDraft(String(department.budget_total ?? 0));
  }, [department]);

  const deptWorkAreas = useMemo(() => {
    if (!department) return [];
    return workAreas.filter((wa) => wa.department_id === department.id);
  }, [department, workAreas]);

  const deptItems = useMemo(() => {
    if (!department) return [];
    const waIds = new Set(deptWorkAreas.map((wa) => wa.id));
    return costItems.filter((ci) => waIds.has(ci.work_area_id));
  }, [department, deptWorkAreas, costItems]);

  const committed = useMemo(
    () => deptItems.reduce((s, ci) => s + ci.current_amount, 0),
    [deptItems],
  );

  const approved = useMemo(
    () => deptItems
      .filter((ci) => ci.approval_status === 'approved')
      .reduce((s, ci) => s + ci.current_amount, 0),
    [deptItems],
  );

  if (!department) return null;

  const budget = Math.max(0, Number(budgetDraft) || 0);
  const remaining = budget - committed;
  const hasChanges =
    nameDraft.trim() !== department.name ||
    budget !== department.budget_total;

  return (
    <div
      className="fixed right-0 top-0 h-full w-[480px] z-40 bg-white flex flex-col"
      style={{
        borderLeft: '1px solid var(--border-default)',
        borderTop: '3px solid #6366f1',
        boxShadow:
          '-8px 0 30px -5px rgba(0, 0, 0, 0.1), -2px 0 8px -2px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 text-[11px] tracking-wider text-indigo-600 font-semibold uppercase">
              <Building2 size={13} />
              Department
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-1 truncate">{department.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Section title="Master Data" defaultOpen={true}>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Name</label>
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Budget (EUR)</label>
              <BudgetAmountInput
                value={budgetDraft}
                onChange={setBudgetDraft}
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>
        </Section>

        <Section title="Overview" defaultOpen={true}>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between gap-3 border-b border-gray-100">
              <p className="text-sm text-gray-600">Budget</p>
              <p className="text-sm font-mono font-semibold text-indigo-700">{format(budget)}</p>
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between gap-3 border-b border-gray-100">
              <p className="text-sm text-gray-600">Committed</p>
              <p className="text-sm font-mono font-semibold text-gray-800">{format(committed)}</p>
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between gap-3 border-b border-gray-100">
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-sm font-mono font-semibold text-green-700">{format(approved)}</p>
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">Remaining</p>
              <p className={`text-sm font-mono font-semibold ${remaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {format(remaining)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {deptWorkAreas.length} categories, {deptItems.length} items
          </p>
        </Section>

        <Section title="Categories" defaultOpen={true}>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {deptWorkAreas.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-500">No categories found.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {deptWorkAreas.map((wa) => {
                  const waItems = deptItems.filter((ci) => ci.work_area_id === wa.id);
                  const waTotal = waItems.reduce((s, ci) => s + ci.current_amount, 0);
                  return (
                    <div key={wa.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{wa.name}</p>
                        <p className="text-xs text-gray-500">{waItems.length} items</p>
                      </div>
                      <p className="text-sm font-mono text-gray-700 whitespace-nowrap">{format(waTotal)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Section>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 px-6 py-3 bg-white">
        {hasChanges && (
          <p className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            Unsaved changes
          </p>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Really delete department "${department.name}"? All contained categories and items will be removed.`,
                )
              ) {
                onDelete(department.id);
              }
            }}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-150"
          >
            Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(department.id, { name: nameDraft.trim(), budget_total: budget })}
              disabled={!hasChanges}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 inline-flex items-center gap-1.5 ${
                hasChanges
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
