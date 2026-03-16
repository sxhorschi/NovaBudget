import React from 'react';
import ProgressMicro from './ProgressMicro';
import HelpTooltip from '../help/HelpTooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummaryStripProps {
  budget: number;
  committed: number;
  remaining: number;
  delta: number;
  itemCount: number;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function formatEur(value: number): string {
  return eurFormatter.format(value);
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function remainingColor(remaining: number, budget: number): 'green' | 'yellow' | 'red' {
  if (budget <= 0) return 'red';
  const pct = (remaining / budget) * 100;
  if (pct > 20) return 'green';
  if (pct >= 5) return 'yellow';
  return 'red';
}

function deltaTextColor(delta: number): string {
  if (delta > 0) return 'text-green-700';
  if (delta < 0) return 'text-red-700';
  return 'text-gray-700';
}

function deltaBarColor(delta: number): 'green' | 'red' | 'indigo' {
  if (delta > 0) return 'green';
  if (delta < 0) return 'red';
  return 'indigo';
}

// ---------------------------------------------------------------------------
// KPI Card (internal)
// ---------------------------------------------------------------------------

interface KPICardProps {
  label: string;
  value: string;
  textColor: string;
  barValue: number;
  barMax: number;
  barColor: 'green' | 'yellow' | 'red' | 'indigo';
  tooltip?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  textColor,
  barValue,
  barMax,
  barColor,
  tooltip,
}) => (
  <div className="flex flex-col gap-1 min-w-0 flex-1">
    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider inline-flex items-center gap-1">
      {label}
      {tooltip && <HelpTooltip text={tooltip} />}
    </span>
    <span className={`text-lg font-bold font-mono tabular-nums truncate ${textColor}`}>
      {value}
    </span>
    <ProgressMicro value={barValue} max={barMax} color={barColor} />
  </div>
);

// ---------------------------------------------------------------------------
// SummaryStrip
// ---------------------------------------------------------------------------

const SummaryStrip: React.FC<SummaryStripProps> = ({
  budget,
  committed,
  remaining,
  delta,
  itemCount,
}) => {
  const remColor = remainingColor(remaining, budget);

  return (
    <div className="bg-white/80 border-t border-gray-100 px-6 py-3">
      <div className="flex items-start gap-6">
        {/* Budget */}
        <KPICard
          label="Budget"
          value={formatEur(budget)}
          textColor="text-indigo-700"
          barValue={budget}
          barMax={budget}
          barColor="indigo"
          tooltip="Genehmigte Gesamtmittel aller Abteilungen"
        />

        {/* Committed */}
        <KPICard
          label="Committed"
          value={formatEur(committed)}
          textColor="text-orange-700"
          barValue={committed}
          barMax={budget}
          barColor="yellow"
          tooltip="Summe aller aktuellen Kostenpositionen"
        />

        {/* Remaining */}
        <KPICard
          label="Remaining"
          value={formatEur(remaining)}
          textColor={
            remColor === 'green'
              ? 'text-green-700'
              : remColor === 'yellow'
                ? 'text-yellow-700'
                : 'text-red-700'
          }
          barValue={remaining}
          barMax={budget}
          barColor={remColor}
          tooltip="Verbleibendes Budget = Budget - Committed"
        />

        {/* Delta */}
        <KPICard
          label="Delta"
          value={`${delta >= 0 ? '+' : ''}${formatEur(delta)}`}
          textColor={deltaTextColor(delta)}
          barValue={Math.abs(delta)}
          barMax={budget || 1}
          barColor={deltaBarColor(delta)}
          tooltip="Kostenveränderung = Original - Aktuell. Negativ = Mehrkosten"
        />

        {/* Items */}
        <KPICard
          label="Positionen"
          value={String(itemCount)}
          textColor="text-gray-700"
          barValue={itemCount}
          barMax={Math.max(itemCount, 1)}
          barColor="indigo"
        />
      </div>
    </div>
  );
};

export default SummaryStrip;
