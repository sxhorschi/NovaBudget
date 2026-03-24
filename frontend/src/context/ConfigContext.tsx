import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import client from '../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfigOption {
  id: string;
  label: string;
}

/** @deprecated Use ConfigOption instead */
export type ConfigItem = ConfigOption;

export interface AppConfig {
  products: ConfigOption[];
  phases: ConfigOption[];
  cost_bases: ConfigOption[];
  cost_drivers: ConfigOption[];
}

interface ConfigContextValue {
  config: AppConfig;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateConfig: (newConfig: AppConfig) => Promise<void>;
  /** Look up a label by id in a given config list. Falls back to the raw id. */
  getLabel: (list: ConfigOption[], id: string) => string;
}

// ---------------------------------------------------------------------------
// Default / fallback config (matches config.json)
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AppConfig = {
  products: [],
  phases: [],
  cost_bases: [],
  cost_drivers: [],
};

const CONFIG_STORAGE_KEY = 'budget-tool:app-config';

// ---------------------------------------------------------------------------
// getLabel helper — shared via context and also exported standalone
// ---------------------------------------------------------------------------

export function getLabel(list: ConfigOption[], id: string): string {
  const found = list.find((opt) => opt.id === id);
  return found ? found.label : id;
}

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useConfig() must be used within a <ConfigProvider>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(() => {
    // Try to load from localStorage first for instant availability
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppConfig;
        if (parsed.products && parsed.phases && parsed.cost_bases && parsed.cost_drivers) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_CONFIG;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.get('/config');
      const data = res.data as AppConfig;
      setConfig(data);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Silently fall back to current config — the backend may not be running
      setError('Failed to load configuration from server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load config from server on mount
  useEffect(() => {
    reload();
  }, [reload]);

  const updateConfig = useCallback(async (newConfig: AppConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.put('/config', newConfig);
      const data = res.data as AppConfig;
      setConfig(data);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Apply locally on API failure
      setConfig(newConfig);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({ config, isLoading, error, reload, updateConfig, getLabel }),
    [config, isLoading, error, reload, updateConfig],
  );

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigContext;
