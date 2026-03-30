import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useBudgetData } from './BudgetDataContext';

const YEAR_STORAGE_KEY = 'novabudget:currentYear';

function loadSavedYear(): number | null {
  try {
    const raw = localStorage.getItem(YEAR_STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function saveYear(year: number | null): void {
  try {
    if (year !== null) {
      localStorage.setItem(YEAR_STORAGE_KEY, String(year));
    } else {
      localStorage.removeItem(YEAR_STORAGE_KEY);
    }
  } catch { /* ignore quota errors */ }
}

export interface YearContextValue {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
  availableYears: number[];
}

const YearContext = createContext<YearContextValue | null>(null);

export function useYear(): YearContextValue {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error('useYear() must be used within <YearProvider>');
  return ctx;
}

export const YearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { costItems, functionalAreas, changeCosts } = useBudgetData();
  const [selectedYear, setSelectedYearState] = useState<number | null>(loadSavedYear);

  const setSelectedYear = useCallback((year: number | null) => {
    setSelectedYearState(year);
    saveYear(year);
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const ci of costItems) {
      if (ci.expected_cash_out) {
        const y = Number(ci.expected_cash_out.slice(0, 4));
        if (y > 2000) years.add(y);
      }
    }
    for (const fa of functionalAreas) {
      for (const b of fa.budgets ?? []) {
        if (b.year > 2000) years.add(b.year);
      }
    }
    for (const cc of changeCosts) {
      if (cc.year > 2000) years.add(cc.year);
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [costItems, functionalAreas, changeCosts]);

  useEffect(() => {
    if (selectedYear !== null && availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(null);
    }
  }, [selectedYear, availableYears, setSelectedYear]);

  const value = useMemo<YearContextValue>(
    () => ({ selectedYear, setSelectedYear, availableYears }),
    [selectedYear, setSelectedYear, availableYears],
  );

  return <YearContext.Provider value={value}>{children}</YearContext.Provider>;
};
