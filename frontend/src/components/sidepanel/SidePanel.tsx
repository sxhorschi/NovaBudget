import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, ClipboardCopy, ChevronDown, ChevronRight } from 'lucide-react';
import type { CostItem } from '../../types/budget';
import { getFAColor } from '../../styles/design-tokens';
import { formatEUR } from '../costbook/AmountCell';
import SidePanelForm from './SidePanelForm';
import AttachmentList from './AttachmentList';
import DecisionLog from './DecisionLog';
import BudgetAdjustmentHistory from './BudgetAdjustmentHistory';
import PriceTimeline from './PriceTimeline';

function isDraftDirty(draft: CostItem | null, item: CostItem | null): boolean {
  if (!draft || !item) return false;
  for (const key of Object.keys(draft) as (keyof CostItem)[]) {
    if (draft[key] !== item[key]) {
      return true;
    }
  }
  return false;
}

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
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full text-left group py-2 border-l-2 border-gray-200 pl-2 hover:bg-gray-50 rounded-r transition-colors"
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
// Props
// ---------------------------------------------------------------------------

interface SidePanelProps {
  item: CostItem | null;
  functionalAreaName?: string;
  functionalAreaId?: string;
  functionalAreaBudget?: number;
  workAreaName?: string;
  onSave?: (data: Partial<CostItem>) => void;
  onClose: () => void;
  onDelete?: () => void;
  onDuplicate?: (item: CostItem) => void;
  onFilterFunctionalArea?: (functionalAreaName: string) => void;
  onScrollToWorkArea?: (workAreaName: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SidePanel: React.FC<SidePanelProps> = ({
  item,
  functionalAreaName,
  functionalAreaId,
  functionalAreaBudget,
  workAreaName,
  onSave,
  onClose,
  onDelete,
  onDuplicate,
  onFilterFunctionalArea,
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

  const hasUnsavedChanges = isDraftDirty(draft, item);

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
      onSave?.({ id: item.id, ...changes });
    }
    onClose();
  }, [draft, item, onSave, onClose]);

  const safeClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm('Discard unsaved changes?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

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
    const text = `${draft.description}\n${formatEUR(draft.total_amount)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch {
      // Fallback: noop
    }
  }, [draft]);

  // Resolve accent color from functional area ID
  const accentColor = functionalAreaId != null ? getFAColor(functionalAreaId) : '#6366f1';

  // Don't render if no item
  if (!item) return null;

  const _hasChanges = hasUnsavedChanges;

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 h-full w-[480px] z-50 bg-white flex flex-col shadow-2xl"
      style={{
        borderLeft: '1px solid var(--border-default)',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 300ms ease-out',
      }}
    >
      {/* ---- Header with gradient background ---- */}
      <div
        className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-700"
        style={{
          borderTop: `3px solid ${accentColor}`,
        }}
      >
        {/* Breadcrumb: Functional Area > Work Area > Item */}
        {(functionalAreaName || workAreaName) && (
          <div className="flex items-center gap-1.5 text-[11px] mb-2 overflow-hidden" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {functionalAreaName && (
              <button
                type="button"
                onClick={() => onFilterFunctionalArea?.(functionalAreaName)}
                className="transition-colors cursor-pointer font-medium flex-shrink-0 hover:text-white"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                title={`Filter: ${functionalAreaName}`}
              >
                {functionalAreaName}
              </button>
            )}
            {functionalAreaName && workAreaName && (
              <ChevronRight size={11} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
            )}
            {workAreaName && (
              <button
                type="button"
                onClick={() => onScrollToWorkArea?.(workAreaName)}
                className="transition-colors cursor-pointer flex-shrink-0 hover:text-white"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                title={`Scroll to: ${workAreaName}`}
              >
                {workAreaName}
              </button>
            )}
            {(functionalAreaName || workAreaName) && draft?.description && (
              <>
                <ChevronRight size={11} className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="truncate font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{draft.description}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white truncate">
              {draft?.description ?? item.description}
            </h2>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {onDuplicate && (
              <button
                onClick={handleDuplicate}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-all duration-150"
                aria-label="Duplicate"
                title="Duplicate"
              >
                <Copy size={16} />
              </button>
            )}
            <button
              onClick={handleCopyToClipboard}
              className={`p-1.5 rounded-lg transition-all duration-150 ${
                copiedToClipboard
                  ? 'text-green-300 bg-white/20'
                  : 'text-white/70 hover:text-white hover:bg-white/20'
              }`}
              aria-label="Copy to clipboard"
              title={copiedToClipboard ? 'Copied!' : 'Copy to clipboard'}
            >
              <ClipboardCopy size={16} />
            </button>
            <button
              onClick={safeClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-all duration-150"
              aria-label="Close"
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

        {/* ---- Budget Adjustments (collapsible, default closed unless active) ---- */}
        {functionalAreaId != null && functionalAreaBudget != null && (
          <CollapsibleSection
            title="Budget Adjustments"
            defaultOpen={!!item.zielanpassung}
          >
            <BudgetAdjustmentHistory
              functionalAreaId={functionalAreaId}
              originalBudget={functionalAreaBudget}
            />
          </CollapsibleSection>
        )}

        {/* ---- Price History (collapsible, default closed) ---- */}
        {item?.id && (
          <CollapsibleSection title="Price History" defaultOpen={false}>
            <PriceTimeline costItemId={String(item.id)} />
          </CollapsibleSection>
        )}

        {/* ---- Attachments (collapsible, default closed, shows count badge) ---- */}
        {item?.id && (
          <CollapsibleSection
            title="Attachments"
            defaultOpen={false}
            badge={
              attachmentCount > 0 ? (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold bg-indigo-50 text-indigo-600 rounded-full">
                  {attachmentCount}
                </span>
              ) : undefined
            }
          >
            <AttachmentList costItemId={String(item.id)} onCountChange={setAttachmentCount} />
          </CollapsibleSection>
        )}

        {/* ---- History (collapsible, default closed) ---- */}
        <CollapsibleSection title="History" defaultOpen={false}>
          <DecisionLog item={item} />
        </CollapsibleSection>
      </div>

      {/* ---- Sticky Footer ---- */}
      <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 bg-white">
        {/* Created / Updated timestamps */}
        <div className="text-[11px] text-gray-400 mb-2 flex items-center gap-3">
          <span>Created: {formatDateDE(item.created_at)}</span>
          <span className="text-gray-300">|</span>
          <span>Last modified: {formatDateDE(item.updated_at)}</span>
        </div>

        {_hasChanges && (
          <p className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            Unsaved changes
          </p>
        )}
        <div className="flex items-center justify-between">
          {onDelete ? (
            <button
              onClick={onDelete}
              className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-150"
            >
              Delete
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={safeClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150"
            >
              {onSave ? 'Cancel' : 'Close'}
            </button>
            {onSave && (
              <button
                onClick={handleSave}
                disabled={!_hasChanges}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${
                    _hasChanges
                      ? 'bg-gradient-to-r from-indigo-900 to-indigo-700 hover:from-indigo-800 hover:to-indigo-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
                title="Cmd+Enter"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
