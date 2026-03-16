import React, { useMemo, useState } from 'react';
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
import { ChevronDown, ChevronUp, TrendingUp, Calendar, Zap, ArrowUpRight } from 'lucide-react';
import HelpTooltip from '../components/help/HelpTooltip';
import type { ProjectPhase, Product, ApprovalStatus, CostItem } from '../types/budget';
import { STATUS_LABELS } from '../types/budget';
import { useBudgetData } from '../context/BudgetDataContext';
import { useFilterState } from '../hooks/useFilterState';
import { useFilteredData } from '../hooks/useFilteredData';
import FilterBar from '../components/filter/FilterBar';
import SummaryStrip from '../components/summary/SummaryStrip';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = [
  '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
  '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01',
];

const MONTH_LABELS: Record<string, string> = {
  '2026-02': 'Feb 26', '2026-03': 'Mrz 26', '2026-04': 'Apr 26',
  '2026-05': 'Mai 26', '2026-06': 'Jun 26', '2026-07': 'Jul 26',
  '2026-08': 'Aug 26', '2026-09': 'Sep 26', '2026-10': 'Okt 26',
  '2026-11': 'Nov 26', '2026-12': 'Dez 26', '2027-01': 'Jan 27',
};

const MONTH_SHORT: Record<string, string> = {
  '2026-02': 'Feb', '2026-03': 'Mrz', '2026-04': 'Apr',
  '2026-05': 'Mai', '2026-06': 'Jun', '2026-07': 'Jul',
  '2026-08': 'Aug', '2026-09': 'Sep', '2026-10': 'Okt',
  '2026-11': 'Nov', '2026-12': 'Dez', '2027-01': 'Jan',
};

const DEPT_COLORS: Record<number, string> = {
  1: '#6366f1', // Assembly Equipment (indigo)
  2: '#f59e0b', // Testing (amber)
  3: '#3b82f6', // Logistics (blue)
  4: '#ec4899', // Facility (pink)
  5: '#a855f7', // Prototyping (purple)
};

const DEPT_COLORS_LIGHT: Record<number, string> = {
  1: '#e0e7ff',
  2: '#fef3c7',
  3: '#dbeafe',
  4: '#fce7f3',
  5: '#f3e8ff',
};

const QUARTERS: { label: string; months: string[] }[] = [
  { label: 'Q1 2026', months: ['2026-02', '2026-03', '2026-04'] },
  { label: 'Q2 2026', months: ['2026-05', '2026-06', '2026-07'] },
  { label: 'Q3 2026', months: ['2026-08', '2026-09', '2026-10'] },
  { label: 'Q4 2026', months: ['2026-11', '2026-12', '2027-01'] },
];

