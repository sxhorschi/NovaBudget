import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X as XIcon, Plus, Layers, FolderPlus, Building2 } from 'lucide-react';
import HelpTooltip from '../components/help/HelpTooltip';
import type {
  CostItem,
  ApprovalStatus,
  ProjectPhase,
  Product,
  Department,
  WorkArea,
} from '../types/budget';
import {
  PHASE_LABELS,
  PRODUCT_LABELS,
  STATUS_LABELS,
} from '../types/budget';
import { useBudgetData } from '../context/BudgetDataContext';
import { EMPTY_FILTER, useFilterState } from '../hooks/useFilterState';
import { useFilteredData } from '../hooks/useFilteredData';
import FilterChip from '../components/filter/FilterChip';
import SearchInput from '../components/filter/SearchInput';
import SavedViews from '../components/filter/SavedViews';
import SummaryStrip from '../components/summary/SummaryStrip';
import CostbookTable from '../components/costbook/CostbookTable';
import DepartmentContextPanel from '../components/costbook/DepartmentContextPanel';
import WorkAreaContextPanel from '../components/costbook/WorkAreaContextPanel';
import SidePanel from '../components/sidepanel/SidePanel';
import DeleteConfirmDialog from '../components/costbook/DeleteConfirmDialog';
import { useToast } from '../components/common/ToastProvider';

// ---------------------------------------------------------------------------
// Filter options (static from enum labels)
// ---------------------------------------------------------------------------

const phaseOptions = (Object.keys(PHASE_LABELS) as ProjectPhase[]).map((p) => ({
  value: p,
  label: PHASE_LABELS[p],
}));

const productOptions = (Object.keys(PRODUCT_LABELS) as Product[]).map((p) => ({
  value: p,
  label: PRODUCT_LABELS[p],
}));

