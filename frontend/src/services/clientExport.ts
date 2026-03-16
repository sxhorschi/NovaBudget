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

/** Build a lookup map: id -> entity */
function indexById<T extends { id: number }>(items: T[]): Map<number, T> {
  return new Map(items.map((i) => [i.id, i]));
}

// ---------------------------------------------------------------------------
// 1) Standard Export — Ein Sheet pro Department
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
    rows.push([`Budget: ${fmt(dept.budget_total).toLocaleString('de-DE')} €`, '', `Committed: ${fmt(committed).toLocaleString('de-DE')} €`]);
    rows.push([]); // blank row

    // Column headers
    rows.push([
      'Work Area',
      'Phase',
      'Product',
      'Beschreibung',
      'Betrag (€)',
      'Cash-Out',
      'Kostenbasis',
      'Status',
      'Zielanpassung',
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
          item.zielanpassung ? 'Ja' : 'Nein',
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
      { wch: 40 }, // Beschreibung
      { wch: 15 }, // Betrag
      { wch: 12 }, // Cash-Out
      { wch: 22 }, // Kostenbasis
      { wch: 18 }, // Status
      { wch: 14 }, // Zielanpassung
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Fallback: if no departments, create empty sheet
  if (departments.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['Keine Daten vorhanden']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Leer');
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

  // Generate month columns: Feb 2026 - Jan 2027
  const months: { label: string; key: string }[] = [];
  for (let m = 1; m <= 12; m++) {
    // Feb 2026 (m=1) -> month 2, ..., Jan 2027 (m=12) -> month 1
    const year = m <= 11 ? 2026 : 2027;
    const monthNum = m <= 11 ? m + 1 : 1;
    const d = new Date(year, monthNum - 1, 1);
    const label = d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
    const key = `${year}-${String(monthNum).padStart(2, '0')}`;
    months.push({ label, key });
  }

  // Headers
  const headerRow = [
    'Description',
    'Department',
    'Work Area',
    'Unit Cost (€)',
    'Date',
    ...months.map((m) => m.label),
    'Q1 Total',
    'Q2 Total',
    'Q3 Total',
    'Q4 Total',
    'Yearly Total',
  ];

  const rows: (string | number)[][] = [headerRow];

  for (const item of items) {
    const wa = waMap.get(item.work_area_id);
    const dept = wa ? deptMap.get(wa.department_id) : undefined;

    // Parse cash-out month from expected_cash_out (format: "YYYY-MM" or "YYYY-MM-DD")
    const cashOutKey = item.expected_cash_out.slice(0, 7); // "YYYY-MM"

    const monthValues: number[] = months.map((m) =>
      m.key === cashOutKey ? fmt(item.current_amount * budgetFactor) : 0,
    );

    // Quarterly totals (3 months each)
    const q1 = monthValues.slice(0, 3).reduce((a, b) => a + b, 0);
    const q2 = monthValues.slice(3, 6).reduce((a, b) => a + b, 0);
    const q3 = monthValues.slice(6, 9).reduce((a, b) => a + b, 0);
    const q4 = monthValues.slice(9, 12).reduce((a, b) => a + b, 0);
    const yearly = q1 + q2 + q3 + q4;

    rows.push([
      item.description,
      dept?.name ?? '',
      wa?.name ?? '',
      fmt(item.current_amount),
      item.expected_cash_out,
      ...monthValues,
      fmt(q1),
      fmt(q2),
      fmt(q3),
      fmt(q4),
      fmt(yearly),
    ]);
  }

  // Totals row
  if (items.length > 0) {
    const totalsRow: (string | number)[] = ['TOTAL', '', '', '', ''];
    for (let col = 0; col < months.length + 5; col++) {
      let sum = 0;
      for (let r = 1; r < rows.length; r++) {
        const val = rows[r][col + 5];
        if (typeof val === 'number') sum += val;
      }
      totalsRow.push(fmt(sum));
    }
    rows.push([]);
    rows.push(totalsRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 40 }, // Description
    { wch: 22 }, // Department
    { wch: 25 }, // Work Area
    { wch: 14 }, // Unit Cost
    { wch: 12 }, // Date
    ...months.map(() => ({ wch: 14 })),
    { wch: 14 }, // Q1
    { wch: 14 }, // Q2
    { wch: 14 }, // Q3
    { wch: 14 }, // Q4
    { wch: 14 }, // Yearly
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'BudgetTemplate');
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

  // ---- Sheet 1: Zusammenfassung ----
  const summaryRows: (string | number)[][] = [];

  summaryRows.push(['CAPEX Steering Committee Report']);
  summaryRows.push([`Stand: ${dateStr()}`]);
  summaryRows.push([]);

  // -- Budget vs Committed vs Remaining pro Department --
  summaryRows.push(['Budget-Übersicht nach Department']);
  summaryRows.push(['Department', 'Budget (€)', 'Committed (€)', 'Remaining (€)', 'Auslastung (%)']);

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
    'GESAMT',
    fmt(summary.budget),
    fmt(summary.committed),
    fmt(summary.remaining),
    summary.budget > 0 ? Math.round((summary.committed / summary.budget) * 100) : 0,
  ]);

  summaryRows.push([]);
  summaryRows.push([]);

  // -- Top 10 größte offene Positionen --
  summaryRows.push(['Top 10 größte offene Positionen']);
  summaryRows.push(['#', 'Beschreibung', 'Department', 'Work Area', 'Betrag (€)', 'Status']);

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

  // -- Cash-Out nächste 3 Monate --
  summaryRows.push(['Cash-Out nächste 3 Monate']);
  summaryRows.push(['Monat', 'Betrag (€)', 'Anzahl Positionen']);

  const now = new Date();
  for (let offset = 0; offset < 3; offset++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const targetKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = targetDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

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

  XLSX.utils.book_append_sheet(wb, ws, 'Zusammenfassung');
  triggerDownload(wb, `CAPEX_Steering_Committee_${dateStr()}.xlsx`);
}
