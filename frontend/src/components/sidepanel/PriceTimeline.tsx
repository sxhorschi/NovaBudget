import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PriceHistory } from '../../types/budget';
import { listPriceHistory } from '../../api/priceHistory';
import { formatEUR } from '../costbook/AmountCell';

// ---------------------------------------------------------------------------
// Cost Basis badge styling
// ---------------------------------------------------------------------------

const COST_BASIS_LABELS: Record<string, string> = {
  cost_estimation: 'Cost Estimation',
  initial_supplier_offer: 'Initial Offer',
  revised_supplier_offer: 'Revised Offer',
  final: 'Final',
};

const COST_BASIS_COLORS: Record<string, string> = {
  cost_estimation: 'bg-gray-100 text-gray-600',
  initial_supplier_offer: 'bg-blue-100 text-blue-700',
  revised_supplier_offer: 'bg-amber-100 text-amber-700',
  final: 'bg-emerald-100 text-emerald-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PriceTimelineProps {
  costItemId: string;
  onCountChange?: (count: number) => void;
}

const PriceTimeline: React.FC<PriceTimelineProps> = ({ costItemId, onCountChange }) => {
  const [entries, setEntries] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Notify parent whenever entry count changes
  useEffect(() => {
    onCountChange?.(entries.length);
  }, [entries.length, onCountChange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    listPriceHistory(costItemId)
      .then((data) => {
        if (!cancelled) {
          setEntries(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [costItemId]);

  if (loading) {
    return (
      <div className="text-xs text-gray-400 py-2">Loading price history...</div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 py-2">Failed to load price history.</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-xs text-gray-400 py-2">No price history available.</div>
    );
  }

  // Compute delta: first entry vs last entry
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];
  const delta = lastEntry.total_amount - firstEntry.total_amount;
  const deltaPct =
    firstEntry.total_amount !== 0
      ? ((delta / firstEntry.total_amount) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-3">
      {/* Delta summary (if more than 1 entry) */}
      {entries.length > 1 && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
            delta > 0
              ? 'bg-red-50 border-red-200 text-red-700'
              : delta < 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}
        >
          {delta > 0 ? (
            <TrendingUp size={16} className="flex-shrink-0" />
          ) : delta < 0 ? (
            <TrendingDown size={16} className="flex-shrink-0" />
          ) : (
            <Minus size={16} className="flex-shrink-0" />
          )}
          <span className="font-medium">
            {delta > 0 ? '+' : ''}
            {formatEUR(delta)} ({delta > 0 ? '+' : ''}
            {deltaPct}%)
          </span>
          <span className="text-xs opacity-70 ml-auto">
            vs. initial estimate
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="relative pl-4">
        {/* Vertical timeline line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

        {entries.map((entry, index) => {
          const isFirst = index === 0;
          const isLast = index === entries.length - 1;
          const prevEntry = index > 0 ? entries[index - 1] : null;
          const entryDelta = prevEntry
            ? entry.total_amount - prevEntry.total_amount
            : 0;

          const date = new Date(entry.created_at);
          const dateStr = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          const timeStr = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const basisLabel =
            COST_BASIS_LABELS[entry.cost_basis] ?? entry.cost_basis;
          const basisColor =
            COST_BASIS_COLORS[entry.cost_basis] ?? 'bg-gray-100 text-gray-600';

          return (
            <div key={entry.id} className="relative mb-4 last:mb-0">
              {/* Timeline dot */}
              <div
                className={`absolute -left-[1px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                  isLast
                    ? 'bg-indigo-500'
                    : isFirst
                      ? 'bg-gray-400'
                      : 'bg-gray-300'
                }`}
              />

              <div className="ml-4">
                {/* Date + cost basis badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {dateStr} {timeStr}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${basisColor}`}
                  >
                    {basisLabel}
                  </span>
                </div>

                {/* Amount row */}
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatEUR(entry.total_amount)}
                  </span>
                  {prevEntry && entryDelta !== 0 && (
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        entryDelta > 0 ? 'text-red-500' : 'text-emerald-500'
                      }`}
                    >
                      {entryDelta > 0 ? '+' : ''}
                      {formatEUR(entryDelta)}
                    </span>
                  )}
                </div>

                {/* Quantity / unit price detail */}
                <div className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                  {formatEUR(entry.unit_price)} x {entry.quantity}
                </div>

                {/* Comment */}
                {entry.comment && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    {entry.comment}
                  </p>
                )}

                {/* Created by */}
                {entry.created_by && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    by {entry.created_by}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriceTimeline;
