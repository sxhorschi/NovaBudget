import React, { useMemo, useState } from 'react';
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
import { useConfig, getLabel } from '../../context/ConfigContext';
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

type SubdivisionMode = 'total' | 'cost_driver' | 'phase';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Color palettes for dynamic config lists
const SUBDIVISION_PALETTE = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
];

function buildColorMap(ids: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  ids.forEach((id, i) => {
    map[id] = SUBDIVISION_PALETTE[i % SUBDIVISION_PALETTE.length];
  });
  return map;
}

function buildZeroMap(ids: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const id of ids) map[id] = 0;
  return map;
}

// Solid accent colors (for reference lines, chips, KPI cards)
const COLORS = {
  budget:  '#6366f1',
  spent:   '#059669',
  pending: '#f59e0b',
  coc:     '#7c3aed',
};

// Anchor (Budget / CoC) fill colors for subdivision mode
const ANCHOR_BAR_COLOR: Record<string, string> = {
  Budget: '#6366f1',
  CoC:    '#7c3aed',
};

// Total-mode single bar fill colors
const TOTAL_BAR_FILL: Record<string, string> = {
  Budget:   '#6366f1',
  Spent:    '#059669',
  Forecast: '#f59e0b',
  CoC:      '#7c3aed',
};


const SUBDIVISION_TABS: { id: SubdivisionMode; label: string }[] = [
  { id: 'total',       label: 'None'        },
  { id: 'cost_driver', label: 'Cost Driver' },
  { id: 'phase',       label: 'Phase'       },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function yTickFormat(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}


// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

// KPICard types and component removed — SummaryStrip handles KPIs now.

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface WaterfallTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string; color?: string }>;
  label?: string;
  budget: number;
  format: (v: number) => string;
  subdivisionMode: SubdivisionMode;
}

