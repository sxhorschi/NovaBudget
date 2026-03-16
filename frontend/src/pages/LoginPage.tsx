import React from 'react';
import { CheckCircle2, BarChart3, FileSpreadsheet, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Microsoft logo — simplified four-square SVG
// ---------------------------------------------------------------------------

const MicrosoftLogo: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 21 21"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

// ---------------------------------------------------------------------------
// TYTAN "T" logo mark
// ---------------------------------------------------------------------------

const TytanLogo: React.FC = () => (
  <img
    src="/tytan-logo-white.svg"
    alt="TYTAN Technologies"
    className="h-10 w-auto select-none"
    draggable={false}
  />
);

// ---------------------------------------------------------------------------
// Feature bullet
// ---------------------------------------------------------------------------

interface FeatureBulletProps {
  icon: React.ReactNode;
  label: string;
}

const FeatureBullet: React.FC<FeatureBulletProps> = ({ icon, label }) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 text-white flex-shrink-0">
      {icon}
    </div>
    <span className="text-white/90 text-sm font-medium">{label}</span>
  </div>
);

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();

  const handleSignIn = async () => {
    await login();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">

      {/* ------------------------------------------------------------------ */}
      {/* Left panel — brand / hero (60% on desktop, header on mobile)        */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative flex flex-col justify-between md:w-3/5 bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-700 px-8 py-10 md:px-14 md:py-16 overflow-hidden">

        {/* Decorative background circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-indigo-950/40" />
        <div className="pointer-events-none absolute top-1/2 right-8 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2" />

        {/* Top: logo */}
        <div className="relative z-10">
          <TytanLogo />
        </div>

        {/* Middle: headline + features (hidden on small mobile) */}
        <div className="relative z-10 mt-10 md:mt-0">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
            CapEx
            <br />
            <span className="text-indigo-300">Planner</span>
          </h1>
          <p className="mt-4 text-white/70 text-base md:text-lg max-w-sm leading-relaxed">
            Strategic capital expenditure management for facility planning
          </p>

          <div className="mt-8 flex flex-col gap-4 hidden md:flex">
            <FeatureBullet
              icon={<BarChart3 size={15} />}
              label="Real-time budget tracking"
            />
            <FeatureBullet
              icon={<FileSpreadsheet size={15} />}
              label="Excel import &amp; export"
            />
            <FeatureBullet
              icon={<Building2 size={15} />}
              label="Multi-department overview"
            />
          </div>
        </div>

        {/* Bottom: version tag */}
        <div className="relative z-10 hidden md:block">
          <span className="text-white/30 text-xs font-mono">v2.0 · 2026</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right panel — sign-in card (40% on desktop, full remaining on mobile) */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 md:px-12 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-10">

            {/* Heading */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Sign in to CapEx Planner
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Use your TYTAN Microsoft account
              </p>
            </div>

            {/* Microsoft / Entra sign-in button */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#0078d4] hover:bg-[#006cbf] active:bg-[#005ea6] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-3.5 transition-all duration-150 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:ring-offset-2"
            >
              {isLoading ? (
                <>
                  {/* Spinner */}
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <MicrosoftLogo />
                  <span>Sign in with Microsoft</span>
                </>
              )}
            </button>

            {/* Entra note */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <CheckCircle2 size={13} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-400">Powered by Microsoft Entra ID</p>
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Need access?{' '}
            <span className="text-gray-500 font-medium">
              Contact your IT administrator
            </span>
          </p>

          {/* Legal */}
          <p className="mt-3 text-center text-xs text-gray-300">
            &copy; 2026 TYTAN Technologies GmbH
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
