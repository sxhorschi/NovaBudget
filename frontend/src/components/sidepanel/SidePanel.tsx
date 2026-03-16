import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, ClipboardCopy, ChevronDown, ChevronRight } from 'lucide-react';
import type { CostItem } from '../../types/budget';
import SidePanelForm from './SidePanelForm';
import AttachmentList from './AttachmentList';
import DecisionLog from './DecisionLog';
import BudgetAdjustmentHistory from './BudgetAdjustmentHistory';

// ---------------------------------------------------------------------------
// Department color mapping (mirrors CostbookTable & CashOutPage)
// ---------------------------------------------------------------------------

const DEPT_ID_COLORS: Record<number, string> = {
  1: '#6366f1', // Assembly — indigo
  2: '#f59e0b', // Testing — amber
  3: '#3b82f6', // Intralogistics — blue
  4: '#ec4899', // Building & Infrastructure — pink
  5: '#a855f7', // Prototyping Lab — purple
};

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

interface CollapsibleSectionProps {
  title: string;
  defaultOpen: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  defaultOpen,
  badge,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full text-left group"
      >
        {isOpen ? (
          <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        )}
        <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider group-hover:text-gray-700 transition-colors">
          {title}
        </span>
        {badge && !isOpen && <span className="ml-1">{badge}</span>}
      </button>
      {isOpen && <div className="mt-3">{children}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Date formatter
// ---------------------------------------------------------------------------

function formatDateDE(iso: string | null | undefined): string {
  if (!iso) return '\u2013';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// EUR formatter for clipboard
// ---------------------------------------------------------------------------

const eurFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

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
  onDuplicate?: (item: CostItem) => void;
  onFilterDepartment?: (departmentName: string) => void;
  onScrollToWorkArea?: (workAreaName: string) => void;
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
  onDuplicate,
  onFilterDepartment,
  onScrollToWorkArea,
}) => {
  // Local draft state -- cloned from item prop
  const [draft, setDraft] = useState<CostItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Attachment count state (lifted so badge can show in collapsed header)
  const [attachmentCount, setAttachmentCount] = useState(0);

  // Sync draft when item changes
  useEffect(() => {
    if (item) {
      setDraft({ ...item });
      setCopiedToClipboard(false);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [item]);

  const handleFieldChange = useCallback(
    (field: keyof CostItem, value: CostItem[keyof CostItem]) => {
      setDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: value };
      });
    },
    [],
  );

  const hasChanges = useCallback(() => {
    if (!draft || !item) return false;
    return JSON.stringify(draft) !== JSON.stringify(item);
  }, [draft, item]);

  const handleSave = useCallback(() => {
    if (!draft || !item) return;
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

  const safeClose = useCallback(() => {
    if (hasChanges()) {
      if (window.confirm('Ungespeicherte \u00c4nderungen verwerfen?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Close on Escape, Cmd+Enter to save
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        safeClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    if (item) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [item, draft, safeClose, handleSave]);

  // --- Quick Actions ---

  const handleDuplicate = useCallback(() => {
    if (!item) return;
    onDuplicate?.(item);
  }, [item, onDuplicate]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!draft) return;
    const text = `${draft.description}\n${eurFormatter.format(draft.current_amount)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch {
      // Fallback: noop
    }
  }, [draft]);

  // Resolve accent color from department ID
  const accentColor = departmentId != null ? (DEPT_ID_COLORS[departmentId] ?? '#6366f1') : '#6366f1';

  // Don't render if no item
  if (!item) return null;

  const _hasChanges = hasChanges();

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
        {/* Breadcrumb: Department > Work Area > Item */}
        {(departmentName || workAreaName) && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2 overflow-hidden">
            {departmentName && (
              <button
                type="button"
                onClick={() => onFilterDepartment?.(departmentName)}
                className="hover:text-indigo-600 transition-colors cursor-pointer font-medium flex-shrink-0"
                style={{ color: accentColor }}
                title={`Filter: ${departmentName}`}
              >
                {departmentName}
              </button>
            )}
            {departmentName && workAreaName && (
              <ChevronRight size={11} className="text-gray-300 flex-shrink-0" />
            )}
            {workAreaName && (
              <button
                type="button"
                onClick={() => onScrollToWorkArea?.(workAreaName)}
                className="hover:text-gray-600 transition-colors cursor-pointer flex-shrink-0"
                title={`Scroll zu: ${workAreaName}`}
              >
                {workAreaName}
              </button>
            )}
            {(departmentName || workAreaName) && draft?.description && (
              <>
                <ChevronRight size={11} className="text-gray-300 flex-shrink-0" />
                <span className="text-gray-500 truncate font-medium">{draft.description}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {draft?.description ?? item.description}
            </h2>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onDuplicate && (
              <button
                onClick={handleDuplicate}
                className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150"
                aria-label="Duplizieren"
                title="Duplizieren"
              >
                <Copy size={16} />
              </button>
            )}
            <button
              onClick={handleCopyToClipboard}
              className={`p-1.5 rounded-lg transition-all duration-150 ${
                copiedToClipboard
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
              aria-label="In Zwischenablage kopieren"
              title={copiedToClipboard ? 'Kopiert!' : 'In Zwischenablage'}
            >
              <ClipboardCopy size={16} />
            </button>
            <button
              onClick={safeClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
              aria-label="Schlie\u00dfen"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Scrollable Form Body ---- */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {draft && (
          <SidePanelForm item={draft} originalItem={item} onChange={handleFieldChange} />
        )}

        {/* ---- Zielanpassung (collapsible, default closed unless active) ---- */}
        <CollapsibleSection
          title="Zielanpassung"
          defaultOpen={item.zielanpassung || (departmentId != null && departmentBudget != null)}
        >
          {departmentId != null && departmentBudget != null && (
            <BudgetAdjustmentHistory
              departmentId={departmentId}
              originalBudget={departmentBudget}
            />
          )}
        </CollapsibleSection>

        {/* ---- Anh\u00e4nge (collapsible, default closed, shows count badge) ---- */}
        {item?.id && (
          <CollapsibleSection
            title="Anh\u00e4nge"
            defaultOpen={false}
            badge={
              attachmentCount > 0 ? (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                  {attachmentCount}
                </span>
              ) : undefined
            }
          >
            <AttachmentList costItemId={String(item.id)} onCountChange={setAttachmentCount} />
          </CollapsibleSection>
        )}

        {/* ---- Historie (collapsible, default closed) ---- */}
        <CollapsibleSection title="Historie" defaultOpen={false}>
          <DecisionLog item={item} />
        </CollapsibleSection>
      </div>

      {/* ---- Sticky Footer ---- */}
      <div className="flex-shrink-0 border-t border-gray-200 px-6 py-3 bg-white">
        {/* Created / Updated timestamps */}
        <div className="text-[11px] text-gray-400 mb-2 flex items-center gap-3">
          <span>Erstellt: {formatDateDE(item.created_at)}</span>
          <span className="text-gray-300">|</span>
          <span>Letzte \u00c4nderung: {formatDateDE(item.updated_at)}</span>
        </div>

        {_hasChanges && (
          <p className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            Ungespeicherte \u00c4nderungen
          </p>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-150"
          >
            L\u00f6schen
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={safeClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={!_hasChanges}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150
                ${
                  _hasChanges
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
