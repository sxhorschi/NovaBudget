import React from 'react';
import { Pencil, Clock, MessageCircle, Paperclip } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SidePanelTab = 'form' | 'activity' | 'comments' | 'attachments';

interface SidePanelTabsProps {
  activeTab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
  activityCount?: number;
  commentCount?: number;
  attachmentCount?: number;
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { key: SidePanelTab; icon: React.ElementType; countProp?: keyof Pick<SidePanelTabsProps, 'activityCount' | 'commentCount' | 'attachmentCount'> }[] = [
  { key: 'form', icon: Pencil },
  { key: 'activity', icon: Clock, countProp: 'activityCount' },
  { key: 'comments', icon: MessageCircle, countProp: 'commentCount' },
  { key: 'attachments', icon: Paperclip, countProp: 'attachmentCount' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SidePanelTabs: React.FC<SidePanelTabsProps> = (props) => {
  const { activeTab, onTabChange } = props;

  return (
    <div className="flex items-center border-b border-gray-100">
      {TABS.map(({ key, icon: Icon, countProp }) => {
        const isActive = activeTab === key;
        const count = countProp ? (props[countProp] ?? 0) : 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={`flex-1 flex items-center justify-center py-2.5 relative cursor-pointer transition-colors ${
              isActive
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={18} />
            {count > 0 && (
              <span className="absolute top-1 right-1/2 -translate-x-[-12px] min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded-full px-1">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SidePanelTabs;
