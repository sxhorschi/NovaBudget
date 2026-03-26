import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MicrosoftLogo: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

const urlPrefix = import.meta.env.VITE_URL_PREFIX || '';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const fallbackLogo = `${urlPrefix}/logo-placeholder.svg`;

const CompanyLogo: React.FC<{ className?: string }> = ({ className = 'h-10 w-auto' }) => {
  return (
    <img
      src={`${apiBaseUrl}/config/logo`}
      alt="Logo"
      className={`${className} select-none`}
      draggable={false}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset.fallback) {
          img.dataset.fallback = '1';
          img.src = fallbackLogo;
        }
      }}
    />
  );
};

const LoginPage: React.FC = () => {
  const { login, isLoading, authError } = useAuth();

  const handleSignIn = async () => {
    await login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#d2d5c2' }}>
      <div className="w-full max-w-sm mx-4">

        {/* TYTAN branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-3">
            <img
              src="https://media.licdn.com/dms/image/v2/D4D0BAQG-JwrrZfimtA/company-logo_200_200/B4DZjx6cYuIcAM-/0/1756405286827/tytan_technologies_logo?e=2147483647&v=beta&t=Ybdas6l-opL10njGQ2ab8uNothDbhInH2f9JjPUi5GQ"
              alt="TYTAN"
              className="h-10 w-10 rounded-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Budget Tool
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            TYTAN Technologies
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 px-8 py-10">

          <div className="mb-6 text-center">
            <div className="flex justify-center mb-4">
              <CompanyLogo className="h-7 w-auto" />
            </div>
            <p className="text-sm text-gray-500">
              Sign in with your Microsoft account
            </p>
          </div>

          {/* Sign-in button */}
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl font-semibold text-sm px-5 py-3.5 transition-all duration-150 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#fcff2a', color: '#000' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e0e300')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fcff2a')}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <MicrosoftLogo />
                <span>Sign in with Microsoft</span>
              </>
            )}
          </button>

          {authError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 font-medium">Authentication error:</p>
              <p className="text-xs text-red-500 mt-1 break-all">{authError}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-1.5">
            <CheckCircle2 size={13} className="text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-400">Powered by Microsoft Entra ID</p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Need access? <span className="font-medium text-gray-600">Contact your IT administrator</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
