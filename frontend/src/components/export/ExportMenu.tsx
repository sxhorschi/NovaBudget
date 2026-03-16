import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, ChevronDown, FileSpreadsheet, PieChart, ClipboardList, Loader2 } from 'lucide-react';
import { USE_MOCKS } from '../../mocks/data';
import { useBudgetData } from '../../context/BudgetDataContext';
import client from '../../api/client';
import { exportStandard, exportFinance, exportSteeringCommittee } from '../../services/clientExport';
import { useToast } from '../common/ToastProvider';

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
    label: 'Excel Export (aktuelle Ansicht)',
    description: 'Gefilterte Cost Items mit Work Area Subtotals',
    icon: <FileSpreadsheet size={16} className="text-green-600" />,
  },
  {
    key: 'finance',
    label: 'Finance Template',
    description: 'BudgetTemplate mit monatlicher Cash-Out-Verteilung',
    icon: <PieChart size={16} className="text-blue-600" />,
  },
  {
    key: 'steering-committee',
    label: 'Steering Committee Report',
    description: 'Budget-Übersicht, Top Items, Risiken, Cash-Out',
    icon: <ClipboardList size={16} className="text-indigo-600" />,
  },
];

// ---------------------------------------------------------------------------
// Helper: build export URL from current filter params
// ---------------------------------------------------------------------------

function buildExportPath(type: ExportType): string {
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

  return `${base}?${exportParams.toString()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExportMenu: React.FC = () => {
  const { departments: allDepartments, workAreas: allWorkAreas, costItems: allCostItems } = useBudgetData();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportType | null>(null);
  const toast = useToast();
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
              exportFinance(departments, workAreas, items);
              break;
            case 'steering-committee': {
              const committed = items.reduce((s, i) => s + i.current_amount, 0);
              const budget = departments.reduce((s, d) => s + d.budget_total, 0);
              const delta = items.reduce((s, i) => s + (i.original_amount - i.current_amount), 0);
              exportSteeringCommittee(departments, workAreas, items, {
                budget,
                committed,
                remaining: budget - committed,
                delta,
                itemCount: items.length,
              });
              break;
            }
          }

          toast.success('Export heruntergeladen');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Export fehlgeschlagen';
          toast.error(msg);
        } finally {
          setLoading(null);
        }
        return;
      }

      setLoading(type);
      try {
        const path = buildExportPath(type);
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

        toast.success('Export erfolgreich heruntergeladen');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Export fehlgeschlagen';
        toast.error(msg);
      } finally {
        setLoading(null);
      }
    },
    [toast],
  );

  return (
      <div ref={menuRef} className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
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
          <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Daten exportieren
              </span>
            </div>
            <div className="py-1">
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleExport(opt.key)}
                  disabled={loading !== null}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
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
            </div>
            <div className="px-3 py-1.5 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">
                Tastenkürzel: Ctrl+E
              </span>
            </div>
          </div>
        )}
      </div>
  );
};

export default ExportMenu;
