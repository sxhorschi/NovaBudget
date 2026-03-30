import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, User, X, Plus, FileText, Upload } from 'lucide-react';
import type { CostItem, ApprovalStatus, AdjustmentCategory } from '../../types/budget';
import { useConfig } from '../../context/ConfigContext';
import { formatEUR as formatEur, formatThousands, parseGermanNumber } from '../costbook/AmountCell';
import { getUsersBrief } from '../../api/users';
import type { UserBrief } from '../../api/users';
import { createPriceHistory } from '../../api/priceHistory';
import { createChangeCost } from '../../api/budgetAdjustments';
import { uploadAttachment } from '../../api/attachments';
import { useToast } from '../common/ToastProvider';

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
      // Only allow digits and dots (thousand separator)
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
// ChipSelect — compact pill-style selector with popover
// ---------------------------------------------------------------------------

interface ChipSelectProps {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
  isDirty: boolean;
}

const ChipSelect: React.FC<ChipSelectProps> = ({ label, value, options, onChange, isDirty }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const currentLabel = options.find((o) => o.id === value)?.label ?? value;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all bg-gray-100 text-gray-700 hover:bg-gray-200${
          isDirty ? ' ring-2 ring-indigo-500' : ''
        }`}
      >
        <span className="text-gray-400">{label}:</span>
        <span>{currentLabel}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[160px]">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer ${
                opt.id === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
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
        <input
          ref={inputRef}
          type="text"
          className={`pl-3 pr-8 ${className ?? ''}`}
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
        <div className="absolute z-[70] left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
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
                  <p className="text-sm text-gray-900 truncate" title={u.name}>{u.name}</p>
                  {u.department && (
                    <p className="text-xs text-gray-400 truncate" title={u.department}>{u.department}</p>
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

// Statuses for which the approval date field is shown
const APPROVAL_DATE_STATUSES: Set<ApprovalStatus> = new Set([
  'approved',
  'purchase_order_sent',
  'purchase_order_confirmed',
  'delivered',
]);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidePanelFormProps {
  item: CostItem;
  /** Original (unedited) item for dirty-field detection */
  originalItem?: CostItem;
  onChange: (field: keyof CostItem, value: CostItem[keyof CostItem]) => void;
  /** Called after a new offer/estimate or change cost is created */
  onPriceHistoryCreated?: () => void;
  /** Functional area ID for change costs */
  functionalAreaId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SidePanelForm: React.FC<SidePanelFormProps> = ({ item, originalItem, onChange, onPriceHistoryCreated, functionalAreaId }) => {
  const { config } = useConfig();
  const toast = useToast();

  // Progressive disclosure state
  const [showDetails, setShowDetails] = useState(false);
  const [showRequester, setShowRequester] = useState(false);

  // Active form: null | 'offer' | 'changecost'
  const [activeForm, setActiveForm] = useState<null | 'offer' | 'changecost'>(null);

  // Offer form state
  const [offerTotal, setOfferTotal] = useState(item.total_amount);
  const [offerUnitPrice, setOfferUnitPrice] = useState(item.unit_price);
  const [offerQuantity, setOfferQuantity] = useState(item.quantity);
  const [offerCostBasis, setOfferCostBasis] = useState('');
  const [offerComment, setOfferComment] = useState('');
  const [offerShowUnits, setOfferShowUnits] = useState(false);
  const [offerFile, setOfferFile] = useState<File | null>(null);

  // Change Cost form state
  const [ccAmount, setCcAmount] = useState(0);
  const [ccCategory, setCcCategory] = useState<string>('');
  const [ccCostDriver, setCcCostDriver] = useState('');
  const [ccReason, setCcReason] = useState('');
  const [ccBudgetRelevant, setCcBudgetRelevant] = useState(true);
  const [ccFile, setCcFile] = useState<File | null>(null);

  // Shared
  const [formSaving, setFormSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requesterRef = useRef<HTMLDivElement>(null);

  // Close requester popover on outside click
  useEffect(() => {
    if (!showRequester) return;
    const handler = (e: MouseEvent) => {
      if (requesterRef.current && !requesterRef.current.contains(e.target as Node)) {
        setShowRequester(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showRequester]);

  /** Returns extra CSS class if the field value differs from the original */
  function dirtyRing(field: keyof CostItem): string {
    if (!originalItem) return '';
    return item[field] !== originalItem[field]
      ? ' ring-2 ring-indigo-500 border-gray-200'
      : '';
  }

  /** Check if a classification field is dirty */
  function isDirty(field: keyof CostItem): boolean {
    if (!originalItem) return false;
    return item[field] !== originalItem[field];
  }

  const isSavedItem = !!item.id;

  /** Submit new offer/estimate via PriceHistory API */
  const handleOfferSubmit = useCallback(async () => {
    if (!offerCostBasis || !item.id) return;
    setFormSaving(true);
    try {
      const created = await createPriceHistory(String(item.id), {
        unit_price: offerUnitPrice,
        quantity: offerQuantity,
        total_amount: offerTotal,
        cost_basis: offerCostBasis,
        comment: offerComment || undefined,
      });
      if (offerFile) {
        await uploadAttachment({
          costItemId: String(item.id),
          priceHistoryId: created.id,
          file: offerFile,
        });
      }
      onChange('total_amount', offerTotal);
      onChange('unit_price', offerUnitPrice);
      onChange('quantity', offerQuantity);
      setActiveForm(null);
      setOfferComment('');
      setOfferCostBasis('');
      setOfferFile(null);
      onPriceHistoryCreated?.();
      toast.success('Offer / Estimate saved');
    } catch {
      toast.error('Failed to save offer');
    } finally {
      setFormSaving(false);
    }
  }, [item.id, offerTotal, offerUnitPrice, offerQuantity, offerCostBasis, offerComment, offerFile, onChange, onPriceHistoryCreated, toast]);

  /** Submit new change cost */
  const handleChangeCostSubmit = useCallback(async () => {
    if (!ccCategory || !ccReason.trim() || !functionalAreaId) return;
    setFormSaving(true);
    try {
      const created = await createChangeCost({
        functional_area_id: functionalAreaId,
        amount: ccAmount,
        reason: ccReason,
        category: ccCategory as AdjustmentCategory,
        cost_driver: ccCostDriver || 'other',
        budget_relevant: ccBudgetRelevant,
        year: new Date().getFullYear(),
      });
      if (ccFile && item.id) {
        await uploadAttachment({
          costItemId: String(item.id),
          changeCostId: created.id,
          file: ccFile,
        });
      }
      setActiveForm(null);
      setCcAmount(0);
      setCcCategory('');
      setCcCostDriver('');
      setCcReason('');
      setCcBudgetRelevant(true);
      setCcFile(null);
      onPriceHistoryCreated?.(); // reloads data
      toast.success('Change Cost saved');
    } catch {
      toast.error('Failed to save change cost');
    } finally {
      setFormSaving(false);
    }
  }, [functionalAreaId, ccAmount, ccCategory, ccCostDriver, ccReason, ccBudgetRelevant, ccFile, item.id, onPriceHistoryCreated, toast]);

  /** Handle drag & drop file */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (activeForm === 'offer') setOfferFile(file);
    else if (activeForm === 'changecost') setCcFile(file);
  }, [activeForm]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  // Details: show fields if they have content or user clicked "+ Add details"
  const hasDetails = !!(item.basis_description?.trim()) || !!(item.assumptions?.trim());
  const detailsVisible = hasDetails || showDetails;

  // Approval date: only show for certain statuses
  const showApprovalDate = APPROVAL_DATE_STATUSES.has(item.approval_status);

  return (
    <div className="space-y-0">

      {/* ================================================================
          1. AMOUNTS CARD — read-only display + two action buttons
          ================================================================ */}
      <div className="bg-gradient-to-br from-indigo-50/50 to-white rounded-xl border border-gray-200/80 p-4">
        {/* Current amount display */}
        <div className="flex items-baseline justify-between">
          <label className={labelClass}>Total Amount</label>
          {item.cost_basis && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
              {config.cost_bases.find((cb) => cb.id === item.cost_basis)?.label ?? item.cost_basis}
            </span>
          )}
        </div>
        <p className="text-xl font-bold tabular-nums text-gray-900 mt-1">
          {formatEur(item.total_amount)}
        </p>
        {item.quantity > 1 && (
          <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
            {formatEur(item.unit_price)} × {item.quantity}
          </p>
        )}

        {/* Expected Cash-Out */}
        <div className="mt-3 pt-3 border-t border-gray-200/60">
          <label className={labelClass}>Expected Cash-Out</label>
          <input
            type="month"
            className={`${inputClass}${dirtyRing('expected_cash_out')}`}
            value={(item.expected_cash_out ?? '').slice(0, 7)}
            onChange={(e) =>
              onChange('expected_cash_out', e.target.value ? `${e.target.value}-01` : '')
            }
          />
        </div>

        {/* Two action buttons side by side */}
        {isSavedItem && activeForm === null && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                setOfferTotal(item.total_amount);
                setOfferUnitPrice(item.unit_price);
                setOfferQuantity(item.quantity);
                setOfferShowUnits(item.quantity > 1);
                setOfferFile(null);
                setActiveForm('offer');
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              <Plus size={12} />
              New Offer / Estimate
            </button>
            {functionalAreaId && (
              <button
                type="button"
                onClick={() => {
                  setCcAmount(0);
                  setCcCategory('');
                  setCcCostDriver('');
                  setCcReason('');
                  setCcBudgetRelevant(true);
                  setCcFile(null);
                  setActiveForm('changecost');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
              >
                <Plus size={12} />
                New Change Cost
              </button>
            )}
          </div>
        )}

        {/* ---- OFFER FORM ---- */}
        {activeForm === 'offer' && (
          <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">New Offer / Estimate</span>
            </div>

            <div>
              <label className={labelClass}>Amount</label>
              <EurAmountInput
                value={offerTotal}
                onChange={(v) => { setOfferTotal(v); setOfferUnitPrice(offerQuantity > 0 ? v / offerQuantity : v); }}
                className={`${inputClass} tabular-nums text-sm font-semibold`}
              />
            </div>

            <button type="button" onClick={() => setOfferShowUnits((p) => !p)} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
              {offerShowUnits ? '\u2212 Hide unit breakdown' : '+ Unit breakdown'}
            </button>

            {offerShowUnits && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Unit Price</label>
                  <EurAmountInput value={offerUnitPrice} onChange={(v) => { setOfferUnitPrice(v); setOfferTotal(v * offerQuantity); }} className={`${inputClass} tabular-nums text-sm`} />
                </div>
                <div>
                  <label className={labelClass}>Quantity</label>
                  <QuantityInput value={offerQuantity} onChange={(v) => { setOfferQuantity(v); setOfferTotal(offerUnitPrice * v); }} className={`${inputClass} tabular-nums text-sm`} />
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Type</label>
              <select className={selectClass} value={offerCostBasis} onChange={(e) => setOfferCostBasis(e.target.value)}>
                <option value="">Select type...</option>
                <option value="cost_estimation">Updated Estimate</option>
                <option value="initial_supplier_offer">Initial Supplier Offer</option>
                <option value="revised_supplier_offer">Revised Supplier Offer</option>
                <option value="final">Final / Contracted Price</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Comment (optional)</label>
              <input type="text" className={inputClass} value={offerComment} onChange={(e) => setOfferComment(e.target.value)} placeholder="e.g. Supplier ABC quote #123" />
            </div>

            {/* File drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                dragOver ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'
              }`}
            >
              <Upload size={14} className="text-gray-400 flex-shrink-0" />
              {offerFile ? (
                <span className="text-xs text-gray-700 truncate flex-1">{offerFile.name}</span>
              ) : (
                <span className="text-xs text-gray-400">Drop file or click to attach</span>
              )}
              {offerFile && (
                <button type="button" onClick={(e) => { e.stopPropagation(); setOfferFile(null); }} className="text-gray-400 hover:text-red-500">
                  <X size={12} />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setOfferFile(e.target.files[0]); e.target.value = ''; }} />

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleOfferSubmit} disabled={!offerCostBasis || formSaving} className="flex-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {formSaving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setActiveForm(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* ---- CHANGE COST FORM ---- */}
        {activeForm === 'changecost' && (
          <div className="mt-3 pt-3 border-t border-indigo-200/60 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] uppercase tracking-wider text-indigo-700 font-semibold">New Change Cost</span>
            </div>

            <div>
              <label className={labelClass}>Amount (EUR)</label>
              <EurAmountInput value={ccAmount} onChange={setCcAmount} className={`${inputClass} tabular-nums text-sm font-semibold`} />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select className={selectClass} value={ccCategory} onChange={(e) => setCcCategory(e.target.value)}>
                <option value="">Select category...</option>
                <option value="product_change">Product Change</option>
                <option value="supplier_change">Supplier Change</option>
                <option value="scope_change">Scope Change</option>
                <option value="optimization">Optimization</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Cost Driver</label>
              <select className={selectClass} value={ccCostDriver} onChange={(e) => setCcCostDriver(e.target.value)}>
                <option value="">Select driver...</option>
                <option value="product">Product</option>
                <option value="process">Process</option>
                <option value="assembly_new_requirements">Assembly / New Req.</option>
                <option value="testing_new_requirements">Testing / New Req.</option>
                <option value="initial_setup">Initial Setup</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Reason</label>
              <textarea className={`${inputClass} resize-none`} rows={2} value={ccReason} onChange={(e) => setCcReason(e.target.value)} placeholder="Why is this cost change needed?" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={ccBudgetRelevant} onChange={(e) => setCcBudgetRelevant(e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-xs text-gray-600">Budget relevant</span>
            </label>

            {/* File drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              <Upload size={14} className="text-gray-400 flex-shrink-0" />
              {ccFile ? (
                <span className="text-xs text-gray-700 truncate flex-1">{ccFile.name}</span>
              ) : (
                <span className="text-xs text-gray-400">Drop file or click to attach</span>
              )}
              {ccFile && (
                <button type="button" onClick={(e) => { e.stopPropagation(); setCcFile(null); }} className="text-gray-400 hover:text-red-500">
                  <X size={12} />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setCcFile(e.target.files[0]); e.target.value = ''; }} />

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleChangeCostSubmit} disabled={!ccCategory || !ccReason.trim() || formSaving} className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {formSaving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setActiveForm(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          2. CLASSIFICATION CHIPS + 3. REQUESTER
          ================================================================ */}
      <div className="flex flex-wrap gap-2 mt-5">
        <ChipSelect
          label="Phase"
          value={item.project_phase}
          options={config.phases}
          onChange={(v) => onChange('project_phase', v)}
          isDirty={isDirty('project_phase')}
        />
        <ChipSelect
          label="Product"
          value={item.product}
          options={config.products}
          onChange={(v) => onChange('product', v)}
          isDirty={isDirty('product')}
        />
        <ChipSelect
          label="Cost Basis"
          value={item.cost_basis}
          options={config.cost_bases}
          onChange={(v) => onChange('cost_basis', v)}
          isDirty={isDirty('cost_basis')}
        />
        <ChipSelect
          label="Cost Driver"
          value={item.cost_driver}
          options={config.cost_drivers}
          onChange={(v) => onChange('cost_driver', v)}
          isDirty={isDirty('cost_driver')}
        />

        {/* Requester chip / link */}
        <div ref={requesterRef} className="relative">
          {item.requester ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition-all${
                isDirty('requester') ? ' ring-2 ring-indigo-500' : ''
              }`}
              onClick={() => setShowRequester((prev) => !prev)}
            >
              <User size={12} className="text-gray-400" />
              {item.requester}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('requester', null);
                }}
                className="ml-0.5 p-0.5 rounded-full hover:bg-gray-300 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear requester"
              >
                <X size={10} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowRequester((prev) => !prev)}
              className="text-xs text-gray-400 hover:text-indigo-600 transition-colors py-1.5"
            >
              + Requester
            </button>
          )}

          {/* Requester combobox popover */}
          {showRequester && (
            <div className="absolute z-50 mt-1 left-0 w-64 bg-white rounded-lg border border-gray-200 shadow-lg p-2">
              <RequesterCombobox
                value={item.requester ?? null}
                onChange={(v) => {
                  onChange('requester', v);
                  if (v) setShowRequester(false);
                }}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================================================================
          4. APPROVAL DATE (conditional)
          ================================================================ */}
      {showApprovalDate && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-gray-500">Approved:</span>
          <input
            type="date"
            className={`rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors${dirtyRing('approval_date')}`}
            value={item.approval_date ?? ''}
            onChange={(e) => onChange('approval_date', e.target.value || null)}
          />
        </div>
      )}

      {/* ================================================================
          5. DETAILS (progressive disclosure)
          ================================================================ */}
      {!detailsVisible && (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors mt-4 block"
        >
          + Add details
        </button>
      )}

      {detailsVisible && (
        <div className="mt-4 space-y-3">
          <div>
            <label className={labelClass}>Basis Description</label>
            <input
              type="text"
              className={`${inputClass}${dirtyRing('basis_description')}`}
              value={item.basis_description}
              onChange={(e) => onChange('basis_description', e.target.value)}
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
      )}
    </div>
  );
};

export default SidePanelForm;
