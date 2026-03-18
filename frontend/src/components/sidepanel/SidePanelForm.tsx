import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Percent, Euro, TrendingUp, TrendingDown, Minus, Search, X } from 'lucide-react';
import type {
  CostItem,
  ProjectPhase,
  Product,
  CostBasis,
  CostDriver,
  ApprovalStatus,
} from '../../types/budget';
import {
  PHASE_LABELS,
  PRODUCT_LABELS,
  COST_BASIS_LABELS,
  COST_DRIVER_LABELS,
  STATUS_LABELS,
  STATUS_DOT_COLORS,
} from '../../types/budget';
import { formatEUR as formatEur, formatThousands, parseGermanNumber } from '../costbook/AmountCell';
import { getUsersBrief } from '../../api/users';
import type { UserBrief } from '../../api/users';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deltaColor(delta: number): string {
  if (delta > 0) return 'text-red-600';
  if (delta < 0) return 'text-green-600';
  return 'text-gray-500';
}

function deltaPrefix(delta: number): string {
  return delta > 0 ? '+' : '';
}

// ---------------------------------------------------------------------------
// Collapsible Section (form-level)
// ---------------------------------------------------------------------------

interface FormSectionProps {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, defaultOpen, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full text-left group py-2 border-l-2 border-indigo-300 pl-2 hover:bg-gray-50 rounded-r transition-colors"
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
      {isOpen && <div className="pt-4 pb-2">{children}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// EUR Amount Input with prefix and thousand separators
// ---------------------------------------------------------------------------

interface EurAmountInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const EurAmountInput: React.FC<EurAmountInputProps> = ({ value, onChange, className }) => {
  const [displayValue, setDisplayValue] = useState(() => formatThousands(String(value)));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when prop value changes externally
  useEffect(() => {
    setDisplayValue(formatThousands(String(value)));
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Only allow digits and dots (German thousand separator)
      const cleaned = raw.replace(/[^\d.]/g, '');
      const formatted = formatThousands(cleaned);
      setDisplayValue(formatted);
      onChange(parseGermanNumber(formatted));
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    // Re-format on blur to clean up
    setDisplayValue(formatThousands(String(value)));
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
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Percent Adjust Input — shows a % suffix, calculates absolute from original
// ---------------------------------------------------------------------------

interface PercentAmountInputProps {
  originalAmount: number;
  onChange: (value: number) => void;
  className?: string;
}

const PercentAmountInput: React.FC<PercentAmountInputProps> = ({
  originalAmount,
  onChange,
  className,
}) => {
  const [pctInput, setPctInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const parsedPct = pctInput === '' || pctInput === '-' ? null : Number(pctInput);
  const calculatedValue =
    parsedPct !== null && !isNaN(parsedPct)
      ? Math.round(originalAmount * (1 + parsedPct / 100))
      : null;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow minus sign, digits only (integer percentages)
    if (raw === '' || raw === '-' || /^-?\d{0,4}$/.test(raw)) {
      setPctInput(raw);
      const num = raw === '' || raw === '-' ? null : Number(raw);
      if (num !== null && !isNaN(num)) {
        onChange(Math.round(originalAmount * (1 + num / 100)));
      }
    }
  }, [originalAmount, onChange]);

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className={`pr-8 ${className ?? ''}`}
          value={pctInput}
          onChange={handleChange}
          placeholder="e.g. -10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none select-none">
          %
        </span>
      </div>
      {calculatedValue !== null && (
        <p className="mt-1 text-xs text-gray-500 tabular-nums">
          = {formatEur(calculatedValue)}
        </p>
      )}
      {pctInput === '' && (
        <p className="mt-1 text-xs text-gray-400">
          Positive = increase, negative = decrease
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Status Select with color dots
// ---------------------------------------------------------------------------

interface StatusSelectProps {
  value: ApprovalStatus;
  onChange: (value: ApprovalStatus) => void;
  className?: string;
}

const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, className }) => {
  const dotColor = STATUS_DOT_COLORS[value];

  return (
    <div className="relative">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
        style={{ backgroundColor: dotColor }}
      />
      <select
        className={`pl-8 ${className ?? ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value as ApprovalStatus)}
      >
        {(Object.keys(STATUS_LABELS) as ApprovalStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Requester Combobox — searchable dropdown of users from /api/v1/users/brief
// ---------------------------------------------------------------------------

interface RequesterComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

const RequesterCombobox: React.FC<RequesterComboboxProps> = ({ value, onChange, className }) => {
  const [users, setUsers] = useState<UserBrief[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users on mount
  useEffect(() => {
    let cancelled = false;
    getUsersBrief()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Filter users by query (name or department)
  const filtered = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.department ?? '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const handleSelect = (user: UserBrief) => {
    onChange(user.name);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  // If the users API fails, fall back to a plain text input
  if (loadError) {
    return (
      <input
        type="text"
        className={className ?? ''}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="Person who requested this item"
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          className={`pl-8 pr-8 ${className ?? ''}`}
          value={isOpen ? query : value ?? ''}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          placeholder={value ? value : 'Search users...'}
        />
        {value && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Clear requester"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">
              {users.length === 0 ? 'Loading users...' : 'No users found'}
            </div>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelect(u)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-indigo-50 transition-colors ${
                  value === u.name ? 'bg-indigo-50/50' : ''
                }`}
              >
                {/* Mini avatar */}
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0 overflow-hidden">
                  {u.photo_url ? (
                    <img src={u.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    u.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate">{u.name}</p>
                  {u.department && (
                    <p className="text-xs text-gray-400 truncate">{u.department}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const labelClass = 'text-xs font-medium text-gray-500 block mb-1';
const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:shadow-sm transition-colors';
const selectClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:shadow-sm transition-colors appearance-none cursor-pointer';
const readonlyInputClass =
  'w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600 tabular-nums';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidePanelFormProps {
  item: CostItem;
  /** Original (unedited) item for dirty-field detection */
  originalItem?: CostItem;
  onChange: (field: keyof CostItem, value: CostItem[keyof CostItem]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SidePanelForm: React.FC<SidePanelFormProps> = ({ item, originalItem, onChange }) => {
  const delta = item.current_amount - item.original_amount;
  const [amountMode, setAmountMode] = useState<'absolute' | 'percent'>('absolute');

  /** Returns extra CSS class if the field value differs from the original */
  function dirtyRing(field: keyof CostItem): string {
    if (!originalItem) return '';
    return item[field] !== originalItem[field]
      ? ' ring-2 ring-indigo-200 border-indigo-300'
      : '';
  }

  const deltaPct =
    item.original_amount !== 0
      ? ((delta / item.original_amount) * 100).toFixed(1)
      : '0.0';

  // Delta trend icon
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="space-y-0">
      {/* ---- AMOUNTS (always open) ---- */}
      <FormSection title="Amounts" defaultOpen={true}>
        <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-xl border border-indigo-100/80 p-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Original (readonly) */}
            <div>
              <label className={labelClass}>Original</label>
              <div className={readonlyInputClass}>{formatEur(item.original_amount)}</div>
            </div>

            {/* Current (editable with EUR prefix + thousand separators, or % adjust) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass} style={{ marginBottom: 0 }}>Current</label>
                {/* Pill toggle: Absolute € / % Adjust */}
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setAmountMode('absolute')}
                    title="Absolute amount"
                    className={`inline-flex items-center justify-center w-6 h-5 rounded-full transition-colors duration-150 ${
                      amountMode === 'absolute'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Euro size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountMode('percent')}
                    title="Percentage adjustment"
                    className={`inline-flex items-center justify-center w-6 h-5 rounded-full transition-colors duration-150 ${
                      amountMode === 'percent'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Percent size={11} />
                  </button>
                </span>
              </div>
              {amountMode === 'absolute' ? (
                <EurAmountInput
                  value={item.current_amount}
                  onChange={(v) => onChange('current_amount', v)}
                  className={`${inputClass} tabular-nums${dirtyRing('current_amount')}`}
                />
              ) : (
                <PercentAmountInput
                  originalAmount={item.original_amount}
                  onChange={(v) => onChange('current_amount', v)}
                  className={`${inputClass} tabular-nums${dirtyRing('current_amount')}`}
                />
              )}
            </div>

            {/* Delta (calculated) with trend icon */}
            <div>
              <label className={labelClass}>Delta</label>
              <div className={`${readonlyInputClass} ${deltaColor(delta)} flex items-center gap-1`}>
                <DeltaIcon size={13} className="flex-shrink-0" />
                <span className="tabular-nums">
                  {deltaPrefix(delta)}
                  {formatEur(delta)}{' '}
                  <span className="text-xs">
                    ({deltaPrefix(delta)}
                    {deltaPct}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* ---- CLASSIFICATION (default open) ---- */}
      <FormSection title="Classification" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phase</label>
            <select
              className={`${selectClass}${dirtyRing('project_phase')}`}
              value={item.project_phase}
              onChange={(e) =>
                onChange('project_phase', e.target.value as ProjectPhase)
              }
            >
              {(Object.keys(PHASE_LABELS) as ProjectPhase[]).map((p) => (
                <option key={p} value={p}>
                  {PHASE_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Product</label>
            <select
              className={`${selectClass}${dirtyRing('product')}`}
              value={item.product}
              onChange={(e) => onChange('product', e.target.value as Product)}
            >
              {(Object.keys(PRODUCT_LABELS) as Product[]).map((p) => (
                <option key={p} value={p}>
                  {PRODUCT_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Cost Basis</label>
            <select
              className={`${selectClass}${dirtyRing('cost_basis')}`}
              value={item.cost_basis}
              onChange={(e) =>
                onChange('cost_basis', e.target.value as CostBasis)
              }
            >
              {(Object.keys(COST_BASIS_LABELS) as CostBasis[]).map((cb) => (
                <option key={cb} value={cb}>
                  {COST_BASIS_LABELS[cb]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Cost Driver</label>
            <select
              className={`${selectClass}${dirtyRing('cost_driver')}`}
              value={item.cost_driver}
              onChange={(e) =>
                onChange('cost_driver', e.target.value as CostDriver)
              }
            >
              {(Object.keys(COST_DRIVER_LABELS) as CostDriver[]).map((cd) => (
                <option key={cd} value={cd}>
                  {COST_DRIVER_LABELS[cd]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>

      {/* ---- APPROVAL (default open) ---- */}
      <FormSection title="Approval" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <StatusSelect
              value={item.approval_status}
              onChange={(v) => onChange('approval_status', v)}
              className={`${selectClass}${dirtyRing('approval_status')}`}
            />
          </div>

          <div>
            <label className={labelClass}>Approval Date</label>
            <input
              type="date"
              className={`${inputClass}${dirtyRing('approval_date')}`}
              value={item.approval_date ?? ''}
              onChange={(e) =>
                onChange('approval_date', e.target.value || null)
              }
            />
          </div>

          <div className="col-span-2">
            <label className={labelClass}>Requester</label>
            <RequesterCombobox
              value={item.requester ?? null}
              onChange={(v) => onChange('requester', v)}
              className={`${inputClass}${dirtyRing('requester')}`}
            />
          </div>
        </div>
      </FormSection>

      {/* ---- TARGET ADJUSTMENT / BUDGET RELEVANT (default closed, opens when active) ---- */}
      <FormSection title="Target Adjustment" defaultOpen={item.zielanpassung}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={item.zielanpassung}
              onChange={(e) => onChange('zielanpassung', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700">Budget Relevant</span>
          </label>
          {item.zielanpassung && (
            <div>
              <label className={labelClass}>Reason</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="Reason for target adjustment..."
                value={item.zielanpassung_reason}
                onChange={(e) => onChange('zielanpassung_reason', e.target.value)}
              />
            </div>
          )}
        </div>
      </FormSection>

      {/* ---- DETAILS (default closed) ---- */}
      <FormSection title="Details" defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Basis Description</label>
            <input
              type="text"
              className={`${inputClass}${dirtyRing('basis_description')}`}
              value={item.basis_description}
              onChange={(e) =>
                onChange('basis_description', e.target.value)
              }
            />
          </div>

          <div>
            <label className={labelClass}>Assumptions</label>
            <textarea
              className={`${inputClass} resize-none${dirtyRing('assumptions')}`}
              rows={2}
              value={item.assumptions}
              onChange={(e) => onChange('assumptions', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Comments</label>
            <textarea
              className={`${inputClass} resize-none${dirtyRing('comments')}`}
              rows={3}
              value={item.comments}
              onChange={(e) => onChange('comments', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Expected Cash-Out</label>
            <input
              type="month"
              className={`${inputClass}${dirtyRing('expected_cash_out')}`}
              value={item.expected_cash_out}
              onChange={(e) =>
                onChange('expected_cash_out', e.target.value)
              }
            />
          </div>
        </div>
      </FormSection>
    </div>
  );
};

export default SidePanelForm;