const WaterfallTooltip: React.FC<WaterfallTooltipProps> = ({
  active, payload, label, budget, format, subdivisionMode,
}) => {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p) => p.dataKey !== 'spacer' && p.value > 0);
  if (!visible.length) return null;
  const total = visible.reduce((s, p) => s + p.value, 0);
  const overBudget = label !== 'Budget' && budget > 0 && total > budget;

  const getSegmentLabel = (dataKey: string): string => {
    if (dataKey === 'anchor') return label === 'CoC' ? 'Cost at Completion' : 'Budget';
    if (dataKey === 'bar') return label ?? '';
    // dataKey is a config id — look it up via label fallback
    return dataKey;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 min-w-[180px]">
      <p className="text-xs font-semibold text-gray-700 mb-2 border-b border-gray-100 pb-1.5">{label}</p>
      {visible.map((entry) => {
        const pct = budget > 0 ? Math.round((entry.value / budget) * 100) : 0;
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            {subdivisionMode !== 'total' && entry.color && (
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
            )}
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

// Icons removed — were used by the old KPI cards.

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  budget,
  committed,
  forecast,
  remaining: _remaining,
  itemCount: _itemCount,
  items,
  hasItemLevelFilters = false,
}) => {
  const format = useAmountFormatter();
  const { config } = useConfig();
  const [subdivisionMode, setSubdivisionMode] = useState<SubdivisionMode>('total');

  // Build dynamic IDs, colors, and zero maps from config
  const COST_DRIVERS = useMemo(() => config.cost_drivers.map((d) => d.id), [config.cost_drivers]);
  const PHASES = useMemo(() => config.phases.map((p) => p.id), [config.phases]);
  const DRIVER_COLORS = useMemo(() => buildColorMap(COST_DRIVERS), [COST_DRIVERS]);
  const PHASE_COLORS = useMemo(() => buildColorMap(PHASES), [PHASES]);
  const ZERO_DRIVERS = useMemo(() => buildZeroMap(COST_DRIVERS), [COST_DRIVERS]);
  const ZERO_PHASES = useMemo(() => buildZeroMap(PHASES), [PHASES]);

  // spent = committed (approved items sum)
  const spent = committed;
  // pending = forecast - spent (floating Forecast bar height)
  const pending = Math.max(0, forecast - spent);

  // ---------------------------------------------------------------------------
  // Per-driver breakdowns (for subdivision modes)
  // ---------------------------------------------------------------------------

  const spentByDriver = useMemo((): Record<string, number> => {
    const result = { ...ZERO_DRIVERS };
    for (const item of items) {
      if (item.approval_status === 'approved') {
        result[item.cost_driver] = (result[item.cost_driver] ?? 0) + item.current_amount;
      }
    }
    return result;
  }, [items, ZERO_DRIVERS]);

  const pendingByDriver = useMemo((): Record<string, number> => {
    const result = { ...ZERO_DRIVERS };
    for (const item of items) {
      if (item.approval_status !== 'approved' && item.approval_status !== 'rejected' && item.approval_status !== 'obsolete') {
        result[item.cost_driver] = (result[item.cost_driver] ?? 0) + item.current_amount;
      }
    }
    return result;
  }, [items, ZERO_DRIVERS]);

  const spentByPhase = useMemo((): Record<string, number> => {
    const result = { ...ZERO_PHASES };
    for (const item of items) {
      if (item.approval_status === 'approved') {
        result[item.project_phase] = (result[item.project_phase] ?? 0) + item.current_amount;
      }
    }
    return result;
  }, [items, ZERO_PHASES]);

  const pendingByPhase = useMemo((): Record<string, number> => {
    const result = { ...ZERO_PHASES };
    for (const item of items) {
      if (item.approval_status !== 'approved' && item.approval_status !== 'rejected' && item.approval_status !== 'obsolete') {
        result[item.project_phase] = (result[item.project_phase] ?? 0) + item.current_amount;
      }
    }
    return result;
  }, [items, ZERO_PHASES]);

  // ---------------------------------------------------------------------------
  // Chart data shape — same 4-bar waterfall, bars split internally
  // ---------------------------------------------------------------------------

  // CoC split: portion within budget vs portion over budget
  const cocWithinBudget = Math.min(forecast, budget);
  const cocOverBudget = Math.max(0, forecast - budget);

  // WaterfallRow uses [key: string]: unknown to allow dynamic driver/phase keys
  // alongside the fixed string 'label' field.
  type WaterfallRow = {
    label: string;
    spacer: number;
    bar: number;
    barOver: number; // red portion above budget (only for CoC)
    anchor: number;
    [key: string]: string | number;
  };

  const chartData = useMemo((): WaterfallRow[] => {
    if (subdivisionMode === 'total') {
      return [
        { label: 'Budget',   spacer: 0,     bar: budget,           barOver: 0, anchor: 0, ...ZERO_DRIVERS, ...ZERO_PHASES },
        { label: 'Spent',    spacer: 0,     bar: spent,            barOver: 0, anchor: 0, ...ZERO_DRIVERS, ...ZERO_PHASES },
        { label: 'Forecast', spacer: spent, bar: pending,          barOver: 0, anchor: 0, ...ZERO_DRIVERS, ...ZERO_PHASES },
        { label: 'CoC',      spacer: 0,     bar: cocWithinBudget,  barOver: cocOverBudget, anchor: 0, ...ZERO_DRIVERS, ...ZERO_PHASES },
      ];
    }

    if (subdivisionMode === 'cost_driver') {
      return [
        { label: 'Budget',   spacer: 0,     bar: 0, barOver: 0, anchor: budget,            ...ZERO_DRIVERS, ...ZERO_PHASES },
        { label: 'Spent',    spacer: 0,     bar: 0, barOver: 0, anchor: 0,                  ...spentByDriver,   ...ZERO_PHASES },
        { label: 'Forecast', spacer: spent, bar: 0, barOver: 0, anchor: 0,                  ...pendingByDriver, ...ZERO_PHASES },
        { label: 'CoC',      spacer: 0,     bar: 0, barOver: cocOverBudget, anchor: cocWithinBudget,    ...ZERO_DRIVERS, ...ZERO_PHASES },
      ];
    }

    // phase
    return [
      { label: 'Budget',   spacer: 0,     bar: 0, barOver: 0, anchor: budget,           ...ZERO_DRIVERS, ...ZERO_PHASES },
      { label: 'Spent',    spacer: 0,     bar: 0, barOver: 0, anchor: 0,                 ...ZERO_DRIVERS, ...spentByPhase   },
      { label: 'Forecast', spacer: spent, bar: 0, barOver: 0, anchor: 0,                 ...ZERO_DRIVERS, ...pendingByPhase },
      { label: 'CoC',      spacer: 0,     bar: 0, barOver: cocOverBudget, anchor: cocWithinBudget,   ...ZERO_DRIVERS, ...ZERO_PHASES },
    ];
  }, [subdivisionMode, budget, spent, pending, forecast, cocWithinBudget, cocOverBudget, spentByDriver, pendingByDriver, spentByPhase, pendingByPhase]);

  // ---------------------------------------------------------------------------
  // Y-axis domain
  // ---------------------------------------------------------------------------

  const yMax = useMemo(() => {
    const topValue = Math.max(budget, forecast);
    return Math.ceil(topValue * 1.12);
  }, [budget, forecast]);

  // Key forces recharts remount + re-animation when mode changes
  const rcKey = `chart-${subdivisionMode}-${budget}-${forecast}-${items.length}`;

  const hasItems = items.length > 0;

  // ---------------------------------------------------------------------------
  // Render bars based on mode
  // ---------------------------------------------------------------------------

  const renderBars = () => {
    if (subdivisionMode === 'total') {
      return (
        <>
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
        </>
      );
    }

    if (subdivisionMode === 'cost_driver') {
      return (
        <>
          <Bar dataKey="spacer" stackId="a" fill="transparent" isAnimationActive={false} legendType="none" />
          <Bar
            dataKey="anchor"
            stackId="a"
            maxBarSize={72}
            radius={0}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={ANCHOR_BAR_COLOR[entry.label] ?? '#6366f1'} />
            ))}
          </Bar>
          {COST_DRIVERS.map((driver) => (
            <Bar
              key={driver}
              dataKey={driver}
              name={getLabel(config.cost_drivers, driver)}
              stackId="a"
              fill={DRIVER_COLORS[driver]}
              maxBarSize={72}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            />
          ))}
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
        </>
      );
    }

    // phase
    return (
      <>
        <Bar dataKey="spacer" stackId="a" fill="transparent" isAnimationActive={false} legendType="none" />
        <Bar
          dataKey="anchor"
          stackId="a"
          maxBarSize={72}
          radius={0}
          isAnimationActive
          animationDuration={700}
          animationEasing="ease-out"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={ANCHOR_BAR_COLOR[entry.label] ?? '#6366f1'} />
          ))}
        </Bar>
        {PHASES.map((phase) => (
          <Bar
            key={phase}
            dataKey={phase}
            name={getLabel(config.phases, phase)}
            stackId="a"
            fill={PHASE_COLORS[phase]}
            maxBarSize={72}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        ))}
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
      </>
    );
  };

  // ---------------------------------------------------------------------------
  // Legend for subdivision mode
  // ---------------------------------------------------------------------------

  const renderLegend = () => {
    if (subdivisionMode === 'total') {
      return (
        <div className="flex flex-wrap items-center gap-3 pt-0.5">
          <LegendDot color={COLORS.budget}  label="Budget" />
          <LegendDot color={COLORS.spent}   label="Spent" />
          <LegendDot color={COLORS.pending} label="Forecast (pending)" />
          <LegendDot color={COLORS.coc} label="Cost at Completion" />
          {forecast > budget && <LegendDot color="#dc2626" label="Over Budget" />}
        </div>
      );
    }
    if (subdivisionMode === 'cost_driver') {
      return (
        <div className="flex flex-wrap items-center gap-3 pt-0.5">
          <LegendDot color={ANCHOR_BAR_COLOR['Budget']} label="Budget / CoC" />
          {COST_DRIVERS.map((d) => (
            <LegendDot key={d} color={DRIVER_COLORS[d]} label={getLabel(config.cost_drivers, d)} />
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        <LegendDot color={ANCHOR_BAR_COLOR['Budget']} label="Budget / CoC" />
        {PHASES.map((p) => (
          <LegendDot key={p} color={PHASE_COLORS[p]} label={getLabel(config.phases, p)} />
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // KPI Cards + Budget indicator removed — SummaryStrip handles KPIs now.
  // This component only renders the waterfall chart.

  if (!hasItems || hasItemLevelFilters) return null;

  return (
    <div className="bg-white">
      <div className="space-y-3">
            {/* Chart */}
            <div className="relative border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 overflow-hidden">
              {/* Subtle dot-grid pattern */}
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="relative">
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
                          subdivisionMode={subdivisionMode}
                        />
                      )}
                      cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                    />
                    {renderBars()}
                    {/* Budget reference line — dashed horizontal line for comparison */}
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
              </div>
            </div>

            {/* Subdivision toggle + over-budget badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                  Subdivide bars by:
                </span>
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 gap-0.5">
                  {SUBDIVISION_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSubdivisionMode(tab.id)}
                      className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
                        subdivisionMode === tab.id
                          ? 'bg-white text-black shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {forecast > budget && budget > 0 && (
                <span className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                  Over budget by {format(forecast - budget)}
                </span>
              )}
            </div>

        {/* Legend */}
        {renderLegend()}
      </div>
    </div>
  );
};

export default BudgetDashboard;
