import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, ClipboardCopy, ChevronRight } from 'lucide-react';
import type { CostItem, ApprovalStatus } from '../../types/budget';
import { STATUS_LABELS } from '../../types/budget';
import StatusBadge from '../costbook/StatusBadge';
import { getFAColor } from '../../styles/design-tokens';
import { formatEUR } from '../costbook/AmountCell';
import SidePanelForm from './SidePanelForm';
import SidePanelTabs from './SidePanelTabs';
import type { SidePanelTab } from './SidePanelTabs';
import ActivityTimeline from './ActivityTimeline';
import AttachmentList from './AttachmentList';
import CommentThread from './CommentThread';
import { useBudgetData } from '../../context/BudgetDataContext';

function isDraftDirty(draft: CostItem | null, item: CostItem | null): boolean {
  if (!draft || !item) return false;
  for (const key of Object.keys(draft) as (keyof CostItem)[]) {
    if (draft[key] !== item[key]) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Date formatter
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '\u2013';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// StatusBadge from costbook is reused for the sidebar status dropdown

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
  onStatusChange?: (itemId: string, newStatus: ApprovalStatus) => void;
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
  onStatusChange,
  onClose,
  onDelete,
  onDuplicate,
  onFilterFunctionalArea,
  onScrollToWorkArea,
}) => {
  const { reloadData } = useBudgetData();
  const [draft, setDraft] = useState<CostItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [activeTab, setActiveTab] = useState<SidePanelTab>('form');
  const panelRef = useRef<HTMLDivElement>(null);

  // Count states for tab badges
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);

  const isSavedItem = !!item?.id;

  // Sync draft when item changes
  useEffect(() => {
    if (item) {
      setDraft({ ...item });
      setCopiedToClipboard(false);
      setAttachmentCount(0);
      setCommentCount(0);
      setActivityCount(0);
      setActiveTab('form');
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
      if (e.key === 'Escape') safeClose();
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
    } catch { /* noop */ }
  }, [draft]);

  const accentColor = functionalAreaId != null ? getFAColor(functionalAreaId) : '#6366f1';

  if (!item) return null;

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
      {/* ---- Header ---- */}
      <div
        className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-700"
        style={{ borderTop: `3px solid ${accentColor}` }}
      >
        {/* Breadcrumb */}
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
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white truncate" title={draft?.description ?? item.description}>
              {draft?.description ?? item.description}
            </h2>
            {/* Total amount — always visible */}
            <p className="text-2xl font-bold text-white tabular-nums mt-1">
              {formatEUR(draft?.total_amount ?? item.total_amount)}
            </p>
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
                copiedToClipboard ? 'text-green-300 bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/20'
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

      {/* ---- Status ---- */}
      {draft && (
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex-shrink-0">Status</span>
          <StatusBadge
            status={draft.approval_status}
            onChange={onStatusChange && item?.id ? (s) => {
              onStatusChange(String(item.id), s);
              setDraft((prev) => prev ? { ...prev, approval_status: s } : prev);
            } : undefined}
          />
        </div>
      )}

      {/* ---- Tab Bar ---- */}
      {isSavedItem && (
        <SidePanelTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activityCount={activityCount}
          commentCount={commentCount}
          attachmentCount={attachmentCount}
        />
      )}

      {/* ---- Tab Content (scrollable) ---- */}
      <div className="flex-1 overflow-y-auto">
        {/* Form Tab */}
        {(activeTab === 'form' || !isSavedItem) && (
          <div className="px-6 py-4">
            {draft && (
              <SidePanelForm item={draft} originalItem={item} onChange={handleFieldChange} onPriceHistoryCreated={reloadData} functionalAreaId={functionalAreaId} />
            )}

          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && isSavedItem && (
          <div className="px-5 py-4">
            <ActivityTimeline
              costItemId={String(item.id)}
              item={item}
              functionalAreaId={functionalAreaId}
              functionalAreaBudget={functionalAreaBudget}
              onCountChange={setActivityCount}
            />
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && isSavedItem && (
          <div className="px-5 py-4">
            <CommentThread costItemId={String(item.id)} onCountChange={setCommentCount} />
          </div>
        )}

        {/* Attachments Tab */}
        {activeTab === 'attachments' && isSavedItem && (
          <div className="px-5 py-4">
            <AttachmentList costItemId={String(item.id)} onCountChange={setAttachmentCount} />
          </div>
        )}
      </div>

      {/* ---- Sticky Footer ---- */}
      <div className="flex-shrink-0 border-t border-gray-100 px-6 py-3 bg-white">
        <div className="text-[11px] text-gray-400 mb-2 flex items-center gap-3">
          <span>Created: {formatDate(item.created_at)}</span>
          <span className="text-gray-300">|</span>
          <span>Last modified: {formatDate(item.updated_at)}</span>
        </div>

        {hasUnsavedChanges && (
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
          ) : <span />}

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
                disabled={!hasUnsavedChanges}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  hasUnsavedChanges
                    ? 'bg-gradient-to-r from-indigo-900 to-indigo-700 hover:from-indigo-800 hover:to-indigo-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
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
