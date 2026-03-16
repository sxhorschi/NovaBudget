import { ChevronRight, Pencil } from 'lucide-react';
import { useAmountFormatter } from './AmountCell';

const contextActionButtonClass = 'rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150 opacity-0 group-hover:opacity-100 focus-visible:opacity-100';

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
  /** Department accent color (hex) for left-border */
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
      className="group cursor-pointer transition-colors duration-150 border-b hover:bg-slate-100/60"
      style={{
        backgroundColor: 'rgba(248, 250, 252, 0.5)',
        borderBottomColor: 'var(--border-default)',
        borderLeft: `4px solid ${accentColor}40`,
      }}
    >
      {/* Name with chevron */}
      <td colSpan={5} className="pl-9 pr-4 py-2.5 text-sm font-medium text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          <ChevronRight
            size={14}
            className="text-slate-400 shrink-0 transition-transform duration-200 ease-out"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          <span className="text-xs font-normal text-slate-400 tabular-nums">
            {itemCount} {itemCount === 1 ? 'Position' : 'Positionen'}
          </span>
          {name}
        </span>
      </td>

      {/* Subtotal + item count */}
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
              title="Kategorie bearbeiten"
              aria-label="Kategorie bearbeiten"
            >
              <Pencil size={14} />
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}
