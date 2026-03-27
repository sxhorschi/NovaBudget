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
  /** Sum of all DELIVERED items. */
  spent?: number;
  remaining: number;
  /** Available budget years for the year selector. */
  availableYears?: number[];
  /** Currently selected year (null = all years). */
  selectedYear?: number | null;
  /** Callback when the user picks a year (null = all). */
  onYearChange?: (year: number | null) => void;
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
  spent = 0,
  remaining,
  availableYears,
  selectedYear,
  onYearChange,
}) => {
  const remColor = remainingColor(remaining, budget);
  const format = useAmountFormatter();

  const showYearSelector = availableYears && availableYears.length > 0 && onYearChange;

  return (
    <div className="bg-white/80 border-t border-gray-100 px-6 py-3">
      {showYearSelector && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Year</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onYearChange(null)}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                selectedYear === null || selectedYear === undefined
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => onYearChange(yr)}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                  selectedYear === yr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-start gap-6">
        {/* Budget */}
        <KPICard
          label="Budget"
          value={format(budget)}
          textColor="text-black"
          barValue={budget}
          barMax={budget}
          barColor="indigo"
          tooltip="Total approved budget of all visible functional areas, incl. target adjustments"
        />

        {/* Committed */}
        <KPICard
          label="Committed"
          value={format(committed)}
          textColor="text-green-700"
          barValue={committed}
          barMax={budget || 1}
          barColor="green"
          tooltip="Sum of all approved cost items"
        />

        {/* Spent */}
        <KPICard
          label="Spent"
          value={format(spent)}
          textColor="text-emerald-700"
          barValue={spent}
          barMax={budget || 1}
          barColor="green"
          tooltip="Sum of all delivered items (status: Delivered)"
        />

        {/* Forecast */}
        <KPICard
          label="Forecast"
          value={format(forecast)}
          textColor="text-orange-700"
          barValue={forecast}
          barMax={budget || 1}
          barColor="yellow"
          tooltip="Expected total costs: all items not rejected or obsolete"
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
          tooltip="Remaining budget = Budget - Forecast"
        />
      </div>
    </div>
  );
};

export default SummaryStrip;
