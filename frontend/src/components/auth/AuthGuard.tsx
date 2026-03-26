import React from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginPage from '../../pages/LoginPage';

// ---------------------------------------------------------------------------
// AuthGuard
//
// Renders the login page while the user is not authenticated.
// During the initial session-restore (isLoading = true), renders a minimal
// full-screen spinner so there is no flash of the login page on refresh.
// ---------------------------------------------------------------------------

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user, logout, authError } = useAuth();

  // Session restore in progress — show a neutral loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <img src={`${import.meta.env.VITE_URL_PREFIX || ''}/logo-placeholder.svg`} alt="Logo" className="h-8 w-auto" />
          <svg
            className="animate-spin h-5 w-5 text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm text-gray-400">Loading CapEx Planner…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // User exists but hasn't been approved yet
  if (user?.role === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-10 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Pending</h2>
          <p className="text-sm text-gray-500 mb-1">
            Signed in as <span className="font-medium text-gray-700">{user.email}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Your account is pending approval. An administrator needs to assign you a role before you can access the tool.
          </p>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
