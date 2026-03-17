import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Plus,
  ExternalLink,
  Copy,
  ChevronDown,
  Package,
  DollarSign,
} from 'lucide-react';
import type { Facility, FacilityStatus } from '../types/budget';
import {
  FACILITY_STATUS_LABELS,
  FACILITY_STATUS_COLORS,
  FACILITY_TYPE_LABELS,
  FACILITY_TYPE_COLORS,
} from '../types/budget';
import { useBudgetData } from '../context/BudgetDataContext';
import { useFacility } from '../context/FacilityContext';

// ---------------------------------------------------------------------------
// Status filter tabs
// ---------------------------------------------------------------------------

type StatusTab = 'all' | FacilityStatus;

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

// ---------------------------------------------------------------------------
// Helper: format EUR amount
// ---------------------------------------------------------------------------

function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// FacilityCard
// ---------------------------------------------------------------------------

interface FacilityCardProps {
  facility: Facility;
  budgetTotal: number;
  itemCount: number;
  onOpen: (facility: Facility) => void;
  onClone: (facility: Facility) => void;
  onChangeStatus: (facility: Facility, newStatus: FacilityStatus) => void;
}

const FacilityCard: React.FC<FacilityCardProps> = ({
  facility,
  budgetTotal,
  itemCount,
  onOpen,
  onClone,
  onChangeStatus,
}) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const availableStatuses = useMemo(() => {
    const all: FacilityStatus[] = ['planning', 'active', 'completed', 'archived'];
    return all.filter((s) => s !== facility.status);
  }, [facility.status]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {facility.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{facility.location || 'No location set'}</span>
          </div>
        </div>
        <Building2 size={20} className="text-gray-300 shrink-0 mt-0.5" />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FACILITY_STATUS_COLORS[facility.status]}`}
        >
          {FACILITY_STATUS_LABELS[facility.status]}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FACILITY_TYPE_COLORS[facility.facility_type]}`}
        >
          {FACILITY_TYPE_LABELS[facility.facility_type]}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <DollarSign size={12} />
            Budget Total
          </div>
          <div className="text-sm font-semibold text-gray-900 tabular-nums">
            {formatEur(budgetTotal)}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Package size={12} />
            Items
          </div>
          <div className="text-sm font-semibold text-gray-900 tabular-nums">
            {itemCount}
          </div>
        </div>
      </div>

      {/* Description */}
      {facility.description && (
        <p className="text-xs text-gray-400 mb-4 line-clamp-2">
          {facility.description}
        </p>
      )}

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => onOpen(facility)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <ExternalLink size={12} />
          Open
        </button>
        <button
          onClick={() => onClone(facility)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-slate-50 transition-colors"
        >
          <Copy size={12} />
          Clone
        </button>

        {/* Status change dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-slate-50 transition-colors"
          >
            Status
            <ChevronDown size={12} />
          </button>
          {statusMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStatusMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {availableStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onChangeStatus(facility, s);
                      setStatusMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-slate-50"
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${FACILITY_STATUS_COLORS[s].split(' ')[0]}`}
                    />
                    {FACILITY_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Create New Card (dashed)
// ---------------------------------------------------------------------------

const CreateNewCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="rounded-xl border-2 border-dashed border-slate-300 bg-white/50 p-6 flex flex-col items-center justify-center gap-3 min-h-[240px] hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors group cursor-pointer"
  >
    <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
      <Plus size={24} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
    </div>
    <span className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">
      Create New Facility
    </span>
  </button>
);

// ---------------------------------------------------------------------------
// FacilitiesPage
// ---------------------------------------------------------------------------

const FacilitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { departments, costItems } = useBudgetData();
  const { facilities, setCurrentFacility, createFacility } = useFacility();

  const [activeTab, setActiveTab] = useState<StatusTab>('all');

  // Local state for facilities list (clone + status changes are local until API exists)
  const [localFacilities, setLocalFacilities] = useState<Facility[]>(facilities);

  // Sync when context facilities change
  useMemo(() => {
    if (facilities.length !== localFacilities.length) {
      setLocalFacilities(facilities);
    }
  }, [facilities]);

  // Compute KPIs per facility
  const facilityKpis = useMemo(() => {
    const kpis: Record<string, { budgetTotal: number; itemCount: number }> = {};

    for (const f of localFacilities) {
      const facilityDepts = departments.filter((d) => d.facility_id === f.id);
      const budgetTotal = facilityDepts.reduce((sum, d) => sum + d.budget_total, 0);

      // In mock mode, all data belongs to the first facility
      const itemCount = facilityDepts.length > 0 ? costItems.length : 0;

      kpis[f.id] = {
        budgetTotal: facilityDepts.length > 0 ? budgetTotal : 0,
        itemCount,
      };
    }

    return kpis;
  }, [localFacilities, departments, costItems]);

  // Filtered facilities
  const filteredFacilities = useMemo(() => {
    if (activeTab === 'all') return localFacilities;
    return localFacilities.filter((f) => f.status === activeTab);
  }, [localFacilities, activeTab]);

  // Counts per status for tab badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: localFacilities.length };
    for (const f of localFacilities) {
      counts[f.status] = (counts[f.status] ?? 0) + 1;
    }
    return counts;
  }, [localFacilities]);

  const handleOpen = useCallback(
    (facility: Facility) => {
      setCurrentFacility(facility.id);
      navigate('/');
    },
    [navigate, setCurrentFacility],
  );

  const handleClone = useCallback(
    (facility: Facility) => {
      const cloneId = `f-${Date.now()}`;
      const cloned: Facility = {
        ...facility,
        id: cloneId,
        name: `${facility.name} (Clone)`,
        status: 'planning',
        source_facility_id: facility.id,
        sort_order: localFacilities.length,
      };
      setLocalFacilities((prev) => [...prev, cloned]);
      console.log('Cloned facility:', facility.id, '->', cloneId);
    },
    [localFacilities.length],
  );

  const handleChangeStatus = useCallback(
    (_facility: Facility, newStatus: FacilityStatus) => {
      setLocalFacilities((prev) =>
        prev.map((f) =>
          f.id === _facility.id ? { ...f, status: newStatus } : f,
        ),
      );
      console.log('Status changed:', _facility.id, '->', newStatus);
    },
    [],
  );

  const handleCreateNew = useCallback(() => {
    const newFacility = createFacility('New Facility', '');
    setLocalFacilities((prev) => [...prev, newFacility]);
    console.log('Created new facility:', newFacility.id);
  }, [createFacility]);

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Facilities</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your factory projects, clone existing facilities, and track progress.
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const count = statusCounts[tab.value] ?? 0;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-4 pb-3 pt-2 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-xs font-medium ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFacilities.map((facility) => {
          const kpi = facilityKpis[facility.id] ?? { budgetTotal: 0, itemCount: 0 };
          return (
            <FacilityCard
              key={facility.id}
              facility={facility}
              budgetTotal={kpi.budgetTotal}
              itemCount={kpi.itemCount}
              onOpen={handleOpen}
              onClone={handleClone}
              onChangeStatus={handleChangeStatus}
            />
          );
        })}
        <CreateNewCard onClick={handleCreateNew} />
      </div>
    </div>
  );
};

export default FacilitiesPage;
