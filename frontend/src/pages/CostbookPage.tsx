import React, { useState, useCallback, useMemo } from 'react';
import { X as XIcon } from 'lucide-react';
import HelpTooltip from '../components/help/HelpTooltip';
import type { CostItem, ApprovalStatus, ProjectPhase, Product } from '../types/budget';
import {
  PHASE_LABELS,
  PRODUCT_LABELS,
  STATUS_LABELS,
} from '../types/budget';
import { useBudgetData } from '../context/BudgetDataContext';
import { useFilterState } from '../hooks/useFilterState';
import { useFilteredData } from '../hooks/useFilteredData';
import FilterChip from '../components/filter/FilterChip';
import SearchInput from '../components/filter/SearchInput';
import SavedViews from '../components/filter/SavedViews';
import SummaryStrip from '../components/summary/SummaryStrip';
import CostbookTable from '../components/costbook/CostbookTable';
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
  const { departments, workAreas, costItems, updateCostItem, deleteCostItem } = useBudgetData();
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

  // -- Delete dialog state --
  const [deleteTarget, setDeleteTarget] = useState<CostItem | null>(null);

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

  // -- Handlers --

  const handleSelectItem = useCallback((item: CostItem) => {
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

  return (
    <>
      {/* ---- Sticky container: SavedViews + FilterBar + SummaryStrip ---- */}
      <div className="sticky top-[56px] z-20 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
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

          </div>
        </div>

        {/* ---- SummaryStrip (inside sticky container) ---- */}
        <SummaryStrip
          budget={summary.budget}
          committed={summary.committed}
          remaining={summary.remaining}
          delta={summary.delta}
          itemCount={summary.itemCount}
        />
      </div>

      {/* ---- Main content area ---- */}
      <div className="flex">
        <div
          className={`flex-1 min-w-0 transition-all duration-300 ease-out ${
            selectedItem ? 'mr-[480px]' : ''
          }`}
        >
          <div className="p-6">
            <CostbookTable
              departments={filteredDepartments}
              workAreas={workAreasWithItems}
              onSelectItem={handleSelectItem}
              selectedItemId={selectedItem?.id ?? null}
              onStatusChange={handleStatusChange}
              onDeleteItem={handleDeleteRequest}
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
