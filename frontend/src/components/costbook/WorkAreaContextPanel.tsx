import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import type { CostItem, WorkArea } from '../../types/budget';
import { STATUS_LABELS } from '../../types/budget';
import { useAmountFormatter } from './AmountCell';

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const labelClass = 'text-xs font-medium text-gray-500 block mb-1';
const inputClass =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors';

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full text-left group py-2 border-b border-gray-100"
      >
        {isOpen ? (
          <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
        )}
        <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider group-hover:text-gray-700 transition-colors">
          {title}
        </span>
      </button>
      {isOpen && <div className="pt-3 pb-1">{children}</div>}
    </div>
  );
}

interface WorkAreaContextPanelProps {
  workArea: WorkArea | null;
  departmentName?: string;
  costItems: CostItem[];
  onClose: () => void;
  onSave: (workAreaId: number, data: { name: string }) => void;
  onDelete: (workAreaId: number) => void;
}

export default function WorkAreaContextPanel({
  workArea,
  departmentName,
  costItems,
  onClose,
  onSave,
  onDelete,
}: WorkAreaContextPanelProps) {
  const format = useAmountFormatter();
  const [nameDraft, setNameDraft] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (workArea) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [workArea]);

  useEffect(() => {
    if (!workArea) return;
    setNameDraft(workArea.name);
  }, [workArea]);

  const waItems = useMemo(() => {
    if (!workArea) return [];
    return costItems.filter((ci) => ci.work_area_id === workArea.id);
  }, [workArea, costItems]);

  const waTotal = useMemo(
    () => waItems.reduce((s, ci) => s + ci.current_amount, 0),
    [waItems],
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of waItems) {
      counts.set(item.approval_status, (counts.get(item.approval_status) ?? 0) + 1);
    }
    return counts;
  }, [waItems]);

  if (!workArea) return null;

  const hasChanges = nameDraft.trim() !== workArea.name;

  return (
    <div
      className="fixed right-0 top-0 h-full w-[480px] z-50 bg-white flex flex-col"
      style={{
        borderLeft: '1px solid var(--border-default)',
        borderTop: '3px solid #6366f1',
        boxShadow:
          '-8px 0 30px -5px rgba(0, 0, 0, 0.1), -2px 0 8px -2px rgba(0, 0, 0, 0.04)',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 300ms ease-out',
      }}
    >
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 text-[11px] tracking-wider text-indigo-600 font-semibold uppercase">
              <FolderOpen size={13} />
              Category
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-1 truncate">{workArea.name}</h2>
            {departmentName && (
              <p className="text-xs text-gray-500 mt-1">Department: {departmentName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Section title="Master Data" defaultOpen={true}>
          <div>
            <label className={labelClass}>Name</label>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className={inputClass}
            />
          </div>
        </Section>

        <Section title="Overview" defaultOpen={true}>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between gap-3 border-b border-gray-100">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-sm font-mono font-semibold text-gray-800">{format(waTotal)}</p>
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">Items</p>
              <p className="text-sm font-mono font-semibold text-gray-800">{waItems.length}</p>
            </div>
          </div>
        </Section>

        <Section title="Status Distribution" defaultOpen={true}>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {statusCounts.size === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-500">No status data.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {[...statusCounts.entries()].map(([status, count]) => (
                  <div key={status} className="px-3 py-2.5 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-700">{STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}</p>
                    <p className="text-sm font-mono text-gray-700">{count}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Items" defaultOpen={true}>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            {waItems.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-500">No items found.</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-72 overflow-auto">
                {[...waItems]
                  .sort((a, b) => b.current_amount - a.current_amount)
                  .map((item) => (
                    <div key={item.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.description}</p>
                        <p className="text-xs text-gray-500">{STATUS_LABELS[item.approval_status]}</p>
                      </div>
                      <p className="text-sm font-mono text-gray-700 whitespace-nowrap">{format(item.current_amount)}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Section>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 px-6 py-3 bg-white">
        {hasChanges && (
          <p className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            Unsaved changes
          </p>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Really delete category "${workArea.name}"? All contained items will be removed.`,
                )
              ) {
                onDelete(workArea.id);
              }
            }}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-150"
          >
            Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(workArea.id, { name: nameDraft.trim() })}
              disabled={!hasChanges}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 inline-flex items-center gap-1.5 ${
                hasChanges
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
