import React, { createContext, useContext, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const LS_DISPLAY_K = 'settings_display_thousands';
const LS_FINANCE_BUDGET_FACTOR = 'capex-planner:finance-budget-factor';
const LS_INFLATION_ENABLED = 'capex-planner:inflation-enabled';
const LS_INFLATION_RATE = 'capex-planner:inflation-rate';

// ---------------------------------------------------------------------------
// Utility: apply inflation to a future amount
// ---------------------------------------------------------------------------

/**
 * Applies annual inflation to an amount based on cash-out date.
 * @param amount      Raw amount (e.g. total_amount)
 * @param cashOutDate YYYY-MM formatted string
 * @param rate        Inflation rate in percent (e.g. 3.0 for 3%)
 * @param currentYear The reference year (usually new Date().getFullYear())
 */
export function applyInflation(
  amount: number,
  cashOutDate: string,
  rate: number,
  currentYear: number,
): number {
  const cashOutYear = parseInt(cashOutDate.split('-')[0], 10);
  const years = Math.max(0, cashOutYear - currentYear);
  return amount * Math.pow(1 + rate / 100, years);
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface DisplaySettings {
  showThousands: boolean;
  setShowThousands: (v: boolean) => void;
  financeBudgetFactor: number;
  setFinanceBudgetFactor: (v: number) => void;
  inflationEnabled: boolean;
  setInflationEnabled: (v: boolean) => void;
  inflationRate: number;
  setInflationRate: (v: number) => void;
}

const DisplaySettingsContext = createContext<DisplaySettings>({
  showThousands: false,
  setShowThousands: () => {},
  financeBudgetFactor: 0.85,
  setFinanceBudgetFactor: () => {},
  inflationEnabled: false,
  setInflationEnabled: () => {},
  inflationRate: 3.0,
  setInflationRate: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DisplaySettingsProvider({ children }: { children: React.ReactNode }) {
  const [showThousands, setShowThousandsRaw] = useState<boolean>(
    () => localStorage.getItem(LS_DISPLAY_K) === 'true',
  );
  const [financeBudgetFactor, setFinanceBudgetFactorRaw] = useState<number>(() => {
    const stored = localStorage.getItem(LS_FINANCE_BUDGET_FACTOR)
      ?? localStorage.getItem('settings_finance_export_factor')
      ?? localStorage.getItem('settings_factor_085');
    if (stored) {
      const parsed = parseFloat(stored);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0.85;
  });
  const [inflationEnabled, setInflationEnabledRaw] = useState<boolean>(
    () => localStorage.getItem(LS_INFLATION_ENABLED) === 'true',
  );
  const [inflationRate, setInflationRateRaw] = useState<number>(() => {
    const stored = localStorage.getItem(LS_INFLATION_RATE);
    if (stored) {
      const parsed = parseFloat(stored);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 3.0;
  });

  const setShowThousands = useCallback((v: boolean) => {
    localStorage.setItem(LS_DISPLAY_K, String(v));
    setShowThousandsRaw(v);
  }, []);

  const setFinanceBudgetFactor = useCallback((v: number) => {
    localStorage.setItem(LS_FINANCE_BUDGET_FACTOR, String(v));
    setFinanceBudgetFactorRaw(v);
  }, []);

  const setInflationEnabled = useCallback((v: boolean) => {
    localStorage.setItem(LS_INFLATION_ENABLED, String(v));
    setInflationEnabledRaw(v);
  }, []);

  const setInflationRate = useCallback((v: number) => {
    localStorage.setItem(LS_INFLATION_RATE, String(v));
    setInflationRateRaw(v);
  }, []);

  return (
    <DisplaySettingsContext.Provider
      value={{
        showThousands,
        setShowThousands,
        financeBudgetFactor,
        setFinanceBudgetFactor,
        inflationEnabled,
        setInflationEnabled,
        inflationRate,
        setInflationRate,
      }}
    >
      {children}
    </DisplaySettingsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDisplaySettings(): DisplaySettings {
  return useContext(DisplaySettingsContext);
}
