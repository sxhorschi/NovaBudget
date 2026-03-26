import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ApprovalStatus } from '../../types/budget';
import { STATUS_LABELS } from '../../types/budget';

// Statuses that require confirmation before applying
const CRITICAL_STATUSES: Set<ApprovalStatus> = new Set(['rejected', 'obsolete', 'delivered']);

// ---------------------------------------------------------------------------
// Status color mapping
// ---------------------------------------------------------------------------

const STATUS_STYLE: Record<ApprovalStatus, { bg: string; text: string; dot: string }> = {
  open:                            { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  reviewed:                        { bg: '#cffafe', text: '#155e75', dot: '#06b6d4' },
  submitted_for_approval:          { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  approved:                        { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  rejected:                        { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  on_hold:                         { bg: '#ffedd5', text: '#9a3412', dot: '#f97316' },
  pending_supplier_negotiation:    { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  pending_technical_clarification: { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
  purchase_order_sent:             { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
  purchase_order_confirmed:        { bg: '#ede9fe', text: '#5b21b6', dot: '#8b5cf6' },
  delivered:                       { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  obsolete:                        { bg: '#e2e8f0', text: '#334155', dot: '#64748b' },
};

// Tailwind gradient badge classes per status
const STATUS_BADGE_CLASS: Record<ApprovalStatus, string> = {
  open:
    'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 border border-gray-200',
  reviewed:
    'bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-700 border border-cyan-200',
  submitted_for_approval:
    'bg-gradient-to-r from-blue-50 to-yellow-50 text-blue-700 border border-blue-200',
  approved:
    'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200',
  rejected:
    'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200',
  on_hold:
    'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200',
  pending_supplier_negotiation:
    'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 border border-violet-200',
  pending_technical_clarification:
    'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 border border-violet-200',
  purchase_order_sent:
    'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-200',
  purchase_order_confirmed:
    'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 border border-violet-200',
  delivered:
    'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300',
  obsolete:
    'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-500 border border-slate-200 opacity-70',
};

// Status groups for organized dropdown display
const STATUS_GROUPS: { label: string; statuses: ApprovalStatus[] }[] = [
  {
    label: 'Pre-Approval',
    statuses: ['open', 'reviewed', 'submitted_for_approval'],
  },
  {
    label: 'Post-Approval',
    statuses: ['approved', 'purchase_order_sent', 'purchase_order_confirmed', 'delivered'],
  },
  {
    label: 'On Hold / Pending',
    statuses: ['on_hold', 'pending_supplier_negotiation', 'pending_technical_clarification'],
  },
  {
    label: 'Terminal',
    statuses: ['rejected', 'obsolete'],
  },
];

const ALL_STATUSES: ApprovalStatus[] = STATUS_GROUPS.flatMap((g) => g.statuses);

// All statuses are reachable from any status — free workflow
const ALLOWED_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = Object.fromEntries(
  ALL_STATUSES.map((s: ApprovalStatus) => [s, ALL_STATUSES.filter((t: ApprovalStatus) => t !== s)]),
) as Record<ApprovalStatus, ApprovalStatus[]>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: ApprovalStatus;
  onChange?: (newStatus: ApprovalStatus) => void;
}

export default function StatusBadge({ status, onChange }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ApprovalStatus | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });
  const style = STATUS_STYLE[status];

  const allowed = ALLOWED_TRANSITIONS[status];

  // Close on outside click — checks both button and portal dropdown
  useEffect(() => {
    if (!open && !pendingStatus) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setOpen(false);
      setPendingStatus(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, pendingStatus]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleClick = (e: React.MouseEvent) => {
    if (!onChange || allowed.length === 0) return;
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const itemCount = allowed.length + 1;
      const estimatedHeight = itemCount * 34 + 12;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const left = Math.min(rect.left, window.innerWidth - 240);
      setPos({
        top: openUp ? rect.top : rect.bottom + 4,
        left: Math.max(4, left),
        openUp,
      });
    }
    setOpen((prev) => !prev);
  };

  const handleSelect = (newStatus: ApprovalStatus) => {
    if (newStatus === status) { setOpen(false); return; }
    if (CRITICAL_STATUSES.has(newStatus)) {
      setPendingStatus(newStatus);
      setOpen(false);
      return;
    }
    onChange?.(newStatus);
    setOpen(false);
  };

  const confirmPending = useCallback(() => {
    if (pendingStatus) {
      onChange?.(pendingStatus);
      setPendingStatus(null);
    }
  }, [pendingStatus, onChange]);

  const cancelPending = useCallback(() => {
    setPendingStatus(null);
  }, []);

  const dropdownContent = open && createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] min-w-[220px] rounded-lg border bg-white py-1"
      style={{
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? window.innerHeight - pos.top + 4 : undefined,
        left: pos.left,
        borderColor: '#e2e8f0',
        boxShadow: '0 10px 30px -5px rgba(0,0,0,0.15), 0 4px 10px -4px rgba(0,0,0,0.06)',
        maxHeight: 'calc(100vh - 16px)',
        overflowY: 'auto',
      }}
    >
      {/* Current status */}
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 mb-0.5">
        Current
      </div>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-semibold"
        style={{ color: style.text }}
        onClick={(e) => { e.stopPropagation(); setOpen(false); }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: style.dot }} />
        {STATUS_LABELS[status]}
      </button>

      {allowed.length > 0 && STATUS_GROUPS.map((group) => {
        const groupStatuses = group.statuses.filter((s) => allowed.includes(s));
        if (groupStatuses.length === 0) return null;
        return (
          <div key={group.label}>
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-t border-gray-100 mt-0.5">
              {group.label}
            </div>
            {groupStatuses.map((s) => {
              const sStyle = STATUS_STYLE[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelect(s); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-50"
                  style={{ color: '#1e293b' }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sStyle.dot }} />
                  {STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>,
    document.body,
  );

  const confirmContent = pendingStatus && createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-[260px] rounded-lg border bg-white p-4 shadow-xl"
      style={{
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? window.innerHeight - pos.top + 4 : undefined,
        left: pos.left,
        borderColor: '#e2e8f0',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-medium text-gray-900 mb-1">Change status?</p>
      <p className="text-xs text-gray-500 mb-3">
        Set to <span className="font-semibold">{STATUS_LABELS[pendingStatus]}</span>?
      </p>
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); cancelPending(); }}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); confirmPending(); }}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className={[
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all duration-200',
          onChange && allowed.length > 0 ? 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer' : 'cursor-default',
          STATUS_BADGE_CLASS[status],
        ].join(' ')}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: style.dot }}
        />
        {STATUS_LABELS[status]}
      </button>
      {dropdownContent}
      {confirmContent}
    </>
  );
}
