import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Facility, FacilityType } from '../types/budget';
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
  createFacility: (name: string, location: string, facilityType?: FacilityType) => Facility;
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
    (name: string, location: string, facilityType?: FacilityType): Facility => {
      const newFacility: Facility = {
        id: nextFacilityId(),
        name: name.trim(),
        location: location.trim(),
        description: '',
        status: 'planning',
        facility_type: facilityType ?? 'production',
        sort_order: facilities.length,
      };
      setFacilities((prev) => [...prev, newFacility]);
      setCurrentFacilityId(newFacility.id);
      return newFacility;
    },
    [facilities.length],
  );

  const value = useMemo<FacilityContextValue>(
    () => ({
      facilities,
      currentFacility,
      setCurrentFacility,
      createFacility,
      isLoading: false,
    }),
    [facilities, currentFacility, setCurrentFacility, createFacility],
  );

  return (
    <FacilityContext.Provider value={value}>
      {children}
    </FacilityContext.Provider>
  );
};

export default FacilityContext;
