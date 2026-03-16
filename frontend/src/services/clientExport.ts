import * as XLSX from 'xlsx';
import type { Department, WorkArea, CostItem } from '../types/budget';
import {
  PHASE_LABELS,
  PRODUCT_LABELS,
  STATUS_LABELS,
  COST_BASIS_LABELS,
} from '../types/budget';
import type { FilteredSummary } from '../hooks/useFilteredData';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triggerDownload(workbook: XLSX.WorkBook, filename: string): void {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmt(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function dateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseMonthKey(value: string): string | null {
  const directMatch = value.match(/^(\d{4})-(\d{2})/);
  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function getPlanningStartMonth(items: CostItem[]): Date {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const futureDates: Date[] = [];

  for (const item of items) {
    const key = parseMonthKey(item.expected_cash_out);
    if (!key) continue;

    const [year, month] = key.split('-').map(Number);
    const candidate = new Date(year, month - 1, 1);
    if (candidate.getTime() >= currentMonthStart.getTime()) {
      futureDates.push(candidate);
    }
  }

  if (futureDates.length === 0) {
    return currentMonthStart;
  }

  futureDates.sort((a, b) => a.getTime() - b.getTime());
  return futureDates[0];
}

function buildPlanningMonths(startMonth: Date, count: number): { label: string; key: string }[] {
  const months: { label: string; key: string }[] = [];

  for (let offset = 0; offset < count; offset++) {
    const date = new Date(startMonth.getFullYear(), startMonth.getMonth() + offset, 1);
    months.push({
      label: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  return months;
}

function quarterTotals(monthValues: number[]): [number, number, number, number] {
  return [
    monthValues.slice(0, 3).reduce((sum, value) => sum + value, 0),
    monthValues.slice(3, 6).reduce((sum, value) => sum + value, 0),
    monthValues.slice(6, 9).reduce((sum, value) => sum + value, 0),
    monthValues.slice(9, 12).reduce((sum, value) => sum + value, 0),
  ];
}

/** Build a lookup map: id -> entity */
function indexById<T extends { id: number }>(items: T[]): Map<number, T> {
  return new Map(items.map((i) => [i.id, i]));
}

// ---------------------------------------------------------------------------
// 1) Standard Export — One sheet per department
// ---------------------------------------------------------------------------

export function exportStandard(
  departments: Department[],
  workAreas: WorkArea[],
  items: CostItem[],
): void {
  const wb = XLSX.utils.book_new();
  const waMap = indexById(workAreas);

  // Group items by department (via work area)
  const waByDept = new Map<number, WorkArea[]>();
  for (const wa of workAreas) {
    const list = waByDept.get(wa.department_id) ?? [];
    list.push(wa);
    waByDept.set(wa.department_id, list);
  }

  const itemsByWa = new Map<number, CostItem[]>();
  for (const item of items) {
    const list = itemsByWa.get(item.work_area_id) ?? [];
    list.push(item);
    itemsByWa.set(item.work_area_id, list);
  }

  for (const dept of departments) {
    const rows: (string | number | boolean)[][] = [];

    // Department header
    const committed = items
      .filter((i) => {
        const wa = waMap.get(i.work_area_id);
        return wa && wa.department_id === dept.id;
      })
      .reduce((s, i) => s + i.current_amount, 0);

    rows.push([`Department: ${dept.name}`]);
    rows.push([`Budget: ${fmt(dept.budget_total).toLocaleString('en-GB')} €`, '', `Committed: ${fmt(committed).toLocaleString('en-GB')} €`]);
    rows.push([]); // blank row

    // Column headers
    rows.push([
      'Work Area',
      'Phase',
      'Product',
      'Description',
      'Amount (€)',
      'Cash-Out',
      'Cost Basis',
      'Status',
      'Target Adjustment',
    ]);

    const deptWorkAreas = waByDept.get(dept.id) ?? [];

    for (const wa of deptWorkAreas) {
      const waItems = itemsByWa.get(wa.id) ?? [];
      if (waItems.length === 0) continue;

      const waTotal = waItems.reduce((s, i) => s + i.current_amount, 0);

      // Work Area grouping row (bold-style via text marker)
      rows.push([
        `▸ ${wa.name}`,
        '',
        '',
        '',
        fmt(waTotal),
        '',
        '',
        '',
        '',
      ]);

      for (const item of waItems) {
        rows.push([
          '',
          PHASE_LABELS[item.project_phase],
          PRODUCT_LABELS[item.product],
          item.description,
          fmt(item.current_amount),
          item.expected_cash_out,
          COST_BASIS_LABELS[item.cost_basis],
          STATUS_LABELS[item.approval_status],
          item.zielanpassung ? 'Yes' : 'No',
        ]);
      }
    }

    // Safe sheet name (max 31 chars, no special chars)
    const sheetName = dept.name.replace(/[\\/*?[\]:]/g, '').slice(0, 31);
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 28 }, // Work Area
      { wch: 10 }, // Phase
      { wch: 10 }, // Product
      { wch: 40 }, // Description
      { wch: 15 }, // Amount
      { wch: 12 }, // Cash-Out
      { wch: 22 }, // Cost Basis
      { wch: 18 }, // Status
      { wch: 14 }, // Target Adjustment
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Fallback: if no departments, create empty sheet
  if (departments.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['No data available']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Empty');
  }

  triggerDownload(wb, `CAPEX_Export_Standard_${dateStr()}.xlsx`);
}

// ---------------------------------------------------------------------------
// 2) Finance Export — BudgetTemplate Format
// ---------------------------------------------------------------------------

export function exportFinance(
  departments: Department[],
  workAreas: WorkArea[],
  items: CostItem[],
  budgetFactor: number = 0.85,
): void {
  const wb = XLSX.utils.book_new();
  const waMap = indexById(workAreas);
  const deptMap = indexById(departments);

  const months = buildPlanningMonths(getPlanningStartMonth(items), 12);
  const monthIndexByKey = new Map(months.map((m, idx) => [m.key, idx]));
  const planningRange = `${months[0].label} - ${months[months.length - 1].label}`;

  const sortedItems = [...items].sort((a, b) => {
    const waA = waMap.get(a.work_area_id);
    const waB = waMap.get(b.work_area_id);
    const deptA = waA ? deptMap.get(waA.department_id) : undefined;
    const deptB = waB ? deptMap.get(waB.department_id) : undefined;

    const deptCmp = (deptA?.name ?? '').localeCompare(deptB?.name ?? '', 'en-GB');
    if (deptCmp !== 0) return deptCmp;

    const waCmp = (waA?.name ?? '').localeCompare(waB?.name ?? '', 'en-GB');
    if (waCmp !== 0) return waCmp;

    return a.description.localeCompare(b.description, 'en-GB');
  });

  const monthlyTotals = months.map(() => 0);
  const monthlyCounts = months.map(() => 0);
  const quarterTotalSums = [0, 0, 0, 0];
  let totalOriginal = 0;
  let totalBudget = 0;
  let totalOutsidePeriod = 0;

  const departmentSummary = new Map<string, { count: number; original: number; budget: number; outside: number }>();

  const detailRows: (string | number)[][] = [
    ['CAPEX Finance Template'],
    ['Export Date', dateStr()],
    ['Planning Period', planningRange],
    ['Budget Factor', budgetFactor],
    [],
    [
      'Department',
      'Category',
      'Description',
      'Phase',
      'Product',
      'Status',
      'Cash-Out',
      'Original Amount (€)',
      'Budget Value (€)',
      ...months.map((m) => m.label),
      'Outside 12M (€)',
      'Q1',
      'Q2',
      'Q3',
      'Q4',
      'Total Budget (€)',
    ],
  ];

  for (const item of sortedItems) {
    const wa = waMap.get(item.work_area_id);
    const dept = wa ? deptMap.get(wa.department_id) : undefined;

    const originalAmount = item.current_amount;
    const budgetAmount = item.current_amount * budgetFactor;
    const monthValues = months.map(() => 0);

    let outsidePeriodAmount = budgetAmount;
    const cashOutKey = parseMonthKey(item.expected_cash_out);
    const monthIdx = cashOutKey ? monthIndexByKey.get(cashOutKey) : undefined;

    if (typeof monthIdx === 'number') {
      monthValues[monthIdx] = budgetAmount;
      outsidePeriodAmount = 0;
      monthlyTotals[monthIdx] += budgetAmount;
      monthlyCounts[monthIdx] += 1;
    }

    const [q1, q2, q3, q4] = quarterTotals(monthValues);

    totalOriginal += originalAmount;
    totalBudget += budgetAmount;
    totalOutsidePeriod += outsidePeriodAmount;
    quarterTotalSums[0] += q1;
    quarterTotalSums[1] += q2;
    quarterTotalSums[2] += q3;
    quarterTotalSums[3] += q4;

    const deptName = dept?.name ?? 'No Department';
    const summaryEntry = departmentSummary.get(deptName) ?? { count: 0, original: 0, budget: 0, outside: 0 };
    summaryEntry.count += 1;
    summaryEntry.original += originalAmount;
    summaryEntry.budget += budgetAmount;
    summaryEntry.outside += outsidePeriodAmount;
    departmentSummary.set(deptName, summaryEntry);

    detailRows.push([
      deptName,
      wa?.name ?? 'No Category',
      item.description,
      PHASE_LABELS[item.project_phase],
      PRODUCT_LABELS[item.product],
      STATUS_LABELS[item.approval_status],
      item.expected_cash_out,
      fmt(originalAmount),
      fmt(budgetAmount),
      ...monthValues.map(fmt),
      fmt(outsidePeriodAmount),
      fmt(q1),
      fmt(q2),
      fmt(q3),
      fmt(q4),
      fmt(budgetAmount),
    ]);
  }

  if (sortedItems.length > 0) {
    detailRows.push([]);
    detailRows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      '',
      fmt(totalOriginal),
      fmt(totalBudget),
      ...monthlyTotals.map(fmt),
      fmt(totalOutsidePeriod),
      fmt(quarterTotalSums[0]),
      fmt(quarterTotalSums[1]),
      fmt(quarterTotalSums[2]),
      fmt(quarterTotalSums[3]),
      fmt(totalBudget),
    ]);
  }

  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
  detailSheet['!cols'] = [
    { wch: 24 }, // Department
    { wch: 24 }, // Category
    { wch: 42 }, // Description
    { wch: 12 }, // Phase
    { wch: 12 }, // Product
    { wch: 14 }, // Status
    { wch: 14 }, // Cash-Out
    { wch: 18 }, // Original Amount
    { wch: 18 }, // Budget Value
    ...months.map(() => ({ wch: 14 })),
    { wch: 18 }, // Outside 12M
    { wch: 12 }, // Q1
    { wch: 12 }, // Q2
    { wch: 12 }, // Q3
    { wch: 12 }, // Q4
    { wch: 18 }, // Total Budget
  ];

  const summaryRows: (string | number)[][] = [
    ['CAPEX Finance Summary'],
    ['Export Date', dateStr()],
    ['Planning Period', planningRange],
    ['Budget Factor', budgetFactor],
    [],
    ['Department', 'Items', 'Original Total (€)', 'Budget Total (€)', 'Outside 12M (€)'],
  ];

  const sortedDepartmentSummary = [...departmentSummary.entries()].sort(([a], [b]) =>
    a.localeCompare(b, 'en-GB'),
  );

  for (const [deptName, entry] of sortedDepartmentSummary) {
    summaryRows.push([
      deptName,
      entry.count,
      fmt(entry.original),
      fmt(entry.budget),
      fmt(entry.outside),
    ]);
  }

  summaryRows.push([]);
  summaryRows.push(['Month', 'Items', 'Cash-Out Budget (€)']);

  for (let i = 0; i < months.length; i++) {
    summaryRows.push([
      months[i].label,
      monthlyCounts[i],
      fmt(monthlyTotals[i]),
    ]);
  }

  summaryRows.push([]);
  summaryRows.push([
    'TOTAL',
    sortedItems.length,
    fmt(totalOriginal),
    fmt(totalBudget),
    fmt(totalOutsidePeriod),
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, detailSheet, 'BudgetTemplate');
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Finance_Summary');
  triggerDownload(wb, `CAPEX_Finance_Template_${dateStr()}.xlsx`);
}

// ---------------------------------------------------------------------------
// 3) Steering Committee Export
// ---------------------------------------------------------------------------

export function exportSteeringCommittee(
  departments: Department[],
  workAreas: WorkArea[],
  items: CostItem[],
  summary: FilteredSummary,
): void {
  const wb = XLSX.utils.book_new();
  const waMap = indexById(workAreas);
  const deptMap = indexById(departments);

  // ---- Sheet 1: Summary ----
  const summaryRows: (string | number)[][] = [];

  summaryRows.push(['CAPEX Steering Committee Report']);
  summaryRows.push([`Date: ${dateStr()}`]);
  summaryRows.push([]);

  // -- Budget vs Committed vs Remaining per Department --
  summaryRows.push(['Budget Overview by Department']);
  summaryRows.push(['Department', 'Budget (€)', 'Committed (€)', 'Remaining (€)', 'Utilisation (%)']);

  for (const dept of departments) {
    const deptItems = items.filter((i) => {
      const wa = waMap.get(i.work_area_id);
      return wa && wa.department_id === dept.id;
    });
    const committed = deptItems.reduce((s, i) => s + i.current_amount, 0);
    const remaining = dept.budget_total - committed;
    const pct = dept.budget_total > 0 ? Math.round((committed / dept.budget_total) * 100) : 0;

    summaryRows.push([
      dept.name,
      fmt(dept.budget_total),
      fmt(committed),
      fmt(remaining),
      pct,
    ]);
  }

  summaryRows.push([]);
  summaryRows.push([
    'TOTAL',
    fmt(summary.budget),
    fmt(summary.committed),
    fmt(summary.remaining),
    summary.budget > 0 ? Math.round((summary.committed / summary.budget) * 100) : 0,
  ]);

  summaryRows.push([]);
  summaryRows.push([]);

  // -- Top 10 largest open items --
  summaryRows.push(['Top 10 Largest Open Items']);
  summaryRows.push(['#', 'Description', 'Department', 'Work Area', 'Amount (€)', 'Status']);

  const openItems = items
    .filter((i) => i.approval_status !== 'approved' && i.approval_status !== 'obsolete')
    .sort((a, b) => b.current_amount - a.current_amount)
    .slice(0, 10);

  openItems.forEach((item, idx) => {
    const wa = waMap.get(item.work_area_id);
    const dept = wa ? deptMap.get(wa.department_id) : undefined;
    summaryRows.push([
      idx + 1,
      item.description,
      dept?.name ?? '',
      wa?.name ?? '',
      fmt(item.current_amount),
      STATUS_LABELS[item.approval_status],
    ]);
  });

  summaryRows.push([]);
  summaryRows.push([]);

  // -- Cash-Out next 3 months --
  summaryRows.push(['Cash-Out Next 3 Months']);
  summaryRows.push(['Month', 'Amount (€)', 'No. of Items']);

  const now = new Date();
  for (let offset = 0; offset < 3; offset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const targetKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = targetDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const monthItems = items.filter((i) => i.expected_cash_out.startsWith(targetKey));
    const monthTotal = monthItems.reduce((s, i) => s + i.current_amount, 0);

    summaryRows.push([monthLabel, fmt(monthTotal), monthItems.length]);
  }

  const ws = XLSX.utils.aoa_to_sheet(summaryRows);

  ws['!cols'] = [
    { wch: 40 },
    { wch: 22 },
    { wch: 18 },
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  triggerDownload(wb, `CAPEX_Steering_Committee_${dateStr()}.xlsx`);
}
