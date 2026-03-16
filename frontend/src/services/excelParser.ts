import * as XLSX from 'xlsx';
import type {
  Department,
  WorkArea,
  CostItem,
  ApprovalStatus,
  ProjectPhase,
  Product,
  CostBasis,
  CostDriver,
} from '../types/budget';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ParseWarning {
  sheet: string;
  row: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ColumnMapping {
  column: string;
  field: string;
}

export interface ExcelParseResult {
  departments: Department[];
  workAreas: WorkArea[];
  costItems: CostItem[];
  warnings: ParseWarning[];
  columnMappings: ColumnMapping[];
  /** Raw preview rows (first 20 data rows across all sheets) for the preview table */
  previewRows: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Constants — mirror backend excel_import.py
// ---------------------------------------------------------------------------

const HEADER_ROW = 5; // 1-indexed (Row 5 = headers)
const DATA_START_ROW = 6; // Row 6+ = data

// Column indices (0-indexed for SheetJS)
const COL = {
  WORK_AREA: 1,       // B
  PHASE: 2,           // C
  PRODUCT: 3,         // D
  DESCRIPTION: 4,     // E
  AMOUNT: 5,          // F
  CASH_OUT: 6,        // G
  COST_BASIS: 7,      // H
  COST_DRIVER: 8,     // I
  BASIS_DESC: 9,      // J
  ASSUMPTIONS: 10,    // K
  APPROVAL: 11,       // L
  APPROVAL_DATE: 12,  // M
  ZIELANPASSUNG: 13,  // N
  COMMENTS: 14,       // O
} as const;

type ColumnKey = keyof typeof COL;
type ColumnMap = Record<ColumnKey, number>;

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  WORK_AREA: ['work area', 'workarea', 'arbeitsbereich'],
  PHASE: ['phase', 'projektphase'],
  PRODUCT: ['product', 'produkt'],
  DESCRIPTION: ['description', 'beschreibung', 'desc'],
  AMOUNT: ['amount', 'betrag', 'kosten', 'value'],
  CASH_OUT: ['cash out', 'cash-out', 'cashout'],
  COST_BASIS: ['cost basis', 'kostenbasis', 'basis'],
  COST_DRIVER: ['cost driver', 'kostentreiber', 'driver'],
  BASIS_DESC: ['basis description', 'basis beschreibung'],
  ASSUMPTIONS: ['assumptions', 'annahmen'],
  APPROVAL: ['approval', 'approval status', 'genehmigung', 'status'],
  APPROVAL_DATE: ['approval date', 'freigabedatum', 'genehmigungsdatum'],
  ZIELANPASSUNG: ['zielanpassung', 'target adjustment'],
  COMMENTS: ['comments', 'comment', 'kommentare'],
};

const COLUMN_NAMES: Record<number, string> = {
  [COL.WORK_AREA]: 'Work Area',
  [COL.PHASE]: 'Phase',
  [COL.PRODUCT]: 'Product',
  [COL.DESCRIPTION]: 'Beschreibung',
  [COL.AMOUNT]: 'Betrag',
  [COL.CASH_OUT]: 'Cash-Out Datum',
  [COL.COST_BASIS]: 'Cost Basis',
  [COL.COST_DRIVER]: 'Cost Driver',
  [COL.BASIS_DESC]: 'Basis Beschreibung',
  [COL.ASSUMPTIONS]: 'Annahmen',
  [COL.APPROVAL]: 'Genehmigungsstatus',
  [COL.APPROVAL_DATE]: 'Genehmigungsdatum',
  [COL.ZIELANPASSUNG]: 'Zielanpassung',
  [COL.COMMENTS]: 'Kommentare',
};

// ---------------------------------------------------------------------------
// Enum parsing helpers
// ---------------------------------------------------------------------------

const APPROVAL_STATUS_MAP: Record<string, ApprovalStatus> = {
  'OPEN': 'open',
  'SUBMITTED_FOR_APPROVAL': 'submitted_for_approval',
  'SUBMITTED': 'submitted_for_approval',
  'APPROVED': 'approved',
  'REJECTED': 'rejected',
  'ON_HOLD': 'on_hold',
  'PENDING_SUPPLIER_NEGOTIATION': 'pending_supplier_negotiation',
  'PENDING_SUPPLIER': 'pending_supplier_negotiation',
  'PENDING_TECHNICAL_CLARIFICATION': 'pending_technical_clarification',
  'PENDING_TECHNICAL': 'pending_technical_clarification',
  'OBSOLETE': 'obsolete',
};

const PROJECT_PHASE_MAP: Record<string, ProjectPhase> = {
  'PHASE_1': 'phase_1',
  'PHASE_2': 'phase_2',
  'PHASE_3': 'phase_3',
  'PHASE_4': 'phase_4',
  'PHASE 1': 'phase_1',
  'PHASE 2': 'phase_2',
  'PHASE 3': 'phase_3',
  'PHASE 4': 'phase_4',
  '1': 'phase_1',
  '2': 'phase_2',
  '3': 'phase_3',
  '4': 'phase_4',
};

const PRODUCT_MAP: Record<string, Product> = {
  'ATLAS': 'atlas',
  'ORION': 'orion',
  'VEGA': 'vega',
  'OVERALL': 'overall',
  // Legacy names from old Excel files
  'BRYAN': 'atlas',
  'GUENTHER': 'orion',
  'GIN_TONIC': 'vega',
  'GIN-TONIC': 'vega',
};

const COST_BASIS_MAP: Record<string, CostBasis> = {
  'COST_ESTIMATION': 'cost_estimation',
  'COST ESTIMATION': 'cost_estimation',
  'INITIAL_SUPPLIER_OFFER': 'initial_supplier_offer',
  'INITIAL SUPPLIER OFFER': 'initial_supplier_offer',
  'REVISED_SUPPLIER_OFFER': 'revised_supplier_offer',
  'REVISED SUPPLIER OFFER': 'revised_supplier_offer',
  'CHANGE_COST': 'change_cost',
  'CHANGE COST': 'change_cost',
};

const COST_DRIVER_MAP: Record<string, CostDriver> = {
  'PRODUCT': 'product',
  'PROCESS': 'process',
  'NEW_REQ_ASSEMBLY': 'new_req_assembly',
  'NEW REQ ASSEMBLY': 'new_req_assembly',
  'NEW_REQ_TESTING': 'new_req_testing',
  'NEW REQ TESTING': 'new_req_testing',
  'INITIAL_SETUP': 'initial_setup',
  'INITIAL SETUP': 'initial_setup',
};

function parseEnum<T>(map: Record<string, T>, value: unknown, fallback: T): T {
  if (value == null) return fallback;
  const str = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  // Exact match
  if (str in map) return map[str];
  // Try with spaces instead of underscores
  const strSpaced = String(value).trim().toUpperCase();
  if (strSpaced in map) return map[strSpaced];
  // Partial match
  for (const [key, val] of Object.entries(map)) {
    if (str.includes(key) || key.includes(str)) return val;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Cell value helpers
// ---------------------------------------------------------------------------

function cellStr(row: unknown[], colIdx: number): string | null {
  const val = row[colIdx];
  if (val == null) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

function cellNum(row: unknown[], colIdx: number): number {
  const val = row[colIdx];
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

/** Convert Excel serial date number to ISO date string */
function excelSerialToDate(serial: number): string {
  // Excel epoch is 1900-01-01 (serial 1), but has a leap year bug (serial 60 = Feb 29, 1900)
  const epoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899
  const ms = epoch.getTime() + serial * 86400000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(val: unknown): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') return excelSerialToDate(val);
  const str = String(val).trim();
  if (str.length === 0) return null;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

function cellDate(row: unknown[], colIdx: number): string {
  return parseDate(row[colIdx]) ?? new Date().toISOString().split('T')[0];
}

function cellDateOrNull(row: unknown[], colIdx: number): string | null {
  return parseDate(row[colIdx]);
}

// ---------------------------------------------------------------------------
// Row classification (mirrors backend logic)
// ---------------------------------------------------------------------------

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\-\n]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function detectColumnMap(headerRow: unknown[] | undefined): { map: ColumnMap; detected: Set<ColumnKey> } {
  const map: ColumnMap = { ...COL };
  const detected = new Set<ColumnKey>();
  if (!headerRow) return { map, detected };

  for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
    const header = normalizeHeader(headerRow[colIdx]);
    if (!header) continue;

    for (const key of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
      if (detected.has(key)) continue;
      const aliases = HEADER_ALIASES[key];
      if (aliases.some((alias) => header.includes(alias))) {
        map[key] = colIdx;
        detected.add(key);
      }
    }
  }

  return { map, detected };
}

function isSubtotalRow(row: unknown[], map: ColumnMap): boolean {
  const hasWorkArea = row[map.WORK_AREA] != null;
  const hasAmount = row[map.AMOUNT] != null;
  const hasDescription = row[map.DESCRIPTION] != null;
  const hasPhase = row[map.PHASE] != null;
  return hasWorkArea && hasAmount && !hasDescription && !hasPhase;
}

function isDataRow(row: unknown[], map: ColumnMap): boolean {
  const hasDescription = row[map.DESCRIPTION] != null && String(row[map.DESCRIPTION]).trim().length > 0;
  const hasAmount = row[map.AMOUNT] != null;
  return hasDescription && hasAmount;
}

function isEmptyRow(row: unknown[], map: ColumnMap): boolean {
  if (!row) return true;
  const columns = new Set<number>(Object.values(map));
  for (const i of columns) {
    if (row[i] != null && String(row[i]).trim().length > 0) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Column letter helper
// ---------------------------------------------------------------------------

function colLetter(idx: number): string {
  return String.fromCharCode(65 + idx); // 0=A, 1=B, ...
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseExcelFile(data: ArrayBuffer): ExcelParseResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  const departments: Department[] = [];
  const workAreas: WorkArea[] = [];
  const costItems: CostItem[] = [];
  const warnings: ParseWarning[] = [];
  const previewRows: Record<string, unknown>[] = [];

  let nextDeptId = 1000; // Start high to avoid collision with mock data
  let nextWaId = 1000;
  let nextCiId = 1000;

  const now = new Date().toISOString().split('T')[0];

  // Build column mappings from first detected data sheet
  const columnMappings: ColumnMapping[] = [];

  // Process each sheet as a department
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    // Convert sheet to array of arrays (0-indexed rows and columns)
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: null,
    });

    // Skip sheets that are too short or look like summary/config sheets
    if (rawRows.length < DATA_START_ROW) {
      // Check if it has at least a header row
      if (rawRows.length < HEADER_ROW) continue;
    }

    // Verify this looks like a data sheet by checking for header keywords in row 5
    const headerRow = rawRows[HEADER_ROW - 1]; // 0-indexed
    if (!headerRow) continue;
    const { map: colMap, detected } = detectColumnMap(headerRow);

    // Heuristic: a data sheet should have recognizable headers
    const headerStr = headerRow.map(h => String(h ?? '').toLowerCase()).join(' ');
    const looksLikeDataSheet =
      headerStr.includes('description') ||
      headerStr.includes('beschreibung') ||
      headerStr.includes('amount') ||
      headerStr.includes('betrag') ||
      headerStr.includes('work area') ||
      headerStr.includes('arbeitsbereich') ||
      headerStr.includes('phase') ||
      headerStr.includes('cost');

    if (!looksLikeDataSheet && workbook.SheetNames.length > 1) {
      // Skip non-data sheets in multi-sheet workbooks
      continue;
    }

    const required: ColumnKey[] = ['DESCRIPTION', 'AMOUNT'];
    const missingRequired = required.filter((k) => !detected.has(k));
    if (missingRequired.length > 0) {
      warnings.push({
        sheet: sheetName,
        row: HEADER_ROW,
        message: `Header nicht gefunden für: ${missingRequired.join(', ')}. Es wird auf Standard-Spalten zurückgefallen.`,
        severity: 'warning',
      });
    }

    if (columnMappings.length === 0) {
      for (const key of Object.keys(colMap) as ColumnKey[]) {
        const idx = colMap[key];
        columnMappings.push({
          column: `Spalte ${colLetter(idx)}`,
          field: COLUMN_NAMES[idx] ?? key,
        });
      }
    }

    // Create department for this sheet
    const deptId = nextDeptId++;
    const deptName = sheetName.replace(/_/g, ' ');
    departments.push({
      id: deptId,
      facility_id: 1,
      name: deptName,
      budget_total: 0,
    });

    let currentWorkArea: WorkArea | null = null;
    let sheetTotal = 0;

    // Parse data rows (starting from DATA_START_ROW, 1-indexed → index DATA_START_ROW - 1)
    for (let rowIdx = DATA_START_ROW - 1; rowIdx < rawRows.length; rowIdx++) {
      const row = rawRows[rowIdx];
      if (!row || isEmptyRow(row, colMap)) continue;

      const excelRow = rowIdx + 1; // 1-indexed for display

      // Subtotal row → extract work area name
      if (isSubtotalRow(row, colMap)) {
        const waName = cellStr(row, colMap.WORK_AREA);
        if (waName) {
          // Check if we already have this work area
          const existing = workAreas.find(
            wa => wa.department_id === deptId && wa.name === waName,
          );
          if (existing) {
            currentWorkArea = existing;
          } else {
            const waId = nextWaId++;
            const newWa: WorkArea = {
              id: waId,
              department_id: deptId,
              name: waName,
            };
            workAreas.push(newWa);
            currentWorkArea = newWa;
          }
        }
        continue;
      }

      // Data row
      if (isDataRow(row, colMap)) {
        // If col B has a work area name and we don't have a current one, create it
        const waCellValue = cellStr(row, colMap.WORK_AREA);
        if (waCellValue && !currentWorkArea) {
          const existing = workAreas.find(
            wa => wa.department_id === deptId && wa.name === waCellValue,
          );
          if (existing) {
            currentWorkArea = existing;
          } else {
            const waId = nextWaId++;
            const newWa: WorkArea = {
              id: waId,
              department_id: deptId,
              name: waCellValue,
            };
            workAreas.push(newWa);
            currentWorkArea = newWa;
          }
        }

        // Ensure we have a work area
        if (!currentWorkArea) {
          const waId = nextWaId++;
          currentWorkArea = {
            id: waId,
            department_id: deptId,
            name: 'Allgemein',
          };
          workAreas.push(currentWorkArea);
        }

        const amount = cellNum(row, colMap.AMOUNT);
        if (amount === 0) {
          warnings.push({
            sheet: sheetName,
            row: excelRow,
            message: `Zeile ohne Betrag — wird uebersprungen`,
            severity: 'warning',
          });
          continue;
        }

        const description = cellStr(row, colMap.DESCRIPTION) ?? '';
        const zielVal = cellNum(row, colMap.ZIELANPASSUNG);

        const costItem: CostItem = {
          id: nextCiId++,
          work_area_id: currentWorkArea.id,
          description,
          original_amount: amount,
          current_amount: amount,
          expected_cash_out: cellDate(row, colMap.CASH_OUT),
          cost_basis: parseEnum(COST_BASIS_MAP, row[colMap.COST_BASIS], 'cost_estimation' as CostBasis),
          cost_driver: parseEnum(COST_DRIVER_MAP, row[colMap.COST_DRIVER], 'initial_setup' as CostDriver),
          basis_description: cellStr(row, colMap.BASIS_DESC) ?? '',
          assumptions: cellStr(row, colMap.ASSUMPTIONS) ?? '',
          approval_status: parseEnum(APPROVAL_STATUS_MAP, row[colMap.APPROVAL], 'open' as ApprovalStatus),
          approval_date: cellDateOrNull(row, colMap.APPROVAL_DATE),
          project_phase: parseEnum(PROJECT_PHASE_MAP, row[colMap.PHASE], 'phase_1' as ProjectPhase),
          product: parseEnum(PRODUCT_MAP, row[colMap.PRODUCT], 'overall' as Product),
          zielanpassung: zielVal !== 0,
          zielanpassung_reason: zielVal !== 0 ? String(zielVal) : '',
          comments: cellStr(row, colMap.COMMENTS) ?? '',
          created_at: now,
          updated_at: now,
        };

        costItems.push(costItem);
        sheetTotal += amount;

        // Collect preview rows (max 20 total)
        if (previewRows.length < 20) {
          previewRows.push({
            _sheet: sheetName,
            _row: excelRow,
            'Work Area': cellStr(row, colMap.WORK_AREA) ?? currentWorkArea.name,
            'Phase': cellStr(row, colMap.PHASE) ?? '',
            'Product': cellStr(row, colMap.PRODUCT) ?? '',
            'Beschreibung': description,
            'Betrag': amount,
            'Cash-Out': cellStr(row, colMap.CASH_OUT) ?? '',
            'Status': cellStr(row, colMap.APPROVAL) ?? '',
          });
        }
      }
    }

    // Update department budget total
    const dept = departments.find(d => d.id === deptId);
    if (dept) {
      dept.budget_total = sheetTotal;
    }
  }

  // Warn if no data was found
  if (costItems.length === 0 && warnings.length === 0) {
    warnings.push({
      sheet: '-',
      row: 0,
      message: 'Keine Daten erkannt. Stellen Sie sicher, dass die Excel-Datei dem erwarteten Format entspricht (Header in Zeile 5, Daten ab Zeile 6).',
      severity: 'error',
    });
  }

  return {
    departments,
    workAreas,
    costItems,
    warnings,
    columnMappings,
    previewRows,
  };
}
