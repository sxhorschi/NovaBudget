import { Pencil, Trash2 } from 'lucide-react';
import type { CostItem, ApprovalStatus } from '../../types/budget';
import { PHASE_LABELS, PRODUCT_LABELS } from '../../types/budget';
import AmountCell from './AmountCell';
import StatusBadge from './StatusBadge';

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
          : 'hover:bg-slate-50/80 border-l-[3px] border-l-transparent',
      ].join(' ')}
      style={{
        borderBottomColor: 'var(--border-default)',
      }}
    >
      {/* Description */}
      <td className="pl-14 pr-4 py-2.5 text-sm text-slate-800 max-w-0 overflow-hidden">
        <span className="truncate block">{item.description}</span>
      </td>

      {/* Amount */}
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <AmountCell original={item.original_amount} current={item.current_amount} />
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
