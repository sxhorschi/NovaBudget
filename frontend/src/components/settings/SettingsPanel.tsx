import React, { useState, useEffect, useCallback } from 'react';
import { X, Building2, Calculator, Eye, PlayCircle, Info, TrendingUp } from 'lucide-react';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { useBudgetData } from '../../context/BudgetDataContext';

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const LS_HIGHLIGHT_ZA = 'settings_highlight_zielanpassung';
const LS_ONBOARDING = 'capex-planner:onboarding-completed';

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

const SectionTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
}> = ({ icon, title, badge }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-indigo-500">{icon}</span>
    <h3 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h3>
    {badge}
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
    financeBudgetFactor,
    setFinanceBudgetFactor,
    inflationEnabled,
    setInflationEnabled,
    inflationRate,
    setInflationRate,
  } = useDisplaySettings();
  const { facility } = useBudgetData();
  const [isVisible, setIsVisible] = useState(false);

  // --- Display prefs ---
  const [highlightZA, setHighlightZA] = useState(() =>
    localStorage.getItem(LS_HIGHLIGHT_ZA) !== 'false',
  );

  // --- Onboarding reset feedback ---
  const [onboardingReset, setOnboardingReset] = useState(false);

  // --- Local string state for finance factor number input to allow typing decimals ---
  const [factorInputStr, setFactorInputStr] = useState(() =>
    financeBudgetFactor.toFixed(2),
  );

  // Keep local string in sync if context value changes
  useEffect(() => {
    setFactorInputStr(financeBudgetFactor.toFixed(2));
  }, [financeBudgetFactor]);

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

  // Persist display prefs
  useEffect(() => {
    localStorage.setItem(LS_HIGHLIGHT_ZA, String(highlightZA));
  }, [highlightZA]);

  const handleResetOnboarding = useCallback(() => {
    localStorage.removeItem(LS_ONBOARDING);
    setOnboardingReset(true);
    // Reload the page so onboarding triggers on next mount
    setTimeout(() => window.location.reload(), 600);
  }, []);

  // --- Finance factor helpers ---
  const factorPct = Math.round(financeBudgetFactor * 100);
  const factorColor =
    financeBudgetFactor > 1.0
      ? 'text-red-600'
      : financeBudgetFactor < 1.0
      ? 'text-green-600'
      : 'text-gray-700';

  const handleFactorSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) {
      setFinanceBudgetFactor(v);
    }
  };

  const handleFactorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFactorInputStr(e.target.value);
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v) && v >= 0.5 && v <= 1.5) {
      setFinanceBudgetFactor(v);
    }
  };

  const handleFactorInputBlur = () => {
    const v = parseFloat(factorInputStr);
    if (!Number.isFinite(v)) {
      setFactorInputStr(financeBudgetFactor.toFixed(2));
    } else {
      const clamped = Math.min(Math.max(v, 0.5), 1.5);
      setFinanceBudgetFactor(clamped);
      setFactorInputStr(clamped.toFixed(2));
    }
  };

  // --- Inflation example ---
  const exampleAmount = 100;
  const exampleYears = 2;
  const exampleInflated = exampleAmount * Math.pow(1 + inflationRate / 100, exampleYears);

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

          {/* ============ 1. Context ============ */}
          <SectionTitle icon={<Building2 size={16} />} title="Context / Header" />
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title (custom)</label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder={facility?.name ?? 'Budget Tool'}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subtitle (optional)</label>
              <input
                type="text"
                value={headerSubtitle}
                onChange={(e) => setHeaderSubtitle(e.target.value)}
                placeholder={facility?.location ?? 'e.g. Location or Team'}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-gray-400">
              These settings are global for the interface and do not need to be tied to a facility.
            </p>
          </div>

          <Divider />

          {/* ============ 2. Finance Export ============ */}
          <SectionTitle icon={<Calculator size={16} />} title="Finance Export" />
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500">Budget Factor</label>
                <span className={`text-sm font-semibold tabular-nums ${factorColor}`}>
                  {factorPct}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.50"
                  max="1.50"
                  step="0.05"
                  value={financeBudgetFactor}
                  onChange={handleFactorSlider}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  max="1.50"
                  value={factorInputStr}
                  onChange={handleFactorInput}
                  onBlur={handleFactorInputBlur}
                  className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 text-center focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Multiplier applied to all amounts in the Finance Template export.
                0.85 = 85% of estimated costs.
              </p>
              {financeBudgetFactor > 1.0 && (
                <p className="text-xs text-red-500 mt-1 font-medium">
                  Factor &gt; 1.0: budgeting above estimated costs (over-budget scenario).
                </p>
              )}
            </div>
          </div>

          <Divider />

          {/* ============ 3. Inflation ============ */}
          <SectionTitle
            icon={<TrendingUp size={16} />}
            title="Inflation"
            badge={
              inflationEnabled ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  INFLATION ON
                </span>
              ) : undefined
            }
          />
          <div className="space-y-3">
            <Toggle
              label="Apply Inflation to Future Cash-Outs"
              checked={inflationEnabled}
              onChange={setInflationEnabled}
            />

            {inflationEnabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-600">Annual Rate</label>
                    <span className="text-sm font-semibold tabular-nums text-amber-700">
                      {inflationRate.toFixed(1)}% per year
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={inflationRate}
                    onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Future cash-outs are multiplied by (1 + rate)<sup>years</sup>. Applies to display and exports.
                </p>
                <p className="text-xs text-amber-700 font-medium">
                  e.g., €{exampleAmount}k in {exampleYears} years at {inflationRate.toFixed(1)}% = €{exampleInflated.toFixed(2)}k
                </p>
              </div>
            )}
          </div>

          <Divider />

          {/* ============ 4. Display ============ */}
          <SectionTitle icon={<Eye size={16} />} title="Display" />
          <div className="space-y-3">
            <Toggle
              label="Show amounts in thousands (k€)"
              checked={showThousands}
              onChange={setShowThousands}
            />
            <Toggle
              label="Highlight target adjustments"
              checked={highlightZA}
              onChange={setHighlightZA}
            />
          </div>

          <Divider />

          {/* ============ 5. Onboarding ============ */}
          <SectionTitle icon={<PlayCircle size={16} />} title="Onboarding" />
          <button
            onClick={handleResetOnboarding}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {onboardingReset ? 'Will start on next load' : 'Restart introduction'}
          </button>

          <Divider />

          {/* ============ 6. About ============ */}
          <SectionTitle icon={<Info size={16} />} title="About" />
          <div className="space-y-1 text-sm text-gray-600">
            <p><span className="font-medium text-gray-700">Version:</span> 2.0</p>
            <p><span className="font-medium text-gray-700">Stack:</span> React 19, TypeScript, Vite 8, TailwindCSS 4</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
