import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { X as XIcon, Plus, Layers, FolderPlus, Building2, ArrowRightLeft } from 'lucide-react';
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
import BudgetDashboard from '../components/summary/BudgetDashboard';
import SummaryStrip from '../components/summary/SummaryStrip';
import CostbookTable from '../components/costbook/CostbookTable';
import DepartmentContextPanel from '../components/costbook/DepartmentContextPanel';
import WorkAreaContextPanel from '../components/costbook/WorkAreaContextPanel';
import SidePanel from '../components/sidepanel/SidePanel';
import DeleteConfirmDialog from '../components/costbook/DeleteConfirmDialog';
import TransferDialog from '../components/transfer/TransferDialog';
import { useToast } from '../components/common/ToastProvider';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Helpers for formatted EUR amount input in modals
// ---------------------------------------------------------------------------

function formatModalThousands(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  return Number(digits).toLocaleString('de-DE');
}

function parseModalGermanNumber(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

interface ModalAmountInputProps {
  value: string; // raw string state (numeric string like "125000")
  onChange: (rawNumericString: string) => void;
  placeholder?: string;
  className?: string;
}

/** Formatted EUR amount input for modals — shows German thousand separators and EUR prefix. */
const ModalAmountInput: React.FC<ModalAmountInputProps> = ({ value, onChange, placeholder, className }) => {
  const [display, setDisplay] = useState(() => formatModalThousands(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally (e.g. reset)
  useEffect(() => {
    setDisplay(formatModalThousands(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, '');
    const formatted = formatModalThousands(raw);
    setDisplay(formatted);
    onChange(String(parseModalGermanNumber(formatted)));
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setDisplay(formatModalThousands(value));
  }, [value]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none select-none">
        EUR
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className={`pl-12 ${className ?? ''}`}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
    </div>
  );
};

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
  const { user } = useAuth();
  const {
    facility,
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
  const [selectedDepartmentContextId, setSelectedDepartmentContextId] = useState<string | null>(null);
  const [selectedWorkAreaContextId, setSelectedWorkAreaContextId] = useState<string | null>(null);

  // -- Delete dialog state --
  const [deleteTarget, setDeleteTarget] = useState<CostItem | null>(null);

  // -- Transfer dialog state --
  const [transferOpen, setTransferOpen] = useState(false);

  // -- Quick create modal state --
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'item' | 'work-area' | 'department'>('item');

  const [newItemDeptId, setNewItemDeptId] = useState<string | null>(null);
  const [newItemWorkAreaId, setNewItemWorkAreaId] = useState<string | null>(null);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('0');

  const [newWADeptId, setNewWADeptId] = useState<string | null>(null);
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
    const workAreaToDepartment = new Map<string, string>();
    for (const wa of workAreas) {
      workAreaToDepartment.set(wa.id, wa.department_id);
    }

    const totals: Record<string, number> = {};
    for (const dept of departments) {
      totals[dept.id] = 0;
    }

    // Committed = only approved items (consistent with useFilteredData source of truth)
    for (const item of filteredItems) {
      if (item.approval_status !== 'approved') continue;
      const departmentId = workAreaToDepartment.get(item.work_area_id);
      if (departmentId == null) continue;
      totals[departmentId] = (totals[departmentId] ?? 0) + item.current_amount;
    }

    return totals;
  }, [workAreas, departments, filteredItems]);

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
      toast.success('Item saved');
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
    toast.success('Item deleted');
  }, [deleteTarget, selectedItem, deleteCostItem, toast]);

  const handleDeleteFromPanel = useCallback(() => {
    if (selectedItem) {
      setDeleteTarget(selectedItem);
    }
  }, [selectedItem]);

  const handleOpenDepartmentContext = useCallback((departmentId: string) => {
    setSelectedItem(null);
    setSelectedWorkAreaContextId(null);
    setSelectedDepartmentContextId(departmentId);
  }, []);

  const handleOpenWorkAreaContext = useCallback((workAreaId: string) => {
    setSelectedItem(null);
    setSelectedDepartmentContextId(null);
    setSelectedWorkAreaContextId(workAreaId);
  }, []);

  const handleDepartmentContextSave = useCallback(
    (departmentId: string, data: { name: string; budget_total: number }) => {
      if (!data.name.trim()) {
        toast.error('Department name must not be empty.');
        return;
      }
      updateDepartment(departmentId, {
        name: data.name,
        budget_total: data.budget_total,
      });
      toast.success('Department saved');
    },
    [updateDepartment, toast],
  );

  const handleDepartmentContextDelete = useCallback(
    (departmentId: string) => {
      if (selectedItem) {
        const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
        if (wa?.department_id === departmentId) {
          setSelectedItem(null);
        }
      }
      deleteDepartment(departmentId);
      setSelectedDepartmentContextId(null);
      setSelectedWorkAreaContextId(null);
      toast.success('Department deleted');
    },
    [selectedItem, workAreas, deleteDepartment, toast],
  );

  const handleWorkAreaContextSave = useCallback(
    (workAreaId: string, data: { name: string }) => {
      if (!data.name.trim()) {
        toast.error('Category name must not be empty.');
        return;
      }
      updateWorkArea(workAreaId, {
        name: data.name,
      });
      toast.success('Category saved');
    },
    [updateWorkArea, toast],
  );

  const handleWorkAreaContextDelete = useCallback(
    (workAreaId: string) => {
      if (selectedItem?.work_area_id === workAreaId) {
        setSelectedItem(null);
      }
      deleteWorkArea(workAreaId);
      setSelectedWorkAreaContextId(null);
      toast.success('Category deleted');
    },
    [selectedItem, deleteWorkArea, toast],
  );

  const handleDuplicate = useCallback(
    (itemToDuplicate: CostItem) => {
      const newItem = createCostItem(itemToDuplicate.work_area_id, {
        description: `${itemToDuplicate.description} (Copy)`,
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
        requester: user?.name ?? 'Unknown',
        approval_status: 'open',
      });
      setSelectedItem(newItem);
      toast.success('Item duplicated');
    },
    [createCostItem, toast, user],
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
      toast.error('Please enter a description for the new item.');
      return;
    }
    if (newItemWorkAreaId == null) {
      toast.error('Please select or create a category (work area) first.');
      return;
    }

    const amount = Math.max(0, Number(newItemAmount) || 0);
    if (amount <= 0) {
      toast.error('Amount must be greater than 0.');
      return;
    }

    const now = new Date().toISOString().slice(0, 7);

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
      requester: user?.name ?? 'Unknown',
    });

    setSelectedItem(newItem);
    if (newItemDeptId != null) {
      setAllFilters({ ...EMPTY_FILTER, departments: [newItemDeptId] });
    }
    closeCreate();
    toast.success('New item created.');
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
    user,
  ]);

  const handleCreateWorkArea = useCallback(() => {
    if (newWADeptId == null) {
      toast.error('Please select a department.');
      return;
    }
    const created = createWorkArea(newWADeptId, newWAName);
    if (!created) {
      toast.error('Category could not be created (name empty or already exists).');
      return;
    }

    setNewItemDeptId(newWADeptId);
    setNewItemWorkAreaId(created.id);
    setAllFilters({ ...EMPTY_FILTER, departments: [newWADeptId] });
    closeCreate();
    toast.success('New category created.');
  }, [newWADeptId, newWAName, createWorkArea, setAllFilters, closeCreate, toast]);

  const handleCreateDepartment = useCallback(() => {
    const budget = Math.max(0, Number(newDeptBudget) || 0);
    const created = createDepartment(newDeptName, budget);
    if (!created) {
      toast.error('Department could not be created (name empty or already exists).');
      return;
    }

    setAllFilters({ ...EMPTY_FILTER, departments: [created.id] });
    setNewItemDeptId(created.id);
    setNewWADeptId(created.id);
    closeCreate();
    toast.success('New department created.');
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

  return (
    <>
      {/* ---- Sticky container: SavedViews + FilterBar + SummaryStrip ---- */}
      <div className="bg-white border-b border-gray-200">
        {/* ---- Saved Views ---- */}
        <SavedViews currentFilters={filters} onApplyView={setAllFilters} />

        {/* ---- FilterBar ---- */}
        <div className="px-6 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              label="Department"
              options={departmentOptions}
              selected={filters.departments}
              onChange={(vals) =>
                setFilter('departments', vals)
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
              label="Product"
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
                title="New Item"
              >
                <Plus size={12} />
                New
              </button>
              <button
                onClick={() => openCreate('work-area')}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="New Category"
              >
                <FolderPlus size={12} />
              </button>
              <button
                onClick={() => openCreate('department')}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="New Department"
              >
                <Building2 size={12} />
              </button>
            </div>
            <button
              onClick={() => setTransferOpen(true)}
              disabled={!selectedItem}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-gray-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={selectedItem ? 'Transfer selected item to another facility' : 'Select an item first'}
            >
              <ArrowRightLeft size={12} />
              Transfer
            </button>
            <SearchInput
              value={filters.search}
              onChange={(v) => setFilter('search', v)}
              placeholder="Search..."
            />
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1.5">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <XIcon size={12} />
                  Reset all filters
                </button>
                <HelpTooltip text="Resets all filters and shows all items" />
              </span>
            )}

            {/* Filter counter */}
            <span className="ml-auto text-xs text-gray-400 tabular-nums whitespace-nowrap">
              {summary.itemCount === summary.totalItemCount
                ? `${summary.totalItemCount} items`
                : `${summary.itemCount} of ${summary.totalItemCount} items`}
            </span>
          </div>
        </div>

        {/* ---- Summary Strip (same as CashOut) ---- */}
        <SummaryStrip
          budget={summary.budget}
          committed={summary.committed}
          forecast={summary.forecast}
          remaining={summary.remaining}
          itemCount={summary.itemCount}
        />
      </div>

      {/* ---- Waterfall Chart (scrolls with content) ---- */}
      <div className="px-6 pt-4">
        <BudgetDashboard
          budget={summary.budget}
          committed={summary.committed}
          forecast={summary.forecast}
          remaining={summary.remaining}
          itemCount={summary.itemCount}
          items={filteredItems}
          hasItemLevelFilters={filters.phases.length > 0 || filters.products.length > 0 || filters.statuses.length > 0 || filters.search.trim().length > 0}
        />
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={closeCreate}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900 inline-flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                Create New
              </h3>
              <button
                onClick={closeCreate}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Close"
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
                  Item
                </button>
                <button
                  onClick={() => setCreateMode('work-area')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    createMode === 'work-area' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Category
                </button>
                <button
                  onClick={() => setCreateMode('department')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    createMode === 'department' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Department
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              {createMode === 'item' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newItemDeptId ?? ''}
                      onChange={(e) => setNewItemDeptId(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category (Work Area)</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newItemWorkAreaId ?? ''}
                      onChange={(e) => setNewItemWorkAreaId(e.target.value)}
                    >
                      {workAreasForSelectedDept.length === 0 ? (
                        <option value="">No category available</option>
                      ) : (
                        workAreasForSelectedDept.map((wa) => (
                          <option key={wa.id} value={wa.id}>{wa.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <input
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. Robot Cell Assembly"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount (EUR)</label>
                    <ModalAmountInput
                      value={newItemAmount}
                      onChange={setNewItemAmount}
                      placeholder="e.g. 125,000"
                      className="w-full rounded-md border border-gray-300 py-2 text-sm tabular-nums"
                    />
                  </div>
                </>
              )}

              {createMode === 'work-area' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newWADeptId ?? ''}
                      onChange={(e) => setNewWADeptId(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category Name</label>
                    <input
                      value={newWAName}
                      onChange={(e) => setNewWAName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. Paint Line"
                    />
                  </div>
                </>
              )}

              {createMode === 'department' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Department Name</label>
                    <input
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. Painting Department"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Initial Budget (EUR)</label>
                    <ModalAmountInput
                      value={newDeptBudget}
                      onChange={setNewDeptBudget}
                      placeholder="e.g. 500,000"
                      className="w-full rounded-md border border-gray-300 py-2 text-sm tabular-nums"
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
                Cancel
              </button>

              {createMode === 'item' && (
                <button
                  onClick={handleCreateItem}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Plus size={14} />
                  Create Item
                </button>
              )}

              {createMode === 'work-area' && (
                <button
                  onClick={handleCreateWorkArea}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <FolderPlus size={14} />
                  Create Category
                </button>
              )}

              {createMode === 'department' && (
                <button
                  onClick={handleCreateDepartment}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Building2 size={14} />
                  Create Department
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- Main content area ---- */}
      <div>
        <div className="min-w-0">
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

      {/* ---- Transfer Dialog ---- */}
      <TransferDialog
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        entityType="cost_item"
        entityIds={selectedItem ? [selectedItem.id] : []}
        sourceFacilityId={facility.id}
      />

    </>
  );
};

export default CostbookPage;
