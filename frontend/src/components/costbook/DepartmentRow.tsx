import { ChevronRight, Pencil } from 'lucide-react';
import { useAmountFormatter } from './AmountCell';

const contextActionButtonClass = 'rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150 opacity-0 group-hover:opacity-100 focus-visible:opacity-100';

// ---------------------------------------------------------------------------
// DepartmentRow — Top-level collapsible row with progress bar
// ---------------------------------------------------------------------------

interface DepartmentRowProps {
  name: string;
  committed: number;
  budget: number;
  itemCount: number;
  expanded: boolean;
  onToggle: () => void;
  onOpenContext?: () => void;
  /** Department accent color (hex) for left-border and progress bar */
  accentColor: string;
}

export default function DepartmentRow({
  name,
  committed,
  budget,
  itemCount,
  expanded,
  onToggle,
  onOpenContext,
  accentColor,
}: DepartmentRowProps) {
  const pct = budget > 0 ? (committed / budget) * 100 : 0;
  const format = useAmountFormatter();

  const progressColor =
    pct < 80 ? '#22c55e' : pct <= 100 ? '#f59e0b' : '#ef4444';

  return (
    <tr
      onClick={onToggle}
      className="group cursor-pointer transition-colors duration-150 border-b hover:brightness-[0.97]"
      style={{
        background: 'linear-gradient(to right, rgba(238,242,255,0.8), rgba(238,242,255,0.4), transparent)',
        borderBottomColor: 'var(--border-default)',
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      {/* Department name + chevron */}
      <td colSpan={5} className="pl-4 pr-4 py-3.5">
        <span className="inline-flex items-center gap-2.5 tracking-tight">
          <ChevronRight
            size={18}
            className="shrink-0 transition-transform duration-200 ease-out"
            style={{
              color: accentColor,
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
          <span className="font-bold text-indigo-900 text-sm">{name}</span>
          <span className="text-xs font-normal text-slate-400 ml-1 tabular-nums">
            ({itemCount})
          </span>
        </span>
      </td>

      {/* Committed / Budget */}
      <td className="px-4 py-3.5 text-right whitespace-nowrap">
        <div className="inline-flex flex-col items-end gap-1.5">
          <div className="inline-flex items-baseline gap-1 font-mono tabular-nums text-sm">
            <span className="font-bold text-slate-800">{format(committed)}</span>
            <span className="text-slate-400 text-xs">/ {format(budget)}</span>
          </div>
          {/* Inline progress pill */}
          <span className="inline-block w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <span
              className="block h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(pct, 100)}%`,
                backgroundColor: progressColor,
              }}
            />
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="inline-flex w-full items-center justify-end gap-2">
          <span
            className="w-[52px] text-right font-mono tabular-nums text-xs font-semibold"
            style={{ color: progressColor }}
          >
            {pct.toFixed(1)}%
          </span>

          {onOpenContext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenContext();
              }}
              className={contextActionButtonClass}
              title="Edit department"
              aria-label="Edit department"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
