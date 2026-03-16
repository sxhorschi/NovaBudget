import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer' | 'editor';
  department?: string;
  avatar?: string; // initials or URL
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Mock user — Georg Weis, TYTAN Technologies admin
// ---------------------------------------------------------------------------

const MOCK_USER: User = {
  id: 'usr-georg-weis-001',
  name: 'Georg Weis',
  email: 'georg.weis@tytan-technologies.com',
  role: 'admin',
  department: 'Industrial Engineering',
  avatar: 'GW',
};

const SESSION_KEY = 'capex-planner:auth-session';

const DEV_SKIP_AUTH = false; // set to true to bypass login in development

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true on mount while we restore session

  // Restore session from sessionStorage on mount
  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      setUser(MOCK_USER);
      setIsLoading(false);
      return;
    }
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed: User = JSON.parse(stored);
        setUser(parsed);
      }
    } catch {
      // corrupted session — ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Simulate Microsoft Entra ID flow: 1.5 s loading then authenticate
  const login = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(MOCK_USER));
    setUser(MOCK_USER);
    setIsLoading(false);
  }, []);

  const logout = useCallback((): void => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

export default AuthContext;