const statusOptions = (Object.keys(STATUS_LABELS) as ApprovalStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

// ---------------------------------------------------------------------------
// CostbookPage
// ---------------------------------------------------------------------------

const CostbookPage: React.FC = () => {
  const {
    departments,
    workAreas,
    costItems,
    updateCostItem,
    deleteCostItem,
    createCostItem,
    createWorkArea,
    updateWorkArea,
    deleteWorkArea,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useBudgetData();
  const { filters, setFilter, setAllFilters, resetFilters, hasActiveFilters } = useFilterState();
  const { filteredDepartments, filteredWorkAreas, filteredItems, summary } =
    useFilteredData(filters);
  const toast = useToast();

  // -- Department filter options (derived from context) --
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.id), label: d.name })),
    [departments],
  );

  // -- SidePanel state --
  const [selectedItem, setSelectedItem] = useState<CostItem | null>(null);
  const [selectedDepartmentContextId, setSelectedDepartmentContextId] = useState<number | null>(null);
  const [selectedWorkAreaContextId, setSelectedWorkAreaContextId] = useState<number | null>(null);

  // -- Delete dialog state --
  const [deleteTarget, setDeleteTarget] = useState<CostItem | null>(null);

  // -- Quick create modal state --
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'item' | 'work-area' | 'department'>('item');

  const [newItemDeptId, setNewItemDeptId] = useState<number | null>(null);
  const [newItemWorkAreaId, setNewItemWorkAreaId] = useState<number | null>(null);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('0');

  const [newWADeptId, setNewWADeptId] = useState<number | null>(null);
  const [newWAName, setNewWAName] = useState('');

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptBudget, setNewDeptBudget] = useState('0');

  const workAreasForSelectedDept = useMemo(() => {
    if (newItemDeptId == null) return [];
    return workAreas.filter((wa) => wa.department_id === newItemDeptId);
  }, [newItemDeptId, workAreas]);

  useEffect(() => {
    if (departments.length === 0) return;
    if (newItemDeptId == null) {
      setNewItemDeptId(departments[0].id);
    }
    if (newWADeptId == null) {
      setNewWADeptId(departments[0].id);
    }
  }, [departments, newItemDeptId, newWADeptId]);

  useEffect(() => {
    if (workAreasForSelectedDept.length === 0) {
      setNewItemWorkAreaId(null);
      return;
    }
    const stillValid = newItemWorkAreaId != null
      && workAreasForSelectedDept.some((wa) => wa.id === newItemWorkAreaId);
    if (!stillValid) {
      setNewItemWorkAreaId(workAreasForSelectedDept[0].id);
    }
  }, [workAreasForSelectedDept, newItemWorkAreaId]);

  // Build work areas with items attached (respects context edits)
  const workAreasWithItems = useMemo(() => {
    return filteredWorkAreas.map((wa) => ({
      ...wa,
      cost_items: costItems.filter(
        (ci) =>
          ci.work_area_id === wa.id &&
          filteredItems.some((fi) => fi.id === ci.id),
      ),
    }));
  }, [filteredWorkAreas, costItems, filteredItems]);

  // Resolve department/workArea names for SidePanel
  const selectedDeptName = useMemo(() => {
    if (!selectedItem) return '';
    const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
    if (!wa) return '';
    const dept = departments.find((d) => d.id === wa.department_id);
    return dept?.name ?? '';
  }, [selectedItem, workAreas, departments]);

  const selectedWaName = useMemo(() => {
    if (!selectedItem) return '';
    const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
    return wa?.name ?? '';
  }, [selectedItem, workAreas]);

  const selectedDeptId = useMemo(() => {
    if (!selectedItem) return undefined;
    const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
    if (!wa) return undefined;
    const dept = departments.find((d) => d.id === wa.department_id);
    return dept?.id;
  }, [selectedItem, workAreas, departments]);

  const selectedDeptBudget = useMemo(() => {
    if (!selectedItem) return undefined;
    const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
    if (!wa) return undefined;
    const dept = departments.find((d) => d.id === wa.department_id);
    return dept?.budget_total;
  }, [selectedItem, workAreas, departments]);

  const selectedDepartmentContext = useMemo<Department | null>(() => {
    if (selectedDepartmentContextId == null) return null;
    return departments.find((d) => d.id === selectedDepartmentContextId) ?? null;
  }, [selectedDepartmentContextId, departments]);

  const selectedWorkAreaContext = useMemo<WorkArea | null>(() => {
    if (selectedWorkAreaContextId == null) return null;
    return workAreas.find((wa) => wa.id === selectedWorkAreaContextId) ?? null;
  }, [selectedWorkAreaContextId, workAreas]);

  const selectedWorkAreaDepartmentName = useMemo(() => {
    if (!selectedWorkAreaContext) return undefined;
    return departments.find((d) => d.id === selectedWorkAreaContext.department_id)?.name;
  }, [selectedWorkAreaContext, departments]);

  const departmentCommittedTotals = useMemo(() => {
    const workAreaToDepartment = new Map<number, number>();
    for (const wa of workAreas) {
      workAreaToDepartment.set(wa.id, wa.department_id);
    }

    const totals: Record<number, number> = {};
    for (const dept of departments) {
      totals[dept.id] = 0;
    }

    for (const item of costItems) {
      const departmentId = workAreaToDepartment.get(item.work_area_id);
      if (departmentId == null) continue;
      totals[departmentId] = (totals[departmentId] ?? 0) + item.current_amount;
    }

    return totals;
  }, [workAreas, departments, costItems]);

  // -- Handlers --

  const handleSelectItem = useCallback((item: CostItem) => {
    setSelectedDepartmentContextId(null);
    setSelectedWorkAreaContextId(null);
    setSelectedItem(item);
  }, []);

  const handleSave = useCallback(
    (data: Partial<CostItem>) => {
      if (!data.id) return;
      updateCostItem(data.id, data);
      setSelectedItem(null);
      toast.success('Position gespeichert');
    },
    [updateCostItem, toast],
  );

  const handleStatusChange = useCallback(
    (item: CostItem, newStatus: ApprovalStatus) => {
      updateCostItem(item.id, { approval_status: newStatus });
    },
    [updateCostItem],
  );

  const handleDeleteRequest = useCallback((item: CostItem) => {
    setDeleteTarget(item);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteCostItem(deleteTarget.id);
    if (selectedItem?.id === deleteTarget.id) {
      setSelectedItem(null);
    }
    setDeleteTarget(null);
    toast.success('Position gelöscht');
  }, [deleteTarget, selectedItem, deleteCostItem, toast]);

  const handleDeleteFromPanel = useCallback(() => {
    if (selectedItem) {
      setDeleteTarget(selectedItem);
    }
  }, [selectedItem]);

  const handleOpenDepartmentContext = useCallback((departmentId: number) => {
    setSelectedItem(null);
    setSelectedWorkAreaContextId(null);
    setSelectedDepartmentContextId(departmentId);
  }, []);

  const handleOpenWorkAreaContext = useCallback((workAreaId: number) => {
    setSelectedItem(null);
    setSelectedDepartmentContextId(null);
    setSelectedWorkAreaContextId(workAreaId);
  }, []);

  const handleDepartmentContextSave = useCallback(
    (departmentId: number, data: { name: string; budget_total: number }) => {
      if (!data.name.trim()) {
        toast.error('Abteilungsname darf nicht leer sein.');
        return;
      }
      updateDepartment(departmentId, {
        name: data.name,
        budget_total: data.budget_total,
      });
      toast.success('Abteilung gespeichert');
    },
    [updateDepartment, toast],
  );

  const handleDepartmentContextDelete = useCallback(
    (departmentId: number) => {
      if (selectedItem) {
        const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
        if (wa?.department_id === departmentId) {
          setSelectedItem(null);
        }
      }
      deleteDepartment(departmentId);
      setSelectedDepartmentContextId(null);
      setSelectedWorkAreaContextId(null);
      toast.success('Abteilung gelöscht');
    },
    [selectedItem, workAreas, deleteDepartment, toast],
  );

  const handleWorkAreaContextSave = useCallback(
    (workAreaId: number, data: { name: string }) => {
      if (!data.name.trim()) {
        toast.error('Kategoriename darf nicht leer sein.');
        return;
      }
      updateWorkArea(workAreaId, {
        name: data.name,
      });
      toast.success('Kategorie gespeichert');
    },
    [updateWorkArea, toast],
  );

  const handleWorkAreaContextDelete = useCallback(
    (workAreaId: number) => {
      if (selectedItem?.work_area_id === workAreaId) {
        setSelectedItem(null);
      }
      deleteWorkArea(workAreaId);
      setSelectedWorkAreaContextId(null);
      toast.success('Kategorie gelöscht');
    },
    [selectedItem, deleteWorkArea, toast],
  );

  const handleDuplicate = useCallback(
    (itemToDuplicate: CostItem) => {
      const newItem = createCostItem(itemToDuplicate.work_area_id, {
        description: `${itemToDuplicate.description} (Kopie)`,
        original_amount: itemToDuplicate.original_amount,
        current_amount: itemToDuplicate.current_amount,
        expected_cash_out: itemToDuplicate.expected_cash_out,
        cost_basis: itemToDuplicate.cost_basis,
        cost_driver: itemToDuplicate.cost_driver,
        basis_description: itemToDuplicate.basis_description,
        assumptions: itemToDuplicate.assumptions,
        project_phase: itemToDuplicate.project_phase,
        product: itemToDuplicate.product,
        zielanpassung: itemToDuplicate.zielanpassung,
        zielanpassung_reason: itemToDuplicate.zielanpassung_reason,
        comments: itemToDuplicate.comments,
        approval_status: 'open',
      });
      setSelectedItem(newItem);
      toast.success('Position dupliziert');
    },
    [createCostItem, toast],
  );

  const handleFilterDepartment = useCallback(
    (deptName: string) => {
      const dept = departments.find((d) => d.name === deptName);
      if (dept) {
        setFilter('departments', [dept.id]);
      }
    },
    [departments, setFilter],
  );

  const handleScrollToWorkArea = useCallback((_workAreaName: string) => {
    // Scroll to work area row in table (best-effort via DOM query)
    const el = document.querySelector(`[data-workarea-name="${CSS.escape(_workAreaName)}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const resetCreateForm = useCallback(() => {
    setNewItemDescription('');
    setNewItemAmount('0');
    setNewWAName('');
    setNewDeptName('');
    setNewDeptBudget('0');
  }, []);

  const openCreate = useCallback(
    (mode: 'item' | 'work-area' | 'department') => {
      setCreateMode(mode);
      setCreateOpen(true);
      resetCreateForm();
    },
    [resetCreateForm],
  );

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
  }, []);

  const handleCreateItem = useCallback(() => {
    if (!newItemDescription.trim()) {
      toast.error('Bitte Beschreibung für die neue Position eingeben.');
      return;
    }
    if (newItemWorkAreaId == null) {
      toast.error('Bitte zuerst eine Kategorie (Work Area) auswählen oder anlegen.');
      return;
    }

    const amount = Math.max(0, Number(newItemAmount) || 0);
    if (amount <= 0) {
      toast.error('Betrag muss größer als 0 sein.');
      return;
    }

    const now = new Date().toISOString().split('T')[0];

    const newItem = createCostItem(newItemWorkAreaId, {
      description: newItemDescription.trim(),
      original_amount: amount,
      current_amount: amount,
      expected_cash_out: now,
      approval_status: 'open',
      project_phase: filters.phases[0] ?? 'phase_1',
      product: filters.products[0] ?? 'overall',
      cost_basis: 'cost_estimation',
      cost_driver: 'product',
      basis_description: '',
      assumptions: '',
      comments: '',
      zielanpassung: false,
      zielanpassung_reason: '',
      approval_date: null,
    });

    setSelectedItem(newItem);
    if (newItemDeptId != null) {
      setAllFilters({ ...EMPTY_FILTER, departments: [newItemDeptId] });
    }
    closeCreate();
    toast.success('Neue Position angelegt.');
  }, [
    newItemDescription,
    newItemWorkAreaId,
    newItemAmount,
    createCostItem,
    filters.phases,
    filters.products,
    newItemDeptId,
    setAllFilters,
    closeCreate,
    toast,
  ]);

  const handleCreateWorkArea = useCallback(() => {
    if (newWADeptId == null) {
      toast.error('Bitte eine Abteilung wählen.');
      return;
    }
    const created = createWorkArea(newWADeptId, newWAName);
    if (!created) {
      toast.error('Kategorie konnte nicht erstellt werden (Name leer oder bereits vorhanden).');
      return;
    }

    setNewItemDeptId(newWADeptId);
    setNewItemWorkAreaId(created.id);
    setAllFilters({ ...EMPTY_FILTER, departments: [newWADeptId] });
    closeCreate();
    toast.success('Neue Kategorie angelegt.');
  }, [newWADeptId, newWAName, createWorkArea, setAllFilters, closeCreate, toast]);

  const handleCreateDepartment = useCallback(() => {
    const budget = Math.max(0, Number(newDeptBudget) || 0);
    const created = createDepartment(newDeptName, budget);
    if (!created) {
      toast.error('Abteilung konnte nicht erstellt werden (Name leer oder bereits vorhanden).');
      return;
    }

    setAllFilters({ ...EMPTY_FILTER, departments: [created.id] });
    setNewItemDeptId(created.id);
    setNewWADeptId(created.id);
    closeCreate();
    toast.success('Neue Abteilung angelegt.');
  }, [newDeptBudget, createDepartment, newDeptName, setAllFilters, closeCreate, toast]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target
        ? ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
        : false;
      if (!isTyping && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openCreate('item');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openCreate]);

  const isRightPanelOpen = Boolean(
    selectedItem || selectedDepartmentContext || selectedWorkAreaContext,
  );

  return (
    <>
      {/* ---- Sticky container: SavedViews + FilterBar + SummaryStrip ---- */}
      <div className="sticky top-[96px] z-20 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        {/* ---- Saved Views ---- */}
        <SavedViews currentFilters={filters} onApplyView={setAllFilters} />

        {/* ---- FilterBar ---- */}
        <div className="px-6 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              label="Abteilung"
              options={departmentOptions}
              selected={filters.departments.map(String)}
              onChange={(vals) =>
                setFilter('departments', vals.map(Number))
              }
            />
            <FilterChip
              label="Phase"
              options={phaseOptions}
              selected={filters.phases}
              onChange={(vals) =>
                setFilter('phases', vals as ProjectPhase[])
              }
            />
            <FilterChip
              label="Produkt"
              options={productOptions}
              selected={filters.products}
              onChange={(vals) =>
                setFilter('products', vals as Product[])
              }
            />
            <FilterChip
              label="Status"
              options={statusOptions}
              selected={filters.statuses}
              onChange={(vals) =>
                setFilter('statuses', vals as ApprovalStatus[])
              }
            />
            <div className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50/70 p-0.5">
              <button
                onClick={() => openCreate('item')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                title="Neue Position"
              >
                <Plus size={12} />
                Neu
              </button>
              <button
                onClick={() => openCreate('work-area')}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="Neue Kategorie"
              >
                <FolderPlus size={12} />
              </button>
              <button
                onClick={() => openCreate('department')}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="Neue Abteilung"
              >
                <Building2 size={12} />
              </button>
            </div>
            <SearchInput
              value={filters.search}
              onChange={(v) => setFilter('search', v)}
              placeholder="Suche..."
            />
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1.5">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <XIcon size={12} />
                  Alle Filter zurücksetzen
                </button>
                <HelpTooltip text="Setzt alle Filter zurück und zeigt alle Positionen" />
              </span>
            )}

            {/* Filter counter */}
            <span className="ml-auto text-xs text-gray-400 tabular-nums whitespace-nowrap">
              {summary.itemCount === summary.totalItemCount
                ? `${summary.totalItemCount} Positionen`
                : `${summary.itemCount} von ${summary.totalItemCount} Positionen`}
            </span>
          </div>
        </div>

        {/* ---- SummaryStrip (inside sticky container) ---- */}
        <SummaryStrip
          budget={summary.budget}
          committed={summary.committed}
          forecast={summary.forecast}
          remaining={summary.remaining}
          itemCount={summary.itemCount}
        />
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={closeCreate}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900 inline-flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                Neu Anlegen
              </h3>
              <button
                onClick={closeCreate}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Schließen"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  onClick={() => setCreateMode('item')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    createMode === 'item' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Position
                </button>
                <button
                  onClick={() => setCreateMode('work-area')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    createMode === 'work-area' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Kategorie
                </button>
                <button
                  onClick={() => setCreateMode('department')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    createMode === 'department' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Abteilung
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              {createMode === 'item' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Abteilung</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newItemDeptId ?? ''}
                      onChange={(e) => setNewItemDeptId(Number(e.target.value))}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kategorie (Work Area)</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newItemWorkAreaId ?? ''}
                      onChange={(e) => setNewItemWorkAreaId(Number(e.target.value))}
                    >
                      {workAreasForSelectedDept.length === 0 ? (
                        <option value="">Keine Kategorie vorhanden</option>
                      ) : (
                        workAreasForSelectedDept.map((wa) => (
                          <option key={wa.id} value={wa.id}>{wa.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Beschreibung</label>
                    <input
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="z. B. Roboterzelle Montage"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Betrag (EUR)</label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}

              {createMode === 'work-area' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Abteilung</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newWADeptId ?? ''}
                      onChange={(e) => setNewWADeptId(Number(e.target.value))}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name der Kategorie</label>
                    <input
                      value={newWAName}
                      onChange={(e) => setNewWAName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="z. B. Lackierstraße"
                    />
                  </div>
                </>
              )}

              {createMode === 'department' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Abteilungsname</label>
                    <input
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="z. B. Lackiererei"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Startbudget (EUR)</label>
                    <input
                      type="number"
                      min={0}
                      step="1000"
                      value={newDeptBudget}
                      onChange={(e) => setNewDeptBudget(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                onClick={closeCreate}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Abbrechen
              </button>

              {createMode === 'item' && (
                <button
                  onClick={handleCreateItem}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus size={14} />
                  Position anlegen
                </button>
              )}

              {createMode === 'work-area' && (
                <button
                  onClick={handleCreateWorkArea}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <FolderPlus size={14} />
                  Kategorie anlegen
                </button>
              )}

              {createMode === 'department' && (
                <button
                  onClick={handleCreateDepartment}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Building2 size={14} />
                  Abteilung anlegen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Main content area ---- */}
      <div className="flex">
        <div
          className={`flex-1 min-w-0 transition-all duration-300 ease-out ${
            isRightPanelOpen ? 'mr-[480px]' : ''
          }`}
        >
          <div className="p-6">
            <CostbookTable
              departments={filteredDepartments}
              workAreas={workAreasWithItems}
              departmentCommittedTotals={departmentCommittedTotals}
              onSelectItem={handleSelectItem}
              selectedItemId={selectedItem?.id ?? null}
              onStatusChange={handleStatusChange}
              onDeleteItem={handleDeleteRequest}
              onOpenDepartmentContext={handleOpenDepartmentContext}
              onOpenWorkAreaContext={handleOpenWorkAreaContext}
            />
          </div>
        </div>

        {/* ---- SidePanel ---- */}
        <SidePanel
          item={selectedItem}
          departmentName={selectedDeptName}
          departmentId={selectedDeptId}
          departmentBudget={selectedDeptBudget}
          workAreaName={selectedWaName}
          onSave={handleSave}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDeleteFromPanel}
          onDuplicate={handleDuplicate}
          onFilterDepartment={handleFilterDepartment}
          onScrollToWorkArea={handleScrollToWorkArea}
        />

        <DepartmentContextPanel
          department={selectedDepartmentContext}
          workAreas={workAreas}
          costItems={costItems}
          onClose={() => setSelectedDepartmentContextId(null)}
          onSave={handleDepartmentContextSave}
          onDelete={handleDepartmentContextDelete}
        />

        <WorkAreaContextPanel
          workArea={selectedWorkAreaContext}
          departmentName={selectedWorkAreaDepartmentName}
          costItems={costItems}
          onClose={() => setSelectedWorkAreaContextId(null)}
          onSave={handleWorkAreaContextSave}
          onDelete={handleWorkAreaContextDelete}
        />
      </div>

      {/* ---- Delete Confirm Dialog ---- */}
      {deleteTarget && (
        <DeleteConfirmDialog
          itemDescription={deleteTarget.description}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default CostbookPage;
