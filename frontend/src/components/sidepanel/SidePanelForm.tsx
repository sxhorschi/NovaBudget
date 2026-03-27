import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import type {
  CostItem,
  ApprovalStatus,
} from '../../types/budget';
import {
  STATUS_LABELS,
  STATUS_DOT_COLORS,
} from '../../types/budget';
import { useConfig } from '../../context/ConfigContext';
import { formatEUR as formatEur, formatThousands, parseGermanNumber } from '../costbook/AmountCell';
import { getUsersBrief } from '../../api/users';
import type { UserBrief } from '../../api/users';
import StatusBadge from '../costbook/StatusBadge';

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
        className="flex items-center gap-1.5 w-full text-left group py-2 border-l-2 border-gray-200 pl-2 hover:bg-gray-50 rounded-r transition-colors"
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
// Quantity Input — simple integer input
// ---------------------------------------------------------------------------

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const QuantityInput: React.FC<QuantityInputProps> = ({ value, onChange, className }) => {
  const [displayValue, setDisplayValue] = useState(() => String(value));

  useEffect(() => {
    setDisplayValue(String(value));
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Only allow digits
      const cleaned = raw.replace(/\D/g, '');
      setDisplayValue(cleaned);
      const num = cleaned === '' ? 1 : Math.max(1, Number(cleaned));
      onChange(num);
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    const num = Math.max(1, Number(displayValue) || 1);
    setDisplayValue(String(num));
    onChange(num);
  }, [displayValue, onChange]);

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className ?? ''}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
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
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-gray-50 transition-colors ${
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
  const { config } = useConfig();

  /** Returns extra CSS class if the field value differs from the original */
  function dirtyRing(field: keyof CostItem): string {
    if (!originalItem) return '';
    return item[field] !== originalItem[field]
      ? ' ring-2 ring-indigo-500 border-gray-200'
      : '';
  }

  // Track whether price/quantity was changed (triggers cost_basis selector)
  const priceChanged = originalItem
    ? item.unit_price !== originalItem.unit_price || item.quantity !== originalItem.quantity
    : false;

  /** When unit_price or quantity changes, auto-calculate total_amount */
  const handleUnitPriceChange = useCallback((v: number) => {
    onChange('unit_price', v);
    onChange('total_amount', v * item.quantity);
  }, [onChange, item.quantity]);

  const handleQuantityChange = useCallback((v: number) => {
    onChange('quantity', v);
    onChange('total_amount', item.unit_price * v);
  }, [onChange, item.unit_price]);

  return (
    <div className="space-y-0">
      {/* ---- BASISDATEN (always open) ---- */}
      <FormSection title="Basisdaten" defaultOpen={true}>
        <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-xl border border-gray-200/80 p-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Unit Price (editable) */}
            <div>
              <label className={labelClass}>Unit Price</label>
              <EurAmountInput
                value={item.unit_price}
                onChange={handleUnitPriceChange}
                className={`${inputClass} tabular-nums${dirtyRing('unit_price')}`}
              />
            </div>

            {/* Quantity (editable) */}
            <div>
              <label className={labelClass}>Quantity</label>
              <QuantityInput
                value={item.quantity}
                onChange={handleQuantityChange}
                className={`${inputClass} tabular-nums${dirtyRing('quantity')}`}
              />
            </div>

            {/* Total (calculated, read-only) */}
            <div>
              <label className={labelClass}>Total</label>
              <div className={`${readonlyInputClass} tabular-nums`}>
                {formatEur(item.total_amount)}
              </div>
            </div>
          </div>

          {/* Expected Cash-Out */}
          <div className="mt-3 pt-3 border-t border-gray-200/60">
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

          {/* Price Change Basis — shown when unit_price or quantity changed */}
          {priceChanged && (
            <div className="mt-3 pt-3 border-t border-gray-200/60">
              <label className={labelClass}>
                Reason for Price Change <span className="text-red-400">*</span>
              </label>
              <select
                className={selectClass}
                value={(item as any).price_change_basis ?? ''}
                onChange={(e) => onChange('price_change_basis' as any, e.target.value || null)}
              >
                <option value="">Select reason...</option>
                <option value="cost_estimation">Cost Estimation</option>
                <option value="initial_supplier_offer">Initial Supplier Offer</option>
                <option value="revised_supplier_offer">Revised Supplier Offer</option>
                <option value="final">Final Price</option>
              </select>
            </div>
          )}
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
                onChange('project_phase', e.target.value)
              }
            >
              {config.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Product</label>
            <select
              className={`${selectClass}${dirtyRing('product')}`}
              value={item.product}
              onChange={(e) => onChange('product', e.target.value)}
            >
              {config.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
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
                onChange('cost_basis', e.target.value)
              }
            >
              {config.cost_bases.map((cb) => (
                <option key={cb.id} value={cb.id}>
                  {cb.label}
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
                onChange('cost_driver', e.target.value)
              }
            >
              {config.cost_drivers.map((cd) => (
                <option key={cd.id} value={cd.id}>
                  {cd.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>

      {/* ---- STATUS (default open) ---- */}
      <FormSection title="Status" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Approval Status</label>
            <div className="mt-1">
              <StatusBadge
                status={item.approval_status}
                onChange={(v) => onChange('approval_status', v)}
              />
            </div>
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

        </div>
      </FormSection>
    </div>
  );
};

export default SidePanelForm;
