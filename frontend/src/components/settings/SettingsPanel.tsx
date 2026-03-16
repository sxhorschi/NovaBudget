import React, { useState, useEffect, useCallback } from 'react';
import { X, Building2, Calculator, Eye, PlayCircle, Info, Keyboard } from 'lucide-react';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { useBudgetData } from '../../context/BudgetDataContext';

// ---------------------------------------------------------------------------
// localStorage keys  (factors only — display toggle lives in DisplaySettingsContext)
// ---------------------------------------------------------------------------

const LS_FINANCE_EXPORT_FACTOR = 'settings_finance_export_factor';
const LS_HIGHLIGHT_ZA = 'settings_highlight_zielanpassung';
const LS_ONBOARDING = 'onboarding_completed';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Small reusable pieces
// ---------------------------------------------------------------------------

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-indigo-500">{icon}</span>
    <h3 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h3>
  </div>
);

const Divider = () => <hr className="my-5 border-gray-200" />;

const Toggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-3 cursor-pointer group">
    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out
        ${checked ? 'bg-indigo-600' : 'bg-gray-300'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out mt-0.5
          ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}
        `}
      />
    </button>
  </label>
);

const ShortcutRow: React.FC<{ keys: string; description: string }> = ({ keys, description }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-gray-600">{description}</span>
    <kbd className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-mono text-gray-500">
      {keys}
    </kbd>
  </div>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SettingsPanel: React.FC<SettingsPanelProps> = ({ open, onClose }) => {
  const {
    showThousands,
    setShowThousands,
    headerTitle,
    setHeaderTitle,
    headerSubtitle,
    setHeaderSubtitle,
  } = useDisplaySettings();
  const { facility } = useBudgetData();
  const [isVisible, setIsVisible] = useState(false);

  // --- Finance Export Faktor ---
  const [financeExportFactor, setFinanceExportFactor] = useState(() => {
    const current = localStorage.getItem(LS_FINANCE_EXPORT_FACTOR);
    if (current) return current;

    // Backward compatibility with legacy key.
    return localStorage.getItem('settings_factor_085') ?? '0.85';
  });

  // --- Anzeige ---
  const [highlightZA, setHighlightZA] = useState(() =>
    localStorage.getItem(LS_HIGHLIGHT_ZA) !== 'false',
  );

  // --- Onboarding reset feedback ---
  const [onboardingReset, setOnboardingReset] = useState(false);

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

  // Persist finance export factor
  useEffect(() => {
    localStorage.setItem(LS_FINANCE_EXPORT_FACTOR, financeExportFactor);
  }, [financeExportFactor]);

  // Persist display prefs
  useEffect(() => {
    localStorage.setItem(LS_HIGHLIGHT_ZA, String(highlightZA));
  }, [highlightZA]);

  const handleResetOnboarding = useCallback(() => {
    localStorage.removeItem(LS_ONBOARDING);
    setOnboardingReset(true);
    setTimeout(() => setOnboardingReset(false), 2500);
  }, []);

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
            <h2 className="text-lg font-semibold text-gray-900">Einstellungen</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ============ 1. Kontext ============ */}
          <SectionTitle icon={<Building2 size={16} />} title="Kontext / Kopfzeile" />
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Titel (frei wählbar)</label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder={facility?.name ?? 'Budget Tool'}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Untertitel (optional)</label>
              <input
                type="text"
                value={headerSubtitle}
                onChange={(e) => setHeaderSubtitle(e.target.value)}
                placeholder={facility?.location ?? 'z. B. Standort oder Team'}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-gray-400">
              Diese Angaben sind global für die Oberfläche und müssen nicht an eine Facility gebunden sein.
            </p>
          </div>

          <Divider />

          {/* ============ 2. Finance Export ============ */}
          <SectionTitle icon={<Calculator size={16} />} title="Finance Export" />
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Budgetfaktor für Finance Template (Regelwert: 0.85)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={financeExportFactor}
                onChange={(e) => setFinanceExportFactor(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-gray-400">
              Gilt aktuell für den Finance-Template Export.
            </p>
          </div>

          <Divider />

          {/* ============ 3. Anzeige ============ */}
          <SectionTitle icon={<Eye size={16} />} title="Anzeige" />
          <div className="space-y-3">
            <Toggle
              label="Beträge in Tausend (k€) anzeigen"
              checked={showThousands}
              onChange={setShowThousands}
            />
            <Toggle
              label="Zielanpassungen hervorheben"
              checked={highlightZA}
              onChange={setHighlightZA}
            />
          </div>

          <Divider />

          {/* ============ 4. Onboarding ============ */}
          <SectionTitle icon={<PlayCircle size={16} />} title="Onboarding" />
          <button
            onClick={handleResetOnboarding}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {onboardingReset ? 'Wird beim nächsten Laden gestartet' : 'Einführung nochmal starten'}
          </button>

          <Divider />

          {/* ============ 5. Über ============ */}
          <SectionTitle icon={<Info size={16} />} title="Über" />
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium text-gray-700">Version:</span> 0.1.0 MVP</p>
            <p><span className="font-medium text-gray-700">Stack:</span> React 19, TypeScript, Vite 8, TailwindCSS 4</p>
            <p>
              <span className="font-medium text-gray-700">Docs:</span>{' '}
              <a
                href="https://docs.novadrive.internal/budget-tool"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
              >
                docs.novadrive.internal
              </a>
            </p>
          </div>

          <Divider />

          {/* ============ 6. Tastenkürzel ============ */}
          <SectionTitle icon={<Keyboard size={16} />} title="Tastenkürzel" />
          <div className="space-y-0.5">
            <ShortcutRow keys="⌘ K" description="Command Palette öffnen" />
            <ShortcutRow keys="Esc" description="Panel / Palette schließen" />
            <ShortcutRow keys="N" description="Neues Item" />
            <ShortcutRow keys="J / K" description="Nächste / Vorherige Zeile" />
            <ShortcutRow keys="Enter" description="Side Panel öffnen" />
            <ShortcutRow keys="⌘ Enter" description="Speichern im Side Panel" />
            <ShortcutRow keys="1 / 2 / 3" description="Tab wechseln" />
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
