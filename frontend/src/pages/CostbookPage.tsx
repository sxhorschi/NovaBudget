import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { X as XIcon, Plus, Layers, FolderPlus, Building2, ArrowRightLeft } from 'lucide-react';
import HelpTooltip from '../components/help/HelpTooltip';
import type {
  CostItem,
  ApprovalStatus,
  FunctionalArea,
  WorkArea,
  WorkAreaWithItems,
} from '../types/budget';
import {
  STATUS_LABELS,
} from '../types/budget';
import { useConfig } from '../context/ConfigContext';
import { useBudgetData } from '../context/BudgetDataContext';
import { EMPTY_FILTER, useFilterState } from '../hooks/useFilterState';
import { useFilteredData } from '../hooks/useFilteredData';
import FilterChip from '../components/filter/FilterChip';
import SearchInput from '../components/filter/SearchInput';
import SavedViews from '../components/filter/SavedViews';
import BudgetDashboard from '../components/summary/BudgetDashboard';
import SummaryStrip from '../components/summary/SummaryStrip';
import CostbookTable from '../components/costbook/CostbookTable';
import FunctionalAreaContextPanel from '../components/costbook/FunctionalAreaContextPanel';
import WorkAreaContextPanel from '../components/costbook/WorkAreaContextPanel';
import SidePanel from '../components/sidepanel/SidePanel';
import DeleteConfirmDialog from '../components/costbook/DeleteConfirmDialog';
import TransferDialog from '../components/transfer/TransferDialog';
import { useToast } from '../components/common/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { formatThousands, parseGermanNumber } from '../components/costbook/AmountCell';

// ---------------------------------------------------------------------------
// Formatted EUR amount input for modals
// ---------------------------------------------------------------------------

interface ModalAmountInputProps {
  value: string; // raw string state (numeric string like "125000")
  onChange: (rawNumericString: string) => void;
  placeholder?: string;
  className?: string;
}

