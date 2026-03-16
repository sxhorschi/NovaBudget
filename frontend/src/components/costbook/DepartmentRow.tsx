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
  const pct = budget > 0 ? Math.min((committed / budget) * 100, 100) : 0;
  const format = useAmountFormatter();

  return (
    <tr
      onClick={onToggle}
      className="group cursor-pointer transition-colors duration-150 border-b hover:brightness-[0.97]"
      style={{
        backgroundColor: 'rgba(241, 245, 249, 0.9)',
        borderBottomColor: 'var(--border-default)',
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      {/* Department name + chevron */}
      <td colSpan={5} className="pl-4 pr-4 py-3.5">
        <span className="inline-flex items-center gap-2.5 text-[15px] font-bold text-slate-900 tracking-tight">
          <ChevronRight
            size={18}
            className="text-slate-500 shrink-0 transition-transform duration-200 ease-out"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          {name}
          <span className="text-xs font-normal text-slate-400 ml-1 tabular-nums">
            ({itemCount})
          </span>
        </span>
      </td>

      {/* Committed / Budget */}
      <td className="px-4 py-3.5 text-right whitespace-nowrap">
        <div className="inline-flex flex-col items-end gap-1.5">
          <span className="font-mono tabular-nums text-sm text-slate-700">
            <span className="font-bold">{format(committed)}</span>
            <span className="text-slate-400"> / {format(budget)}</span>
          </span>
          <span className="inline-block w-[132px]">
            <span
              className="block h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <span
                className="block h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: accentColor,
                }}
              />
            </span>
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="inline-flex w-full items-center justify-end gap-2">
          <span className="w-[52px] text-right font-mono tabular-nums text-xs font-semibold text-slate-600">
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
              title="Abteilung bearbeiten"
              aria-label="Abteilung bearbeiten"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
