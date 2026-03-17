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
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CostItem, CostDriver, ProjectPhase } from '../../types/budget';
import { COST_DRIVER_LABELS, PHASE_LABELS } from '../../types/budget';
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

const COST_DRIVERS: CostDriver[] = [
  'product',
  'process',
  'new_req_assembly',
  'new_req_testing',
  'initial_setup',
];

const PHASES: ProjectPhase[] = ['phase_1', 'phase_2', 'phase_3', 'phase_4'];

const DRIVER_COLORS: Record<CostDriver, string> = {
  product:          '#6366f1', // indigo
  process:          '#0ea5e9', // sky
  new_req_assembly: '#10b981', // emerald
  new_req_testing:  '#f59e0b', // amber
  initial_setup:    '#ef4444', // red
};

const PHASE_COLORS: Record<ProjectPhase, string> = {
  phase_1: '#6366f1',
  phase_2: '#0ea5e9',
  phase_3: '#10b981',
  phase_4: '#f59e0b',
};

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

const ZERO_DRIVERS: Record<CostDriver, number> = {
  product: 0, process: 0, new_req_assembly: 0, new_req_testing: 0, initial_setup: 0,
};

const ZERO_PHASES: Record<ProjectPhase, number> = {
  phase_1: 0, phase_2: 0, phase_3: 0, phase_4: 0,
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

function currentYearMonth(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${mm}`;
}

function remainingCardColors(remaining: number, budget: number) {
  if (budget <= 0 || remaining < 0) {
    return {
      bg: 'bg-red-50', border: 'border-red-200', blob: 'bg-red-400',
      label: 'text-red-500', value: 'text-red-700',
      iconBg: 'bg-red-100', iconColor: 'text-red-500',
    };
  }
  const p = (remaining / budget) * 100;
  if (p > 20) {
    return {
      bg: 'bg-emerald-50', border: 'border-emerald-200', blob: 'bg-emerald-400',
      label: 'text-emerald-600', value: 'text-emerald-700',
      iconBg: 'bg-emerald-100', iconColor: 'text-emerald-500',
    };
  }
  if (p >= 5) {
    return {
      bg: 'bg-amber-50', border: 'border-amber-200', blob: 'bg-amber-400',
      label: 'text-amber-600', value: 'text-amber-700',
      iconBg: 'bg-amber-100', iconColor: 'text-amber-500',
    };
  }
  return {
    bg: 'bg-red-50', border: 'border-red-200', blob: 'bg-red-400',
    label: 'text-red-500', value: 'text-red-700',
    iconBg: 'bg-red-100', iconColor: 'text-red-500',
  };
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KPICardColors {
  bg: string; border: string; blob: string;
  label: string; value: string; iconBg: string; iconColor: string;
}

interface KPICardProps {
  label: string;
  value: string;
  subLabel?: string;
  colors: KPICardColors;
  icon: React.ReactNode;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, subLabel, colors, icon }) => (
  <div className={`flex-1 min-w-0 rounded-2xl border p-4 relative overflow-hidden ${colors.bg} ${colors.border}`}>
    <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 ${colors.blob}`} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${colors.label}`}>{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.iconBg}`}>{icon}</div>
      </div>
      <p className={`text-xl font-black font-mono tabular-nums leading-none ${colors.value}`}>{value}</p>
      {subLabel && <p className="text-[11px] text-gray-400 mt-1.5 truncate">{subLabel}</p>}
    </div>
  </div>
);

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
    if (subdivisionMode === 'cost_driver') return COST_DRIVER_LABELS[dataKey as CostDriver] ?? dataKey;
    if (subdivisionMode === 'phase') return PHASE_LABELS[dataKey as ProjectPhase] ?? dataKey;
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

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const IconBudget = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5 5.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconSpent = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPending = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const IconCoC = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 12 L5 7 L8 9 L11 4 L14 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 4 L14 4 L14 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconRemaining = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M3.5 5A6 6 0 1 0 8 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const BudgetDashboard: React.FC<BudgetDashboardProps> = ({
  budget,
  committed,
  forecast,
  remaining,
  itemCount,
  items,
  hasItemLevelFilters = false,
}) => {
  const format = useAmountFormatter();
  const [subdivisionMode, setSubdivisionMode] = useState<SubdivisionMode>('total');

  // spent = committed (approved items sum)
  const spent = committed;
  // pending = forecast - spent (floating Forecast bar height)
  const pending = Math.max(0, forecast - spent);

  // ---------------------------------------------------------------------------
  // Paid-out sub-category
  // ---------------------------------------------------------------------------

  const currentYM = useMemo(() => currentYearMonth(), []);

  const paidOut = useMemo(
    () =>
      items
        .filter((i) => i.approval_status === 'approved' && i.expected_cash_out <= currentYM)
        .reduce((s, i) => s + i.current_amount, 0),
    [items, currentYM],
  );

  const approvedFuture = useMemo(() => Math.max(0, spent - paidOut), [spent, paidOut]);

  // ---------------------------------------------------------------------------
  // Per-driver breakdowns (for subdivision modes)
  // ---------------------------------------------------------------------------

  const spentByDriver = useMemo((): Record<CostDriver, number> => {
    const result = { ...ZERO_DRIVERS };
    for (const item of items) {
      if (item.approval_status === 'approved') {
        result[item.cost_driver] = (result[item.cost_driver] ?? 0) + item.current_amount;
      }
    }
    return result;
  }, [items]);

  const pendingByDriver = useMemo((): Record<CostDriver, number> => {
    const result = { ...ZERO_DRIVERS };
    for (const item of items) {
      if (item.approval_status !== 'approved' && item.approval_status !== 'rejected' && item.approval_status !== 'obsolete') {
        result[item.cost_driver] = (result[item.cost_driver] ?? 0) + item.current_amount;
      }
    }
    return result;
  }, [items]);

  const spentByPhase = useMemo((): Record<ProjectPhase, number> => {
    const result = { ...ZERO_PHASES };
    for (const item of items) {
      if (item.approval_status === 'approved') {
        result[item.project_phase] = (result[item.project_phase] ?? 0) + item.current_amount;
      }
    }
    return result;
  }, [items]);

  const pendingByPhase = useMemo((): Record<ProjectPhase, number> => {
    const result = { ...ZERO_PHASES };
    for (const item of items) {
      if (item.approval_status !== 'approved' && item.approval_status !== 'rejected' && item.approval_status !== 'obsolete') {
        result[item.project_phase] = (result[item.project_phase] ?? 0) + item.current_amount;
      }
    }
    return result;
  }, [items]);

  // ---------------------------------------------------------------------------
  // Chart data shape — same 4-bar waterfall, bars split internally
  // ---------------------------------------------------------------------------

  // CoC split: portion within budget vs portion over budget
  const cocWithinBudget = Math.min(forecast, budget);
  const cocOverBudget = Math.max(0, forecast - budget);

  type WaterfallRow = {
    label: string;
    spacer: number;
    bar: number;
    barOver: number; // red portion above budget (only for CoC)
    anchor: number;
  } & Record<CostDriver, number> & Record<ProjectPhase, number>;

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

  // KPI derived
  const spentPct = forecast > 0 ? `${Math.round((spent / forecast) * 100)}% of CoC` : undefined;
  const pendingPct = forecast > 0 ? `${Math.round((pending / forecast) * 100)}% of CoC` : undefined;
  const remainingColors = remainingCardColors(remaining, budget);
  const remainingPct = budget > 0 ? `${Math.round((remaining / budget) * 100)}% of Budget` : undefined;
  const paidSubLabel = paidOut > 0 ? `${format(paidOut)} paid · ${format(approvedFuture)} committed` : undefined;

  // Budget vs CoC indicator
  const delta = forecast - budget;
  const deltaPercent = budget > 0 ? ((delta / budget) * 100).toFixed(1) : '0';
  const isOverBudget = delta > 0;
  const cocBarWidth = budget > 0 ? Math.min(100, (forecast / Math.max(budget, forecast)) * 100) : 0;

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
              name={COST_DRIVER_LABELS[driver]}
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
            name={PHASE_LABELS[phase]}
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
            <LegendDot key={d} color={DRIVER_COLORS[d]} label={COST_DRIVER_LABELS[d]} />
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        <LegendDot color={ANCHOR_BAR_COLOR['Budget']} label="Budget / CoC" />
        {PHASES.map((p) => (
          <LegendDot key={p} color={PHASE_COLORS[p]} label={PHASE_LABELS[p]} />
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
                          ? 'bg-white text-indigo-700 shadow-sm'
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
