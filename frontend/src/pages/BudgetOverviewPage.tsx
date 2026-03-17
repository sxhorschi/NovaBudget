import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBudgetData } from '../context/BudgetDataContext';
import { getDeptColor } from '../styles/design-tokens';
import { formatEUR } from '../components/costbook/AmountCell';
import {
  PHASE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  type ProjectPhase,
} from '../types/budget';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PHASE_COLORS: Record<ProjectPhase, string> = {
  phase_1: '#6366f1',
  phase_2: '#0ea5e9',
  phase_3: '#10b981',
  phase_4: '#f59e0b',
};

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1]} ${y}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BudgetOverviewPage: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  const navigate = useNavigate();
  const { departments, workAreas, costItems, budgetAdjustments } = useBudgetData();

  // Build lookup: workAreaId -> departmentId
  const waToDept = useMemo(() => {
    const m = new Map<string, string>();
    for (const wa of workAreas) m.set(wa.id, wa.department_id);
    return m;
  }, [workAreas]);

  // Active items (not rejected/obsolete)
  const activeItems = useMemo(
    () => costItems.filter((ci) => ci.approval_status !== 'rejected' && ci.approval_status !== 'obsolete'),
    [costItems],
  );

  // --- Scorecards ---
  const scorecards = useMemo(() => {
    const totalBudget =
      departments.reduce((s, d) => s + d.budget_total, 0) +
      budgetAdjustments.reduce((s, a) => s + a.amount, 0);
    const totalForecast = activeItems.reduce((s, ci) => s + ci.current_amount, 0);
    const remaining = totalBudget - totalForecast;

    const openItems = costItems.filter((ci) => ci.approval_status === 'open');
    const openCount = openItems.length;
    const openSum = openItems.reduce((s, ci) => s + ci.current_amount, 0);

    // Next cash-out: earliest month with active items, in the future
    const now = new Date().toISOString().slice(0, 7);
    const futureMonths = new Map<string, number>();
    for (const ci of activeItems) {
      const m = ci.expected_cash_out.slice(0, 7);
      if (m >= now) futureMonths.set(m, (futureMonths.get(m) ?? 0) + ci.current_amount);
    }
    const sortedMonths = [...futureMonths.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const nextCashOut = sortedMonths[0];

    return { totalBudget, remaining, openCount, openSum, nextCashOut };
  }, [departments, budgetAdjustments, activeItems, costItems]);

  // --- Department stats ---
  const deptStats = useMemo(() => {
    return departments.map((dept) => {
      const deptWAs = workAreas.filter((wa) => wa.department_id === dept.id);
      const deptWAIds = new Set(deptWAs.map((wa) => wa.id));
      const deptItems = activeItems.filter((ci) => deptWAIds.has(ci.work_area_id));
      const spent = deptItems.reduce((s, ci) => s + ci.current_amount, 0);
      const adj = budgetAdjustments
        .filter((a) => a.department_id === dept.id)
        .reduce((s, a) => s + a.amount, 0);
      const budget = dept.budget_total + adj;
      const ratio = budget > 0 ? spent / budget : 0;
      return { dept, budget, spent, remaining: budget - spent, ratio, count: deptItems.length };
    });
  }, [departments, workAreas, activeItems, budgetAdjustments]);

  // --- Phase distribution ---
  const phaseData = useMemo(() => {
    const totals = new Map<ProjectPhase, number>();
    let grandTotal = 0;
    for (const ci of activeItems) {
      totals.set(ci.project_phase, (totals.get(ci.project_phase) ?? 0) + ci.current_amount);
      grandTotal += ci.current_amount;
    }
    return (['phase_1', 'phase_2', 'phase_3', 'phase_4'] as ProjectPhase[])
      .map((p) => ({ phase: p, amount: totals.get(p) ?? 0, pct: grandTotal > 0 ? ((totals.get(p) ?? 0) / grandTotal) * 100 : 0 }))
      .filter((d) => d.amount > 0);
  }, [activeItems]);

  // --- Top 10 items ---
  const top10 = useMemo(() => {
    return [...costItems]
      .sort((a, b) => b.current_amount - a.current_amount)
      .slice(0, 10)
      .map((ci) => ({ ...ci, deptName: departments.find((d) => d.id === waToDept.get(ci.work_area_id))?.name ?? '' }));
  }, [costItems, departments, waToDept]);

  // --- Health color helper ---
  function healthColor(ratio: number): string {
    if (ratio < 0.8) return '#22c55e';
    if (ratio < 0.95) return '#f59e0b';
    return '#ef4444';
  }

  return (
    <div className="px-6 py-6 space-y-8 max-w-7xl mx-auto">
      {/* Section 1: Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs uppercase text-slate-500 tracking-wide">Remaining Budget</p>
          <p className="text-3xl font-bold font-mono mt-1 text-slate-900">{formatEUR(scorecards.remaining)}</p>
          <p className="text-xs text-slate-400 mt-1">of {formatEUR(scorecards.totalBudget)} total</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs uppercase text-slate-500 tracking-wide">Open Items</p>
          <p className="text-3xl font-bold font-mono mt-1 text-slate-900">{scorecards.openCount} Items</p>
          <p className="text-xs text-slate-400 mt-1">{formatEUR(scorecards.openSum)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-xs uppercase text-slate-500 tracking-wide">Next Cash-Out</p>
          <p className="text-3xl font-bold font-mono mt-1 text-slate-900">
            {scorecards.nextCashOut ? monthLabel(scorecards.nextCashOut[0]) : '--'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {scorecards.nextCashOut ? formatEUR(scorecards.nextCashOut[1]) : 'No upcoming items'}
          </p>
        </div>
      </div>

      {/* Section 2: Department Health Cards */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Department Health</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {deptStats.map(({ dept, budget: _budget, spent: _spent, remaining, ratio, count }) => (
            <button
              key={dept.id}
              onClick={() => navigate(`/f/${facilityId}/costbook?dept=${dept.id}`)}
              className="min-w-[200px] flex-shrink-0 rounded-xl border border-slate-200 p-4 text-left hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getDeptColor(dept.id) }} />
                <span className="text-sm font-semibold text-slate-800 truncate">{dept.name}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(ratio * 100, 100)}%`, backgroundColor: healthColor(ratio) }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{Math.round(ratio * 100)}% used</span>
                <span>{count} items</span>
              </div>
              <p className="text-sm font-mono font-medium text-slate-700 mt-1">{formatEUR(remaining)} left</p>
            </button>
          ))}
        </div>
      </section>

      {/* Section 3: Phase Distribution */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Phase Distribution</h2>
        <div className="flex w-full h-10 rounded-lg overflow-hidden border border-slate-200">
          {phaseData.map(({ phase, pct, amount }) => (
            <button
              key={phase}
              onClick={() => navigate(`/f/${facilityId}/costbook?phase=${phase}`)}
              className="relative flex items-center justify-center text-white text-xs font-medium hover:brightness-110 transition-all overflow-hidden"
              style={{ width: `${pct}%`, backgroundColor: PHASE_COLORS[phase], minWidth: pct > 0 ? '32px' : 0 }}
              title={`${PHASE_LABELS[phase]}: ${formatEUR(amount)} (${pct.toFixed(1)}%)`}
            >
              {pct >= 8 && <span className="truncate px-1">{PHASE_LABELS[phase]} ({Math.round(pct)}%)</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-4 mt-2">
          {phaseData.map(({ phase, pct }) => (
            <div key={phase} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PHASE_COLORS[phase] }} />
              {PHASE_LABELS[phase]} ({Math.round(pct)}%)
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Top 10 Items */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Top 10 Items by Amount</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wider">
                <th className="py-2.5 px-3 text-left w-8">#</th>
                <th className="py-2.5 px-3 text-left">Description</th>
                <th className="py-2.5 px-3 text-left">Department</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((item, i) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/f/${facilityId}/costbook?q=${encodeURIComponent(item.description)}`)}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                  <td className="py-2.5 px-3 text-slate-800 font-medium max-w-xs truncate">{item.description}</td>
                  <td className="py-2.5 px-3 text-slate-600">{item.deptName}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">{formatEUR(item.current_amount)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.approval_status]}`}>
                      {STATUS_LABELS[item.approval_status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default BudgetOverviewPage;
