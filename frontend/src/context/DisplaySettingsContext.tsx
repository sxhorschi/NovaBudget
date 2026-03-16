import React, { createContext, useContext, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Single localStorage key (same as SettingsPanel uses)
// ---------------------------------------------------------------------------

const LS_DISPLAY_K = 'settings_display_thousands';
const LS_HEADER_TITLE = 'settings_header_title';
const LS_HEADER_SUBTITLE = 'settings_header_subtitle';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface DisplaySettings {
  showThousands: boolean;
  setShowThousands: (v: boolean) => void;
  headerTitle: string;
  setHeaderTitle: (v: string) => void;
  headerSubtitle: string;
  setHeaderSubtitle: (v: string) => void;
}

const DisplaySettingsContext = createContext<DisplaySettings>({
  showThousands: false,
  setShowThousands: () => {},
  headerTitle: '',
  setHeaderTitle: () => {},
  headerSubtitle: '',
  setHeaderSubtitle: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DisplaySettingsProvider({ children }: { children: React.ReactNode }) {
  const [showThousands, setShowThousandsRaw] = useState<boolean>(
    () => localStorage.getItem(LS_DISPLAY_K) === 'true',
  );
  const [headerTitle, setHeaderTitleRaw] = useState<string>(
    () => localStorage.getItem(LS_HEADER_TITLE) ?? '',
  );
  const [headerSubtitle, setHeaderSubtitleRaw] = useState<string>(
    () => localStorage.getItem(LS_HEADER_SUBTITLE) ?? '',
  );

  const setShowThousands = useCallback((v: boolean) => {
    localStorage.setItem(LS_DISPLAY_K, String(v));
    setShowThousandsRaw(v);
  }, []);

  const setHeaderTitle = useCallback((v: string) => {
    localStorage.setItem(LS_HEADER_TITLE, v);
    setHeaderTitleRaw(v);
  }, []);

  const setHeaderSubtitle = useCallback((v: string) => {
    localStorage.setItem(LS_HEADER_SUBTITLE, v);
    setHeaderSubtitleRaw(v);
  }, []);

  return (
    <DisplaySettingsContext.Provider
      value={{
        showThousands,
        setShowThousands,
        headerTitle,
        setHeaderTitle,
        headerSubtitle,
        setHeaderSubtitle,
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