const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function formatEur(value: number): string {
  return eurFormatter.format(value);
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Phase config
// ---------------------------------------------------------------------------

interface PhaseConfig {
  key: ProjectPhase;
  label: string;
  subtitle: string;
}

const PHASES: PhaseConfig[] = [
  { key: 'phase_1', label: 'Phase 1', subtitle: 'Bryan Start' },
  { key: 'phase_2', label: 'Phase 2', subtitle: 'Günther Ramp-Up' },
  { key: 'phase_3', label: 'Phase 3', subtitle: 'Optimization' },
  { key: 'phase_4', label: 'Phase 4', subtitle: 'Automation' },
];

// ---------------------------------------------------------------------------
// CashOutPage
// ---------------------------------------------------------------------------

const CashOutPage: React.FC = () => {
  const { departments, workAreas } = useBudgetData();
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilterState();
  const { filteredDepartments, filteredItems, summary } = useFilteredData(filters);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  // ---- Chart data: stacked area per department ----
  const chartData = useMemo(() => {
    return MONTHS.map((month) => {
      const entry: Record<string, number | string> = {
        month,
        label: MONTH_LABELS[month] ?? month,
      };
      let total = 0;

      filteredDepartments.forEach((dept) => {
        const waIds = new Set(
          workAreas
            .filter((wa) => wa.department_id === dept.id)
            .map((wa) => wa.id),
        );
        const amount = filteredItems
          .filter((ci) => waIds.has(ci.work_area_id) && ci.expected_cash_out === month)
          .reduce((sum, ci) => sum + ci.current_amount, 0);

        entry[`dept_${dept.id}`] = amount;
        total += amount;
      });

      entry.total = total;
      return entry;
    });
  }, [filteredDepartments, filteredItems, workAreas]);

  // ---- Heatmap table data ----
  const tableData = useMemo(() => {
    return filteredDepartments.map((dept) => {
      const waIds = new Set(
        workAreas
          .filter((wa) => wa.department_id === dept.id)
          .map((wa) => wa.id),
      );

      const row: Record<string, number> = {};
      let rowTotal = 0;

      MONTHS.forEach((month) => {
        const amount = filteredItems
          .filter((ci) => waIds.has(ci.work_area_id) && ci.expected_cash_out === month)
          .reduce((sum, ci) => sum + ci.current_amount, 0);
        row[month] = amount;
        rowTotal += amount;
      });

      row.__total = rowTotal;
      return { department: dept, months: row };
    });
  }, [filteredDepartments, filteredItems, workAreas]);

  // ---- Column totals ----
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    MONTHS.forEach((month) => {
      totals[month] = tableData.reduce((sum, row) => sum + (row.months[month] || 0), 0);
    });
    totals.__total = tableData.reduce((sum, row) => sum + row.months.__total, 0);
    return totals;
  }, [tableData]);

  // ---- Max cell value for heatmap ----
  const maxCellValue = useMemo(() => {
    let max = 0;
    tableData.forEach((row) => {
      MONTHS.forEach((month) => {
        if (row.months[month] > max) max = row.months[month];
      });
    });
    return max;
  }, [tableData]);

  // ---- Quarterly sums ----
  const quarterlySums = useMemo(() => {
    return QUARTERS.map((q) => {
      const total = q.months.reduce((sum, m) => sum + (columnTotals[m] || 0), 0);
      return { ...q, total };
    });
  }, [columnTotals]);

  // ---- Peak month ----
  const peakMonth = useMemo(() => {
    let maxMonth = MONTHS[0];
    let maxVal = 0;
    MONTHS.forEach((m) => {
      const val = columnTotals[m] || 0;
      if (val > maxVal) {
        maxVal = val;
        maxMonth = m;
      }
    });
    return { month: maxMonth, label: MONTH_LABELS[maxMonth], value: maxVal };
  }, [columnTotals]);

  // ---- Next 3 months (from "today" = March 2026) ----
  const upcomingMonths = useMemo(() => {
    const currentMonthIndex = MONTHS.indexOf('2026-03');
    const upcoming = MONTHS.slice(
      Math.max(0, currentMonthIndex),
      Math.min(MONTHS.length, currentMonthIndex + 3),
    );
    return upcoming.map((m) => ({
      month: m,
      label: MONTH_LABELS[m],
      total: columnTotals[m] || 0,
      items: filteredItems.filter((ci) => ci.expected_cash_out === m).length,
    }));
  }, [columnTotals, filteredItems]);

  // ---- Burndown data ----
  const burndownData = useMemo(() => {
    const byMonth: Record<string, number> = {};
    filteredItems.forEach((item) => {
      const m = item.expected_cash_out;
      if (m) {
        byMonth[m] = (byMonth[m] || 0) + item.current_amount;
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
  }, [filteredItems, summary.budget]);

  // ---- Phase progress data ----
  const phaseData = useMemo(() => {
    const totalCommitted = filteredItems.reduce((s, i) => s + i.current_amount, 0);
    const byPhase: Record<ProjectPhase, number> = {
      phase_1: 0,
      phase_2: 0,
      phase_3: 0,
      phase_4: 0,
    };
    filteredItems.forEach((item) => {
      byPhase[item.project_phase] += item.current_amount;
    });

    return PHASES.map((config) => {
      const committed = byPhase[config.key];
      const phaseBudget =
        totalCommitted > 0
          ? Math.round((committed / totalCommitted) * summary.budget)
          : Math.round(summary.budget / 4);
      const percent = phaseBudget > 0 ? Math.round((committed / phaseBudget) * 100) : 0;
      return { config, committed, phaseBudget, percent };
    });
  }, [filteredItems, summary.budget]);

  // ---- Detail items sorted by cash-out date ----
  const detailItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => a.expected_cash_out.localeCompare(b.expected_cash_out));
  }, [filteredItems]);

  // ---- Heatmap cell background ----
  function cellBg(value: number): string {
    if (value === 0 || maxCellValue === 0) return 'transparent';
    const intensity = Math.min(value / maxCellValue, 1);
    // 6 steps: indigo-50 -> indigo-600
    if (intensity < 0.1) return '#eef2ff';    // indigo-50
    if (intensity < 0.25) return '#e0e7ff';   // indigo-100
    if (intensity < 0.4) return '#c7d2fe';    // indigo-200
    if (intensity < 0.6) return '#a5b4fc';    // indigo-300
    if (intensity < 0.8) return '#818cf8';    // indigo-400
    return '#6366f1';                          // indigo-500
  }

  function cellTextColor(value: number): string {
    if (value === 0 || maxCellValue === 0) return 'text-gray-300';
    const intensity = Math.min(value / maxCellValue, 1);
    return intensity >= 0.6 ? 'text-white' : 'text-gray-800';
  }

  function progressBarColor(pct: number): string {
    if (pct <= 60) return 'bg-emerald-500';
    if (pct <= 85) return 'bg-amber-500';
    return 'bg-red-500';
  }

  function progressTextColor(pct: number): string {
    if (pct <= 60) return 'text-emerald-700';
    if (pct <= 85) return 'text-amber-700';
    return 'text-red-700';
  }

  // ---- Find department name for a cost item ----
  function getDeptName(item: CostItem): string {
    const wa = workAreas.find((w) => w.id === item.work_area_id);
    if (!wa) return '-';
    const dept = departments.find((d) => d.id === wa.department_id);
    return dept?.name ?? '-';
  }

  return (
    <>
      {/* ================================================================ */}
      {/* 1. FilterBar + SummaryStrip (sticky container)                   */}
      {/* ================================================================ */}
      <div className="sticky top-[96px] z-20 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <FilterBar
          filters={filters}
          onFilterChange={setFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
        <SummaryStrip
          budget={summary.budget}
          committed={summary.committed}
          remaining={summary.remaining}
          delta={summary.delta}
          itemCount={summary.itemCount}
        />
      </div>

      <div className="px-6 pb-8 space-y-6">
        {/* ================================================================ */}
        {/* Empty State                                                       */}
        {/* ================================================================ */}
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Calendar className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              Keine Kostenpositionen fuer die aktuelle Filterauswahl
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Passe die Filter an oder setze sie zurueck, um Cash-Out Daten zu sehen.
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* 2. Hero: Cash-Out Timeline (stacked area)                        */}
        {/* ================================================================ */}
        {filteredItems.length > 0 && (<section>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Cash-Out Timeline</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Monatlicher Cash-Out nach Abteilung -- Feb 2026 bis Jan 2027
                </p>
              </div>
              {/* Legend inline */}
              <div className="hidden md:flex items-center gap-3">
                {filteredDepartments.map((dept) => (
                  <div key={dept.id} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: DEPT_COLORS[dept.id] ?? '#6b7280' }}
                    />
                    <span className="text-xs text-gray-600">{dept.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-2">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    {filteredDepartments.map((dept) => (
                      <linearGradient
                        key={dept.id}
                        id={`grad_dept_${dept.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={DEPT_COLORS[dept.id] ?? '#6b7280'}
                          stopOpacity={0.6}
                        />
                        <stop
                          offset="100%"
                          stopColor={DEPT_COLORS[dept.id] ?? '#6b7280'}
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
                      const total = payload.reduce(
                        (s, p) => s + (typeof p.value === 'number' ? p.value : 0),
                        0,
                      );
                      return (
                        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 text-sm">
                          <p className="font-semibold text-gray-900 mb-1.5">{label}</p>
                          {payload
                            .filter((p) => typeof p.value === 'number' && p.value > 0)
                            .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                            .map((p) => {
                              const dept = filteredDepartments.find(
                                (d) => `dept_${d.id}` === p.dataKey,
                              );
                              return (
                                <div
                                  key={String(p.dataKey)}
                                  className="flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: String(p.color) }}
                                    />
                                    <span className="text-gray-600">
                                      {dept?.name ?? String(p.dataKey)}
                                    </span>
                                  </div>
                                  <span className="font-medium tabular-nums text-gray-900">
                                    {formatEur(Number(p.value))}
                                  </span>
                                </div>
                              );
                            })}
                          <div className="border-t border-gray-200 mt-1.5 pt-1.5 flex justify-between font-semibold text-gray-900">
                            <span>Gesamt</span>
                            <span className="tabular-nums">{formatEur(total)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {filteredDepartments.map((dept) => (
                    <Area
                      key={dept.id}
                      type="monotone"
                      dataKey={`dept_${dept.id}`}
                      stackId="cashout"
                      stroke={DEPT_COLORS[dept.id] ?? '#6b7280'}
                      strokeWidth={1.5}
                      fill={`url(#grad_dept_${dept.id})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Quarterly summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 pb-5 pt-2">
              {quarterlySums.map((q) => (
                <div
                  key={q.label}
                  className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3"
                >
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {q.label}
                  </p>
                  <p className="text-lg font-bold text-gray-900 font-mono tabular-nums mt-0.5">
                    {fmtCompact(q.total)}
                  </p>
                  {/* Mini sparkline bar showing proportion */}
                  <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{
                        width: `${
                          columnTotals.__total > 0
                            ? Math.round((q.total / columnTotals.__total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>)}

        {/* ================================================================ */}
        {/* 3. Two-column grid: Heatmap + Insights                           */}
        {/* ================================================================ */}
        {filteredItems.length > 0 && (<section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Heatmap table (60% = 3/5 cols) */}
          <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-gray-900">Monats-Heatmap</h3>
                <HelpTooltip text="Farbintensität zeigt die Höhe des monatlichen Geldabflusses" />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Abteilungen x Monate -- Farbintensität proportional zum Betrag
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50/80 z-10 min-w-[130px]">
                      Abteilung
                    </th>
                    {MONTHS.map((m, colIdx) => (
                      <th
                        key={m}
                        className={`px-2 py-2 text-center font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                          hoveredCell?.col === colIdx
                            ? 'bg-indigo-50'
                            : ''
                        }`}
                      >
                        {MONTH_SHORT[m] ?? m}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-bold text-gray-900 uppercase tracking-wider border-l border-gray-200">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, rowIdx) => (
                    <tr
                      key={row.department.id}
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
                                DEPT_COLORS[row.department.id] ?? '#6b7280',
                            }}
                          />
                          <span className="truncate">{row.department.name}</span>
                        </div>
                      </td>
                      {MONTHS.map((m, colIdx) => {
                        const val = row.months[m] || 0;
                        const bg = cellBg(val);
                        const textCls = cellTextColor(val);
                        const isHovered =
                          hoveredCell?.row === rowIdx || hoveredCell?.col === colIdx;
                        return (
                          <td
                            key={m}
                            className={`px-2 py-2 text-center tabular-nums cursor-default transition-colors duration-100 ${textCls} ${
                              isHovered && val > 0 ? 'ring-1 ring-indigo-300 ring-inset' : ''
                            }`}
                            style={{ backgroundColor: bg }}
                            onMouseEnter={() =>
                              setHoveredCell({ row: rowIdx, col: colIdx })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            title={val > 0 ? formatEur(val) : '-'}
                          >
                            {val > 0 ? fmtCompact(val) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-gray-900 border-l border-gray-200">
                        {fmtCompact(row.months.__total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50/80 font-bold">
                    <td className="px-3 py-2 text-gray-900 sticky left-0 bg-gray-50/80 z-10">
                      Gesamt
                    </td>
                    {MONTHS.map((m, colIdx) => (
                      <td
                        key={m}
                        className={`px-2 py-2 text-center tabular-nums text-gray-900 ${
                          hoveredCell?.col === colIdx ? 'bg-indigo-50' : ''
                        }`}
                      >
                        {columnTotals[m] > 0 ? fmtCompact(columnTotals[m]) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right tabular-nums text-indigo-700 border-l border-gray-200">
                      {fmtCompact(columnTotals.__total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* RIGHT: Insights panel (40% = 2/5 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mini Burndown */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-semibold text-gray-900">Budget Burndown</h4>
              </div>
              {burndownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
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
                          planned: 'Geplant',
                          actual: 'Ist',
                          remaining: 'Verbleibend',
                        };
                        return [formatEur(Number(value)), labels[String(name)] ?? String(name)];
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
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  Keine Daten vorhanden
                </div>
              )}
            </div>

            {/* Phase Progress */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-gray-900">Phasen-Fortschritt</h4>
              </div>
              <div className="space-y-3">
                {phaseData.map(({ config, committed, phaseBudget, percent }) => (
                  <div key={config.key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-semibold text-gray-800">
                          {config.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{config.subtitle}</span>
                      </div>
                      <span
                        className={`text-xs font-bold tabular-nums ${progressTextColor(percent)}`}
                      >
                        {percent}%
                      </span>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${progressBarColor(percent)}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] tabular-nums text-gray-400">
                        {fmtCompact(committed)}
                      </span>
                      <span className="text-[10px] tabular-nums text-gray-400">
                        {fmtCompact(phaseBudget)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Month Card */}
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-semibold text-gray-900">Peak Month</h4>
              </div>
              <p className="text-2xl font-bold text-indigo-700 tabular-nums">
                {formatEur(peakMonth.value)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Höchster Cash-Out: {peakMonth.label}
              </p>
            </div>

            {/* Upcoming 3 Months */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-semibold text-gray-900">Nächste 3 Monate</h4>
              </div>
              <div className="space-y-2">
                {upcomingMonths.map((um) => (
                  <div
                    key={um.month}
                    className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800">{um.label}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {um.items} Position{um.items !== 1 ? 'en' : ''}
                      </span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-gray-900">
                      {fmtCompact(um.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>)}

        {/* ================================================================ */}
        {/* 4. Footer: Detail table (expandable)                             */}
        {/* ================================================================ */}
        <section>
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">
              Details anzeigen
              <span className="text-gray-400 font-normal ml-2">
                ({detailItems.length} Positionen)
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Cash-Out
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Abteilung
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[280px]">
                        Beschreibung
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Betrag
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-2 text-gray-600 tabular-nums whitespace-nowrap">
                          {MONTH_LABELS[item.expected_cash_out] ?? item.expected_cash_out}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-gray-800 font-medium">
                            {getDeptName(item)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-700 max-w-md truncate">
                          {item.description}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {STATUS_LABELS[item.approval_status] ?? item.approval_status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums text-gray-900">
                          {formatEur(item.current_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50/80 font-bold">
                      <td colSpan={4} className="px-4 py-2.5 text-gray-900">
                        Gesamt ({detailItems.length} Positionen)
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-indigo-700">
                        {formatEur(
                          detailItems.reduce((s, i) => s + i.current_amount, 0),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default CashOutPage;
