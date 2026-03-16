import React from 'react';
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

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const sectionHeader =
  'text-xs uppercase text-gray-500 font-semibold tracking-wider border-b border-gray-100 pb-2 mb-3 mt-6';
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
  onChange: (field: keyof CostItem, value: CostItem[keyof CostItem]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SidePanelForm: React.FC<SidePanelFormProps> = ({ item, onChange }) => {
  const delta = item.current_amount - item.original_amount;
  const deltaPct =
    item.original_amount !== 0
      ? ((delta / item.original_amount) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-0">
      {/* ---- BETRAEGE ---- */}
      <h4 className={sectionHeader}>Beträge</h4>
      <div className="grid grid-cols-3 gap-4">
        {/* Original (readonly) */}
        <div>
          <label className={labelClass}>Original</label>
          <div className={readonlyInputClass}>{formatEur(item.original_amount)}</div>
        </div>

        {/* Current (editable) */}
        <div>
          <label className={labelClass}>Aktuell</label>
          <input
            type="number"
            className={`${inputClass} tabular-nums`}
            value={item.current_amount}
            onChange={(e) =>
              onChange('current_amount', Number(e.target.value) || 0)
            }
            step={500}
            min={0}
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

      {/* ---- KLASSIFIZIERUNG ---- */}
      <h4 className={sectionHeader}>Klassifizierung</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Phase</label>
          <select
            className={selectClass}
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
            className={selectClass}
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
            className={selectClass}
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
            className={selectClass}
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

      {/* ---- FREIGABE ---- */}
      <h4 className={sectionHeader}>Freigabe</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={selectClass}
            value={item.approval_status}
            onChange={(e) =>
              onChange('approval_status', e.target.value as ApprovalStatus)
            }
          >
            {(Object.keys(STATUS_LABELS) as ApprovalStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Freigabedatum</label>
          <input
            type="date"
            className={inputClass}
            value={item.approval_date ?? ''}
            onChange={(e) =>
              onChange('approval_date', e.target.value || null)
            }
          />
        </div>
      </div>

      {/* ---- ZIELANPASSUNG / BUDGET-WIRKSAM ---- */}
      <h4 className={sectionHeader}>Zielanpassung / Budget-wirksam</h4>
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
            <label className={labelClass}>Begründung</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Begründung für die Zielanpassung..."
              value={item.zielanpassung_reason}
              onChange={(e) => onChange('zielanpassung_reason', e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ---- DETAILS ---- */}
      <h4 className={sectionHeader}>Details</h4>
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Basisbeschreibung</label>
          <input
            type="text"
            className={inputClass}
            value={item.basis_description}
            onChange={(e) =>
              onChange('basis_description', e.target.value)
            }
          />
        </div>

        <div>
          <label className={labelClass}>Annahmen</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={item.assumptions}
            onChange={(e) => onChange('assumptions', e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Kommentare</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            value={item.comments}
            onChange={(e) => onChange('comments', e.target.value)}
          />
        </div>
      </div>

      {/* ---- TIMING ---- */}
      <h4 className={sectionHeader}>Timing</h4>
      <div>
        <label className={labelClass}>Erwarteter Zahlungsausgang</label>
        <input
          type="month"
          className={inputClass}
          value={item.expected_cash_out}
          onChange={(e) =>
            onChange('expected_cash_out', e.target.value)
          }
        />
      </div>
    </div>
  );
};

export default SidePanelForm;
