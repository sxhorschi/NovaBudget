import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, getAuthToken } from '../api/client';

// ---------------------------------------------------------------------------
// Types — enriched with Microsoft Entra ID profile fields
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer' | 'editor';
  job_title?: string;
  department?: string;
  office_location?: string;
  phone?: string;
  employee_id?: string;
  company_name?: string;
  manager_email?: string;
  manager_name?: string;
  photo_url?: string;
  avatar?: string; // initials fallback
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True if the user is admin or editor (can create/edit/delete data). */
  canEdit: boolean;
  /** True if the user is an admin (can manage users, delete facilities). */
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// DEV MODE ONLY — in production, user data comes from Entra ID token.
// This dev user is used for local development without Azure AD.
// ---------------------------------------------------------------------------

// Minimal dev user — no fake profile data. In production, all fields
// come from the Entra ID token + Graph API sync.
const DEV_USER: User = {
  id: 'dev-admin',
  name: 'Admin (Dev)',
  email: 'admin@localhost',
  role: 'admin',
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
      setUser(DEV_USER);
      setAuthToken(buildToken(DEV_USER));
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
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(DEV_USER));
    setAuthToken(buildToken(DEV_USER));
    setUser(DEV_USER);
    setIsLoading(false);
  }, []);

  const logout = useCallback((): void => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    canEdit: !!canEdit,
    isAdmin: !!isAdmin,
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
