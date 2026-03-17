import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, LogOut, MapPin, Briefcase, Mail, Shield } from 'lucide-react';
import ExportMenu from '../export/ExportMenu';
import SettingsPanel from '../settings/SettingsPanel';
import FacilitySwitcher from './FacilitySwitcher';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Avatar color — deterministic hue from name
// ---------------------------------------------------------------------------

function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getAvatarStyle(name: string): React.CSSProperties {
  const hue = nameToHue(name);
  return {
    backgroundColor: `hsl(${hue}, 55%, 48%)`,
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<User['role'], string> = {
  admin: 'bg-indigo-100 text-indigo-700',
  editor: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-gray-100 text-gray-600',
};

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'Administrator',
  editor: 'Editor',
  viewer: 'Viewer',
};

// ---------------------------------------------------------------------------
// UserMenu — avatar button + dropdown
// ---------------------------------------------------------------------------

const UserMenu: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!user) return null;

  const initials = getInitials(user.name);
  const avatarStyle = getAvatarStyle(user.name);
  const hasPhoto = !!user.photo_url;

  return (
    <div ref={containerRef} className="relative">
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 group"
        aria-label={`User menu for ${user.name}`}
        aria-expanded={open}
      >
        {hasPhoto ? (
          <img
            src={user.photo_url}
            alt={user.name}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm group-hover:ring-indigo-300 transition-all"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white select-none ring-2 ring-white shadow-sm group-hover:ring-indigo-300 transition-all"
            style={avatarStyle}
          >
            {initials}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white shadow-xl border border-gray-100 py-1 z-[200] animate-in fade-in slide-in-from-top-1 duration-100">
          {/* User info block */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {hasPhoto ? (
                <img
                  src={user.photo_url}
                  alt={user.name}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white select-none flex-shrink-0"
                  style={avatarStyle}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                {user.job_title && (
                  <p className="text-xs text-gray-500 truncate">{user.job_title}</p>
                )}
              </div>
            </div>

            {/* Role + Department */}
            {user.role && (
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role]}`}
                >
                  {ROLE_LABELS[user.role]}
                </span>
                {user.department && (
                  <span className="text-xs text-gray-400 truncate">{user.department}</span>
                )}
              </div>
            )}

            {/* Profile details */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail size={12} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.office_location && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{user.office_location}</span>
                </div>
              )}
              {user.company_name && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Briefcase size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{user.company_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors group/item"
              >
                <Shield
                  size={15}
                  className="text-gray-400 group-hover/item:text-indigo-500 transition-colors flex-shrink-0"
                />
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors group/item"
            >
              <LogOut
                size={15}
                className="text-gray-400 group-hover/item:text-red-500 transition-colors flex-shrink-0"
              />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// TopBar
// ---------------------------------------------------------------------------

const TopBar: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { inflationEnabled, inflationRate } = useDisplaySettings();

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4">
        {/* Left: Logo + Facility Switcher */}
        <div className="flex items-center gap-3">
          {/* TYTAN Logo */}
          <Link to="/facilities" className="flex-shrink-0">
            <img src="/tytan-logo.png" alt="TYTAN Technologies" className="h-8 w-auto select-none" draggable={false} />
          </Link>
          {/* Facility switcher */}
          <div className="border-l border-gray-200 pl-3">
            <FacilitySwitcher />
          </div>
          {inflationEnabled && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              ~ Inflation {inflationRate.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Right: User avatar + Export + Settings */}
        <div className="flex items-center gap-2">
          <UserMenu />
          <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />
          <div className="hidden sm:flex items-center bg-gray-50 rounded-xl px-2 py-1 gap-1">
            <ExportMenu />
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className={`rounded-md p-2 transition-colors ${
                settingsOpen
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
          {/* Fallback for small screens: show buttons ungrouped */}
          <div className="flex sm:hidden items-center gap-1">
            <ExportMenu />
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className={`rounded-md p-2 transition-colors ${
                settingsOpen
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              }`}
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export default TopBar;
