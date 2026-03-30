import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { CostItem } from '../../types/budget';
import { useAmountFormatter } from '../costbook/AmountCell';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetDashboardProps {
  budget: number;
  committed: number; // = spent
  forecast: number;  // = CoC
  remaining: number;
  itemCount: number;
  items: CostItem[];
  /** When true, item-level filters are active — budget/remaining/chart are not meaningful */
  hasItemLevelFilters?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Solid accent colors (for reference lines, legend)
const COLORS = {
  budget:  '#6366f1',
  spent:   '#059669',
  pending: '#f59e0b',
  coc:     '#7c3aed',
};

// Total-mode single bar fill colors
const TOTAL_BAR_FILL: Record<string, string> = {
  Budget:   '#6366f1',
  Spent:    '#059669',
  Forecast: '#f59e0b',
  CoC:      '#7c3aed',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function yTickFormat(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface WaterfallTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string; color?: string }>;
  label?: string;
  budget: number;
  format: (v: number) => string;
}

const WaterfallTooltip: React.FC<WaterfallTooltipProps> = ({
  active, payload, label, budget, format,
}) => {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p) => p.dataKey !== 'spacer' && p.value > 0);
  if (!visible.length) return null;
  const total = visible.reduce((s, p) => s + p.value, 0);
  const overBudget = label !== 'Budget' && budget > 0 && total > budget;

  const getSegmentLabel = (dataKey: string): string => {
    if (dataKey === 'bar') return label ?? '';
    return dataKey;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="text-xs font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1.5">{label}</p>
      {visible.map((entry) => {
        const pct = budget > 0 ? Math.round((entry.value / budget) * 100) : 0;
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="text-[11px] text-gray-500 flex-1">{getSegmentLabel(entry.dataKey)}</span>
            <span className="text-[11px] font-mono font-semibold text-gray-800">{format(entry.value)}</span>
            <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
          </div>
        );
      })}
      {visible.length > 1 && (
        <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-gray-100">
          <span className="text-[11px] text-gray-500 flex-1 font-medium">Total</span>
          <span className="text-[11px] font-mono font-bold text-gray-900">{format(total)}</span>
        </div>
      )}
      {overBudget && (
        <p className="text-[10px] font-medium text-red-600 mt-1.5 bg-red-50 rounded px-1.5 py-0.5">
          Over budget by {format(total - budget)}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Legend Dot
// ---------------------------------------------------------------------------

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-gray-500">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  budget,
  committed,
  forecast,
  items,
}) => {
  const format = useAmountFormatter();

  // spent = delivered items
  const spent = committed;
  // pending = forecast (open/in-progress items, already excludes delivered)
  const pending = forecast;

  // CoC (Cost at Completion) = spent + forecast
  const coc = spent + forecast;
  const cocWithinBudget = Math.min(coc, budget);
  const cocOverBudget = Math.max(0, coc - budget);

  type WaterfallRow = {
    label: string;
    spacer: number;
    bar: number;
    barOver: number;
  };

  const chartData = useMemo((): WaterfallRow[] => {
    return [
      { label: 'Budget',   spacer: 0,     bar: budget,          barOver: 0 },
      { label: 'Spent',    spacer: 0,     bar: spent,           barOver: 0 },
      { label: 'Forecast', spacer: spent, bar: pending,         barOver: 0 },
      { label: 'CoC',      spacer: 0,     bar: cocWithinBudget, barOver: cocOverBudget },
    ];
  }, [budget, spent, pending, cocWithinBudget, cocOverBudget]);

  // ---------------------------------------------------------------------------
  // Y-axis domain
  // ---------------------------------------------------------------------------

  const yMax = useMemo(() => {
    const topValue = Math.max(budget, coc);
    return Math.ceil(topValue * 1.12);
  }, [budget, coc]);

  // Key forces recharts remount + re-animation when data changes
  const rcKey = `chart-total-${budget}-${forecast}-${items.length}`;

  const hasItems = items.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!hasItems && budget <= 0) return null;

  return (
    <div className="relative border border-gray-100 rounded-lg bg-gradient-to-br from-gray-50 to-white p-4 overflow-hidden">
      {/* Subtle dot-grid pattern */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative space-y-3">
        {/* Chart */}
        <ResponsiveContainer key={rcKey} width="100%" height={200}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
            barCategoryGap="32%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.6}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={yTickFormat}
              tick={{ fontSize: 10, fill: '#cbd5e1' }}
              axisLine={false}
              tickLine={false}
              width={44}
              domain={[0, yMax]}
            />
            <Tooltip
              content={(props) => (
                <WaterfallTooltip
                  active={props.active}
                  payload={props.payload as unknown as WaterfallTooltipProps['payload']}
                  label={props.label as string}
                  budget={budget}
                  format={format}
                />
              )}
              cursor={{ fill: 'rgba(99,102,241,0.04)' }}
            />
            {/* Invisible spacer lifts the floating Forecast bar */}
            <Bar dataKey="spacer" stackId="a" fill="transparent" isAnimationActive={false} legendType="none" />
            {/* Visible bar — portion within budget */}
            <Bar
              dataKey="bar"
              name="Amount"
              stackId="a"
              maxBarSize={72}
              radius={0}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={TOTAL_BAR_FILL[entry.label] ?? '#94a3b8'} />
              ))}
            </Bar>
            {/* Red portion above budget (only visible on CoC bar when over budget) */}
            <Bar
              dataKey="barOver"
              name="Over Budget"
              stackId="a"
              maxBarSize={72}
              radius={0}
              fill="#dc2626"
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            />
            {/* Budget reference line */}
            {budget > 0 && (
              <ReferenceLine
                y={budget}
                stroke="#6366f1"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                strokeOpacity={0.6}
                label={{ value: 'Budget', position: 'right', fontSize: 10, fill: '#6366f1' }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>

        {/* Footer: legend left, over-budget badge right */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-3">
            <LegendDot color={COLORS.budget}  label="Budget" />
            <LegendDot color={COLORS.spent}   label="Spent" />
            <LegendDot color={COLORS.pending} label="Forecast (pending)" />
            <LegendDot color={COLORS.coc} label="Cost at Completion" />
            {coc > budget && <LegendDot color="#dc2626" label="Over Budget" />}
          </div>
          {coc > budget && budget > 0 && (
            <span className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5 shrink-0 ml-4">
              Over budget by {format(coc - budget)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetDashboard;
