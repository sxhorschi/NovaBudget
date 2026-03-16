import React from 'react';
import { NavLink } from 'react-router-dom';
import { Table2, Calendar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TabDef {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

const tabs: TabDef[] = [
  { label: 'Costbook', to: '/', icon: Table2, end: true },
  { label: 'Cash-Out', to: '/cashout', icon: Calendar },
];

const TabBar: React.FC = () => {
  return (
    <nav className="sticky top-16 z-30 flex h-11 items-end gap-1 border-b border-gray-200 bg-white px-4 shadow-sm">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
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

export default TabBar;
