import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { msalInstance, loginScopes } from '../lib/msal';
import client from '../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer' | 'editor' | 'pending';
  job_title?: string;
  department?: string;
  office_location?: string;
  phone?: string;
  employee_id?: string;
  company_name?: string;
  manager_email?: string;
  manager_name?: string;
  photo_url?: string;
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  canEdit: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helper: fetch user profile from backend (gets real role from DB)
// ---------------------------------------------------------------------------

async function fetchUserProfile(idToken: string): Promise<User> {
  const resp = await client.get('/auth/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return resp.data;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const initialized = useRef(false);
  const msalReady = useRef(false);

  // Get a fresh ID token silently (MSAL caches + refreshes automatically)
  const getIdToken = useCallback(async (): Promise<string | null> => {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) return null;

    try {
      const response = await msalInstance.acquireTokenSilent({
        scopes: loginScopes,
        account: accounts[0],
      });
      return response.idToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        return null; // Need interactive login
      }
      console.error('[Auth] Silent token acquisition failed:', err);
      return null;
    }
  }, []);

  // Set up axios interceptor to always use fresh token
  useEffect(() => {
    const interceptorId = client.interceptors.request.use(async (config) => {
      const idToken = await getIdToken();
      if (idToken) {
        config.headers.Authorization = `Bearer ${idToken}`;
      }
      return config;
    });

    return () => {
      client.interceptors.request.eject(interceptorId);
    };
  }, [getIdToken]);

  // Initialize MSAL and restore session — single point of initialization
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        await msalInstance.initialize();
        msalReady.current = true;
        const result = await msalInstance.handleRedirectPromise();

        if (result?.account && result.idToken) {
          // Just came back from redirect login
          const profile = await fetchUserProfile(result.idToken);
          setUser(profile);
        } else {
          // Check for existing MSAL session
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            const idToken = await getIdToken();
            if (idToken) {
              const profile = await fetchUserProfile(idToken);
              setUser(profile);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const detail = err && typeof err === 'object' && 'response' in err
          ? ` (status: ${(err as { response?: { status?: number } }).response?.status})`
          : '';
        console.error('[Auth] Init error:', err);
        setAuthError(`${msg}${detail}`);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [getIdToken]);

  // Login via redirect — user goes to Microsoft login page and comes back
  const login = useCallback(async (): Promise<void> => {
    try {
      setAuthError(null);
      setIsLoading(true);
      if (!msalReady.current) {
        await msalInstance.initialize();
        await msalInstance.handleRedirectPromise();
        msalReady.current = true;
      }
      await msalInstance.loginRedirect({ scopes: loginScopes });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Auth] Login error:', msg);
      setAuthError(msg);
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    setUser(null);
    msalInstance.logoutRedirect();
  }, []);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';
  const isAdmin = user?.role === 'admin';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      authError,
      canEdit: !!canEdit,
      isAdmin: !!isAdmin,
      login,
      logout,
    }),
    [user, isLoading, authError, canEdit, isAdmin, login, logout],
  );

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
