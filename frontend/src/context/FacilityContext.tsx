import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Facility } from '../types/budget';
import * as api from '../api/facilities';
import { dispatchToastEvent } from '../components/common/ToastProvider';

// ---------------------------------------------------------------------------
// localStorage — only for remembering the selected facility (UI preference)
// ---------------------------------------------------------------------------

const CURRENT_FACILITY_KEY = 'novabudget:currentFacilityId';

function loadCurrentFacilityId(): string | null {
  try {
    return localStorage.getItem(CURRENT_FACILITY_KEY);
  } catch {
    return null;
  }
}

function saveCurrentFacilityId(id: string): void {
  try {
    localStorage.setItem(CURRENT_FACILITY_KEY, id);
  } catch {
    // ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface FacilityContextValue {
  facilities: Facility[];
  currentFacility: Facility | null;
  setCurrentFacility: (id: string) => void;
  createFacility: (name: string, location: string) => Promise<Facility | null>;
  updateFacility: (id: string, data: Partial<Facility>) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;
  isLoading: boolean;
  reload: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context + hook
// ---------------------------------------------------------------------------

const FacilityContext = createContext<FacilityContextValue | null>(null);

export function useFacility(): FacilityContextValue {
  const ctx = useContext(FacilityContext);
  if (!ctx) {
    throw new Error('useFacility() must be used within a <FacilityProvider>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const FacilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentFacilityId, setCurrentFacilityId] = useState<string>(() => {
    return loadCurrentFacilityId() ?? '';
  });

  // Load facilities from backend API on mount
  const loadFacilities = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.listFacilities();
      setFacilities(result);
      setCurrentFacilityId((prev) => {
        if (prev && result.some((f) => f.id === prev)) return prev;
        return result[0]?.id ?? '';
      });
    } catch {
      // Backend not reachable — keep empty list
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const currentFacility = useMemo(
    () => facilities.find((f) => f.id === currentFacilityId) ?? facilities[0] ?? null,
    [facilities, currentFacilityId],
  );

  // Persist selection preference
  useEffect(() => {
    if (currentFacilityId) {
      saveCurrentFacilityId(currentFacilityId);
    }
  }, [currentFacilityId]);

  const setCurrentFacility = useCallback((id: string) => {
    setCurrentFacilityId(id);
  }, []);

  const createFacility = useCallback(
    async (name: string, location: string): Promise<Facility | null> => {
      try {
        const newFacility = await api.createFacility({
          name: name.trim(),
          location: location.trim() || undefined,
        });
        setFacilities((prev) => [...prev, newFacility]);
        setCurrentFacilityId(newFacility.id);
        return newFacility;
      } catch {
        dispatchToastEvent('error', 'Failed to create facility.');
        return null;
      }
    },
    [],
  );

  const updateFacility = useCallback(async (id: string, data: Partial<Facility>) => {
    try {
      const updated = await api.updateFacility(id, data);
      setFacilities((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch {
      dispatchToastEvent('error', 'Failed to update facility.');
    }
  }, []);

  const deleteFacility = useCallback(async (id: string) => {
    try {
      await api.deleteFacility(id);
      setFacilities((prev) => prev.filter((f) => f.id !== id));
      setCurrentFacilityId((prevId) => {
        if (prevId === id) {
          const remaining = facilities.filter((f) => f.id !== id);
          return remaining[0]?.id ?? '';
        }
        return prevId;
      });
    } catch {
      dispatchToastEvent('error', 'Failed to delete facility.');
    }
  }, [facilities]);

  const value = useMemo<FacilityContextValue>(
    () => ({
      facilities,
      currentFacility,
      setCurrentFacility,
      createFacility,
      updateFacility,
      deleteFacility,
      isLoading,
      reload: loadFacilities,
    }),
    [facilities, currentFacility, setCurrentFacility, createFacility, updateFacility, deleteFacility, isLoading, loadFacilities],
  );

  return (
    <FacilityContext.Provider value={value}>
      {children}
    </FacilityContext.Provider>
  );
};

export default FacilityContext;
