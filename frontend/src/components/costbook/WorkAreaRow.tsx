import { ChevronRight, Pencil } from 'lucide-react';
import { useAmountFormatter } from './AmountCell';

const contextActionButtonClass = 'rounded p-1 text-slate-400 hover:text-black hover:bg-gray-50 transition-all duration-150 opacity-0 group-hover:opacity-100 focus-visible:opacity-100';

// ---------------------------------------------------------------------------
// WorkAreaRow — Second-level collapsible row
// ---------------------------------------------------------------------------

interface WorkAreaRowProps {
  name: string;
  total: number;
  itemCount: number;
  expanded: boolean;
  onToggle: () => void;
  onOpenContext?: () => void;
  /** Functional Area accent color (hex) for left-border */
  accentColor: string;
}

export default function WorkAreaRow({
  name,
  total,
  itemCount,
  expanded,
  onToggle,
  onOpenContext,
  accentColor,
}: WorkAreaRowProps) {
  const format = useAmountFormatter();
  return (
    <tr
      onClick={onToggle}
      data-workarea-name={name}
      className="group cursor-pointer transition-colors duration-150 border-b bg-white hover:bg-gray-50/80"
      style={{
        borderBottomColor: 'var(--border-default)',
        borderLeft: `4px solid ${accentColor}40`,
      }}
    >
      {/* Name with chevron */}
      <td colSpan={6} className="pl-9 pr-4 py-2.5">
        <span className="inline-flex items-center gap-1.5">
          <ChevronRight
            size={14}
            className="text-slate-400 shrink-0 transition-transform duration-200 ease-out"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          <span className="font-semibold text-gray-700 text-sm">{name}</span>
          {/* Item count badge */}
          <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ml-1">
            {itemCount}
          </span>
        </span>
      </td>

      {/* Subtotal */}
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className="font-mono tabular-nums text-sm font-medium text-slate-700">
          {format(total)}
        </span>
      </td>

      <td className="px-4 py-2.5 whitespace-nowrap">
        <span className="inline-flex w-full items-center justify-end">
          {onOpenContext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenContext();
              }}
              className={contextActionButtonClass}
              title="Edit category"
              aria-label="Edit category"
            >
              <Pencil size={14} />
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}
