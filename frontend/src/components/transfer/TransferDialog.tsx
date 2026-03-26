import React, { useState, useMemo, useCallback } from 'react';
import { X, ArrowRightLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useBudgetData } from '../../context/BudgetDataContext';
import { useFacility } from '../../context/FacilityContext';
import { useToast } from '../common/ToastProvider';
import { transferCostItems, transferWorkAreas, transferFunctionalAreas } from '../../api/transfers';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'cost_item' | 'work_area' | 'functional_area';
  entityIds: string[];
  sourceFacilityId: string;
}

// ---------------------------------------------------------------------------
// Entity type labels
// ---------------------------------------------------------------------------

const ENTITY_TYPE_LABELS: Record<string, string> = {
  cost_item: 'Item',
  work_area: 'Work Area',
  functional_area: 'Functional Area',
};

// ---------------------------------------------------------------------------
// TransferDialog
// ---------------------------------------------------------------------------

const TransferDialog: React.FC<TransferDialogProps> = ({
  isOpen,
  onClose,
  entityType,
  entityIds,
  sourceFacilityId,
}) => {
  const { functionalAreas, workAreas } = useBudgetData();
  const { facilities: allFacilities } = useFacility();
  const toast = useToast();

  // Loading state for API call
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: target facility
  const [targetFacilityId, setTargetFacilityId] = useState<string>('');

  // Step 2: target location
  const [targetFunctionalAreaId, setTargetFunctionalAreaId] = useState<string>('');
  const [targetWorkAreaId, setTargetWorkAreaId] = useState<string>('');

  // Step 3: options
  const [transferMode, setTransferMode] = useState<'copy' | 'move'>('copy');
  const [resetStatus, setResetStatus] = useState(false);
  const [resetAmounts, setResetAmounts] = useState(false);

  // Available target facilities (exclude current)
  const targetFacilities = useMemo(() => {
    return allFacilities.filter(
      (f) => f.id !== sourceFacilityId,
    );
  }, [allFacilities, sourceFacilityId]);

  // Target facility object
  const targetFacility = useMemo(() => {
    return allFacilities.find((f) => f.id === targetFacilityId) ?? null;
  }, [allFacilities, targetFacilityId]);

  // Functional areas in target facility
  const targetFunctionalAreas = useMemo(() => {
    if (!targetFacilityId) return [];
    return functionalAreas.filter((d) => d.facility_id === targetFacilityId);
  }, [targetFacilityId, functionalAreas]);

  // Work areas in selected target functional area
  const targetWorkAreas = useMemo(() => {
    if (!targetFunctionalAreaId) return [];
    return workAreas.filter((wa) => wa.functional_area_id === targetFunctionalAreaId);
  }, [targetFunctionalAreaId, workAreas]);

  // Whether step 2 is needed
  const needsLocationStep = entityType === 'cost_item' || entityType === 'work_area';

  // Max step: functional areas only need facility selection, others need location too
  const maxStep = entityType === 'functional_area' ? 3 : 4;

  const handleNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, maxStep));
  }, [maxStep]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      let result;
      if (entityType === 'cost_item') {
        result = await transferCostItems({
          source_facility_id: sourceFacilityId,
          target_facility_id: targetFacilityId,
          cost_item_ids: entityIds,
          target_work_area_id: targetWorkAreaId,
          mode: transferMode,
          reset_status: resetStatus,
          reset_amounts: resetAmounts,
        });
      } else if (entityType === 'work_area') {
        result = await transferWorkAreas({
          source_facility_id: sourceFacilityId,
          target_facility_id: targetFacilityId,
          work_area_ids: entityIds,
          target_functional_area_id: targetFunctionalAreaId,
          mode: transferMode,
          reset_status: resetStatus,
          reset_amounts: resetAmounts,
        });
      } else {
        result = await transferFunctionalAreas({
          source_facility_id: sourceFacilityId,
          target_facility_id: targetFacilityId,
          functional_area_ids: entityIds,
          mode: transferMode,
          reset_status: resetStatus,
          reset_amounts: resetAmounts,
        });
      }
      const label = ENTITY_TYPE_LABELS[entityType];
      toast.success(
        `${result.transferred_count} ${label}${result.transferred_count !== 1 ? 's' : ''} ${transferMode === 'move' ? 'moved' : 'copied'} successfully`,
      );
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Transfer failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    entityType,
    entityIds,
    sourceFacilityId,
    targetFacilityId,
    targetFunctionalAreaId,
    targetWorkAreaId,
    transferMode,
    resetStatus,
    resetAmounts,
    onClose,
    toast,
  ]);

  // Reset state when closing
  const handleClose = useCallback(() => {
    setStep(1);
    setTargetFacilityId('');
    setTargetFunctionalAreaId('');
    setTargetWorkAreaId('');
    setTransferMode('copy');
    setResetStatus(false);
    setResetAmounts(false);
    onClose();
  }, [onClose]);

  // Can proceed to next step?
  const canProceed = useMemo(() => {
    if (step === 1) return !!targetFacilityId;
    if (step === 2 && needsLocationStep) {
      if (entityType === 'cost_item') return !!targetFunctionalAreaId && !!targetWorkAreaId;
      if (entityType === 'work_area') return !!targetFunctionalAreaId;
    }
    return true;
  }, [step, targetFacilityId, needsLocationStep, entityType, targetFunctionalAreaId, targetWorkAreaId]);

  // Determine the "options" step and "confirm" step number
  const optionsStep = needsLocationStep ? 3 : 2;
  const confirmStep = needsLocationStep ? 4 : 3;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900 inline-flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-indigo-600" />
            Transfer {ENTITY_TYPE_LABELS[entityType]}
            {entityIds.length > 1 ? 's' : ''}
          </h3>
          <button
            onClick={handleClose}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {Array.from({ length: maxStep }, (_, i) => i + 1).map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    s === step
                      ? 'bg-indigo-600 text-white'
                      : s < step
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {s}
                </div>
                {s < maxStep && (
                  <ChevronRight
                    size={14}
                    className={s < step ? 'text-indigo-600' : 'text-gray-300'}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-5 py-4 min-h-[200px]">
          {/* Step 1: Select target facility */}
          {step === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Target Facility
              </label>
              {targetFacilities.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No eligible target facilities available. Create another facility first.
                </p>
              ) : (
                <div className="space-y-2">
                  {targetFacilities.map((f) => (
                    <label
                      key={f.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        targetFacilityId === f.id
                          ? 'border-gray-200 bg-indigo-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetFacility"
                        value={f.id}
                        checked={targetFacilityId === f.id}
                        onChange={() => {
                          setTargetFacilityId(f.id);
                          setTargetFunctionalAreaId('');
                          setTargetWorkAreaId('');
                        }}
                        className="accent-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {f.name}
                        </div>
                        <div className="text-xs text-gray-500">{f.location}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select target location (for items and work areas) */}
          {step === 2 && needsLocationStep && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Functional Area
                </label>
                {targetFunctionalAreas.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No functional areas found in {targetFacility?.name ?? 'the target facility'}.
                    The target facility needs at least one functional area.
                  </p>
                ) : (
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={targetFunctionalAreaId}
                    onChange={(e) => {
                      setTargetFunctionalAreaId(e.target.value);
                      setTargetWorkAreaId('');
                    }}
                  >
                    <option value="">Select a functional area...</option>
                    {targetFunctionalAreas.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {entityType === 'cost_item' && targetFunctionalAreaId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Work Area
                  </label>
                  {targetWorkAreas.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No work areas in this functional area. Create one first.
                    </p>
                  ) : (
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={targetWorkAreaId}
                      onChange={(e) => setTargetWorkAreaId(e.target.value)}
                    >
                      <option value="">Select a work area...</option>
                      {targetWorkAreas.map((wa) => (
                        <option key={wa.id} value={wa.id}>
                          {wa.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Options step */}
          {step === optionsStep && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Transfer Mode
                </label>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      transferMode === 'copy'
                        ? 'border-gray-200 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transferMode"
                      value="copy"
                      checked={transferMode === 'copy'}
                      onChange={() => setTransferMode('copy')}
                      className="accent-indigo-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Copy</div>
                      <div className="text-xs text-gray-500">
                        Keep original, create duplicate in target
                      </div>
                    </div>
                  </label>
                  <label
                    className={`flex-1 flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      transferMode === 'move'
                        ? 'border-gray-200 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transferMode"
                      value="move"
                      checked={transferMode === 'move'}
                      onChange={() => setTransferMode('move')}
                      className="accent-indigo-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Move</div>
                      <div className="text-xs text-gray-500">
                        Remove from source, place in target
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetStatus}
                    onChange={(e) => setResetStatus(e.target.checked)}
                    className="rounded border-gray-300 accent-indigo-600"
                  />
                  <div>
                    <div className="text-sm text-gray-700">Reset status to Open</div>
                    <div className="text-xs text-gray-400">
                      All transferred items will start as &quot;Open&quot; in the target
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetAmounts}
                    onChange={(e) => setResetAmounts(e.target.checked)}
                    className="rounded border-gray-300 accent-indigo-600"
                  />
                  <div>
                    <div className="text-sm text-gray-700">Reset amounts to 0</div>
                    <div className="text-xs text-gray-400">
                      Current amounts will be zeroed out (use as template)
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Confirm step */}
          {step === confirmStep && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Transfer Summary</h4>
              <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-900">
                    {ENTITY_TYPE_LABELS[entityType]}
                    {entityIds.length > 1 ? ` (${entityIds.length})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target Facility</span>
                  <span className="font-medium text-gray-900">
                    {targetFacility?.name ?? '-'}
                  </span>
                </div>
                {targetFunctionalAreaId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Target Functional Area</span>
                    <span className="font-medium text-gray-900">
                      {functionalAreas.find((d) => d.id === targetFunctionalAreaId)?.name ?? '-'}
                    </span>
                  </div>
                )}
                {targetWorkAreaId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Target Work Area</span>
                    <span className="font-medium text-gray-900">
                      {workAreas.find((wa) => wa.id === targetWorkAreaId)?.name ?? '-'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Mode</span>
                  <span className="font-medium text-gray-900 capitalize">{transferMode}</span>
                </div>
                {resetStatus && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reset Status</span>
                    <span className="font-medium text-green-700">Yes</span>
                  </div>
                )}
                {resetAmounts && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reset Amounts</span>
                    <span className="font-medium text-green-700">Yes</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
          <button
            onClick={step === 1 ? handleClose : handleBack}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            {step < confirmStep ? (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ArrowRightLeft size={14} />
                )}
                {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferDialog;
