import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, getAuthToken } from '../api/client';

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
  email: 'georg.weis@tytan.tech',
  role: 'admin',
  department: 'Industrial Engineering',
  avatar: 'GW',
};

const SESSION_KEY = 'capex-planner:auth-session';

const DEV_SKIP_AUTH = false; // set to true to bypass login in development

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/** Build a base64-encoded JSON token matching the backend's expected format. */
function buildToken(user: User): string {
  const payload = JSON.stringify({
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
  });
  return btoa(payload);
}

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
      setAuthToken(buildToken(MOCK_USER));
      setIsLoading(false);
      return;
    }
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      const existingToken = getAuthToken();
      if (stored && existingToken) {
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
  // TODO: Replace with real Microsoft Entra ID (Azure AD) OAuth flow
  const login = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));

    // Store user in session and generate auth token for API requests
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(MOCK_USER));
    setAuthToken(buildToken(MOCK_USER));
    setUser(MOCK_USER);
    setIsLoading(false);
  }, []);

  const logout = useCallback((): void => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthToken(null);
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
