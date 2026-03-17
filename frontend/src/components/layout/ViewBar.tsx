import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Table2, Calendar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TabDef {
  label: string;
  segment: string;
  icon: LucideIcon;
}

const tabs: TabDef[] = [
  { label: 'Costbook', segment: 'costbook', icon: Table2 },
  { label: 'Cash-Out', segment: 'cashout', icon: Calendar },
];

const ViewBar: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();

  return (
    <nav className="flex h-11 items-end gap-1 border-b border-gray-200 bg-white px-4">
      {tabs.map((tab) => (
        <NavLink
          key={tab.segment}
          to={`/f/${facilityId}/${tab.segment}`}
          end
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 pb-3 pt-2.5 text-sm font-medium transition-colors rounded-t ${
              isActive
                ? 'border-b-[3px] border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-b-[3px] border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
            }`
          }
        >
          <tab.icon size={16} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default ViewBar;
