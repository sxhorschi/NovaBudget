import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
} from 'recharts';
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowUpDown,
  BarChart3,
  FilterX,
} from 'lucide-react';
import HelpTooltip from '../components/help/HelpTooltip';
import EmptyState from '../components/common/EmptyState';
import type { CostItem, FunctionalArea } from '../types/budget';
import { STATUS_LABELS, STATUS_COLORS } from '../types/budget';
import { getFAColor } from '../styles/design-tokens';
import { formatEUR } from '../components/costbook/AmountCell';
import { useBudgetData } from '../context/BudgetDataContext';
import { useFilterState } from '../hooks/useFilterState';
import { useFilteredData } from '../hooks/useFilteredData';
import FilterBar from '../components/filter/FilterBar';
import SummaryStrip from '../components/summary/SummaryStrip';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

// Month label helpers (populated dynamically per visible date range)
function buildMonthMeta(months: string[]): {
  labels: Record<string, string>;
  shorts: Record<string, string>;
} {
  const shortFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
  const labels: Record<string, string> = {};
  const shorts: Record<string, string> = {};
  for (const key of months) {
    const [yearStr, monthStr] = key.split('-');
    const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    const short = shortFormatter.format(d);
    const yr = String(d.getFullYear()).slice(2);
    labels[key] = `${short} ${yr}`;
    shorts[key] = short;
  }
  return { labels, shorts };
}

// Committed statuses (approved or later in lifecycle, excluding delivered which is "spent")
const COMMITTED_STATUSES_FE = new Set<string>([
  'approved',
  'purchase_order_sent',
  'purchase_order_confirmed',
]);

// Quarters are computed dynamically from data (see useDynamicQuarters below).
// This constant is kept as a fallback type definition only.
type QuarterDef = { label: string; months: string[] };

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatEur(value: number): string {
  return formatEUR(value);
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return formatEUR(n);
}

// ---------------------------------------------------------------------------
// Sort types for detail table
// ---------------------------------------------------------------------------

type SortField = 'cashout' | 'functionalArea' | 'amount';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Heatmap color interpolation
// ---------------------------------------------------------------------------

function interpolateColor(t: number): string {
  // t in [0..1], 0 = white, 1 = indigo-600 (#4f46e5)
  // Linear interpolation in RGB space
  // white: 255, 255, 255
  // indigo-600: 79, 70, 229
  const r = Math.round(255 - t * (255 - 79));
  const g = Math.round(255 - t * (255 - 70));
  const b = Math.round(255 - t * (255 - 229));
  return `rgb(${r}, ${g}, ${b})`;
}

function heatmapTextColor(t: number): string {
  return t > 0.45 ? 'text-white' : 'text-gray-800';
}

// ---------------------------------------------------------------------------
// CashOutPage
// ---------------------------------------------------------------------------

