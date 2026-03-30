import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Activity,
  ChevronDown,
  Paperclip,
  Download,
} from 'lucide-react';
import type { CostItem, PriceHistory, ChangeCost, Attachment } from '../../types/budget';
import {
  STATUS_LABELS,
  ADJUSTMENT_CATEGORY_LABELS,
  ADJUSTMENT_CATEGORY_COLORS,
} from '../../types/budget';
import { listPriceHistory } from '../../api/priceHistory';
import { listChangeCosts } from '../../api/budgetAdjustments';
import { getAttachments, getDownloadUrl } from '../../api/attachments';
import { formatEUR } from '../costbook/AmountCell';
import { useConfig } from '../../context/ConfigContext';

// ---------------------------------------------------------------------------
// Cost Basis badge styling (copied from PriceTimeline)
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
// Unified activity entry
// ---------------------------------------------------------------------------

type ActivityType = 'price' | 'cost' | 'decision';

interface ActivityEntry {
  type: ActivityType;
  date: string;
  price?: PriceHistory;
  priceDelta?: number;
  cost?: ChangeCost;
  decision?: { icon: string; color: string; text: string; detail?: string };
  attachments?: Attachment[];
}

/** Match attachments to timeline entries by explicit ID, then timestamp fallback */
function matchAttachments(entries: ActivityEntry[], attachments: Attachment[]): void {
  const remaining = new Set(attachments);

  // Pass 1: match by explicit price_history_id or change_cost_id
  for (const entry of entries) {
    const matched: Attachment[] = [];
    for (const att of remaining) {
      if (entry.type === 'price' && entry.price && att.price_history_id === entry.price.id) {
        matched.push(att);
      } else if (entry.type === 'cost' && entry.cost && att.change_cost_id === entry.cost.id) {
        matched.push(att);
      }
    }
    if (matched.length > 0) {
      entry.attachments = matched;
      for (const m of matched) remaining.delete(m);
    }
  }

  // Pass 2: fallback — match unlinked attachments by timestamp proximity (within 60s)
  for (const entry of entries) {
    const entryTime = new Date(entry.date).getTime();
    const matched: Attachment[] = [];
    for (const att of remaining) {
      if (att.price_history_id || att.change_cost_id) continue; // already has a link, skip
      const attTime = new Date(att.created_at).getTime();
      if (Math.abs(attTime - entryTime) < 60_000) {
        matched.push(att);
      }
    }
    if (matched.length > 0) {
      entry.attachments = [...(entry.attachments ?? []), ...matched];
      for (const m of matched) remaining.delete(m);
    }
  }
}

/** Format file size in human-readable form */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Derive decisions from CostItem (adapted from DecisionLog)
// ---------------------------------------------------------------------------

