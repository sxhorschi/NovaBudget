import React from 'react';
import { NavLink } from 'react-router-dom';
import { Table2, Calendar, Upload } from 'lucide-react';
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
  { label: 'Import', to: '/import', icon: Upload },
];

const TabBar: React.FC = () => {
  return (
    <nav className="sticky top-14 z-30 flex h-10 items-end gap-1 border-b border-gray-200 bg-white px-4">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 pb-2.5 pt-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700'
            }`
          }
        >
          <tab.icon size={15} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default TabBar;
