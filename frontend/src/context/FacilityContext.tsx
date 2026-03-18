import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Facility } from '../types/budget';
import { mockFacilities } from '../mocks/data';

// ---------------------------------------------------------------------------
// localStorage key
// ---------------------------------------------------------------------------

const CURRENT_FACILITY_KEY = 'budget-tool:current-facility-id';

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
  createFacility: (name: string, location: string) => Facility;
  updateFacility: (id: string, data: Partial<Facility>) => void;
  deleteFacility: (id: string) => void;
  isLoading: boolean;
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
// ID generator
// ---------------------------------------------------------------------------

let facilityCounter = 100;

function nextFacilityId(): string {
  facilityCounter += 1;
  return `f-${String(facilityCounter).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const FacilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [facilities, setFacilities] = useState<Facility[]>(() => [...mockFacilities]);

  // Resolve initial facility from localStorage or default to first
  const [currentFacilityId, setCurrentFacilityId] = useState<string>(() => {
    const stored = loadCurrentFacilityId();
    if (stored && mockFacilities.some((f) => f.id === stored)) return stored;
    return mockFacilities[0]?.id ?? '';
  });

  const currentFacility = useMemo(
    () => facilities.find((f) => f.id === currentFacilityId) ?? facilities[0] ?? null,
    [facilities, currentFacilityId],
  );

  // Persist selection
  useEffect(() => {
    if (currentFacilityId) {
      saveCurrentFacilityId(currentFacilityId);
    }
  }, [currentFacilityId]);

  const setCurrentFacility = useCallback((id: string) => {
    setCurrentFacilityId(id);
  }, []);

  const createFacility = useCallback(
    (name: string, location: string): Facility => {
      const newFacility: Facility = {
        id: nextFacilityId(),
        name: name.trim(),
        location: location.trim(),
        description: '',
      };
      setFacilities((prev) => [...prev, newFacility]);
      setCurrentFacilityId(newFacility.id);
      return newFacility;
    },
    [],
  );

  const updateFacility = useCallback((id: string, data: Partial<Facility>) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...data } : f)),
    );
  }, []);

  const deleteFacility = useCallback((id: string) => {
    setFacilities((prev) => prev.filter((f) => f.id !== id));
    // If we deleted the current facility, switch to the first remaining one
    setCurrentFacilityId((prevId) => {
      if (prevId === id) {
        const remaining = facilities.filter((f) => f.id !== id);
        return remaining[0]?.id ?? '';
      }
      return prevId;
    });
  }, [facilities]);

  const value = useMemo<FacilityContextValue>(
    () => ({
      facilities,
      currentFacility,
      setCurrentFacility,
      createFacility,
      updateFacility,
      deleteFacility,
      isLoading: false,
    }),
    [facilities, currentFacility, setCurrentFacility, createFacility, updateFacility, deleteFacility],
  );

  return (
    <FacilityContext.Provider value={value}>
      {children}
    </FacilityContext.Provider>
  );
};

export default FacilityContext;
