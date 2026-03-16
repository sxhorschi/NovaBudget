import { ChevronRight } from 'lucide-react';
import { formatEUR } from './AmountCell';

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
  accentColor,
}: DepartmentRowProps) {
  const pct = budget > 0 ? Math.min((committed / budget) * 100, 100) : 0;

  return (
    <tr
      onClick={onToggle}
      className="cursor-pointer transition-colors duration-150 border-b hover:brightness-[0.97]"
      style={{
        backgroundColor: 'rgba(241, 245, 249, 0.9)',
        borderBottomColor: 'var(--border-default)',
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      {/* Department name + chevron */}
      <td colSpan={4} className="pl-4 pr-4 py-3.5">
        <span className="inline-flex items-center gap-2.5 text-[15px] font-bold text-slate-900 tracking-tight">
          <ChevronRight
            size={18}
            className="text-slate-500 shrink-0 transition-transform duration-200 ease-out"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          {name}
          <span className="text-xs font-normal text-slate-400 ml-1 tabular-nums">
            {itemCount} {itemCount === 1 ? 'Position' : 'Positionen'}
          </span>
        </span>
      </td>

      {/* Committed / Budget + Progress */}
      <td colSpan={3} className="px-4 py-3.5 text-right">
        <span className="inline-flex items-center gap-4">
          {/* Amounts */}
          <span className="font-mono tabular-nums text-sm text-slate-700">
            <span className="font-bold">{formatEUR(committed)}</span>
            <span className="text-slate-400"> / {formatEUR(budget)}</span>
          </span>

          {/* Progress bar (160px, taller) */}
          <span className="inline-block w-[160px]">
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

          {/* Percentage */}
          <span className="font-mono tabular-nums text-xs font-semibold text-slate-600 w-[42px] text-right">
            {pct.toFixed(1)}%
          </span>
        </span>
      </td>
    </tr>
  );
}
