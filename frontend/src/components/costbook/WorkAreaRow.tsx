import { ChevronRight } from 'lucide-react';
import { formatEUR } from './AmountCell';

// ---------------------------------------------------------------------------
// WorkAreaRow — Second-level collapsible row
// ---------------------------------------------------------------------------

interface WorkAreaRowProps {
  name: string;
  total: number;
  itemCount: number;
  expanded: boolean;
  onToggle: () => void;
  /** Department accent color (hex) for left-border */
  accentColor: string;
}

export default function WorkAreaRow({
  name,
  total,
  itemCount,
  expanded,
  onToggle,
  accentColor,
}: WorkAreaRowProps) {
  return (
    <tr
      onClick={onToggle}
      className="cursor-pointer transition-colors duration-150 border-b hover:bg-slate-100/60"
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
          {name}
        </span>
      </td>

      {/* Subtotal + item count */}
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className="font-mono tabular-nums text-sm font-medium text-slate-700">
          {formatEUR(total)}
        </span>
      </td>

      <td className="px-4 py-2.5 whitespace-nowrap">
        <span className="inline-flex items-center justify-center rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 tabular-nums">
          {itemCount}
        </span>
      </td>
    </tr>
  );
}
