import { useAmountFormatter } from './AmountCell';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';

// ---------------------------------------------------------------------------
// TableFooter — Grand total row at the bottom of CostbookTable
// ---------------------------------------------------------------------------

interface TableFooterProps {
  totalAmount: number;
  itemCount: number;
}

export default function TableFooter({ totalAmount, itemCount }: TableFooterProps) {
  const format = useAmountFormatter();
  const { inflationEnabled, inflationRate } = useDisplaySettings();

  return (
    <tfoot>
      <tr
        className="sticky bottom-0 z-10 bg-white border-t-2"
        style={{ borderColor: 'var(--border-strong)' }}
      >
        <td
          colSpan={6}
          className="px-4 py-3 text-sm font-semibold text-slate-900 uppercase tracking-wide"
        >
          <span>Total ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          {inflationEnabled && (
            <span className="ml-3 text-[11px] font-normal normal-case text-amber-600 tracking-normal">
              * inflation ({inflationRate}% p.a.) applied to individual items
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums text-sm font-bold text-slate-900">
          {format(totalAmount)}
        </td>
        <td className="px-4 py-3" />
      </tr>
    </tfoot>
  );
}
