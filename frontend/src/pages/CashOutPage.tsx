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
import type { CostItem, Department } from '../types/budget';
import { STATUS_LABELS, STATUS_COLORS } from '../types/budget';
import { getDeptColor as getDeptColorById } from '../styles/design-tokens';
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

const MONTHS = [
  '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
  '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01',
];

const MONTH_LABELS: Record<string, string> = {
  '2026-02': 'Feb 26', '2026-03': 'Mar 26', '2026-04': 'Apr 26',
  '2026-05': 'May 26', '2026-06': 'Jun 26', '2026-07': 'Jul 26',
  '2026-08': 'Aug 26', '2026-09': 'Sep 26', '2026-10': 'Oct 26',
  '2026-11': 'Nov 26', '2026-12': 'Dec 26', '2027-01': 'Jan 27',
};

const MONTH_SHORT: Record<string, string> = {
  '2026-02': 'Feb', '2026-03': 'Mar', '2026-04': 'Apr',
  '2026-05': 'May', '2026-06': 'Jun', '2026-07': 'Jul',
  '2026-08': 'Aug', '2026-09': 'Sep', '2026-10': 'Oct',
  '2026-11': 'Nov', '2026-12': 'Dec', '2027-01': 'Jan',
};


const QUARTERS: { label: string; months: string[] }[] = [
  { label: 'Q1 2026', months: ['2026-02', '2026-03', '2026-04'] },
  { label: 'Q2 2026', months: ['2026-05', '2026-06', '2026-07'] },
  { label: 'Q3 2026', months: ['2026-08', '2026-09', '2026-10'] },
  { label: 'Q4 2026', months: ['2026-11', '2026-12', '2027-01'] },
];

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

