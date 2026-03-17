import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Eye,
  Building2,
  FlaskConical,
  Info,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/common/ToastProvider';
import { useBudgetData } from '../context/BudgetDataContext';
import { USE_MOCKS } from '../mocks/data';
import { parseExcelFile } from '../services/excelParser';
import type { ExcelParseResult, ParseWarning, ColumnMapping } from '../services/excelParser';
import client from '../api/client';
import { formatEUR as formatAmount } from '../components/costbook/AmountCell';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ImportStep = 'upload' | 'preview' | 'importing' | 'dry-run-result' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { key: 'upload' as const, label: '1. Upload', activeSteps: ['upload'] },
  { key: 'preview' as const, label: '2. Preview', activeSteps: ['preview', 'dry-run-result'] },
  { key: 'import' as const, label: '3. Import', activeSteps: ['importing', 'success'] },
];

const StepIndicator: React.FC<{ currentStep: ImportStep }> = ({ currentStep }) => {
  const getStepState = (step: typeof STEPS[number]) => {
    if (step.activeSteps.includes(currentStep)) return 'active';
    const currentIdx = STEPS.findIndex(s => s.activeSteps.includes(currentStep));
    const stepIdx = STEPS.indexOf(step);
    if (stepIdx < currentIdx) return 'done';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, idx) => {
        const state = getStepState(step);
        return (
          <React.Fragment key={step.key}>
            {idx > 0 && (
              <div
                className={`h-px w-12 ${
                  state === 'pending' ? 'bg-gray-200' : 'bg-indigo-400'
                }`}
              />
            )}
            <div
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${state === 'active' ? 'bg-indigo-100 text-indigo-700' : ''}
                ${state === 'done' ? 'bg-green-100 text-green-700' : ''}
                ${state === 'pending' ? 'bg-gray-100 text-gray-400' : ''}
              `}
            >
              {state === 'done' && <CheckCircle size={14} />}
              {step.label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Preview Table
// ---------------------------------------------------------------------------

const PreviewTable: React.FC<{ rows: Record<string, unknown>[] }> = ({ rows }) => {
  if (rows.length === 0) return null;
  const columns = Object.keys(rows[0]).filter(k => !k.startsWith('_'));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                #
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-1.5 text-xs text-gray-400 tabular-nums">
                  {(row['_row'] as number) ?? idx + 1}
                </td>
                {columns.map(col => (
                  <td key={col} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                    {col === 'Amount'
                      ? formatAmount(row[col] as number)
                      : String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Row-Level Error Table
// ---------------------------------------------------------------------------

interface RowError {
  row: number;
  sheet: string;
  severity: 'error' | 'warning';
  message: string;
}

const ErrorTable: React.FC<{ errors: RowError[] }> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <div className="border border-red-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-red-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-red-600 uppercase tracking-wider w-16">
                Row
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-red-600 uppercase tracking-wider w-28">
                Sheet
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-red-600 uppercase tracking-wider w-20">
                Severity
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-red-600 uppercase tracking-wider">
                Message
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-100 bg-white">
            {errors.map((err, idx) => (
              <tr key={idx} className="hover:bg-red-50/50">
                <td className="px-3 py-1.5 text-xs text-gray-600 tabular-nums font-mono">
                  {err.row > 0 ? err.row : '-'}
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-600 truncate max-w-[120px]">
                  {err.sheet !== '-' ? err.sheet : '-'}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      err.severity === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {err.severity === 'error' ? (
                      <AlertCircle size={10} />
                    ) : (
                      <AlertTriangle size={10} />
                    )}
                    {err.severity}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs text-gray-700">
                  {err.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errors.length > 50 && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200 text-xs text-red-600 italic">
          Showing first 50 of {errors.length} issues
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Warnings List (compact fallback for non-row errors)
// ---------------------------------------------------------------------------

const WarningsList: React.FC<{ warnings: ParseWarning[] }> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-red-600" />
            <span className="text-sm font-medium text-red-800">
              {errors.length} {errors.length === 1 ? 'error' : 'errors'}
            </span>
          </div>
          <ul className="text-xs text-red-700 space-y-0.5 ml-5">
            {errors.slice(0, 10).map((e, i) => (
              <li key={i}>
                {e.sheet !== '-' && `[${e.sheet}] `}
                {e.row > 0 && `Row ${e.row}: `}
                {e.message}
              </li>
            ))}
            {errors.length > 10 && (
              <li className="italic">...and {errors.length - 10} more</li>
            )}
          </ul>
        </div>
      )}
      {warns.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {warns.length} {warns.length === 1 ? 'warning' : 'warnings'}
            </span>
          </div>
          <ul className="text-xs text-amber-700 space-y-0.5 ml-5">
            {warns.slice(0, 10).map((w, i) => (
              <li key={i}>
                [{w.sheet}] Row {w.row}: {w.message}
              </li>
            ))}
            {warns.length > 10 && (
              <li className="italic">...and {warns.length - 10} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Column Mapping Display
// ---------------------------------------------------------------------------

const ColumnMappingDisplay: React.FC<{ mappings: ColumnMapping[] }> = ({ mappings }) => (
  <details className="rounded-lg border border-gray-200 bg-gray-50">
    <summary className="px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
      Show column mapping
    </summary>
    <div className="px-4 pb-3 pt-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
        {mappings.map(m => (
          <div key={m.column} className="text-xs text-gray-600">
            <span className="font-mono text-gray-400">{m.column}</span>
            <span className="mx-1 text-gray-300">&rarr;</span>
            <span>{m.field}</span>
          </div>
        ))}
      </div>
    </div>
  </details>
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// ImportPage
// ---------------------------------------------------------------------------

const ImportPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { facilityId } = useParams<{ facilityId: string }>();
  const { facility, bulkImport } = useBudgetData();

  const [step, setStep] = useState<ImportStep>('upload');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  // Use facility ID from URL params (route-scoped), falling back to context
  const selectedFacilityId = facilityId ?? facility.id;

  // Convert warnings to row-level errors for table display
  const rowErrors: RowError[] = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.warnings
      .map(w => ({
        row: w.row,
        sheet: w.sheet,
        severity: w.severity,
        message: w.message,
      }))
      .slice(0, 50);
  }, [parseResult]);

  // Has row-level issues?
  const hasRowErrors = rowErrors.some(e => e.row > 0);

  // --- File handling ---
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      toast.error('Only .xlsx files are supported.');
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setRawFile(file);
    setDryRunResult(null);

    if (USE_MOCKS) {
      // Client-side parsing with xlsx library
      try {
        const buffer = await file.arrayBuffer();
        const result = parseExcelFile(buffer, selectedFacilityId);
        setParseResult(result);

        if (result.costItems.length === 0) {
          setStep('error');
          setErrorMessage('No importable data found. Please check the file format.');
        } else {
          setStep('preview');
        }
      } catch (err: unknown) {
        setStep('error');
        setErrorMessage(
          err instanceof Error
            ? `Error reading file: ${err.message}`
            : 'Unknown error reading file.',
        );
      }
    } else {
      // Real API mode — parse client-side for preview, upload on confirm
      try {
        const buffer = await file.arrayBuffer();
        const result = parseExcelFile(buffer, selectedFacilityId);
        setParseResult(result);

        if (result.costItems.length === 0) {
          setStep('error');
          setErrorMessage('No importable data found. Please check the file format.');
        } else {
          setStep('preview');
        }
      } catch (err: unknown) {
        setStep('error');
        setErrorMessage(
          err instanceof Error
            ? `Error reading file: ${err.message}`
            : 'Unknown error reading file.',
        );
      }
    }
  }, [toast, selectedFacilityId]);

  // --- Dry Run ---
  const runDryRun = useCallback(async () => {
    if (!rawFile) return;
    setDryRunLoading(true);

    try {
      if (USE_MOCKS) {
        // In mock mode, simulate a dry run result from client-side data
        await new Promise(resolve => setTimeout(resolve, 500));
        setDryRunResult({
          dry_run: true,
          status: 'success',
          summary: {
            departments_created: parseResult?.departments.length ?? 0,
            departments_updated: 0,
            total_work_areas: parseResult?.workAreas.length ?? 0,
            total_items_imported: parseResult?.costItems.length ?? 0,
            total_items_updated: 0,
            total_items_skipped: 0,
            total_amount: parseResult?.costItems.reduce((s, i) => s + i.current_amount, 0) ?? 0,
          },
          warnings: parseResult?.warnings.filter(w => w.severity === 'warning').map(w =>
            `${w.sheet !== '-' ? `[${w.sheet}] ` : ''}${w.row > 0 ? `Row ${w.row}: ` : ''}${w.message}`
          ) ?? [],
          errors: parseResult?.warnings.filter(w => w.severity === 'error').map(w =>
            `${w.sheet !== '-' ? `[${w.sheet}] ` : ''}${w.row > 0 ? `Row ${w.row}: ` : ''}${w.message}`
          ) ?? [],
        });
        setStep('dry-run-result');
      } else {
        const formData = new FormData();
        formData.append('file', rawFile);

        const response = await client.post(
          `/import/excel?facility_id=${selectedFacilityId}&dry_run=true`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        setDryRunResult(response.data);
        setStep('dry-run-result');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } }; message?: string };
      toast.error(
        axiosError?.response?.data?.detail ||
        axiosError?.message ||
        'Dry run failed.',
      );
    } finally {
      setDryRunLoading(false);
    }
  }, [rawFile, parseResult, selectedFacilityId, toast]);

  // --- Confirm import ---
  const confirmImport = useCallback(async () => {
    if (!parseResult) return;

    setStep('importing');
    setProgress(0);

    try {
      if (USE_MOCKS) {
        // Simulate import with progress
        await new Promise<void>((resolve) => {
          let pct = 0;
          const interval = setInterval(() => {
            pct += 5;
            setProgress(Math.min(pct, 100));
            if (pct >= 100) {
              clearInterval(interval);
              resolve();
            }
          }, 40);
        });

        // Write to context
        bulkImport({
          departments: parseResult.departments,
          workAreas: parseResult.workAreas,
          costItems: parseResult.costItems,
        });
      } else {
        // Real API upload
        if (!rawFile) throw new Error('File not available.');
        const formData = new FormData();
        formData.append('file', rawFile);

        await client.post(`/import/excel?facility_id=${selectedFacilityId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
            }
          },
        });
      }

      setStep('success');
      setProgress(100);
      toast.success('Import completed successfully');
    } catch (err: unknown) {
      setStep('error');
      setProgress(0);
      const axiosError = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMessage(
        axiosError?.response?.data?.detail ||
          axiosError?.message ||
          'Import failed. Please try again.',
      );
    }
  }, [parseResult, rawFile, selectedFacilityId, bulkImport, toast]);

  // --- Drag & Drop ---
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  // --- Reset ---
  const reset = useCallback(() => {
    setStep('upload');
    setFileName('');
    setFileSize(0);
    setParseResult(null);
    setProgress(0);
    setErrorMessage('');
    setRawFile(null);
    setDryRunResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // --- Stats ---
  const uniqueWorkAreaCount = parseResult
    ? new Set(parseResult.workAreas.map(wa => wa.name)).size
    : 0;

  const totalAmount = useMemo(() => {
    if (!parseResult) return 0;
    return parseResult.costItems.reduce((sum, ci) => sum + ci.current_amount, 0);
  }, [parseResult]);

  return (
    <div className="flex-1 flex items-start justify-center pt-12 px-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Import Data</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload an Excel file to import budget data.
          </p>
        </div>

        {/* Facility Selector */}
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-2.5">
          <Building2 size={16} className="text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider">
              Importing into facility
            </p>
            <p className="text-sm font-semibold text-indigo-900 truncate">
              {facility.name}
            </p>
          </div>
          <span className="text-[10px] text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full">
            ID: {selectedFacilityId}
          </span>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* ============================================================= */}
        {/* Step 1: Upload */}
        {/* ============================================================= */}
        {step === 'upload' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed
              p-16 cursor-pointer transition-all duration-200
              ${
                dragging
                  ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
              }
            `}
          >
            <div
              className={`
                rounded-full p-4 transition-colors
                ${dragging ? 'bg-indigo-100' : 'bg-gray-100'}
              `}
            >
              <Upload
                size={32}
                className={dragging ? 'text-indigo-600' : 'text-gray-400'}
              />
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium">
                Drop Excel file here
              </p>
              <p className="text-sm text-gray-400 mt-1">
                or click to select
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-500">
                <FileSpreadsheet size={12} />
                .xlsx
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Expected format: header in row 5, data from row 6. One sheet per department.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={onFileSelect}
            />
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 2: Preview */}
        {/* ============================================================= */}
        {step === 'preview' && parseResult && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
              <FileSpreadsheet size={20} className="text-indigo-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
              </div>
              <button
                onClick={reset}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Different file
              </button>
            </div>

            {/* Statistics — enhanced with 4 cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {parseResult.departments.length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Departments</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {uniqueWorkAreaCount}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Work Areas</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {parseResult.costItems.length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Cost Items</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                <p className="text-lg font-bold text-gray-900 tabular-nums">
                  {formatAmount(totalAmount)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Total Amount</p>
              </div>
            </div>

            {/* Detected sheets */}
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Detected departments (sheets)</p>
              <div className="flex flex-wrap gap-2">
                {parseResult.departments.map(dept => {
                  const deptItems = parseResult.costItems.filter(ci =>
                    parseResult.workAreas
                      .filter(wa => wa.department_id === dept.id)
                      .some(wa => wa.id === ci.work_area_id),
                  );
                  const deptWorkAreas = parseResult.workAreas.filter(
                    wa => wa.department_id === dept.id,
                  );
                  return (
                    <span
                      key={dept.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-xs text-indigo-700"
                    >
                      {dept.name}
                      <span className="text-indigo-400">
                        ({deptItems.length} items, {deptWorkAreas.length} areas)
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Row-level errors table */}
            {hasRowErrors && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-sm font-medium text-red-700">
                    Row-level issues ({rowErrors.length})
                  </p>
                </div>
                <ErrorTable errors={rowErrors} />
              </div>
            )}

            {/* Warnings (non-row-level) */}
            {!hasRowErrors && <WarningsList warnings={parseResult.warnings} />}

            {/* Column Mapping */}
            <ColumnMappingDisplay mappings={parseResult.columnMappings} />

            {/* Preview Table */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Eye size={14} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-700">
                  Preview (first {parseResult.previewRows.length} rows)
                </p>
              </div>
              <PreviewTable rows={parseResult.previewRows} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={runDryRun}
                  disabled={dryRunLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  {dryRunLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FlaskConical size={14} />
                  )}
                  Dry Run
                </button>
                <button
                  onClick={confirmImport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Import {parseResult.costItems.length} items
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 2b: Dry Run Result */}
        {/* ============================================================= */}
        {step === 'dry-run-result' && dryRunResult && parseResult && (
          <div className="space-y-4">
            {/* Dry run banner */}
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <FlaskConical size={16} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">
                  Dry Run Result — No changes were made
                </span>
              </div>
              <p className="text-xs text-amber-700">
                This is a validation-only preview. Click "Import" to apply changes.
              </p>
            </div>

            {/* Summary stats from dry run */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                <p className="text-2xl font-bold text-green-600 tabular-nums">
                  {dryRunResult.summary?.total_items_imported ?? parseResult.costItems.length}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Would Import</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                <p className="text-2xl font-bold text-blue-600 tabular-nums">
                  {dryRunResult.summary?.total_items_updated ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Would Update</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                <p className="text-2xl font-bold text-gray-400 tabular-nums">
                  {dryRunResult.summary?.total_items_skipped ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Would Skip</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-center">
                <p className="text-2xl font-bold text-gray-900 tabular-nums">
                  {dryRunResult.summary?.total_work_areas ?? uniqueWorkAreaCount}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Work Areas</p>
              </div>
            </div>

            {/* Dry run errors/warnings */}
            {(dryRunResult.errors?.length > 0 || dryRunResult.warnings?.length > 0) && (
              <div className="space-y-2">
                {dryRunResult.errors?.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={14} className="text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        {dryRunResult.errors.length} error(s) found
                      </span>
                    </div>
                    <ul className="text-xs text-red-700 space-y-0.5 ml-5">
                      {dryRunResult.errors.slice(0, 15).map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {dryRunResult.warnings?.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">
                        {dryRunResult.warnings.length} warning(s)
                      </span>
                    </div>
                    <ul className="text-xs text-amber-700 space-y-0.5 ml-5">
                      {dryRunResult.warnings.slice(0, 15).map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Validation passed info */}
            {(!dryRunResult.errors || dryRunResult.errors.length === 0) && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  Validation passed — file is ready to import.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep('preview')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to Preview
              </button>
              <button
                onClick={confirmImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Import {parseResult.costItems.length} items
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 3a: Importing (Progress) */}
        {/* ============================================================= */}
        {step === 'importing' && (
          <div className="rounded-xl border border-gray-200 bg-white p-8">
            <div className="flex items-center gap-4">
              <Loader2 size={24} className="text-indigo-600 animate-spin" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Importing data into {facility.name}...
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {parseResult?.costItems.length ?? 0} items in {parseResult?.departments.length ?? 0} departments
                </p>
              </div>
              <span className="text-sm font-mono text-indigo-600 tabular-nums">
                {progress}%
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Step 3b: Success */}
        {/* ============================================================= */}
        {step === 'success' && parseResult && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle size={28} className="text-green-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-green-900">
              Import successful
            </h3>
            <p className="text-sm text-green-700 mt-1">
              {parseResult.costItems.length} items from {parseResult.departments.length} departments
              were imported into <span className="font-semibold">{facility.name}</span>.
            </p>

            {/* Summary */}
            <div className="mt-4 inline-flex flex-col items-start gap-1 text-left text-xs text-green-700 bg-green-100/50 rounded-lg px-4 py-2">
              {parseResult.departments.map(dept => (
                <div key={dept.id}>
                  <span className="font-medium">{dept.name}:</span>{' '}
                  {formatAmount(dept.budget_total)}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={reset}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Import another file
              </button>
              <button
                onClick={() => navigate(`/f/${facilityId}/costbook`)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                View in Costbook
              </button>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Error */}
        {/* ============================================================= */}
        {step === 'error' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle size={28} className="text-red-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-red-900">
              Import failed
            </h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>

            {/* Show parse warnings as error table if row-level */}
            {parseResult && rowErrors.length > 0 && hasRowErrors && (
              <div className="mt-4 text-left max-w-2xl mx-auto">
                <ErrorTable errors={rowErrors} />
              </div>
            )}

            {/* Fallback: show non-row warnings */}
            {parseResult && parseResult.warnings.length > 0 && !hasRowErrors && (
              <div className="mt-4 text-left max-w-lg mx-auto">
                <WarningsList warnings={parseResult.warnings} />
              </div>
            )}

            <button
              onClick={reset}
              className="mt-6 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Import tips */}
        {(step === 'upload' || step === 'preview') && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
            <Info size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-400">
              Tip: Use "Dry Run" to validate your file before importing. This checks all data
              without making any changes to the database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportPage;
