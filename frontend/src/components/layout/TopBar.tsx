import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import ExportMenu from '../export/ExportMenu';
import SettingsPanel from '../settings/SettingsPanel';

const TopBar: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
        {/* Left: Logo + Facility */}
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-indigo-600 tracking-tight">NovaDrive</span>
          <span className="hidden sm:inline text-sm text-gray-400">|</span>
          <span className="hidden sm:inline text-sm text-gray-500">Werk Sued -- Augsburg</span>
        </div>

        {/* Right: Export + Settings */}
        <div className="flex items-center gap-2">
          <ExportMenu />
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className={`rounded-md p-2 transition-colors ${
              settingsOpen
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
            aria-label="Einstellungen"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export default TopBar;