const CashOutPage: React.FC = () => {
  const { functionalAreas, workAreas } = useBudgetData();
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilterState();
  const { filteredFunctionalAreas, filteredItems, summary } = useFilteredData(filters);
  const navigate = useNavigate();
  const { facilityId } = useParams<{ facilityId: string }>();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [sortField, setSortField] = useState<SortField>('cashout');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [legendFilter, setLegendFilter] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // ---- Available years from functional area yearly budgets ----
  const availableYears = useMemo((): number[] => {
    const yearSet = new Set<number>();
    for (const fa of functionalAreas) {
      for (const b of fa.budgets ?? []) {
        yearSet.add(b.year);
      }
    }
    return Array.from(yearSet).sort();
  }, [functionalAreas]);

  // ---- Items filtered by selected year (based on expected_cash_out year) ----
  const yearFilteredItems = useMemo(() => {
    if (selectedYear === null) return filteredItems;
    return filteredItems.filter((ci) => {
      if (!ci.expected_cash_out) return false;
      return Number(ci.expected_cash_out.slice(0, 4)) === selectedYear;
    });
  }, [filteredItems, selectedYear]);

  // ---- Dynamic MONTHS derived from actual expected_cash_out dates in data ----
  const dynamicMonths = useMemo((): string[] => {
    const now = new Date();
    const currentYear = selectedYear ?? now.getFullYear();

    // Collect all months that appear in data
    const monthSet = new Set<string>();

    // Always include current year's months as a baseline
    for (let m = 0; m < 12; m++) {
      const d = new Date(currentYear, m, 1);
      monthSet.add(d.toISOString().slice(0, 7));
    }

    // Add months from actual item data
    for (const ci of filteredItems) {
      if (ci.expected_cash_out) {
        const monthKey = ci.expected_cash_out.slice(0, 7);
        // Only include months in the selected year if a year is selected
        if (selectedYear !== null) {
          if (Number(monthKey.slice(0, 4)) === selectedYear) {
            monthSet.add(monthKey);
          }
        } else {
          monthSet.add(monthKey);
        }
      }
    }

    return Array.from(monthSet).sort();
  }, [filteredItems, selectedYear]);

  // ---- Month label maps derived from dynamic months ----
  const { labels: MONTH_LABELS, shorts: MONTH_SHORT } = useMemo(
    () => buildMonthMeta(dynamicMonths),
    [dynamicMonths],
  );

  // ---- Budget reference lines per year ----
  // Shows the total yearly budget as a horizontal ReferenceLine on the chart.
  // We compute total budget per year across all visible functional areas.
  const budgetByYear = useMemo((): Record<number, number> => {
    const totals: Record<number, number> = {};
    for (const fa of filteredFunctionalAreas) {
      for (const b of fa.budgets ?? []) {
        totals[b.year] = (totals[b.year] ?? 0) + b.amount;
      }
    }
    return totals;
  }, [filteredFunctionalAreas]);

  // ---- Helper: work area IDs for a functional area ----
  const faWaIds = useCallback(
    (faId: string): Set<string> => {
      return new Set(
        workAreas
          .filter((wa) => wa.functional_area_id === faId)
          .map((wa) => wa.id),
      );
    },
    [workAreas],
  );

  // ---- Dynamic quarters computed from dynamic months ----
  const dynamicQuarters = useMemo((): QuarterDef[] => {
    if (dynamicMonths.length === 0) return [];

    // Group dynamicMonths into calendar quarters
    const quarterMap = new Map<string, string[]>();
    for (const m of dynamicMonths) {
      const [yearStr, monthStr] = m.split('-');
      const monthNum = Number(monthStr);
      const calQ = Math.ceil(monthNum / 3);
      const key = `Q${calQ} ${yearStr}`;
      if (!quarterMap.has(key)) quarterMap.set(key, []);
      quarterMap.get(key)!.push(m);
    }

    return Array.from(quarterMap.entries()).map(([label, months]) => ({ label, months }));
  }, [dynamicMonths]);

  // ---- Chart data: stacked area per functional area, three series ----
  const chartData = useMemo(() => {
    return dynamicMonths.map((month) => {
      const entry: Record<string, number | string> = {
        month,
        label: MONTH_LABELS[month] ?? month,
      };
      let forecastTotal = 0;
      let committedTotal = 0;
      let spentTotal = 0;

      filteredFunctionalAreas.forEach((fa) => {
        const waIds = faWaIds(fa.id);

        // Forecast: items not rejected/obsolete/delivered (not yet spent)
        const forecastAmount = yearFilteredItems
          .filter(
            (ci) =>
              waIds.has(ci.work_area_id) &&
              ci.expected_cash_out === month &&
              ci.approval_status !== 'rejected' &&
              ci.approval_status !== 'obsolete' &&
              ci.approval_status !== 'delivered',
          )
          .reduce((sum, ci) => sum + ci.total_amount, 0);

        // Committed: approved, purchase_order_sent, purchase_order_confirmed
        // (delivered is excluded here — it's counted as "spent")
        const committedAmount = yearFilteredItems
          .filter(
            (ci) =>
              waIds.has(ci.work_area_id) &&
              ci.expected_cash_out === month &&
              COMMITTED_STATUSES_FE.has(ci.approval_status),
          )
          .reduce((sum, ci) => sum + ci.total_amount, 0);

        // Spent: delivered items only
        const spentAmount = yearFilteredItems
          .filter(
            (ci) =>
              waIds.has(ci.work_area_id) &&
              ci.expected_cash_out === month &&
              ci.approval_status === 'delivered',
          )
          .reduce((sum, ci) => sum + ci.total_amount, 0);

        entry[`fa_${fa.id}`] = forecastAmount;
        entry[`committed_fa_${fa.id}`] = committedAmount;
        entry[`spent_fa_${fa.id}`] = spentAmount;
        forecastTotal += forecastAmount;
        committedTotal += committedAmount;
        spentTotal += spentAmount;
      });

      entry.total = forecastTotal;
      entry.committed_total = committedTotal;
      entry.spent_total = spentTotal;
      return entry;
    });
  }, [dynamicMonths, MONTH_LABELS, filteredFunctionalAreas, yearFilteredItems, faWaIds]);

  // ---- Heatmap table data ----
  const tableData = useMemo(() => {
    return filteredFunctionalAreas.map((fa) => {
      const waIds = faWaIds(fa.id);

      const row: Record<string, number> = {};
      let rowTotal = 0;

      dynamicMonths.forEach((month) => {
        const amount = yearFilteredItems
          .filter((ci) => waIds.has(ci.work_area_id) && ci.expected_cash_out === month)
          .reduce((sum, ci) => sum + ci.total_amount, 0);
        row[month] = amount;
        rowTotal += amount;
      });

      row.__total = rowTotal;
      return { functionalArea: fa, months: row };
    });
  }, [filteredFunctionalAreas, yearFilteredItems, faWaIds, dynamicMonths]);

  // ---- Column totals ----
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    dynamicMonths.forEach((month) => {
      totals[month] = tableData.reduce((sum, row) => sum + (row.months[month] || 0), 0);
    });
    totals.__total = tableData.reduce((sum, row) => sum + row.months.__total, 0);
    return totals;
  }, [tableData, dynamicMonths]);

  // ---- Max cell value for heatmap ----
  const maxCellValue = useMemo(() => {
    let max = 0;
    tableData.forEach((row) => {
      dynamicMonths.forEach((month) => {
        if (row.months[month] > max) max = row.months[month];
      });
    });
    return max;
  }, [tableData, dynamicMonths]);

  // ---- Quarterly sums (dynamic) ----
  const quarterlySums = useMemo(() => {
    return dynamicQuarters.map((q) => {
      const total = q.months.reduce((sum, m) => sum + (columnTotals[m] || 0), 0);
      const pct = columnTotals.__total > 0
        ? Math.round((total / columnTotals.__total) * 100)
        : 0;
      return { ...q, total, pct };
    });
  }, [dynamicQuarters, columnTotals]);

  // ---- Peak month ----
  const peakMonth = useMemo(() => {
    let maxMonth = dynamicMonths[0] ?? CURRENT_MONTH;
    let maxVal = 0;
    dynamicMonths.forEach((m) => {
      const val = columnTotals[m] || 0;
      if (val > maxVal) {
        maxVal = val;
        maxMonth = m;
      }
    });
    return { month: maxMonth, label: MONTH_LABELS[maxMonth] ?? maxMonth, value: maxVal };
  }, [columnTotals, dynamicMonths, MONTH_LABELS]);

  // ---- Next 3 months with functional area breakdown ----
  const upcomingMonths = useMemo(() => {
    const currentMonthIndex = dynamicMonths.indexOf(CURRENT_MONTH);
    const startIdx = currentMonthIndex >= 0 ? currentMonthIndex : 0;
    const upcoming = dynamicMonths.slice(startIdx, startIdx + 3);
    return upcoming.map((m) => {
      const total = columnTotals[m] || 0;
      const items = yearFilteredItems.filter((ci) => ci.expected_cash_out === m);

      // Functional area breakdown
      const faBreakdown: { fa: FunctionalArea; amount: number }[] = [];
      filteredFunctionalAreas.forEach((fa) => {
        const waIds = faWaIds(fa.id);
        const amount = items
          .filter((ci) => waIds.has(ci.work_area_id))
          .reduce((s, ci) => s + ci.total_amount, 0);
        if (amount > 0) {
          faBreakdown.push({ fa, amount });
        }
      });
      faBreakdown.sort((a, b) => b.amount - a.amount);

      return {
        month: m,
        label: MONTH_LABELS[m] ?? m,
        total,
        itemCount: items.length,
        faBreakdown,
      };
    });
  }, [columnTotals, yearFilteredItems, filteredFunctionalAreas, faWaIds, dynamicMonths, MONTH_LABELS]);

  // ---- Burndown data ----
  const burndownData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    yearFilteredItems.forEach((item) => {
      const m = item.expected_cash_out;
      if (m) {
        byMonth[m] = (byMonth[m] || 0) + item.total_amount;
      }
    });

    const months = Object.keys(byMonth).sort();
    if (months.length === 0) return [];

    let cumulativePlanned = 0;
    let cumulativeActual = 0;

    return months.map((m) => {
      const monthAmount = byMonth[m] || 0;
      cumulativePlanned += monthAmount;
      cumulativeActual += monthAmount;
      return {
        month: m,
        label: MONTH_SHORT[m] ?? m,
        planned: cumulativePlanned,
        actual: cumulativeActual,
        remaining: summary.budget - cumulativePlanned,
      };
    });
  }, [yearFilteredItems, summary.budget, MONTH_SHORT]);

  // ---- Detail items sorted ----
  const detailItems = useMemo(() => {
    const items = [...yearFilteredItems];

    const getFANameForItem = (item: CostItem): string => {
      const wa = workAreas.find((w) => w.id === item.work_area_id);
      if (!wa) return '';
      const fa = functionalAreas.find((d) => d.id === wa.functional_area_id);
      return fa?.name ?? '';
    };

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'cashout':
          cmp = a.expected_cash_out.localeCompare(b.expected_cash_out);
          break;
        case 'functionalArea':
          cmp = getFANameForItem(a).localeCompare(getFANameForItem(b));
          break;
        case 'amount':
          cmp = a.total_amount - b.total_amount;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [yearFilteredItems, sortField, sortDir, workAreas, functionalAreas]);

  // ---- Functional area lookup helpers ----
  function getFAForItem(item: CostItem): FunctionalArea | undefined {
    const wa = workAreas.find((w) => w.id === item.work_area_id);
    if (!wa) return undefined;
    return functionalAreas.find((d) => d.id === wa.functional_area_id);
  }

  function getFAName(item: CostItem): string {
    return getFAForItem(item)?.name ?? '-';
  }

  function getItemFAColor(item: CostItem): string {
    const fa = getFAForItem(item);
    return fa ? getFAColor(fa.id) : '#64748b';
  }

  // ---- Sort toggle ----
  function toggleSort(field: SortField): void {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function sortIcon(field: SortField): React.ReactNode {
    const active = sortField === field;
    return (
      <ArrowUpDown
        className={`inline w-3 h-3 ml-1 ${active ? 'text-black' : 'text-gray-400'}`}
      />
    );
  }

  // ---- Navigate to costbook with filters ----
  function navigateToCostbook(faId: string, _month: string): void {
    const params = new URLSearchParams();
    params.set('fa', String(faId));
    navigate(`/f/${facilityId}/costbook?${params.toString()}`);
  }

  // ---- Legend click handler ----
  function handleLegendClick(faId: string): void {
    setLegendFilter((prev) => (prev === faId ? null : faId));
  }

  return (
    <>
      {/* ================================================================ */}
      {/* 1. FilterBar + SummaryStrip (sticky container)                   */}
      {/* ================================================================ */}
      <div className="bg-white border-b border-gray-200">
        <FilterBar
          filters={filters}
          onFilterChange={setFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          filteredCount={summary.itemCount}
          totalCount={summary.totalItemCount}
        />
        <SummaryStrip
          budget={summary.budget}
          committed={summary.committed}
          forecast={summary.forecast}
          spent={summary.spent}
          remaining={summary.remaining}
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </div>

      <div className="px-6 pt-4 pb-8 space-y-6">
        {/* ================================================================ */}
        {/* Empty State                                                       */}
        {/* ================================================================ */}
        {filteredItems.length === 0 && (
          <EmptyState
            icon={BarChart3}
            title="No cash-out data available"
            description="No cost items found for the current filter selection. Adjust or reset the filters."
            action={
              hasActiveFilters
                ? { label: 'Reset filters', onClick: resetFilters }
                : undefined
            }
          />
        )}

        {/* ================================================================ */}
        {/* 2. Hero: Cash-Out Timeline (stacked area)                        */}
        {/* ================================================================ */}
        {filteredItems.length > 0 && (
          <section>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Cash-Out Timeline</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Monthly cash-out by functional area —{' '}
                    {dynamicMonths.length > 0
                      ? `${MONTH_LABELS[dynamicMonths[0]] ?? dynamicMonths[0]} to ${MONTH_LABELS[dynamicMonths[dynamicMonths.length - 1]] ?? dynamicMonths[dynamicMonths.length - 1]}`
                      : 'no data'}
                    {selectedYear !== null && ` · ${selectedYear}`}
                  </p>
                </div>
                {/* Clickable legend */}
                <div className="flex flex-wrap items-center gap-3">
                  {filteredFunctionalAreas.map((fa) => {
                    const isActive = legendFilter === null || legendFilter === fa.id;
                    return (
                      <button
                        key={fa.id}
                        type="button"
                        onClick={() => handleLegendClick(fa.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-200 ${
                          isActive
                            ? 'opacity-100 bg-gray-50 hover:bg-gray-100'
                            : 'opacity-40 hover:opacity-70'
                        }`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getFAColor(fa.id) }}
                        />
                        <span className="text-gray-700 font-medium">{fa.name}</span>
                      </button>
                    );
                  })}
                  {legendFilter !== null && (
                    <button
                      type="button"
                      onClick={() => setLegendFilter(null)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <FilterX className="w-3 h-3" />
                      All
                    </button>
                  )}
                </div>
              </div>

              <div className="px-2">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <defs>
                      {filteredFunctionalAreas.map((fa) => (
                        <linearGradient
                          key={fa.id}
                          id={`grad_fa_${fa.id}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={getFAColor(fa.id)}
                            stopOpacity={0.6}
                          />
                          <stop
                            offset="100%"
                            stopColor={getFAColor(fa.id)}
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickFormatter={(v: number) => fmtCompact(v)}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        // Separate FA areas from aggregate lines
                        const faPayload = payload.filter((p) => {
                          const dk = String(p.dataKey);
                          if (!dk.startsWith('fa_')) return false;
                          if (legendFilter === null) return true;
                          return dk === `fa_${legendFilter}`;
                        });
                        const committedEntry = payload.find((p) => p.dataKey === 'committed_total');
                        const spentEntry = payload.find((p) => p.dataKey === 'spent_total');
                        const forecastTotal = faPayload.reduce(
                          (s, p) => s + (typeof p.value === 'number' ? p.value : 0),
                          0,
                        );
                        return (
                          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 text-sm">
                            <p className="font-semibold text-gray-900 mb-1.5">{label}</p>
                            {faPayload
                              .filter((p) => typeof p.value === 'number' && p.value > 0)
                              .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                              .map((p) => {
                                const fa = filteredFunctionalAreas.find(
                                  (d) => `fa_${d.id}` === p.dataKey,
                                );
                                return (
                                  <div
                                    key={String(p.dataKey)}
                                    className="flex items-center justify-between gap-6"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: String(p.color) }}
                                      />
                                      <span className="text-gray-600">
                                        {fa?.name ?? String(p.dataKey)}
                                      </span>
                                    </div>
                                    <span className="font-medium tabular-nums text-gray-900">
                                      {formatEur(Number(p.value))}
                                    </span>
                                  </div>
                                );
                              })}
                            <div className="border-t border-gray-200 mt-1.5 pt-1.5 flex justify-between font-semibold text-gray-900">
                              <span>Forecast</span>
                              <span className="tabular-nums">{formatEur(forecastTotal)}</span>
                            </div>
                            {committedEntry && Number(committedEntry.value) > 0 && (
                              <div className="flex justify-between text-xs text-emerald-700 mt-0.5">
                                <span>Committed</span>
                                <span className="tabular-nums">{formatEur(Number(committedEntry.value))}</span>
                              </div>
                            )}
                            {spentEntry && Number(spentEntry.value) > 0 && (
                              <div className="flex justify-between text-xs text-indigo-600 mt-0.5">
                                <span>Spent (Delivered)</span>
                                <span className="tabular-nums">{formatEur(Number(spentEntry.value))}</span>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    {filteredFunctionalAreas.map((fa) => {
                      const isVisible = legendFilter === null || legendFilter === fa.id;
                      return (
                        <Area
                          key={fa.id}
                          type="monotone"
                          dataKey={`fa_${fa.id}`}
                          stackId="cashout"
                          stroke={isVisible ? (getFAColor(fa.id)) : 'transparent'}
                          strokeWidth={isVisible ? 1.5 : 0}
                          fill={isVisible ? `url(#grad_fa_${fa.id})` : 'transparent'}
                          fillOpacity={isVisible ? 1 : 0}
                        />
                      );
                    })}
                    {/* Committed overlay line */}
                    <Line
                      type="monotone"
                      dataKey="committed_total"
                      name="Committed"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="5 3"
                      legendType="none"
                    />
                    {/* Spent overlay line */}
                    <Line
                      type="monotone"
                      dataKey="spent_total"
                      name="Spent"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="3 2"
                      legendType="none"
                    />
                    {/* Budget reference lines per year */}
                    {Object.entries(budgetByYear).map(([year, budget]) => (
                      <ReferenceLine
                        key={`budget_${year}`}
                        y={budget}
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="6 4"
                        label={{
                          value: `Budget ${year}: ${fmtCompact(budget)}`,
                          position: 'insideTopRight',
                          fontSize: 10,
                          fill: '#b45309',
                        }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Quarterly summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 pb-5 pt-2">
                {quarterlySums.map((q) => (
                  <div
                    key={q.label}
                    className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {q.label}
                      </p>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full tabular-nums">
                        {q.pct}%
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 tabular-nums mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatEur(q.total)}
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${q.pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 tabular-nums">
                      {q.pct}% of total budget
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* 3. Two-column grid: Heatmap + Insights                           */}
        {/* ================================================================ */}
        {filteredItems.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* LEFT: Heatmap table (3/5 cols) */}
            <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-gray-900">Monthly Heatmap</h3>
                  <HelpTooltip text="Color intensity shows the level of monthly cash outflow. Click a cell to jump to the Costbook view." />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Functional areas x months — color intensity proportional to amount
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50/80 z-10 min-w-[130px]">
                        Functional Area
                      </th>
                      {dynamicMonths.map((m) => {
                        const isCurrent = m === CURRENT_MONTH;
                        return (
                          <th
                            key={m}
                            className={`px-2 py-2 text-center font-semibold uppercase tracking-wider whitespace-nowrap ${
                              isCurrent
                                ? 'text-indigo-600 bg-indigo-50/60'
                                : hoveredCell?.col === colIdx
                                  ? 'text-gray-500 bg-indigo-50'
                                  : 'text-gray-500'
                            }`}
                          >
                            {MONTH_SHORT[m] ?? m}
                            {isCurrent && (
                              <div className="h-0.5 bg-indigo-600 rounded-full mt-1 mx-auto w-full" />
                            )}
                          </th>
                        );
                      })}
                      <th className="px-3 py-2 text-right font-bold text-gray-900 uppercase tracking-wider border-l border-gray-200">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, rowIdx) => (
                      <tr
                        key={row.functionalArea.id}
                        className={`border-b border-gray-100 ${
                          hoveredCell?.row === rowIdx ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor:
                                  getFAColor(row.functionalArea.id),
                              }}
                            />
                            <span className="truncate">{row.functionalArea.name}</span>
                          </div>
                        </td>
                        {dynamicMonths.map((m) => {
                          const val = row.months[m] || 0;
                          const t = maxCellValue > 0 ? Math.min(val / maxCellValue, 1) : 0;
                          const bg = val === 0 ? 'transparent' : interpolateColor(t);
                          const textCls = val === 0 ? 'text-gray-300' : heatmapTextColor(t);
                          const isCurrent = m === CURRENT_MONTH;
                          const isHovered =
                            hoveredCell?.row === rowIdx || hoveredCell?.col === colIdx;
                          return (
                            <td
                              key={m}
                              className={`px-2 py-2 text-center tabular-nums transition-colors duration-100 ${textCls} ${
                                isCurrent ? 'border-x-2 border-indigo-600/50' : ''
                              } ${
                                isHovered && val > 0 ? 'ring-1 ring-indigo-500 ring-inset' : ''
                              } ${val > 0 ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-inset' : 'cursor-default'}`}
                              style={{ backgroundColor: bg }}
                              onMouseEnter={() =>
                                setHoveredCell({ row: rowIdx, col: colIdx })
                              }
                              onMouseLeave={() => setHoveredCell(null)}
                              onClick={() => {
                                if (val > 0) {
                                  navigateToCostbook(row.functionalArea.id, m);
                                }
                              }}
                              title={val > 0 ? `${row.functionalArea.name} / ${MONTH_LABELS[m]}: ${formatEur(val)} — Click for details` : '-'}
                            >
                              {val > 0 ? fmtCompact(val) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-gray-900 border-l border-gray-200">
                          {formatEur(row.months.__total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50/80 font-bold">
                      <td className="px-3 py-2 text-gray-900 sticky left-0 bg-gray-50/80 z-10">
                        Total
                      </td>
                      {dynamicMonths.map((m) => {
                        const isCurrent = m === CURRENT_MONTH;
                        return (
                          <td
                            key={m}
                            className={`px-2 py-2 text-center tabular-nums text-gray-900 ${
                              isCurrent ? 'border-x-2 border-indigo-600/50 bg-indigo-50/40' : ''
                            } ${hoveredCell?.col === colIdx && !isCurrent ? 'bg-indigo-50' : ''}`}
                          >
                            {columnTotals[m] > 0 ? formatEur(columnTotals[m]) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right tabular-nums text-black border-l border-gray-200">
                        {formatEur(columnTotals.__total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* Heatmap color scale legend */}
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Scale</span>
                <div className="flex items-center gap-0.5">
                  {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((t) => (
                    <div
                      key={t}
                      className="w-6 h-3 first:rounded-l last:rounded-r"
                      style={{ backgroundColor: t === 0 ? '#f8fafc' : interpolateColor(t) }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">
                  {formatEur(0)} — {formatEur(maxCellValue)}
                </span>
              </div>
            </div>

            {/* RIGHT: Insights panel (2/5 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Peak Month Card */}
              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Peak Month</h4>
                    <p className="text-[10px] text-gray-500">Highest monthly cash-out</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-black tabular-nums mt-1">
                  {formatEur(peakMonth.value)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-semibold text-black">{peakMonth.label}</span>
                  {' '}— {columnTotals.__total > 0
                    ? `${Math.round((peakMonth.value / columnTotals.__total) * 100)}% of total volume`
                    : ''}
                </p>
              </div>

              {/* Upcoming 3 Months with functional area breakdown */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Next 3 Months</h4>
                    <p className="text-[10px] text-gray-500">Expected cash-out by functional area</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {upcomingMonths.map((um) => (
                    <div key={um.month}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-gray-800">{um.label}</span>
                          <span className="text-[10px] text-gray-400">
                            {um.itemCount} item{um.itemCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-gray-900">
                          {formatEur(um.total)}
                        </span>
                      </div>
                      {um.faBreakdown.length > 0 && (
                        <div className="space-y-1 ml-0.5">
                          {um.faBreakdown.map(({ fa, amount }) => (
                            <div key={fa.id} className="flex items-center gap-2">
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getFAColor(fa.id) }}
                              />
                              <span className="text-[11px] text-gray-500 flex-1 truncate">
                                {fa.name}
                              </span>
                              <span className="text-[11px] font-medium tabular-nums text-gray-700">
                                {formatEur(amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {um.month !== upcomingMonths[upcomingMonths.length - 1].month && (
                        <div className="border-b border-gray-100 mt-3" />
                      )}
                    </div>
                  ))}
                </div>
                {/* Upcoming total */}
                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between">
                  <span className="text-xs font-semibold text-gray-600">3-month total</span>
                  <span className="text-sm font-bold tabular-nums text-black">
                    {formatEur(upcomingMonths.reduce((s, m) => s + m.total, 0))}
                  </span>
                </div>
              </div>

              {/* Mini Burndown */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Budget Burndown</h4>
                </div>
                {burndownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart
                      data={burndownData}
                      margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={fmtCompact}
                        tickLine={false}
                        axisLine={false}
                        width={45}
                      />
                      <Tooltip
                        formatter={(value: any, name: any) => {
                          const labels: Record<string, string> = {
                            planned: 'Planned',
                            actual: 'Actual',
                            remaining: 'Remaining',
                          };
                          return [formatEur(Number(value)), labels[name] ?? name];
                        }}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          fontSize: 11,
                        }}
                      />
                      <ReferenceLine
                        y={summary.budget}
                        stroke="#6366f1"
                        strokeDasharray="4 3"
                        strokeWidth={1}
                      />
                      <Area
                        type="monotone"
                        dataKey="actual"
                        stroke="none"
                        fill="#6366f1"
                        fillOpacity={0.06}
                      />
                      <Line
                        type="monotone"
                        dataKey="planned"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 2, fill: '#6366f1', strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#22c55e"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        dot={{ r: 1.5, fill: '#22c55e', strokeWidth: 0 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* 4. Footer: Detail table (expandable, default closed)             */}
        {/* ================================================================ */}
        {filteredItems.length > 0 && (
          <section>
            <button
              onClick={() => setDetailsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900">
                Show details
                <span className="text-gray-400 font-normal ml-2">
                  ({detailItems.length} items)
                </span>
              </span>
              {detailsOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {detailsOpen && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/80">
                        <th
                          className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                          onClick={() => toggleSort('cashout')}
                        >
                          Cash-Out {sortIcon('cashout')}
                        </th>
                        <th
                          className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                          onClick={() => toggleSort('functionalArea')}
                        >
                          Functional Area {sortIcon('functionalArea')}
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[280px]">
                          Description
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th
                          className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-gray-900 select-none"
                          onClick={() => toggleSort('amount')}
                        >
                          Amount {sortIcon('amount')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailItems.map((item) => {
                        const faColor = getItemFAColor(item);
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-4 py-2 text-gray-600 tabular-nums whitespace-nowrap">
                              {MONTH_LABELS[item.expected_cash_out] ?? item.expected_cash_out}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: faColor }}
                                />
                                <span className="text-gray-800 font-medium">
                                  {getFAName(item)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-gray-700 max-w-md truncate">
                              {item.description}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  STATUS_COLORS[item.approval_status] ?? 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {STATUS_LABELS[item.approval_status] ?? item.approval_status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right font-semibold tabular-nums text-gray-900">
                              {formatEur(item.total_amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50/80 font-bold">
                        <td colSpan={4} className="px-4 py-2.5 text-gray-900">
                          Total ({detailItems.length} items)
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-black">
                          {formatEur(
                            detailItems.reduce((s, i) => s + i.total_amount, 0),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
};

export default CashOutPage;
