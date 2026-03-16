import React, { useCallback } from 'react';
import { useToast } from '../common/ToastProvider';

// ---------------------------------------------------------------------------
// AmountCell — Formatted EUR amount with optional delta indicator
// Click on the amount copies the raw number to clipboard.
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
  const toast = useToast();

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(String(current)).then(() => {
        toast.info(`${formatEUR(current)} kopiert`);
      });
    },
    [current, toast],
  );

  return (
    <span
      className="inline-flex flex-col items-end font-mono tabular-nums font-medium text-sm leading-tight cursor-copy"
      style={{ fontVariantNumeric: 'tabular-nums' }}
      onClick={handleCopy}
      title="Klick zum Kopieren"
    >
      <span className="text-slate-900 hover:text-indigo-600 transition-colors duration-150">{formatEUR(current)}</span>
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
