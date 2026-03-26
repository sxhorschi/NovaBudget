import * as XLSX from 'xlsx';
import type {
  FunctionalArea,
  WorkArea,
  CostItem,
  ApprovalStatus,
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
  functionalAreas: FunctionalArea[];
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
  COMMENTS: 13,       // N
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

/**
 * Normalize a raw enum value to a lowercase_underscored ID.
 * This matches whatever IDs are configured in the admin panel —
 * no hardcoded product/phase/cost names needed.
 */
function normalizeEnumValue(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

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

export function parseExcelFile(data: ArrayBuffer, facilityId: string = ''): ExcelParseResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  const functionalAreas: FunctionalArea[] = [];
  const workAreas: WorkArea[] = [];
  const costItems: CostItem[] = [];
  const warnings: ParseWarning[] = [];
  const previewRows: Record<string, unknown>[] = [];

  let nextFaId = 1000; // Start high to avoid collision with existing data
  let nextWaId = 1000;
  let nextCiId = 1000;

  function faIdStr(): string { return `fa-imp-${nextFaId++}`; }
  function waIdStr(): string { return `wa-imp-${nextWaId++}`; }
  function ciIdStr(): string { return `ci-imp-${nextCiId++}`; }

  const now = new Date().toISOString().split('T')[0];

  // Build column mappings from first detected data sheet
  const columnMappings: ColumnMapping[] = [];

  // Process each sheet as a functional area
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
        message: `Header not found for: ${missingRequired.join(', ')}. Falling back to default columns.`,
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

    // Create functional area for this sheet
    const faId = faIdStr();
    const faName = sheetName.replace(/_/g, ' ');
    functionalAreas.push({
      id: faId,
      facility_id: facilityId,
      name: faName,
      budget_total: 0,
      budgets: [],
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
            wa => wa.functional_area_id === faId && wa.name === waName,
          );
          if (existing) {
            currentWorkArea = existing;
          } else {
            const waId = waIdStr();
            const newWa: WorkArea = {
              id: waId,
              functional_area_id: faId,
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
            wa => wa.functional_area_id === faId && wa.name === waCellValue,
          );
          if (existing) {
            currentWorkArea = existing;
          } else {
            const waId = waIdStr();
            const newWa: WorkArea = {
              id: waId,
              functional_area_id: faId,
              name: waCellValue,
            };
            workAreas.push(newWa);
            currentWorkArea = newWa;
          }
        }

        // Ensure we have a work area
        if (!currentWorkArea) {
          const waId = waIdStr();
          currentWorkArea = {
            id: waId,
            functional_area_id: faId,
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
        const costItem: CostItem = {
          id: ciIdStr(),
          work_area_id: currentWorkArea.id,
          description,
          unit_price: amount,
          quantity: 1,
          total_amount: amount,
          expected_cash_out: cellDate(row, colMap.CASH_OUT),
          cost_basis: normalizeEnumValue(row[colMap.COST_BASIS]) || 'cost_estimation',
          cost_driver: normalizeEnumValue(row[colMap.COST_DRIVER]) || 'initial_setup',
          basis_description: cellStr(row, colMap.BASIS_DESC) ?? '',
          assumptions: cellStr(row, colMap.ASSUMPTIONS) ?? '',
          approval_status: parseEnum(APPROVAL_STATUS_MAP, row[colMap.APPROVAL], 'open' as ApprovalStatus),
          approval_date: cellDateOrNull(row, colMap.APPROVAL_DATE),
          project_phase: normalizeEnumValue(row[colMap.PHASE]) || 'phase_1',
          product: normalizeEnumValue(row[colMap.PRODUCT]) || 'overall',
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

    // Update functional area budget total
    const fa = functionalAreas.find(d => d.id === faId);
    if (fa) {
      fa.budget_total = sheetTotal;
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
    functionalAreas,
    workAreas,
    costItems,
    warnings,
    columnMappings,
    previewRows,
  };
}