type SortField = 'cashout' | 'department' | 'amount';
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
  const { departments, workAreas } = useBudgetData();
  const { filters, setFilter, resetFilters, hasActiveFilters } = useFilterState();
  const { filteredDepartments, filteredItems, summary } = useFilteredData(filters);
  const navigate = useNavigate();
  const { facilityId } = useParams<{ facilityId: string }>();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [sortField, setSortField] = useState<SortField>('cashout');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [legendFilter, setLegendFilter] = useState<string | null>(null);

  // ---- Helper: work area IDs for a department ----
  const deptWaIds = useCallback(
    (deptId: string): Set<string> => {
      return new Set(
        workAreas
          .filter((wa) => wa.department_id === deptId)
          .map((wa) => wa.id),
      );
    },
    [workAreas],
  );

  // ---- Chart data: stacked area per department ----
  const chartData = useMemo(() => {
    return MONTHS.map((month) => {
      const entry: Record<string, number | string> = {
        month,
        label: MONTH_LABELS[month] ?? month,
      };
      let total = 0;

      filteredDepartments.forEach((dept) => {
        const waIds = deptWaIds(dept.id);
        const amount = filteredItems
          .filter((ci) => waIds.has(ci.work_area_id) && ci.expected_cash_out === month)
          .reduce((sum, ci) => sum + ci.current_amount, 0);

        entry[`dept_${dept.id}`] = amount;
        total += amount;
      });

      entry.total = total;
      return entry;
    });
  }, [filteredDepartments, filteredItems, deptWaIds]);

  // ---- Heatmap table data ----
  const tableData = useMemo(() => {
    return filteredDepartments.map((dept) => {
      const waIds = deptWaIds(dept.id);

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
  }, [filteredDepartments, filteredItems, deptWaIds]);

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
      const pct = columnTotals.__total > 0
        ? Math.round((total / columnTotals.__total) * 100)
        : 0;
      return { ...q, total, pct };
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

  // ---- Next 3 months with department breakdown ----
  const upcomingMonths = useMemo(() => {
    const currentMonthIndex = MONTHS.indexOf(CURRENT_MONTH);
    const upcoming = MONTHS.slice(
      Math.max(0, currentMonthIndex),
      Math.min(MONTHS.length, currentMonthIndex + 3),
    );
    return upcoming.map((m) => {
      const total = columnTotals[m] || 0;
      const items = filteredItems.filter((ci) => ci.expected_cash_out === m);

      // Department breakdown
      const deptBreakdown: { dept: Department; amount: number }[] = [];
      filteredDepartments.forEach((dept) => {
        const waIds = deptWaIds(dept.id);
        const amount = items
          .filter((ci) => waIds.has(ci.work_area_id))
          .reduce((s, ci) => s + ci.current_amount, 0);
        if (amount > 0) {
          deptBreakdown.push({ dept, amount });
        }
      });
      deptBreakdown.sort((a, b) => b.amount - a.amount);

      return {
        month: m,
        label: MONTH_LABELS[m],
        total,
        itemCount: items.length,
        deptBreakdown,
      };
    });
  }, [columnTotals, filteredItems, filteredDepartments, deptWaIds]);

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

  // ---- Detail items sorted ----
  const detailItems = useMemo(() => {
    const items = [...filteredItems];

    const getDeptNameForItem = (item: CostItem): string => {
      const wa = workAreas.find((w) => w.id === item.work_area_id);
      if (!wa) return '';
      const dept = departments.find((d) => d.id === wa.department_id);
      return dept?.name ?? '';
    };

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'cashout':
          cmp = a.expected_cash_out.localeCompare(b.expected_cash_out);
          break;
        case 'department':
          cmp = getDeptNameForItem(a).localeCompare(getDeptNameForItem(b));
          break;
        case 'amount':
          cmp = a.current_amount - b.current_amount;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [filteredItems, sortField, sortDir, workAreas, departments]);

  // ---- Department lookup helpers ----
  function getDeptForItem(item: CostItem): Department | undefined {
    const wa = workAreas.find((w) => w.id === item.work_area_id);
    if (!wa) return undefined;
    return departments.find((d) => d.id === wa.department_id);
  }

  function getDeptName(item: CostItem): string {
    return getDeptForItem(item)?.name ?? '-';
  }

  function getDeptColor(item: CostItem): string {
    const dept = getDeptForItem(item);
    return dept ? getDeptColorById(dept.id) : '#64748b';
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
        className={`inline w-3 h-3 ml-1 ${active ? 'text-indigo-600' : 'text-gray-400'}`}
      />
    );
  }

  // ---- Navigate to costbook with filters ----
  function navigateToCostbook(deptId: string, _month: string): void {
    const params = new URLSearchParams();
    params.set('dept', String(deptId));
    navigate(`/f/${facilityId}/costbook?${params.toString()}`);
  }

  // ---- Legend click handler ----
  function handleLegendClick(deptId: string): void {
    setLegendFilter((prev) => (prev === deptId ? null : deptId));
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
          remaining={summary.remaining}
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
                    Monthly cash-out by department — Feb 2026 to Jan 2027
                  </p>
                </div>
                {/* Clickable legend */}
                <div className="flex flex-wrap items-center gap-3">
                  {filteredDepartments.map((dept) => {
                    const isActive = legendFilter === null || legendFilter === dept.id;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => handleLegendClick(dept.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all duration-200 ${
                          isActive
                            ? 'opacity-100 bg-gray-50 hover:bg-gray-100'
                            : 'opacity-40 hover:opacity-70'
                        }`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getDeptColorById(dept.id) }}
                        />
                        <span className="text-gray-700 font-medium">{dept.name}</span>
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
                            stopColor={getDeptColorById(dept.id)}
                            stopOpacity={0.6}
                          />
                          <stop
                            offset="100%"
                            stopColor={getDeptColorById(dept.id)}
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
                        const visiblePayload = payload.filter((p) => {
                          if (legendFilter === null) return true;
                          return p.dataKey === `dept_${legendFilter}`;
                        });
                        const total = visiblePayload.reduce(
                          (s, p) => s + (typeof p.value === 'number' ? p.value : 0),
                          0,
                        );
                        return (
                          <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-3 text-sm">
                            <p className="font-semibold text-gray-900 mb-1.5">{label}</p>
                            {visiblePayload
                              .filter((p) => typeof p.value === 'number' && p.value > 0)
                              .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                              .map((p) => {
                                const dept = filteredDepartments.find(
                                  (d) => `dept_${d.id}` === p.dataKey,
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
                              <span>Total</span>
                              <span className="tabular-nums">{formatEur(total)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    {filteredDepartments.map((dept) => {
                      const isVisible = legendFilter === null || legendFilter === dept.id;
                      return (
                        <Area
                          key={dept.id}
                          type="monotone"
                          dataKey={`dept_${dept.id}`}
                          stackId="cashout"
                          stroke={isVisible ? (getDeptColorById(dept.id)) : 'transparent'}
                          strokeWidth={isVisible ? 1.5 : 0}
                          fill={isVisible ? `url(#grad_dept_${dept.id})` : 'transparent'}
                          fillOpacity={isVisible ? 1 : 0}
                        />
                      );
                    })}
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
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
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
                  Departments x months — color intensity proportional to amount
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50/80 z-10 min-w-[130px]">
                        Department
                      </th>
                      {MONTHS.map((m, colIdx) => {
                        const isCurrent = m === CURRENT_MONTH;
                        return (
                          <th
                            key={m}
                            className={`px-2 py-2 text-center font-semibold uppercase tracking-wider whitespace-nowrap ${
                              isCurrent
                                ? 'text-indigo-700 bg-indigo-50/60'
                                : hoveredCell?.col === colIdx
                                  ? 'text-gray-500 bg-indigo-50'
                                  : 'text-gray-500'
                            }`}
                          >
                            {MONTH_SHORT[m] ?? m}
                            {isCurrent && (
                              <div className="h-0.5 bg-indigo-500 rounded-full mt-1 mx-auto w-full" />
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
                                  getDeptColorById(row.department.id),
                              }}
                            />
                            <span className="truncate">{row.department.name}</span>
                          </div>
                        </td>
                        {MONTHS.map((m, colIdx) => {
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
                                isCurrent ? 'border-x-2 border-indigo-400/50' : ''
                              } ${
                                isHovered && val > 0 ? 'ring-1 ring-indigo-300 ring-inset' : ''
                              } ${val > 0 ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:ring-inset' : 'cursor-default'}`}
                              style={{ backgroundColor: bg }}
                              onMouseEnter={() =>
                                setHoveredCell({ row: rowIdx, col: colIdx })
                              }
                              onMouseLeave={() => setHoveredCell(null)}
                              onClick={() => {
                                if (val > 0) {
                                  navigateToCostbook(row.department.id, m);
                                }
                              }}
                              title={val > 0 ? `${row.department.name} / ${MONTH_LABELS[m]}: ${formatEur(val)} — Click for details` : '-'}
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
                      {MONTHS.map((m, colIdx) => {
                        const isCurrent = m === CURRENT_MONTH;
                        return (
                          <td
                            key={m}
                            className={`px-2 py-2 text-center tabular-nums text-gray-900 ${
                              isCurrent ? 'border-x-2 border-indigo-400/50 bg-indigo-50/40' : ''
                            } ${hoveredCell?.col === colIdx && !isCurrent ? 'bg-indigo-50' : ''}`}
                          >
                            {columnTotals[m] > 0 ? formatEur(columnTotals[m]) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right tabular-nums text-indigo-700 border-l border-gray-200">
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
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Peak Month</h4>
                    <p className="text-[10px] text-gray-500">Highest monthly cash-out</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-indigo-700 tabular-nums mt-1">
                  {formatEur(peakMonth.value)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-semibold text-indigo-600">{peakMonth.label}</span>
                  {' '}— {columnTotals.__total > 0
                    ? `${Math.round((peakMonth.value / columnTotals.__total) * 100)}% of total volume`
                    : ''}
                </p>
              </div>

              {/* Upcoming 3 Months with department breakdown */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Next 3 Months</h4>
                    <p className="text-[10px] text-gray-500">Expected cash-out by department</p>
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
                      {um.deptBreakdown.length > 0 && (
                        <div className="space-y-1 ml-0.5">
                          {um.deptBreakdown.map(({ dept, amount }) => (
                            <div key={dept.id} className="flex items-center gap-2">
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getDeptColorById(dept.id) }}
                              />
                              <span className="text-[11px] text-gray-500 flex-1 truncate">
                                {dept.name}
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
                  <span className="text-sm font-bold tabular-nums text-indigo-700">
                    {formatEur(upcomingMonths.reduce((s, m) => s + m.total, 0))}
                  </span>
                </div>
              </div>

              {/* Mini Burndown */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
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
                          onClick={() => toggleSort('department')}
                        >
                          Department {sortIcon('department')}
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
                        const deptColor = getDeptColor(item);
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
                                  style={{ backgroundColor: deptColor }}
                                />
                                <span className="text-gray-800 font-medium">
                                  {getDeptName(item)}
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
                              {formatEur(item.current_amount)}
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
        )}
      </div>
    </>
  );
};

export default CashOutPage;
