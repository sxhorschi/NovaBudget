// ---------------------------------------------------------------------------
// AmountCell — Formatted EUR amount with optional delta indicator
// ---------------------------------------------------------------------------

interface AmountCellProps {
  original: number;
  current: number;
}

/** Shared EUR formatter instance (avoid re-creating on every call). */
const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Format a number as EUR with thousands separator (German locale). */
function formatEUR(value: number): string {
  return eurFormatter.format(value);
}

export default function AmountCell({ original, current }: AmountCellProps) {
  const delta = current - original;
  const hasDelta = delta !== 0;

  return (
    <span className="inline-flex flex-col items-end font-mono tabular-nums font-medium text-sm leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span className="text-slate-900">{formatEUR(current)}</span>
      {hasDelta && (
        <span
          className="text-[11px] font-normal"
          style={{ color: delta > 0 ? '#dc2626' : '#16a34a' }}
        >
          ({delta > 0 ? '+' : ''}{formatEUR(delta)})
        </span>
      )}
    </span>
  );
}

export { formatEUR };
