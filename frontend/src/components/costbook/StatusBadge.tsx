import { useState, useRef, useEffect } from 'react';
import type { ApprovalStatus } from '../../types/budget';
import { STATUS_LABELS } from '../../types/budget';

// ---------------------------------------------------------------------------
// Status color mapping
// ---------------------------------------------------------------------------

const STATUS_STYLE: Record<ApprovalStatus, { bg: string; text: string; dot: string }> = {
  open:                            { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  submitted_for_approval:          { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  approved:                        { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  rejected:                        { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  on_hold:                         { bg: '#ffedd5', text: '#9a3412', dot: '#f97316' },
  pending_supplier_negotiation:    { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  pending_technical_clarification: { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
  obsolete:                        { bg: '#e2e8f0', text: '#334155', dot: '#64748b' },
};

const ALL_STATUSES: ApprovalStatus[] = [
  'open',
  'submitted_for_approval',
  'approved',
  'rejected',
  'on_hold',
  'pending_supplier_negotiation',
  'pending_technical_clarification',
  'obsolete',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: ApprovalStatus;
  onChange?: (newStatus: ApprovalStatus) => void;
}

export default function StatusBadge({ status, onChange }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const style = STATUS_STYLE[status];

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleClick = (e: React.MouseEvent) => {
    if (!onChange) return;
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleSelect = (newStatus: ApprovalStatus) => {
    onChange?.(newStatus);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          backgroundColor: style.bg,
          color: style.text,
          cursor: onChange ? 'pointer' : 'default',
        }}
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: style.dot }}
        />
        {STATUS_LABELS[status]}
      </button>

      {open && (
        <div
          className="absolute left-0 z-50 mt-1 min-w-[200px] rounded-lg border bg-white py-1"
          style={{
            borderColor: 'var(--border-default)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
        >
          {ALL_STATUSES.map((s) => {
            const sStyle = STATUS_STYLE[s];
            const isActive = s === status;
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(s);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-50"
                style={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? sStyle.text : 'var(--text-primary)',
                }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: sStyle.dot }}
                />
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