function deriveDecisions(item: CostItem, costBasisLabel: string): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  // Created
  entries.push({
    type: 'decision',
    date: item.created_at,
    decision: { icon: 'FileText', color: 'gray', text: 'Item created', detail: `Basis: ${costBasisLabel}` },
  });

  // Approval status transitions
  if (item.approval_status === 'approved' && item.approval_date) {
    entries.push({
      type: 'decision',
      date: item.approval_date,
      decision: { icon: 'CheckCircle2', color: 'emerald', text: 'Approved' },
    });
  } else if (item.approval_status === 'rejected' && item.approval_date) {
    entries.push({
      type: 'decision',
      date: item.approval_date,
      decision: { icon: 'AlertTriangle', color: 'red', text: 'Rejected' },
    });
  } else if (item.approval_status === 'on_hold') {
    entries.push({
      type: 'decision',
      date: item.updated_at,
      decision: { icon: 'Clock', color: 'amber', text: 'Set to On Hold' },
    });
  } else if (
    item.approval_status === 'pending_supplier_negotiation' ||
    item.approval_status === 'pending_technical_clarification'
  ) {
    entries.push({
      type: 'decision',
      date: item.updated_at,
      decision: { icon: 'Clock', color: 'blue', text: STATUS_LABELS[item.approval_status] },
    });
  } else if (item.approval_status === 'submitted_for_approval') {
    entries.push({
      type: 'decision',
      date: item.updated_at,
      decision: { icon: 'FileText', color: 'yellow', text: 'Submitted for approval' },
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Decision icon helper
// ---------------------------------------------------------------------------

const DECISION_ICONS: Record<string, React.ElementType> = {
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
};

const DECISION_DOT_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-400',
  red: 'bg-red-400',
  amber: 'bg-amber-400',
  blue: 'bg-blue-400',
  yellow: 'bg-yellow-400',
  gray: 'bg-gray-300',
};

const DECISION_ICON_COLORS: Record<string, string> = {
  emerald: 'text-emerald-500',
  red: 'text-red-500',
  amber: 'text-amber-500',
  blue: 'text-blue-500',
  yellow: 'text-yellow-500',
  gray: 'text-gray-400',
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}


// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActivityTimelineProps {
  costItemId: string;
  item: CostItem;
  functionalAreaId?: string;
  functionalAreaBudget?: number;
  onCountChange?: (count: number) => void;
}

// ---------------------------------------------------------------------------
// Filter pills
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: { key: ActivityType | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'price', label: 'Price Adj.' },
  { key: 'cost', label: 'Change Costs' },
  { key: 'decision', label: 'Status' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  costItemId,
  item,
  functionalAreaId,
  functionalAreaBudget,
  onCountChange,
}) => {
  const { config, getLabel } = useConfig();
  const [priceEntries, setPriceEntries] = useState<PriceHistory[]>([]);
  const [changeCosts, setChangeCosts] = useState<ChangeCost[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Fetch price history and change costs in parallel
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const promises: Promise<any>[] = [
      listPriceHistory(costItemId),
      functionalAreaId ? listChangeCosts(functionalAreaId) : Promise.resolve([]),
      getAttachments({ costItemId }).then((r) => r.items ?? []).catch(() => []),
    ];

    Promise.all(promises)
      .then(([prices, costs, atts]) => {
        if (!cancelled) {
          setPriceEntries(prices);
          setChangeCosts(costs);
          setAttachments(Array.isArray(atts) ? atts : []);
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
  }, [costItemId, functionalAreaId]);

  // Derive decisions from cost item
  const decisions = useMemo(
    () => deriveDecisions(item, getLabel(config.cost_bases, item.cost_basis)),
    [item, config.cost_bases, getLabel],
  );

  // Build unified activity entries
  const allEntries = useMemo(() => {
    const entries: ActivityEntry[] = [];

    // Price entries with deltas
    priceEntries.forEach((p, idx) => {
      const prevEntry = idx > 0 ? priceEntries[idx - 1] : null;
      const delta = prevEntry ? p.total_amount - prevEntry.total_amount : 0;
      entries.push({
        type: 'price',
        date: p.created_at,
        price: p,
        priceDelta: delta,
      });
    });

    // Change cost entries
    changeCosts.forEach((cc) => {
      entries.push({
        type: 'cost',
        date: cc.created_at,
        cost: cc,
      });
    });

    // Decision entries
    entries.push(...decisions);

    // Sort descending by date (newest first)
    entries.sort((a, b) => b.date.localeCompare(a.date));

    // Match attachments to entries by timestamp proximity
    matchAttachments(entries, attachments);

    return entries;
  }, [priceEntries, changeCosts, decisions, attachments]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered entries
  const filteredEntries = useMemo(
    () => filter === 'all' ? allEntries : allEntries.filter((e) => e.type === filter),
    [allEntries, filter],
  );

  // Report total count
  useEffect(() => {
    onCountChange?.(allEntries.length);
  }, [allEntries.length, onCountChange]);

  // Budget summary calculations
  const totalAdjustment = useMemo(
    () => changeCosts.filter((a) => a.budget_relevant).reduce((sum, a) => sum + a.amount, 0),
    [changeCosts],
  );

  const originalBudget = functionalAreaBudget ?? 0;
  const currentBudget = originalBudget + totalAdjustment;

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
        <span className="ml-2 text-xs text-gray-400">Loading activity...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 py-4 text-center">Failed to load activity data.</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex items-center gap-1.5">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
              filter === opt.key
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Budget summary bar (only if change costs exist) */}
      {changeCosts.length > 0 && functionalAreaBudget != null && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Original budget</span>
            <span className="font-medium text-gray-700 tabular-nums">{formatEUR(originalBudget)}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-gray-500">Budget-relevant adjustments</span>
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
              {formatEUR(totalAdjustment)}
            </span>
          </div>
          <div className="border-t border-gray-200 mt-1.5 pt-1.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">Current budget</span>
            <span className="font-semibold text-gray-900 tabular-nums">{formatEUR(currentBudget)}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Activity size={28} className="mb-2 opacity-50" />
          <span className="text-xs">No activity yet</span>
        </div>
      )}

      {/* Timeline */}
      {filteredEntries.length > 0 && (
        <div className="relative pl-5">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200" />

          <div className="space-y-3">
            {filteredEntries.map((entry, idx) => {
              if (entry.type === 'price' && entry.price) {
                return renderPriceEntry(entry, idx, expandedIds, toggleExpand);
              }
              if (entry.type === 'cost' && entry.cost) {
                return renderCostEntry(entry, idx, expandedIds, toggleExpand);
              }
              if (entry.type === 'decision' && entry.decision) {
                return renderDecisionEntry(entry, idx);
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

/** Inline attachment chips */
function renderAttachments(atts: Attachment[]) {
  if (!atts || atts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {atts.map((att) => (
        <a
          key={att.id}
          href={getDownloadUrl(att.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-[10px] text-gray-600 transition-colors"
          title={`${att.original_filename} (${formatFileSize(att.file_size)})`}
        >
          <Paperclip size={10} className="flex-shrink-0" />
          <span className="truncate max-w-[120px]">{att.original_filename}</span>
          <Download size={9} className="flex-shrink-0 text-gray-400" />
        </a>
      ))}
    </div>
  );
}

function renderPriceEntry(entry: ActivityEntry, idx: number, expandedIds: Set<string>, toggleExpand: (id: string) => void) {
  const p = entry.price!;
  const delta = entry.priceDelta ?? 0;
  const dateStr = formatDate(p.created_at);
  const timeStr = formatTime(p.created_at);
  const entryId = `price-${p.id}`;
  const isExpanded = expandedIds.has(entryId);

  const basisLabel = COST_BASIS_LABELS[p.cost_basis] ?? p.cost_basis;
  const basisColor = COST_BASIS_COLORS[p.cost_basis] ?? 'bg-gray-100 text-gray-600';

  const hasDetail = !!(p.comment) || (p.quantity > 1) || (entry.attachments && entry.attachments.length > 0);

  return (
    <div key={`price-${p.id}-${idx}`} className="relative flex items-start gap-3">
      {/* Blue dot */}
      <div className="absolute -left-5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-gray-200">
        <div className="h-2 w-2 rounded-full bg-blue-400" />
      </div>

      <div className="min-w-0 flex-1">
        {/* Clickable header row */}
        <button
          type="button"
          onClick={() => hasDetail && toggleExpand(entryId)}
          className={`w-full text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {delta > 0 ? (
              <TrendingUp size={13} className="text-red-500 flex-shrink-0" />
            ) : delta < 0 ? (
              <TrendingDown size={13} className="text-emerald-500 flex-shrink-0" />
            ) : null}
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {formatEUR(p.total_amount)}
            </span>
            {delta !== 0 && (
              <span
                className={`text-xs font-medium tabular-nums ${
                  delta > 0 ? 'text-red-500' : 'text-emerald-500'
                }`}
              >
                {delta > 0 ? '+' : ''}
                {formatEUR(delta)}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${basisColor}`}
            >
              {basisLabel}
            </span>
            {entry.attachments && entry.attachments.length > 0 && (
              <Paperclip size={11} className="text-gray-400 flex-shrink-0" />
            )}
            {hasDetail && (
              <ChevronDown size={12} className={`text-gray-400 transition-transform ml-auto flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </div>

          {/* Meta line — always visible */}
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-mono tabular-nums">
              {dateStr} {timeStr}
            </span>
            {p.created_by && (
              <span className="text-[10px] text-gray-400">by {p.created_by}</span>
            )}
          </div>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-1.5 pl-0 space-y-1 border-l-2 border-blue-200 ml-0.5 pl-2.5">
            {/* Unit price breakdown */}
            {p.quantity > 1 && (
              <div className="text-[11px] text-gray-500 tabular-nums">
                {formatEUR(p.unit_price)} × {p.quantity}
              </div>
            )}

            {/* Comment */}
            {p.comment && (
              <p className="text-xs text-gray-600 leading-relaxed italic">{p.comment}</p>
            )}

            {/* Attachments */}
            {renderAttachments(entry.attachments ?? [])}
          </div>
        )}
      </div>
    </div>
  );
}

function renderCostEntry(entry: ActivityEntry, idx: number, expandedIds: Set<string>, toggleExpand: (id: string) => void) {
  const cc = entry.cost!;
  const isPositive = cc.amount > 0;
  const entryId = `cost-${cc.id}`;
  const isExpanded = expandedIds.has(entryId);

  const hasDetail = !!(cc.reason) || !!(cc.cost_driver) || (entry.attachments && entry.attachments.length > 0);

  return (
    <div key={`cost-${cc.id}-${idx}`} className="relative flex items-start gap-3">
      {/* Amber dot */}
      <div className="absolute -left-5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-gray-200">
        <div className="h-2 w-2 rounded-full bg-amber-400" />
      </div>

      <div className="min-w-0 flex-1">
        {/* Clickable header */}
        <button
          type="button"
          onClick={() => hasDetail && toggleExpand(entryId)}
          className={`w-full text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
        >
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
              {formatEUR(cc.amount)}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                ADJUSTMENT_CATEGORY_COLORS[cc.category]
              }`}
            >
              {ADJUSTMENT_CATEGORY_LABELS[cc.category]}
            </span>
            {cc.budget_relevant && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800">
                Budget
              </span>
            )}
            {entry.attachments && entry.attachments.length > 0 && (
              <Paperclip size={11} className="text-gray-400 flex-shrink-0" />
            )}
            {hasDetail && (
              <ChevronDown size={12} className={`text-gray-400 transition-transform ml-auto flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </div>

          {/* Meta — always visible */}
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-mono tabular-nums">
              {formatDate(cc.created_at)}
            </span>
            {cc.created_by && (
              <span className="text-[10px] text-gray-400">by {cc.created_by}</span>
            )}
          </div>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-1.5 space-y-1 border-l-2 border-amber-200 ml-0.5 pl-2.5">
            {/* Reason */}
            {cc.reason && (
              <p className="text-xs text-gray-600 leading-relaxed">{cc.reason}</p>
            )}

            {/* Cost driver */}
            {cc.cost_driver && (
              <div className="text-[11px] text-gray-500">
                <span className="text-gray-400">Driver:</span> {cc.cost_driver}
              </div>
            )}

            {/* Year */}
            {cc.year && (
              <div className="text-[11px] text-gray-500">
                <span className="text-gray-400">Year:</span> {cc.year}
              </div>
            )}

            {/* Attachments */}
            {renderAttachments(entry.attachments ?? [])}
          </div>
        )}
      </div>
    </div>
  );
}

function renderDecisionEntry(entry: ActivityEntry, idx: number) {
  const d = entry.decision!;
  const Icon = DECISION_ICONS[d.icon] ?? FileText;
  const dotColor = DECISION_DOT_COLORS[d.color] ?? 'bg-gray-300';
  const iconColor = DECISION_ICON_COLORS[d.color] ?? 'text-gray-400';

  return (
    <div key={`decision-${idx}`} className="relative flex items-start gap-3">
      {/* Color-coded dot */}
      <div className="absolute -left-5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-gray-200">
        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon size={13} className={iconColor} />
          <span className="text-xs font-medium text-gray-800">{d.text}</span>
        </div>
        {d.detail && (
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{d.detail}</p>
        )}
        <span className="text-[10px] text-gray-400 font-mono tabular-nums">
          {formatDate(entry.date)}
        </span>
      </div>
    </div>
  );
}

export default ActivityTimeline;
