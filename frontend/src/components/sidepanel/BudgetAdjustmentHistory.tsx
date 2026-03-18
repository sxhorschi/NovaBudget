import React, { useState, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import type { BudgetAdjustment, AdjustmentCategory } from '../../types/budget';
import {
  ADJUSTMENT_CATEGORY_LABELS,
  ADJUSTMENT_CATEGORY_COLORS,
} from '../../types/budget';
import { useBudgetData } from '../../context/BudgetDataContext';
import { formatEUR as formatEur } from '../costbook/AmountCell';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Inline Form for new adjustment
// ---------------------------------------------------------------------------

interface NewAdjustmentFormProps {
  onSubmit: (data: Omit<BudgetAdjustment, 'id' | 'department_id' | 'created_at'>) => void;
  onCancel: () => void;
}

const CATEGORY_OPTIONS: AdjustmentCategory[] = [
  'product_change',
  'supplier_change',
  'scope_change',
  'optimization',
  'other',
];

const NewAdjustmentForm: React.FC<NewAdjustmentFormProps> = ({ onSubmit, onCancel }) => {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<AdjustmentCategory>('product_change');

  const isValid = amount !== '' && Number(amount) !== 0 && reason.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      amount: Number(amount),
      reason: reason.trim(),
      category,
      created_by: undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Amount (EUR)
          </label>
          <input
            type="number"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors tabular-nums"
            placeholder="+80000 or -20000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step={1000}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Category
          </label>
          <select
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value as AdjustmentCategory)}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {ADJUSTMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">
          Reason <span className="text-red-400">*</span>
        </label>
        <textarea
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors resize-none"
          rows={2}
          placeholder="e.g. Product Change CR-2026-042..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            isValid
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-indigo-300 text-indigo-100 cursor-not-allowed'
          }`}
        >
          Save
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BudgetAdjustmentHistoryProps {
  departmentId: string;
  originalBudget: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BudgetAdjustmentHistory: React.FC<BudgetAdjustmentHistoryProps> = ({
  departmentId,
  originalBudget,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const { budgetAdjustments: allAdjustments, addBudgetAdjustment } = useBudgetData();

  // Filter adjustments for this department
  const adjustments = useMemo(() => {
    return allAdjustments
      .filter((a) => a.department_id === departmentId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [departmentId, allAdjustments]);

  const totalAdjustment = useMemo(
    () => adjustments.reduce((sum, a) => sum + a.amount, 0),
    [adjustments],
  );

  const currentBudget = originalBudget + totalAdjustment;

  const handleNewAdjustment = (data: Omit<BudgetAdjustment, 'id' | 'department_id' | 'created_at'>) => {
    addBudgetAdjustment(departmentId, data.amount, data.reason, data.category);
    setShowForm(false);
  };

  if (adjustments.length === 0 && !showForm) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Target Adjustments
          </h4>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Plus size={12} />
            New Adjustment
          </button>
        </div>
        {showForm && (
          <NewAdjustmentForm
            onSubmit={handleNewAdjustment}
            onCancel={() => setShowForm(false)}
          />
        )}
        <p className="text-xs text-gray-400 italic">No target adjustments recorded.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors"
        >
          Target Adjustments
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <Plus size={12} />
          New Adjustment
        </button>
      </div>

      {/* Summary bar */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Original budget</span>
          <span className="font-medium text-gray-700 tabular-nums">{formatEur(originalBudget)}</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-500">Total adjustments</span>
          <span
            className={`font-medium tabular-nums ${
              totalAdjustment > 0
                ? 'text-red-600'
                : totalAdjustment < 0
                  ? 'text-emerald-600'
                  : 'text-gray-500'
            }`}
          >
            {totalAdjustment > 0 ? '+' : ''}
            {formatEur(totalAdjustment)}
          </span>
        </div>
        <div className="border-t border-gray-200 mt-1.5 pt-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-700">Current budget</span>
          <span className="font-semibold text-gray-900 tabular-nums">{formatEur(currentBudget)}</span>
        </div>
      </div>

      {/* New adjustment form */}
      {showForm && (
        <div className="mb-3">
          <NewAdjustmentForm
            onSubmit={handleNewAdjustment}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Timeline */}
      {expanded && (
        <div className="relative pl-5">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200" />

          <div className="space-y-3">
            {adjustments.map((adj) => {
              const isPositive = adj.amount > 0;
              return (
                <div key={adj.id} className="relative flex items-start gap-3">
                  {/* Dot on timeline */}
                  <div className="absolute -left-5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-gray-200">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isPositive ? 'bg-red-400' : 'bg-emerald-400'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPositive ? (
                        <TrendingUp size={13} className="text-red-500 flex-shrink-0" />
                      ) : (
                        <TrendingDown size={13} className="text-emerald-500 flex-shrink-0" />
                      )}
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          isPositive ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatEur(adj.amount)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          ADJUSTMENT_CATEGORY_COLORS[adj.category]
                        }`}
                      >
                        {ADJUSTMENT_CATEGORY_LABELS[adj.category]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">
                      {adj.reason}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-mono tabular-nums">
                        {formatDate(adj.created_at)}
                      </span>
                      {adj.created_by && (
                        <span className="text-[10px] text-gray-400">
                          by {adj.created_by}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetAdjustmentHistory;
