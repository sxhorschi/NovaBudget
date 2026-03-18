import React, { useMemo } from 'react';
import { CheckCircle2, DollarSign, FileText, Clock, AlertTriangle } from 'lucide-react';
import type { CostItem } from '../../types/budget';
import { STATUS_LABELS } from '../../types/budget';
import { useConfig } from '../../context/ConfigContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DecisionEntry {
  date: string;
  icon: React.ElementType;
  iconColor: string;
  text: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Derive timeline from CostItem fields (MVP)
// ---------------------------------------------------------------------------

function deriveDecisions(item: CostItem, costBasisLabel: string): DecisionEntry[] {
  const entries: DecisionEntry[] = [];

  // 1. Created
  entries.push({
    date: item.created_at,
    icon: FileText,
    iconColor: 'text-gray-400',
    text: 'Item created',
    detail: `Basis: ${costBasisLabel}`,
  });

  // 2. Amount changed?
  if (item.current_amount !== item.original_amount) {
    const diff = item.current_amount - item.original_amount;
    const sign = diff > 0 ? '+' : '';
    entries.push({
      date: item.updated_at,
      icon: DollarSign,
      iconColor: diff > 0 ? 'text-amber-500' : 'text-emerald-500',
      text: `Amount adjusted ${sign}${diff.toLocaleString('de-DE')} EUR`,
      detail: item.zielanpassung ? `Target adjustment: ${item.zielanpassung_reason}` : undefined,
    });
  }

  // 3. Approval status transitions
  if (item.approval_status === 'approved' && item.approval_date) {
    entries.push({
      date: item.approval_date,
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      text: 'Approved',
    });
  } else if (item.approval_status === 'rejected' && item.approval_date) {
    entries.push({
      date: item.approval_date,
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      text: 'Rejected',
      detail: item.comments || undefined,
    });
  } else if (item.approval_status === 'on_hold') {
    entries.push({
      date: item.updated_at,
      icon: Clock,
      iconColor: 'text-amber-500',
      text: 'Set to On Hold',
      detail: item.comments || undefined,
    });
  } else if (
    item.approval_status === 'pending_supplier_negotiation' ||
    item.approval_status === 'pending_technical_clarification'
  ) {
    entries.push({
      date: item.updated_at,
      icon: Clock,
      iconColor: 'text-blue-500',
      text: STATUS_LABELS[item.approval_status],
      detail: item.comments || undefined,
    });
  } else if (item.approval_status === 'submitted_for_approval') {
    entries.push({
      date: item.updated_at,
      icon: FileText,
      iconColor: 'text-yellow-500',
      text: 'Submitted for approval',
      detail: item.comments || undefined,
    });
  }

  // Sort by date ascending
  entries.sort((a, b) => a.date.localeCompare(b.date));

  return entries;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DecisionLogProps {
  item: CostItem;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DecisionLog: React.FC<DecisionLogProps> = ({ item }) => {
  const { config, getLabel } = useConfig();
  const entries = useMemo(
    () => deriveDecisions(item, getLabel(config.cost_bases, item.cost_basis)),
    [item, config.cost_bases, getLabel],
  );

  if (entries.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        Decision Log
      </h4>

      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200" />

        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const Icon = entry.icon;
            return (
              <div key={idx} className="relative flex items-start gap-3">
                {/* Dot on the timeline */}
                <div
                  className={`absolute -left-5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-gray-200`}
                >
                  <div className={`h-2 w-2 rounded-full ${
                    entry.iconColor === 'text-emerald-500' ? 'bg-emerald-400' :
                    entry.iconColor === 'text-amber-500' ? 'bg-amber-400' :
                    entry.iconColor === 'text-red-500' ? 'bg-red-400' :
                    entry.iconColor === 'text-blue-500' ? 'bg-blue-400' :
                    entry.iconColor === 'text-yellow-500' ? 'bg-yellow-400' :
                    'bg-gray-300'
                  }`} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon size={13} className={entry.iconColor} />
                    <span className="text-xs font-medium text-gray-800">
                      {entry.text}
                    </span>
                  </div>
                  {entry.detail && (
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                      {entry.detail}
                    </p>
                  )}
                  <span className="text-[10px] text-gray-400 font-mono tabular-nums">
                    {entry.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DecisionLog;
