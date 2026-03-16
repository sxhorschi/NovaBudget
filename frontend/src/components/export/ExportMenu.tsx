import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, ChevronDown, FileSpreadsheet, PieChart, ClipboardList, Loader2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { USE_MOCKS } from '../../mocks/data';
import { useBudgetData } from '../../context/BudgetDataContext';
import client from '../../api/client';
import { exportStandard, exportFinance, exportSteeringCommittee } from '../../services/clientExport';
import { useToast } from '../common/ToastProvider';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportType = 'standard' | 'finance' | 'steering-committee';

const EXPORT_OPTIONS: {
  key: ExportType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'standard',
    label: 'Excel Export (current view)',
    description: 'Filtered cost items with work area subtotals',
    icon: <FileSpreadsheet size={16} className="text-green-600" />,
  },
  {
    key: 'finance',
    label: 'Finance Template',
    description: 'Budget template with monthly cash-out distribution',
    icon: <PieChart size={16} className="text-blue-600" />,
  },
  {
    key: 'steering-committee',
    label: 'Steering Committee Report',
    description: 'Budget overview, top items, risks, cash-out',
    icon: <ClipboardList size={16} className="text-indigo-600" />,
  },
];

// ---------------------------------------------------------------------------
// Helper: build export URL from current filter params
// ---------------------------------------------------------------------------

function buildExportPath(type: ExportType, budgetFactor?: number): string {
  const base = `/export/${type}`;
  const params = new URLSearchParams(window.location.search);

  // For the standard export, forward dept & phase filters
  const exportParams = new URLSearchParams();

  // TODO: facility_id should come from app context / route params
  exportParams.set('facility_id', '00000000-0000-0000-0000-000000000001');

  if (type === 'standard') {
    const dept = params.get('dept');
    if (dept) exportParams.set('dept', dept);
    const phase = params.get('phase');
    if (phase) exportParams.set('phase', phase);
  }

  if (type === 'finance' && typeof budgetFactor === 'number') {
    exportParams.set('budget_factor', budgetFactor.toString());
  }

  return `${base}?${exportParams.toString()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExportMenu: React.FC = () => {
  const { departments: allDepartments, workAreas: allWorkAreas, costItems: allCostItems } = useBudgetData();
  const { financeBudgetFactor } = useDisplaySettings();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportType | null>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut: Cmd+E / Ctrl+E
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleExport = useCallback(
    async (type: ExportType) => {
      setOpen(false);

      // Mock mode: client-side export with mock data
      if (USE_MOCKS) {
        setLoading(type);
        try {
          const departments = allDepartments;
          const workAreas = allWorkAreas;
          const items = allCostItems;

          switch (type) {
            case 'standard':
              exportStandard(departments, workAreas, items);
              break;
            case 'finance':
              exportFinance(departments, workAreas, items, financeBudgetFactor);
              break;
            case 'steering-committee': {
              const approved = items.filter(i => i.approval_status === 'approved');
              const committedAmt = approved.reduce((s, i) => s + i.current_amount, 0);
              const forecastItems = items.filter(i => i.approval_status !== 'rejected' && i.approval_status !== 'obsolete');
              const forecastAmt = forecastItems.reduce((s, i) => s + i.current_amount, 0);
              const budgetAmt = departments.reduce((s, d) => s + d.budget_total, 0);
              exportSteeringCommittee(departments, workAreas, items, {
                budget: budgetAmt,
                committed: committedAmt,
                forecast: forecastAmt,
                remaining: budgetAmt - forecastAmt,
                delta: 0,
                itemCount: items.length,
                totalItemCount: items.length,
              });
              break;
            }
          }

          toast.success('Export downloaded');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Export failed';
          toast.error(msg);
        } finally {
          setLoading(null);
        }
        return;
      }

      setLoading(type);
      try {
        const factor = type === 'finance' ? financeBudgetFactor : undefined;
        const path = buildExportPath(type, factor);
        const response = await client.get(path, { responseType: 'blob' });

        // Extract filename from Content-Disposition or use default
        const disposition = response.headers['content-disposition'];
        let filename = `export_${type}.xlsx`;
        if (disposition) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }

        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        toast.success('Export downloaded successfully');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Export failed';
        toast.error(msg);
      } finally {
        setLoading(null);
      }
    },
    [toast, allDepartments, allWorkAreas, allCostItems, financeBudgetFactor],
  );

  return (
      <div ref={menuRef} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-all hover:shadow hover:border-indigo-200 hover:text-indigo-600 ${open ? 'text-indigo-600 border-indigo-200' : 'text-gray-700'}`}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          <span className="hidden lg:inline">Export</span>
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-1 w-80 rounded-2xl border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Export Data
              </span>
            </div>
            <div className="py-1">
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleExport(opt.key)}
                  disabled={loading !== null}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-indigo-50/60 disabled:opacity-50"
                >
                  <div className="mt-0.5 shrink-0">{opt.icon}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                  </div>
                  {loading === opt.key && (
                    <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-gray-400" />
                  )}
                </button>
              ))}
              <div className="border-t border-dashed border-gray-200 mt-1 pt-1" />
              <button
                type="button"
                onClick={() => { setOpen(false); navigate('/import'); }}
                disabled={loading !== null}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-indigo-50/60 disabled:opacity-50"
              >
                <div className="mt-0.5 shrink-0">
                  <Upload size={16} className="text-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">Import Excel</div>
                  <div className="text-xs text-gray-500 mt-0.5">Import budget data from an Excel file</div>
                </div>
              </button>
            </div>
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <span className="text-[10px] text-gray-400">
                Shortcut: Ctrl+E
              </span>
            </div>
          </div>
        )}
      </div>
  );
};

export default ExportMenu;
