import React from 'react';
import ProgressMicro from './ProgressMicro';
import HelpTooltip from '../help/HelpTooltip';
import { useAmountFormatter } from '../costbook/AmountCell';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummaryStripProps {
  budget: number;
  committed: number;
  forecast: number;
  remaining: number;
  itemCount: number;
}

// ---------------------------------------------------------------------------
// Formatters (now handled by useAmountFormatter hook)
// ---------------------------------------------------------------------------

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
  forecast,
  remaining,
  itemCount,
}) => {
  const remColor = remainingColor(remaining, budget);
  const format = useAmountFormatter();

  return (
    <div className="bg-white/80 border-t border-gray-100 px-6 py-3">
      <div className="flex items-start gap-6">
        {/* Budget */}
        <KPICard
          label="Budget"
          value={format(budget)}
          textColor="text-indigo-700"
          barValue={budget}
          barMax={budget}
          barColor="indigo"
          tooltip="Genehmigtes Gesamtbudget aller sichtbaren Abteilungen, inkl. Zielanpassungen"
        />

        {/* Committed */}
        <KPICard
          label="Committed"
          value={format(committed)}
          textColor="text-green-700"
          barValue={committed}
          barMax={budget || 1}
          barColor="green"
          tooltip="Summe aller freigegebenen (approved) Kostenpositionen"
        />

        {/* Forecast */}
        <KPICard
          label="Forecast"
          value={format(forecast)}
          textColor="text-orange-700"
          barValue={forecast}
          barMax={budget || 1}
          barColor="yellow"
          tooltip="Erwartete Gesamtkosten: alle Positionen die nicht abgelehnt oder obsolet sind"
        />

        {/* Remaining */}
        <KPICard
          label="Remaining"
          value={format(remaining)}
          textColor={
            remColor === 'green'
              ? 'text-green-700'
              : remColor === 'yellow'
                ? 'text-yellow-700'
                : 'text-red-700'
          }
          barValue={Math.max(remaining, 0)}
          barMax={budget || 1}
          barColor={remColor}
          tooltip="Verbleibendes Budget = Budget - Forecast"
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
