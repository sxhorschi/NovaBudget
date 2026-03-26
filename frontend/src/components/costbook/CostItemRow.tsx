import { Pencil, Trash2 } from 'lucide-react';
import type { CostItem, ApprovalStatus } from '../../types/budget';
import { useConfig } from '../../context/ConfigContext';
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
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wk ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo ago`;
  return `${Math.floor(diffDays / 365)} yr ago`;
}

// ---------------------------------------------------------------------------
// CostItemRow — Single cost item (deepest level in the hierarchy)
// ---------------------------------------------------------------------------

interface CostItemRowProps {
  item: CostItem;
  selected: boolean;
  onClick: () => void;
  onStatusChange: (newStatus: ApprovalStatus) => void;
  onDelete?: () => void;
}

export default function CostItemRow({
  item,
  selected,
  onClick,
  onStatusChange,
  onDelete,
}: CostItemRowProps) {
  const { config, getLabel } = useConfig();
  return (
    <tr
      onClick={onClick}
      className={[
        'group cursor-pointer border-b transition-all duration-150 ease-out',
        selected
          ? 'bg-indigo-50 border-l-4 border-l-indigo-600'
          : 'border-l-4 border-l-transparent hover:bg-gray-50/30 hover:shadow-sm hover:border-l-gray-200',
      ].join(' ')}
      style={{
        borderBottomColor: 'var(--border-default)',
      }}
    >
      {/* Description + last edited */}
      <td className="pl-14 pr-4 py-2.5 max-w-0 overflow-hidden">
        <span className="truncate block font-medium text-gray-800 text-sm">{item.description}</span>
        {item.updated_at && (
          <span className="text-[10px] text-gray-400 block mt-0.5" title={item.updated_at}>
            {relativeTime(item.updated_at)}
          </span>
        )}
      </td>

      {/* Phase */}
      <td className="px-4 py-2.5 whitespace-nowrap">
        <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
          {getLabel(config.phases, item.project_phase)}
        </span>
      </td>

      {/* Product */}
      <td className="px-4 py-2.5 text-sm text-slate-600 whitespace-nowrap">
        {getLabel(config.products, item.product)}
      </td>

      {/* Status */}
      <td className="px-4 py-2.5 whitespace-nowrap">
        <StatusBadge status={item.approval_status} onChange={onStatusChange} />
      </td>

      {/* Requester */}
      <td className="px-4 py-2.5 text-sm text-slate-600 whitespace-nowrap truncate max-w-[130px]">
        {item.requester ?? ''}
      </td>

      {/* Cash-Out */}
      <td className="px-4 py-2.5 text-sm font-mono tabular-nums text-slate-500 whitespace-nowrap">
        {item.expected_cash_out}
      </td>

      {/* Amount */}
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <AmountCell original={item.original_amount} current={item.current_amount} cashOutDate={item.expected_cash_out} />
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
            className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-gray-50 transition-all duration-150"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}
