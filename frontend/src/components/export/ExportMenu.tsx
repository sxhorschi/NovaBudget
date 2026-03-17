import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Download, ChevronDown, FileSpreadsheet, PieChart, ClipboardList, Loader2, Upload, GitCompareArrows, Filter } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { USE_MOCKS } from '../../mocks/data';
import { useBudgetData } from '../../context/BudgetDataContext';
import client from '../../api/client';
import { exportStandard, exportFinance, exportSteeringCommittee } from '../../services/clientExport';
import { useToast } from '../common/ToastProvider';
import { PHASE_LABELS, STATUS_LABELS } from '../../types/budget';
import type { ProjectPhase, ApprovalStatus } from '../../types/budget';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportType = 'standard' | 'finance' | 'steering-committee' | 'compare';

// ---------------------------------------------------------------------------
// Helper: detect active filters from URL params
// ---------------------------------------------------------------------------

function useActiveFilterLabels(): string | null {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const parts: string[] = [];

    const phase = searchParams.get('phase');
    if (phase) {
      const phases = phase.split(',').map(p => {
        const key = p.trim() as ProjectPhase;
        return PHASE_LABELS[key] ?? key;
      });
      parts.push(phases.join(', '));
    }

    const status = searchParams.get('status');
    if (status) {
      const statuses = status.split(',').map(s => {
        const key = s.trim() as ApprovalStatus;
        return STATUS_LABELS[key] ?? key;
      });
      parts.push(statuses.join(', '));
    }

    const dept = searchParams.get('dept');
    if (dept) {
      const count = dept.split(',').filter(Boolean).length;
      parts.push(`${count} dept${count > 1 ? 's' : ''}`);
    }

    const q = searchParams.get('q');
    if (q) {
      parts.push(`"${q}"`);
    }

    return parts.length > 0 ? parts.join(', ') : null;
  }, [searchParams]);
}

// ---------------------------------------------------------------------------
// Helper: build export URL from current filter params
// ---------------------------------------------------------------------------

function buildExportPath(type: ExportType, facilityId: string, budgetFactor?: number, compareFacilityId?: string): string {
  const base = type === 'compare' ? '/export/compare' : `/export/${type}`;
  const params = new URLSearchParams(window.location.search);

  // For the standard export, forward dept & phase filters
  const exportParams = new URLSearchParams();

  exportParams.set('facility_id', facilityId);

  if (type === 'standard') {
    const dept = params.get('dept');
    if (dept) exportParams.set('dept', dept);
    const phase = params.get('phase');
    if (phase) exportParams.set('phase', phase);
  }

  if (type === 'finance' && typeof budgetFactor === 'number') {
    exportParams.set('budget_factor', budgetFactor.toString());
  }

  if (type === 'compare' && compareFacilityId) {
    exportParams.set('compare_facility_id', compareFacilityId);
  }

  return `${base}?${exportParams.toString()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExportMenu: React.FC = () => {
  const { facility, departments: allDepartments, workAreas: allWorkAreas, costItems: allCostItems } = useBudgetData();
  const financeBudgetFactor = 1.0;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportType | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareFacilityId, setCompareFacilityId] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const activeFilterLabel = useActiveFilterLabels();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCompareDialog(false);
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
      if (type === 'compare') {
        setShowCompareDialog(true);
        return;
      }

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
        const path = buildExportPath(type, facility.id, factor);
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

  const handleCompareExport = useCallback(async () => {
    if (!compareFacilityId.trim()) {
      toast.error('Please enter a facility ID to compare against.');
      return;
    }

    setShowCompareDialog(false);
    setOpen(false);
    setLoading('compare');

    try {
      if (USE_MOCKS) {
        // Mock mode: compare export not available
        toast.error('Compare Export requires API mode. Not available in demo mode.');
        return;
      }

      const path = buildExportPath('compare', facility.id, undefined, compareFacilityId.trim());
      const response = await client.get(path, { responseType: 'blob' });

      const disposition = response.headers['content-disposition'];
      let filename = `compare_export.xlsx`;
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

      toast.success('Compare export downloaded');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Compare export failed';
      toast.error(msg);
    } finally {
      setLoading(null);
      setCompareFacilityId('');
    }
  }, [compareFacilityId, toast]);

  // Build export options with dynamic label showing filter context
  const exportOptions = useMemo(() => {
    const standardLabel = activeFilterLabel
      ? `Standard (filtered: ${activeFilterLabel})`
      : 'Excel Export (current view)';

    return [
      {
        key: 'standard' as ExportType,
        label: standardLabel,
        description: 'Filtered cost items with work area subtotals',
        icon: <FileSpreadsheet size={16} className="text-green-600" />,
      },
      {
        key: 'finance' as ExportType,
        label: 'Finance Template',
        description: 'Budget template with monthly cash-out distribution',
        icon: <PieChart size={16} className="text-blue-600" />,
      },
      {
        key: 'steering-committee' as ExportType,
        label: 'Steering Committee Report',
        description: 'Budget overview, top items, risks, cash-out',
        icon: <ClipboardList size={16} className="text-indigo-600" />,
      },
      {
        key: 'compare' as ExportType,
        label: 'Compare Export',
        description: 'KPIs side-by-side vs. another facility',
        icon: <GitCompareArrows size={16} className="text-purple-600" />,
      },
    ];
  }, [activeFilterLabel]);

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
          <span className="hidden lg:inline">Import / Export</span>
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-full mt-1 w-96 rounded-2xl border border-gray-100 bg-white shadow-2xl z-50 overflow-hidden">
            {/* Dropdown header with facility name */}
            <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Import / Export
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-indigo-600 font-medium truncate">
                  {facility.name}
                </span>
              </div>
              {activeFilterLabel && (
                <div className="flex items-center gap-1 mt-1">
                  <Filter size={10} className="text-amber-500" />
                  <span className="text-[10px] text-amber-600 truncate">
                    Active filters: {activeFilterLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="py-1">
              {exportOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleExport(opt.key)}
                  disabled={loading !== null}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-indigo-50/60 disabled:opacity-50"
                >
                  <div className="mt-0.5 shrink-0">{opt.icon}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                  </div>
                  {loading === opt.key && (
                    <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-gray-400" />
                  )}
                </button>
              ))}

              {/* Compare dialog inline */}
              {showCompareDialog && (
                <div className="border-t border-gray-200 mx-3 mt-1 pt-2 pb-2">
                  <p className="text-xs font-medium text-gray-600 mb-1.5">
                    Compare "{facility.name}" against:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={compareFacilityId}
                      onChange={(e) => setCompareFacilityId(e.target.value)}
                      placeholder="Enter facility ID..."
                      className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCompareExport();
                        if (e.key === 'Escape') setShowCompareDialog(false);
                      }}
                    />
                    <button
                      onClick={handleCompareExport}
                      disabled={!compareFacilityId.trim()}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      Export
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCompareDialog(false)}
                    className="mt-1 text-[10px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="border-t border-dashed border-gray-200 mt-1 pt-1" />
              <button
                type="button"
                onClick={() => { setOpen(false); navigate(`/f/${facility.id}/import`); }}
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
