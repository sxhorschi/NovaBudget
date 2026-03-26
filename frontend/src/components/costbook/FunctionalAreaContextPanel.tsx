import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, Building2, Plus, Pencil, Trash2, Check } from 'lucide-react';
import type { CostItem, FunctionalArea, FunctionalAreaBudget, WorkArea } from '../../types/budget';
import { useAmountFormatter, formatThousands, parseGermanNumber } from './AmountCell';
import Section from './Section';
import { useBudgetData } from '../../context/BudgetDataContext';

// ---------------------------------------------------------------------------
// Formatted EUR input for budget field
// ---------------------------------------------------------------------------

interface BudgetAmountInputProps {
  value: string; // raw numeric string, e.g. "500000"
  onChange: (rawNumericString: string) => void;
  className?: string;
}

const BudgetAmountInput: React.FC<BudgetAmountInputProps> = ({ value, onChange, className }) => {
  const [display, setDisplay] = useState(() => formatThousands(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplay(formatThousands(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, '');
    const formatted = formatThousands(raw);
    setDisplay(formatted);
    onChange(String(parseGermanNumber(formatted)));
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setDisplay(formatThousands(value));
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

const labelClass = 'text-xs font-medium text-gray-500 block mb-1';
const inputClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors';

// ---------------------------------------------------------------------------
// Yearly Budget Row (inline edit)
// ---------------------------------------------------------------------------

interface YearlyBudgetRowProps {
  budget: FunctionalAreaBudget;
  faId: string;
  format: (v: number) => string;
}

const YearlyBudgetRow: React.FC<YearlyBudgetRowProps> = ({ budget, faId, format }) => {
  const { updateYearlyBudget, deleteYearlyBudget } = useBudgetData();
  const [editing, setEditing] = useState(false);
  const [amountDraft, setAmountDraft] = useState(String(budget.amount));
  const [commentDraft, setCommentDraft] = useState(budget.comment ?? '');

  useEffect(() => {
    setAmountDraft(String(budget.amount));
    setCommentDraft(budget.comment ?? '');
  }, [budget]);

  const handleSave = useCallback(async () => {
    const amount = Math.max(0, Number(parseGermanNumber(amountDraft)) || 0);
    await updateYearlyBudget(faId, budget.id, {
      amount,
      comment: commentDraft.trim() || null,
    });
    setEditing(false);
  }, [faId, budget.id, amountDraft, commentDraft, updateYearlyBudget]);

  const handleDelete = useCallback(async () => {
    if (window.confirm(`Delete budget for ${budget.year}?`)) {
      await deleteYearlyBudget(faId, budget.id);
    }
  }, [faId, budget.id, budget.year, deleteYearlyBudget]);

  if (editing) {
    return (
      <div className="px-3 py-2 space-y-1.5 bg-indigo-50/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 w-12">{budget.year}</span>
          <BudgetAmountInput
            value={amountDraft}
            onChange={setAmountDraft}
            className={`${inputClass} tabular-nums flex-1 !py-1.5 text-xs`}
          />
        </div>
        <input
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          placeholder="Comment (optional)"
          className={`${inputClass} !py-1.5 text-xs`}
        />
        <div className="flex justify-end gap-1.5">
          <button
            onClick={() => setEditing(false)}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 inline-flex items-center gap-1"
          >
            <Check size={12} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 flex items-center justify-between gap-2 group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 w-12">{budget.year}</span>
          <span className="text-sm font-mono font-semibold text-indigo-700">{format(budget.amount)}</span>
        </div>
        {budget.comment && (
          <p className="text-xs text-gray-500 mt-0.5 ml-14 truncate">{budget.comment}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-gray-400 hover:text-indigo-600 rounded"
          aria-label="Edit"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-600 rounded"
          aria-label="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Add Budget Row
// ---------------------------------------------------------------------------

interface AddBudgetRowProps {
  faId: string;
  existingYears: Set<number>;
}

const AddBudgetRow: React.FC<AddBudgetRowProps> = ({ faId, existingYears }) => {
  const { createYearlyBudget } = useBudgetData();
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [yearDraft, setYearDraft] = useState(String(currentYear));
  const [amountDraft, setAmountDraft] = useState('0');
  const [commentDraft, setCommentDraft] = useState('');

  const handleAdd = useCallback(async () => {
    const year = Number(yearDraft);
    if (!year || existingYears.has(year)) return;
    const amount = Math.max(0, Number(parseGermanNumber(amountDraft)) || 0);
    const result = await createYearlyBudget(faId, year, amount, commentDraft.trim() || null);
    if (result) {
      setOpen(false);
      setAmountDraft('0');
      setCommentDraft('');
      setYearDraft(String(currentYear));
    }
  }, [faId, yearDraft, amountDraft, commentDraft, existingYears, createYearlyBudget, currentYear]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full px-3 py-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors"
      >
        <Plus size={13} /> Add yearly budget
      </button>
    );
  }

  return (
    <div className="px-3 py-2 space-y-1.5 bg-indigo-50/50 border-t border-gray-100">
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={yearDraft}
          onChange={(e) => setYearDraft(e.target.value)}
          placeholder="Year"
          className={`${inputClass} !py-1.5 text-xs w-20`}
          min={2020}
          max={2099}
        />
        <BudgetAmountInput
          value={amountDraft}
          onChange={setAmountDraft}
          className={`${inputClass} tabular-nums flex-1 !py-1.5 text-xs`}
        />
      </div>
      <input
        value={commentDraft}
        onChange={(e) => setCommentDraft(e.target.value)}
        placeholder="Comment (optional)"
        className={`${inputClass} !py-1.5 text-xs`}
      />
      {existingYears.has(Number(yearDraft)) && (
        <p className="text-xs text-red-500">Budget for {yearDraft} already exists.</p>
      )}
      <div className="flex justify-end gap-1.5">
        <button
          onClick={() => setOpen(false)}
          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={existingYears.has(Number(yearDraft))}
          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

interface FunctionalAreaContextPanelProps {
  functionalArea: FunctionalArea | null;
  workAreas: WorkArea[];
  costItems: CostItem[];
  onClose: () => void;
  onSave?: (functionalAreaId: string, data: { name: string; budget_total: number }) => void;
  onDelete?: (functionalAreaId: string) => void;
}

export default function FunctionalAreaContextPanel({
  functionalArea,
  workAreas,
  costItems,
  onClose,
  onSave,
  onDelete,
}: FunctionalAreaContextPanelProps) {
  const format = useAmountFormatter();
  const [nameDraft, setNameDraft] = useState('');
  const [budgetDraft, setBudgetDraft] = useState('0');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (functionalArea) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [functionalArea]);

  useEffect(() => {
    if (!functionalArea) return;
    setNameDraft(functionalArea.name);
    setBudgetDraft(String(functionalArea.budget_total ?? 0));
  }, [functionalArea]);

  const faWorkAreas = useMemo(() => {
    if (!functionalArea) return [];
    return workAreas.filter((wa) => wa.functional_area_id === functionalArea.id);
  }, [functionalArea, workAreas]);

  const faItems = useMemo(() => {
    if (!functionalArea) return [];
    const waIds = new Set(faWorkAreas.map((wa) => wa.id));
    return costItems.filter((ci) => waIds.has(ci.work_area_id));
  }, [functionalArea, faWorkAreas, costItems]);

  const committed = useMemo(
    () => faItems
      .filter(ci => ci.approval_status === 'approved')
      .reduce((s, ci) => s + ci.total_amount, 0),
    [faItems],
  );

  // Forecast = all items not rejected or obsolete (consistent with useFilteredData)
  const forecast = useMemo(
    () => faItems
      .filter((ci) => ci.approval_status !== 'rejected' && ci.approval_status !== 'obsolete')
      .reduce((s, ci) => s + ci.total_amount, 0),
    [faItems],
  );

  // Sorted yearly budgets
  const sortedBudgets = useMemo(() => {
    if (!functionalArea) return [];
    return [...(functionalArea.budgets ?? [])].sort((a, b) => a.year - b.year);
  }, [functionalArea]);

  const existingYears = useMemo(
    () => new Set(sortedBudgets.map((b) => b.year)),
    [sortedBudgets],
  );

  // Total yearly budgets
  const yearlyBudgetTotal = useMemo(
    () => sortedBudgets.reduce((s, b) => s + b.amount, 0),
    [sortedBudgets],
  );

  if (!functionalArea) return null;

  const budget = Math.max(0, Number(budgetDraft) || 0);
  // If we have yearly budgets, use their sum; otherwise fall back to budget_total
  const effectiveBudget = sortedBudgets.length > 0 ? yearlyBudgetTotal : budget;
  // Remaining = Budget - Forecast (consistent with useFilteredData source of truth)
  const remaining = effectiveBudget - forecast;
  const hasChanges =
    nameDraft.trim() !== functionalArea.name ||
    budget !== functionalArea.budget_total;

  return (
    <>
      {/* Backdrop — click outside to close */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-[480px] z-50 bg-white flex flex-col"
        style={{
          borderLeft: '1px solid #e2e8f0',
          borderTop: '3px solid #6366f1',
          boxShadow:
            '-8px 0 30px -5px rgba(0, 0, 0, 0.1), -2px 0 8px -2px rgba(0, 0, 0, 0.04)',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-out',
        }}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 text-[11px] tracking-wider text-indigo-600 font-semibold uppercase">
                <Building2 size={13} />
                Functional Area
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mt-1 truncate">{functionalArea.name}</h2>
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
                <label className={labelClass}>Base Budget (EUR)</label>
                <BudgetAmountInput
                  value={budgetDraft}
                  onChange={setBudgetDraft}
                  className={`${inputClass} tabular-nums`}
                />
                <p className="text-xs text-gray-400 mt-1">Legacy single budget value. Use yearly budgets below for per-year planning.</p>
              </div>
            </div>
          </Section>

          <Section title="Yearly Budgets" defaultOpen={true}>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {sortedBudgets.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-500">No yearly budgets defined yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sortedBudgets.map((b) => (
                    <YearlyBudgetRow
                      key={b.id}
                      budget={b}
                      faId={functionalArea.id}
                      format={format}
                    />
                  ))}
                  {/* Total row */}
                  <div className="px-3 py-2 flex items-center justify-between bg-gray-50">
                    <span className="text-sm font-medium text-gray-600 w-12">Total</span>
                    <span className="text-sm font-mono font-bold text-indigo-700">{format(yearlyBudgetTotal)}</span>
                  </div>
                </div>
              )}
              <AddBudgetRow faId={functionalArea.id} existingYears={existingYears} />
            </div>
          </Section>

          <Section title="Overview" defaultOpen={true}>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-3 py-2.5 flex items-center justify-between gap-3 border-b border-gray-100">
                <p className="text-sm text-gray-600">Budget</p>
                <p className="text-sm font-mono font-semibold text-indigo-700">{format(effectiveBudget)}</p>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between gap-3 border-b border-gray-100">
                <p className="text-sm text-gray-600">Committed</p>
                <p className="text-sm font-mono font-semibold text-green-700">{format(committed)}</p>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between gap-3 border-b border-gray-100">
                <p className="text-sm text-gray-600">Forecast</p>
                <p className="text-sm font-mono font-semibold text-orange-700">{format(forecast)}</p>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Remaining</p>
                <p className={`text-sm font-mono font-semibold ${remaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {format(remaining)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {faWorkAreas.length} categories, {faItems.length} items
            </p>
          </Section>

          <Section title="Categories" defaultOpen={true}>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {faWorkAreas.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-500">No categories found.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {faWorkAreas.map((wa) => {
                    const waItems = faItems.filter((ci) => ci.work_area_id === wa.id);
                    const waTotal = waItems.reduce((s, ci) => s + ci.total_amount, 0);
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
            {onDelete ? (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Really delete functional area "${functionalArea.name}"? All contained categories and items will be removed.`,
                    )
                  ) {
                    onDelete(functionalArea.id);
                  }
                }}
                className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-150"
              >
                Delete
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150"
              >
                {onSave ? 'Cancel' : 'Close'}
              </button>
              {onSave && (
                <button
                  onClick={() => onSave(functionalArea.id, { name: nameDraft.trim(), budget_total: budget })}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
