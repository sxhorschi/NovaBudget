import React, { useCallback } from 'react';
import { useToast } from '../common/ToastProvider';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { useInflatedAmount } from '../../hooks/useInflatedAmount';

// ---------------------------------------------------------------------------
// AmountCell — Formatted EUR amount with optional delta indicator
// Click on the amount copies the raw number to clipboard.
// Optional cashOutDate enables inflation display when inflation is active.
// ---------------------------------------------------------------------------

interface AmountCellProps {
  amount: number;
  /** YYYY-MM formatted cash-out date. When provided and inflation is active,
   *  the displayed value is inflated and a "~" prefix is shown. */
  cashOutDate?: string;
}

/** Shared EUR formatter instance (avoid re-creating on every call). */
const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const keurNumberFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Format a number as EUR with thousands separator (German locale). */
export function formatEUR(value: number): string {
  return eurFormatter.format(value);
}

/** Format a number as k€ (German locale, no decimal). */
export function formatKEUR(value: number): string {
  return `${keurNumberFormatter.format(Math.round(value / 1000))} k€`;
}

/**
 * Format a raw numeric string with German thousand separators.
 * E.g. "125000" -> "125.000"
 */
export function formatThousands(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  return Number(digits).toLocaleString('de-DE');
}

/**
 * Parse a German-formatted number string back to a number.
 * E.g. "125.000" -> 125000
 */
export function parseGermanNumber(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

/**
 * Hook that returns the currently active amount formatter based on display settings.
 * Use this in any component that shows monetary values.
 */
export function useAmountFormatter(): (value: number) => string {
  const { showThousands } = useDisplaySettings();
  return showThousands ? formatKEUR : formatEUR;
}

export default function AmountCell({ amount, cashOutDate }: AmountCellProps) {
  const { inflationEnabled } = useDisplaySettings();
  const displayAmount = useInflatedAmount(amount, cashOutDate);
  const isInflated = inflationEnabled && !!cashOutDate && displayAmount !== amount;

  const toast = useToast();
  const format = useAmountFormatter();

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(String(amount)).then(() => {
        toast.info(`${format(amount)} copied`);
      });
    },
    [amount, toast, format],
  );

  return (
    <span
      className="inline-flex flex-col items-end font-mono tabular-nums font-medium text-sm leading-tight cursor-copy"
      style={{ fontVariantNumeric: 'tabular-nums' }}
      onClick={handleCopy}
      title={isInflated ? `Inflated value (raw: ${format(amount)}) — click to copy raw` : 'Click to copy'}
    >
      <span
        className="hover:text-black transition-colors duration-150"
        style={{ color: isInflated ? '#d97706' : undefined }}
      >
        {isInflated && <span className="mr-0.5 opacity-70">~</span>}
        <span className={isInflated ? '' : 'text-slate-900'}>{format(displayAmount)}</span>
      </span>
    </span>
  );
}
