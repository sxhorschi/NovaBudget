import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function formatEur(value: number): string {
  return eurFormatter.format(value);
}

function deltaColor(delta: number): string {
  if (delta > 0) return 'text-green-600';
  if (delta < 0) return 'text-red-600';
  return 'text-gray-500';
}

function deltaPrefix(delta: number): string {
  return delta > 0 ? '+' : '';
}

/**
 * Formats a raw number string with German thousand separators.
 * E.g. "125000" -> "125.000"
 */
function formatThousands(raw: string): string {
  // Strip everything that's not a digit
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  return Number(digits).toLocaleString('de-DE');
}

/**
 * Parses a German-formatted number string back to a number.
 * E.g. "125.000" -> 125000
 */
function parseGermanNumber(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
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
// Shared style constants
// ---------------------------------------------------------------------------

const labelClass = 'text-xs font-medium text-gray-500 block mb-1';
const inputClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors';
const selectClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors appearance-none cursor-pointer';
const readonlyInputClass =
  'w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600 tabular-nums';

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

  return (
    <div className="space-y-0">
      {/* ---- BETR\u00c4GE (always open) ---- */}
      <FormSection title="Betr\u00e4ge" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-4">
          {/* Original (readonly) */}
          <div>
            <label className={labelClass}>Original</label>
            <div className={readonlyInputClass}>{formatEur(item.original_amount)}</div>
          </div>

          {/* Current (editable with EUR prefix + thousand separators) */}
          <div>
            <label className={labelClass}>Aktuell</label>
            <EurAmountInput
              value={item.current_amount}
              onChange={(v) => onChange('current_amount', v)}
              className={`${inputClass} tabular-nums${dirtyRing('current_amount')}`}
            />
          </div>

          {/* Delta (calculated) */}
          <div>
            <label className={labelClass}>Delta</label>
            <div className={`${readonlyInputClass} ${deltaColor(delta)}`}>
              {deltaPrefix(delta)}
              {formatEur(delta)}{' '}
              <span className="text-xs">
                ({deltaPrefix(delta)}
                {deltaPct}%)
              </span>
            </div>
          </div>
        </div>
      </FormSection>

      {/* ---- KLASSIFIZIERUNG (default open) ---- */}
      <FormSection title="Klassifizierung" defaultOpen={true}>
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
            <label className={labelClass}>Produkt</label>
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
            <label className={labelClass}>Kostenbasis</label>
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
            <label className={labelClass}>Kostentreiber</label>
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

      {/* ---- FREIGABE (default open) ---- */}
      <FormSection title="Freigabe" defaultOpen={true}>
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
            <label className={labelClass}>Freigabedatum</label>
            <input
              type="date"
              className={`${inputClass}${dirtyRing('approval_date')}`}
              value={item.approval_date ?? ''}
              onChange={(e) =>
                onChange('approval_date', e.target.value || null)
              }
            />
          </div>
        </div>
      </FormSection>

      {/* ---- ZIELANPASSUNG / BUDGET-WIRKSAM (default closed, opens when active) ---- */}
      <FormSection title="Zielanpassung" defaultOpen={item.zielanpassung}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={item.zielanpassung}
              onChange={(e) => onChange('zielanpassung', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700">Budget-wirksam</span>
          </label>
          {item.zielanpassung && (
            <div>
              <label className={labelClass}>Begr\u00fcndung</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="Begr\u00fcndung f\u00fcr die Zielanpassung..."
                value={item.zielanpassung_reason}
                onChange={(e) => onChange('zielanpassung_reason', e.target.value)}
              />
            </div>
          )}
        </div>
      </FormSection>

      {/* ---- DETAILS (default closed) ---- */}
      <FormSection title="Details" defaultOpen={false}>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Basisbeschreibung</label>
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
            <label className={labelClass}>Annahmen</label>
            <textarea
              className={`${inputClass} resize-none${dirtyRing('assumptions')}`}
              rows={2}
              value={item.assumptions}
              onChange={(e) => onChange('assumptions', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Kommentare</label>
            <textarea
              className={`${inputClass} resize-none${dirtyRing('comments')}`}
              rows={3}
              value={item.comments}
              onChange={(e) => onChange('comments', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Erwarteter Zahlungsausgang</label>
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
