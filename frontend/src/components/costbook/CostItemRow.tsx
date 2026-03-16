import { Pencil, Trash2 } from 'lucide-react';
import type { CostItem, ApprovalStatus } from '../../types/budget';
import { PHASE_LABELS, PRODUCT_LABELS } from '../../types/budget';
import AmountCell from './AmountCell';
import StatusBadge from './StatusBadge';

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(isoDate: string): string {
  const now = new Date();
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '';
  if (diffDays === 0) return 'heute';
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wo.`;
  if (diffDays < 365) return `vor ${Math.floor(diffDays / 30)} Mon.`;
  return `vor ${Math.floor(diffDays / 365)} J.`;
}

// ---------------------------------------------------------------------------
// CostItemRow — Single cost item (deepest level in the hierarchy)
// ---------------------------------------------------------------------------

interface CostItemRowProps {
  item: CostItem;
  selected: boolean;
  onClick: () => void;
  onStatusChange: (newStatus: ApprovalStatus) => void;
  onDelete: () => void;
}

export default function CostItemRow({
  item,
  selected,
  onClick,
  onStatusChange,
  onDelete,
}: CostItemRowProps) {
  return (
    <tr
      onClick={onClick}
      className={[
        'group cursor-pointer border-b transition-all duration-150 ease-out',
        selected
          ? 'bg-indigo-50/80 border-l-[3px] border-l-indigo-500'
          : 'hover:bg-indigo-50/30 border-l-[3px] border-l-transparent hover:border-l-indigo-200',
      ].join(' ')}
      style={{
        borderBottomColor: 'var(--border-default)',
      }}
    >
      {/* Description + last edited */}
      <td className="pl-14 pr-4 py-2.5 text-sm text-slate-800 max-w-0 overflow-hidden">
        <span className="truncate block">{item.description}</span>
        {item.updated_at && (
          <span className="text-[10px] text-gray-400 block mt-0.5" title={item.updated_at}>
            {relativeTime(item.updated_at)}
          </span>
        )}
      </td>

      {/* Phase */}
      <td className="px-4 py-2.5 whitespace-nowrap">
        <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          {PHASE_LABELS[item.project_phase]}
        </span>
      </td>

      {/* Product */}
      <td className="px-4 py-2.5 text-sm text-slate-600 whitespace-nowrap">
        {PRODUCT_LABELS[item.product]}
      </td>

      {/* Status */}
      <td className="px-4 py-2.5 whitespace-nowrap">
        <StatusBadge status={item.approval_status} onChange={onStatusChange} />
      </td>

      {/* Cash-Out */}
      <td className="px-4 py-2.5 text-sm font-mono tabular-nums text-slate-500 whitespace-nowrap">
        {item.expected_cash_out}
      </td>

      {/* Amount */}
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <AmountCell original={item.original_amount} current={item.current_amount} />
      </td>

      {/* Actions */}
      <td className="px-4 py-2.5 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </span>
      </td>
    </tr>
  );
}
