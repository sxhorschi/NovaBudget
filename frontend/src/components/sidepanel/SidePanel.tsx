import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import type { CostItem } from '../../types/budget';
import SidePanelForm from './SidePanelForm';
import AttachmentList from './AttachmentList';
import DecisionLog from './DecisionLog';
import BudgetAdjustmentHistory from './BudgetAdjustmentHistory';

// ---------------------------------------------------------------------------
// Department color mapping (mirrors CostbookTable DEPT_COLORS)
// ---------------------------------------------------------------------------

const DEPT_NAME_COLORS: Record<string, string> = {
  'Assembly Equipment': '#6366f1',
  'Testing': '#f59e0b',
  'Logistics': '#3b82f6',
  'Facility': '#ec4899',
  'Prototyping': '#a855f7',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidePanelProps {
  item: CostItem | null;
  departmentName?: string;
  departmentId?: number;
  departmentBudget?: number;
  workAreaName?: string;
  onSave: (data: Partial<CostItem>) => void;
  onClose: () => void;
  onDelete: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SidePanel: React.FC<SidePanelProps> = ({
  item,
  departmentName,
  departmentId,
  departmentBudget,
  workAreaName,
  onSave,
  onClose,
  onDelete,
}) => {
  // Local draft state -- cloned from item prop
  const [draft, setDraft] = useState<CostItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync draft when item changes
  useEffect(() => {
    if (item) {
      setDraft({ ...item });
      // Trigger slide-in on next frame
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [item]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Cmd/Ctrl + Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    if (item) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [item, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = useCallback(
    (field: keyof CostItem, value: CostItem[keyof CostItem]) => {
      setDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: value };
      });
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!draft || !item) return;
    // Only send changed fields
    const changes: Partial<CostItem> = {};
    for (const key of Object.keys(draft) as (keyof CostItem)[]) {
      if (draft[key] !== item[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (changes as any)[key] = draft[key];
      }
    }
    if (Object.keys(changes).length > 0) {
      onSave({ id: item.id, ...changes });
    }
    onClose();
  }, [draft, item, onSave, onClose]);

  const hasChanges = useCallback(() => {
    if (!draft || !item) return false;
    return JSON.stringify(draft) !== JSON.stringify(item);
  }, [draft, item]);

  // Resolve accent color from department name
  const accentColor = departmentName ? (DEPT_NAME_COLORS[departmentName] ?? '#6366f1') : '#6366f1';

  // Don't render if no item
  if (!item) return null;

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 h-full w-[480px] z-40 bg-white flex flex-col"
      style={{
        borderLeft: '1px solid var(--border-default)',
        boxShadow: isVisible
          ? '-8px 0 30px -5px rgba(0, 0, 0, 0.1), -2px 0 8px -2px rgba(0, 0, 0, 0.04)'
          : 'none',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out, box-shadow 250ms ease-out',
      }}
    >
      {/* ---- Header with department accent ---- */}
      <div
        className="flex-shrink-0 border-b border-gray-200 px-6 py-4"
        style={{
          borderTop: `3px solid ${accentColor}`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {draft?.description ?? item.description}
            </h2>
            {(departmentName || workAreaName) && (
              <p className="text-xs text-gray-500 mt-1 truncate flex items-center gap-1.5">
                {departmentName && (
                  <>
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="font-medium" style={{ color: accentColor }}>
                      {departmentName}
                    </span>
                  </>
                )}
                {departmentName && workAreaName && (
                  <span className="text-gray-300">/</span>
                )}
                {workAreaName && (
                  <span>{workAreaName}</span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ---- Scrollable Form Body ---- */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {draft && (
          <SidePanelForm item={draft} onChange={handleFieldChange} />
        )}

        {/* ---- Decision Log ---- */}
        {item && <DecisionLog item={item} />}

        {/* ---- Zielanpassungen (Department-Level) ---- */}
        {departmentId != null && departmentBudget != null && (
          <BudgetAdjustmentHistory
            departmentId={departmentId}
            originalBudget={departmentBudget}
          />
        )}

        {/* ---- Attachments Section ---- */}
        {item?.id && (
          <AttachmentList costItemId={String(item.id)} />
        )}
      </div>

      {/* ---- Sticky Footer ---- */}
      <div className="flex-shrink-0 border-t border-gray-200 px-6 py-3 bg-white">
        <div className="flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-150"
          >
            Löschen
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges()}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150
                ${
                  hasChanges()
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                    : 'bg-indigo-300 text-indigo-100 cursor-not-allowed'
                }
              `}
              title="Cmd+Enter"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
