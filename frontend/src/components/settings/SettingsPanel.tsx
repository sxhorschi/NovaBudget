import React, { useState, useEffect, useRef } from 'react';
import { X, Info, Settings, Plus, Trash2, Pencil, Check, Image, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import type { AppConfig, ConfigOption } from '../../context/ConfigContext';
import client from '../../api/client';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Admin config helpers
// ---------------------------------------------------------------------------

const LOGO_API_PATH = '/config/logo';

const generateId = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

/** Inline-editable list of config items for one section (Products, Phases, etc.) */
const ConfigSectionPanel: React.FC<{
  items: ConfigOption[];
  onAdd: (item: ConfigOption) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newLabel: string) => void;
}> = ({ items, onAdd, onDelete, onEdit }) => {
  const [addLabel, setAddLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAdd = () => {
    const label = addLabel.trim();
    if (!label) return;
    const id = generateId(label);
    if (!id) return;
    if (items.some((it) => it.id === id)) return;
    onAdd({ id, label });
    setAddLabel('');
  };

  const startEdit = (item: ConfigOption) => {
    setEditingId(item.id);
    setEditLabel(item.label);
  };

  const saveEdit = () => {
    if (!editingId || !editLabel.trim()) return;
    onEdit(editingId, editLabel.trim());
    setEditingId(null);
    setEditLabel('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
  };

  return (
    <div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 group py-1.5 pl-3 border-l-2 border-gray-200 hover:border-indigo-300 transition-colors">
            {editingId === item.id ? (
              <>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onBlur={saveEdit}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <button onClick={saveEdit} className="p-1 text-green-600 hover:text-green-800 flex-shrink-0">
                  <Check size={12} />
                </button>
                <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startEdit(item)}
                  className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900 truncate"
                  title={`Click to edit · id: ${item.id}`}
                >
                  {item.label}
                </button>
                <button
                  onClick={() => startEdit(item)}
                  className="p-1 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Inline add row */}
      <div className="flex items-center gap-1.5 mt-3 ml-3 pl-3 py-2 border border-dashed border-gray-300 rounded-md">
        <input
          type="text"
          value={addLabel}
          onChange={(e) => setAddLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="New item…"
          className="flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
        />
        <button
          onClick={handleAdd}
          disabled={!addLabel.trim()}
          className="inline-flex items-center gap-0.5 rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 flex-shrink-0 mr-1.5"
        >
          <Plus size={11} />
          Add
        </button>
      </div>
    </div>
  );
};

/** Logo upload widget for the admin config section */
const LogoUploadPanel: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState<string>(`${client.defaults.baseURL}${LOGO_API_PATH}`);
  const [logoKey, setLogoKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'File too large. Max 2 MB.' });
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      await client.post(LOGO_API_PATH, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLogoUrl(`${client.defaults.baseURL}${LOGO_API_PATH}?t=${Date.now()}`);
      setLogoKey((k) => k + 1);
      setFeedback({ type: 'success', message: 'Logo updated.' });
      window.dispatchEvent(new Event('budget-tool:logo-changed'));
    } catch {
      setFeedback({ type: 'error', message: 'Failed to upload logo.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        <span className="inline-flex items-center gap-1"><Image size={11} />Branding</span>
      </p>

      {/* Preview */}
      <div className="mb-2 inline-flex items-center justify-center rounded border border-gray-200 bg-gray-50 p-2">
        <img
          key={logoKey}
          src={logoUrl}
          alt="Current logo"
          className="h-8 w-auto"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = '/logo-placeholder.svg';
            }
          }}
        />
      </div>

      {/* Upload button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload size={11} />
          {uploading ? 'Uploading…' : 'Upload Logo'}
        </button>
        <span className="text-xs text-gray-400">PNG, JPG or SVG</span>
      </div>

      {feedback && (
        <p className={`mt-1.5 text-xs ${feedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
};

/** Category pill tabs config */
const CATEGORY_TABS: { key: keyof AppConfig; label: string }[] = [
  { key: 'products', label: 'Products' },
  { key: 'phases', label: 'Phases' },
  { key: 'cost_bases', label: 'Cost Bases' },
  { key: 'cost_drivers', label: 'Cost Drivers' },
];

/** Full admin-only Configuration section rendered inside SettingsPanel */
const AdminConfigSection: React.FC = () => {
  const { config, updateConfig } = useConfig();
  const [activeCategory, setActiveCategory] = useState<keyof AppConfig>('products');

  const handleAdd = (section: keyof AppConfig) => (item: ConfigOption) => {
    updateConfig({ ...config, [section]: [...config[section], item] });
  };

  const handleDelete = (section: keyof AppConfig) => (id: string) => {
    updateConfig({ ...config, [section]: config[section].filter((it) => it.id !== id) });
  };

  const handleEdit = (section: keyof AppConfig) => (id: string, newLabel: string) => {
    updateConfig({
      ...config,
      [section]: config[section].map((it) => (it.id === id ? { ...it, label: newLabel } : it)),
    });
  };

  return (
    <div>
      {/* Category pill selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CATEGORY_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === key
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {label} ({config[key].length})
          </button>
        ))}
      </div>

      {/* Active category content */}
      <ConfigSectionPanel
        items={config[activeCategory]}
        onAdd={handleAdd(activeCategory)}
        onDelete={handleDelete(activeCategory)}
        onEdit={handleEdit(activeCategory)}
      />

      {/* Logo upload — rarely used, kept at bottom */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <LogoUploadPanel />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const { isAdmin } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  // Slide-in animation
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-200"
        style={{ opacity: isVisible ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-[400px] z-50 bg-white flex flex-col"
        style={{
          borderLeft: '1px solid #e5e7eb',
          boxShadow: isVisible
            ? '-8px 0 30px -5px rgba(0, 0, 0, 0.1), -2px 0 8px -2px rgba(0, 0, 0, 0.04)'
            : 'none',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          opacity: isVisible ? 1 : 0,
          transition:
            'transform 250ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out, box-shadow 250ms ease-out',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ============ Configuration (admin only) ============ */}
          {isAdmin && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-indigo-600"><Settings size={16} /></span>
                <h3 className="text-sm font-semibold text-gray-900 tracking-tight">Configuration</h3>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                  Admin only
                </span>
              </div>
              <AdminConfigSection />
            </div>
          )}

          {/* ============ About ============ */}
          <div className="pt-5 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-indigo-600"><Info size={16} /></span>
              <h3 className="text-sm font-semibold text-gray-900 tracking-tight">About</h3>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium text-gray-700">Version:</span> 2.1</p>
              <p><span className="font-medium text-gray-700">Stack:</span> React 19, TypeScript, Vite 8, TailwindCSS 4</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