/** Formatted EUR amount input for modals — shows German thousand separators and EUR prefix. */
const ModalAmountInput: React.FC<ModalAmountInputProps> = ({ value, onChange, placeholder, className }) => {
  const [display, setDisplay] = useState(() => formatThousands(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally (e.g. reset)
  useEffect(() => {
    setDisplay(formatThousands(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.]/g, '');
    const formatted = formatThousands(raw);
    setDisplay(formatted);
    onChange(String(parseGermanNumber(formatted)));
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setDisplay(formatThousands(value));
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

const statusOptions = (Object.keys(STATUS_LABELS) as ApprovalStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABELS[s],
}));

// ---------------------------------------------------------------------------
// CostbookPage
// ---------------------------------------------------------------------------

const CostbookPage: React.FC = () => {
  const { config } = useConfig();
  const phaseOptions = useMemo(() => config.phases.map((p) => ({ value: p.id, label: p.label })), [config.phases]);
  const productOptions = useMemo(() => config.products.map((p) => ({ value: p.id, label: p.label })), [config.products]);
  const { user, canEdit } = useAuth();
  const {
    facility,
    functionalAreas,
    workAreas,
    costItems,
    updateCostItem,
    deleteCostItem,
    createCostItem,
    createWorkArea,
    updateWorkArea,
    deleteWorkArea,
    createFunctionalArea,
    updateFunctionalArea,
    deleteFunctionalArea,
    addBudgetAdjustment,
  } = useBudgetData();
  const { filters, setFilter, setAllFilters, resetFilters, hasActiveFilters } = useFilterState();
  const { filteredFunctionalAreas, filteredWorkAreas, filteredItems, summary } =
    useFilteredData(filters);
  const toast = useToast();

  // -- Year selector for SummaryStrip --
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const fa of functionalAreas) {
      for (const b of fa.budgets ?? []) {
        years.add(b.year);
      }
    }
    return Array.from(years).sort();
  }, [functionalAreas]);

  // -- Functional Area filter options (derived from context) --
  const faOptions = useMemo(
    () => functionalAreas.map((d) => ({ value: String(d.id), label: d.name })),
    [functionalAreas],
  );

  // -- SidePanel state --
  const [selectedItem, setSelectedItem] = useState<CostItem | null>(null);
  const [selectedFAContextId, setSelectedFAContextId] = useState<string | null>(null);
  const [selectedWorkAreaContextId, setSelectedWorkAreaContextId] = useState<string | null>(null);

  // -- Delete dialog state --
  const [deleteTarget, setDeleteTarget] = useState<CostItem | null>(null);

  // -- Transfer dialog state --
  const [transferOpen, setTransferOpen] = useState(false);

  // -- Quick create modal state --
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'item' | 'work-area' | 'functional-area'>('item');

  const [newItemFAId, setNewItemFAId] = useState<string | null>(null);
  const [newItemWorkAreaId, setNewItemWorkAreaId] = useState<string | null>(null);
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('0');

  const [newWAFAId, setNewWAFAId] = useState<string | null>(null);
  const [newWAName, setNewWAName] = useState('');

  const [newFAName, setNewFAName] = useState('');
  const [newFABudget, setNewFABudget] = useState('0');

  const workAreasForSelectedFA = useMemo(() => {
    if (newItemFAId == null) return [];
    return workAreas.filter((wa) => wa.functional_area_id === newItemFAId);
  }, [newItemFAId, workAreas]);

  useEffect(() => {
    if (functionalAreas.length === 0) return;
    if (newItemFAId == null) {
      setNewItemFAId(functionalAreas[0].id);
    }
    if (newWAFAId == null) {
      setNewWAFAId(functionalAreas[0].id);
    }
  }, [functionalAreas, newItemFAId, newWAFAId]);

  useEffect(() => {
    if (workAreasForSelectedFA.length === 0) {
      setNewItemWorkAreaId(null);
      return;
    }
    const stillValid = newItemWorkAreaId != null
      && workAreasForSelectedFA.some((wa) => wa.id === newItemWorkAreaId);
    if (!stillValid) {
      setNewItemWorkAreaId(workAreasForSelectedFA[0].id);
    }
  }, [workAreasForSelectedFA, newItemWorkAreaId]);

  // Build work areas with items attached (respects context edits)
  const workAreasWithItems: WorkAreaWithItems[] = useMemo(() => {
    return filteredWorkAreas.map((wa) => ({
      ...wa,
      cost_items: costItems.filter(
        (ci) =>
          ci.work_area_id === wa.id &&
          filteredItems.some((fi) => fi.id === ci.id),
      ),
    }));
  }, [filteredWorkAreas, costItems, filteredItems]);

  // Resolve functional area/workArea names for SidePanel
  const selectedFAName = useMemo(() => {
    if (!selectedItem) return '';
    const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
    if (!wa) return '';
    const fa = functionalAreas.find((d) => d.id === wa.functional_area_id);
    return fa?.name ?? '';
  }, [selectedItem, workAreas, functionalAreas]);

  const selectedWaName = useMemo(() => {
    if (!selectedItem) return '';
    const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
    return wa?.name ?? '';
  }, [selectedItem, workAreas]);

  const selectedFAId = useMemo(() => {
    if (!selectedItem) return undefined;
    const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
    if (!wa) return undefined;
    const fa = functionalAreas.find((d) => d.id === wa.functional_area_id);
    return fa?.id;
  }, [selectedItem, workAreas, functionalAreas]);

  const selectedFABudget = useMemo(() => {
    if (!selectedItem) return undefined;
    const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
    if (!wa) return undefined;
    const fa = functionalAreas.find((d) => d.id === wa.functional_area_id);
    return fa?.budget_total;
  }, [selectedItem, workAreas, functionalAreas]);

  const selectedFAContext = useMemo<FunctionalArea | null>(() => {
    if (selectedFAContextId == null) return null;
    return functionalAreas.find((d) => d.id === selectedFAContextId) ?? null;
  }, [selectedFAContextId, functionalAreas]);

  const selectedWorkAreaContext = useMemo<WorkArea | null>(() => {
    if (selectedWorkAreaContextId == null) return null;
    return workAreas.find((wa) => wa.id === selectedWorkAreaContextId) ?? null;
  }, [selectedWorkAreaContextId, workAreas]);

  const selectedWorkAreaFAName = useMemo(() => {
    if (!selectedWorkAreaContext) return undefined;
    return functionalAreas.find((d) => d.id === selectedWorkAreaContext.functional_area_id)?.name;
  }, [selectedWorkAreaContext, functionalAreas]);

  const faCommittedTotals = useMemo(() => {
    const workAreaToFA = new Map<string, string>();
    for (const wa of workAreas) {
      workAreaToFA.set(wa.id, wa.functional_area_id);
    }

    const totals: Record<string, number> = {};
    for (const fa of functionalAreas) {
      totals[fa.id] = 0;
    }

    // Committed = only approved items (consistent with useFilteredData source of truth)
    for (const item of filteredItems) {
      if (item.approval_status !== 'approved') continue;
      const faId = workAreaToFA.get(item.work_area_id);
      if (faId == null) continue;
      totals[faId] = (totals[faId] ?? 0) + item.total_amount;
    }

    return totals;
  }, [workAreas, functionalAreas, filteredItems]);

  // -- Handlers --

  const handleSelectItem = useCallback((item: CostItem) => {
    setSelectedFAContextId(null);
    setSelectedWorkAreaContextId(null);
    setSelectedItem(item);
  }, []);

  const handleSave = useCallback(
    (data: Partial<CostItem>) => {
      if (!data.id) return;
      const itemId = data.id;

      // If amount changed and user checked "Create Budget Adjustment", create one
      if (data.zielanpassung && data.total_amount !== undefined) {
        const originalItem = costItems.find((ci) => ci.id === itemId);
        if (originalItem && data.total_amount !== originalItem.total_amount) {
          const delta = data.total_amount - originalItem.total_amount;
          const reason = data.zielanpassung_reason || `Amount change on "${originalItem.description}"`;
          // Find functional area via work area
          const wa = workAreas.find((w) => w.id === originalItem.work_area_id);
          if (wa) {
            addBudgetAdjustment(wa.functional_area_id, delta, reason, 'scope_change');
          }
        }
      }

      updateCostItem(itemId, data);
      setSelectedItem(null);
      toast.success('Item saved');
    },
    [updateCostItem, costItems, workAreas, addBudgetAdjustment, toast],
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

  const handleOpenFAContext = useCallback((faId: string) => {
    setSelectedItem(null);
    setSelectedWorkAreaContextId(null);
    setSelectedFAContextId(faId);
  }, []);

  const handleOpenWorkAreaContext = useCallback((workAreaId: string) => {
    setSelectedItem(null);
    setSelectedFAContextId(null);
    setSelectedWorkAreaContextId(workAreaId);
  }, []);

  const handleFAContextSave = useCallback(
    (faId: string, data: { name: string; budget_total: number }) => {
      if (!data.name.trim()) {
        toast.error('Functional Area name must not be empty.');
        return;
      }
      updateFunctionalArea(faId, {
        name: data.name,
        budget_total: data.budget_total,
      });
      toast.success('Functional Area saved');
    },
    [updateFunctionalArea, toast],
  );

  const handleFAContextDelete = useCallback(
    (faId: string) => {
      if (selectedItem) {
        const wa = workAreas.find((w) => w.id === selectedItem.work_area_id);
        if (wa?.functional_area_id === faId) {
          setSelectedItem(null);
        }
      }
      deleteFunctionalArea(faId);
      setSelectedFAContextId(null);
      setSelectedWorkAreaContextId(null);
      toast.success('Functional Area deleted');
    },
    [selectedItem, workAreas, deleteFunctionalArea, toast],
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
    async (itemToDuplicate: CostItem) => {
      const newItem = await createCostItem(itemToDuplicate.work_area_id, {
        description: `${itemToDuplicate.description} (Copy)`,
        unit_price: itemToDuplicate.unit_price,
        quantity: itemToDuplicate.quantity,
        total_amount: itemToDuplicate.total_amount,
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
      if (newItem) setSelectedItem(newItem);
      toast.success('Item duplicated');
    },
    [createCostItem, toast, user],
  );

  const handleFilterFunctionalArea = useCallback(
    (faName: string) => {
      const fa = functionalAreas.find((d) => d.name === faName);
      if (fa) {
        setFilter('functionalAreas', [fa.id]);
      }
    },
    [functionalAreas, setFilter],
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
    setNewFAName('');
    setNewFABudget('0');
  }, []);

  const openCreate = useCallback(
    (mode: 'item' | 'work-area' | 'functional-area') => {
      setCreateMode(mode);
      setCreateOpen(true);
      resetCreateForm();
    },
    [resetCreateForm],
  );

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
  }, []);

  const handleCreateItem = useCallback(async () => {
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

    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const newItem = await createCostItem(newItemWorkAreaId, {
      description: newItemDescription.trim(),
      unit_price: amount,
      quantity: 1,
      total_amount: amount,
      expected_cash_out: now,
      approval_status: 'open',
      project_phase: filters.phases[0] ?? '',
      product: filters.products[0] ?? '',
      cost_basis: '',
      cost_driver: '',
      basis_description: '',
      assumptions: '',
      comments: '',
      zielanpassung: null,
      zielanpassung_reason: '',
      approval_date: null,
      requester: user?.name ?? 'Unknown',
    });

    if (!newItem) return;
    setSelectedItem(newItem);
    if (newItemFAId != null) {
      setAllFilters({ ...EMPTY_FILTER, functionalAreas: [newItemFAId] });
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
    newItemFAId,
    setAllFilters,
    closeCreate,
    toast,
    user,
  ]);

  const handleCreateWorkArea = useCallback(async () => {
    if (newWAFAId == null) {
      toast.error('Please select a functional area.');
      return;
    }
    const created = await createWorkArea(newWAFAId, newWAName);
    if (!created) {
      toast.error('Category could not be created (name empty or already exists).');
      return;
    }

    setNewItemFAId(newWAFAId);
    setNewItemWorkAreaId(created.id);
    setAllFilters({ ...EMPTY_FILTER, functionalAreas: [newWAFAId] });
    closeCreate();
    toast.success('New category created.');
  }, [newWAFAId, newWAName, createWorkArea, setAllFilters, closeCreate, toast]);

  const handleCreateFunctionalArea = useCallback(async () => {
    const budget = Math.max(0, Number(newFABudget) || 0);
    const created = await createFunctionalArea(newFAName, budget);
    if (!created) {
      toast.error('Functional Area could not be created (name empty or already exists).');
      return;
    }

    setAllFilters({ ...EMPTY_FILTER, functionalAreas: [created.id] });
    setNewItemFAId(created.id);
    setNewWAFAId(created.id);
    closeCreate();
    toast.success('New Functional Area created.');
  }, [newFABudget, createFunctionalArea, newFAName, setAllFilters, closeCreate, toast]);

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
              label="Functional Area"
              options={faOptions}
              selected={filters.functionalAreas}
              onChange={(vals) =>
                setFilter('functionalAreas', vals)
              }
            />
            <FilterChip
              label="Phase"
              options={phaseOptions}
              selected={filters.phases}
              onChange={(vals) =>
                setFilter('phases', vals)
              }
            />
            <FilterChip
              label="Product"
              options={productOptions}
              selected={filters.products}
              onChange={(vals) =>
                setFilter('products', vals)
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
            {canEdit && (
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-indigo-50/70 p-0.5">
                <button
                  onClick={() => openCreate('item')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-black hover:bg-gray-100 transition-colors"
                  title="New Item"
                >
                  <Plus size={12} />
                  New
                </button>
                <button
                  onClick={() => openCreate('work-area')}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-black hover:bg-gray-100 transition-colors"
                  title="New Category"
                >
                  <FolderPlus size={12} />
                </button>
                <button
                  onClick={() => openCreate('functional-area')}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-black hover:bg-gray-100 transition-colors"
                  title="New Functional Area"
                >
                  <Building2 size={12} />
                </button>
              </div>
            )}
            {canEdit && (
              <button
                onClick={() => setTransferOpen(true)}
                disabled={!selectedItem}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-gray-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title={selectedItem ? 'Transfer selected item to another facility' : 'Select an item first'}
              >
                <ArrowRightLeft size={12} />
                Transfer
              </button>
            )}
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
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
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
                <Layers size={16} className="text-black" />
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
                    createMode === 'item' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Item
                </button>
                <button
                  onClick={() => setCreateMode('work-area')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    createMode === 'work-area' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Category
                </button>
                <button
                  onClick={() => setCreateMode('functional-area')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    createMode === 'functional-area' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Functional Area
                </button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              {createMode === 'item' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Functional Area</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newItemFAId ?? ''}
                      onChange={(e) => setNewItemFAId(e.target.value)}
                    >
                      {functionalAreas.map((d) => (
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
                      {workAreasForSelectedFA.length === 0 ? (
                        <option value="">No category available</option>
                      ) : (
                        workAreasForSelectedFA.map((wa) => (
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
                      placeholder="Item description"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount (EUR)</label>
                    <ModalAmountInput
                      value={newItemAmount}
                      onChange={setNewItemAmount}
                      placeholder="0"
                      className="w-full rounded-md border border-gray-300 py-2 text-sm tabular-nums"
                    />
                  </div>
                </>
              )}

              {createMode === 'work-area' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Functional Area</label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={newWAFAId ?? ''}
                      onChange={(e) => setNewWAFAId(e.target.value)}
                    >
                      {functionalAreas.map((d) => (
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
                      placeholder="Category name"
                    />
                  </div>
                </>
              )}

              {createMode === 'functional-area' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Functional Area Name</label>
                    <input
                      value={newFAName}
                      onChange={(e) => setNewFAName(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Functional Area name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Initial Budget (EUR)</label>
                    <ModalAmountInput
                      value={newFABudget}
                      onChange={setNewFABudget}
                      placeholder="0"
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

              {createMode === 'functional-area' && (
                <button
                  onClick={handleCreateFunctionalArea}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Building2 size={14} />
                  Create Functional Area
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
              functionalAreas={filteredFunctionalAreas}
              workAreas={workAreasWithItems}
              functionalAreaCommittedTotals={faCommittedTotals}
              onSelectItem={handleSelectItem}
              selectedItemId={selectedItem?.id ?? null}
              onStatusChange={handleStatusChange}
              onDeleteItem={canEdit ? handleDeleteRequest : undefined}
              onOpenFunctionalAreaContext={handleOpenFAContext}
              onOpenWorkAreaContext={handleOpenWorkAreaContext}
            />
          </div>
        </div>

        {/* ---- SidePanel ---- */}
        <SidePanel
          item={selectedItem}
          functionalAreaName={selectedFAName}
          functionalAreaId={selectedFAId}
          functionalAreaBudget={selectedFABudget}
          workAreaName={selectedWaName}
          onSave={canEdit ? handleSave : undefined}
          onClose={() => setSelectedItem(null)}
          onDelete={canEdit ? handleDeleteFromPanel : undefined}
          onDuplicate={canEdit ? handleDuplicate : undefined}
          onFilterFunctionalArea={handleFilterFunctionalArea}
          onScrollToWorkArea={handleScrollToWorkArea}
        />

        <FunctionalAreaContextPanel
          functionalArea={selectedFAContext}
          workAreas={workAreas}
          costItems={costItems}
          onClose={() => setSelectedFAContextId(null)}
          onSave={canEdit ? handleFAContextSave : undefined}
          onDelete={canEdit ? handleFAContextDelete : undefined}
        />

        <WorkAreaContextPanel
          workArea={selectedWorkAreaContext}
          functionalAreaName={selectedWorkAreaFAName}
          costItems={costItems}
          onClose={() => setSelectedWorkAreaContextId(null)}
          onSave={canEdit ? handleWorkAreaContextSave : undefined}
          onDelete={canEdit ? handleWorkAreaContextDelete : undefined}
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
