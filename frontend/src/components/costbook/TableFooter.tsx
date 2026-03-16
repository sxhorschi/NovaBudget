import { formatEUR } from './AmountCell';

// ---------------------------------------------------------------------------
// TableFooter — Grand total row at the bottom of CostbookTable
// ---------------------------------------------------------------------------

interface TableFooterProps {
  totalAmount: number;
  itemCount: number;
}

export default function TableFooter({ totalAmount, itemCount }: TableFooterProps) {
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
          Gesamt ({itemCount} {itemCount === 1 ? 'Position' : 'Positionen'})
        </td>
        <td className="px-4 py-3 text-right font-mono tabular-nums text-sm font-bold text-slate-900">
          {formatEUR(totalAmount)}
        </td>
        <td />
      </tr>
    </tfoot>
  );
}
