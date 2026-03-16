import React, { useEffect, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingModalProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSkip: () => void;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 6; // steps 0–5

// ---------------------------------------------------------------------------
// Illustration components
// ---------------------------------------------------------------------------

const WelcomeIllustration: React.FC = () => (
  <div className="relative flex flex-col items-center justify-center h-full select-none">
    {/* Animated background dots / sparkles */}
    <div className="absolute inset-0 overflow-hidden">
      {[
        { top: '15%', left: '20%', size: 6, delay: '0s', opacity: 0.5 },
        { top: '25%', left: '70%', size: 4, delay: '0.4s', opacity: 0.4 },
        { top: '60%', left: '15%', size: 5, delay: '0.8s', opacity: 0.45 },
        { top: '70%', left: '75%', size: 7, delay: '0.2s', opacity: 0.35 },
        { top: '40%', left: '85%', size: 4, delay: '1.0s', opacity: 0.5 },
        { top: '80%', left: '40%', size: 5, delay: '0.6s', opacity: 0.4 },
        { top: '10%', left: '50%', size: 3, delay: '1.2s', opacity: 0.45 },
        { top: '50%', left: '5%',  size: 4, delay: '0.9s', opacity: 0.35 },
      ].map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            opacity: dot.opacity,
            animation: `pulse 2.5s ease-in-out infinite`,
            animationDelay: dot.delay,
          }}
        />
      ))}
    </div>

    {/* Big TYTAN "T" logo */}
    <div className="relative z-10 flex items-center justify-center w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-2xl mb-6">
      <span className="text-5xl font-black text-white tracking-tighter">T</span>
    </div>

    <p className="relative z-10 text-white/70 text-xs font-medium uppercase tracking-widest">
      TYTAN Technologies
    </p>
  </div>
);

const DashboardIllustration: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4 px-6 select-none">
    {/* Simplified waterfall / bar chart */}
    <div className="w-full max-w-[180px]">
      {/* Chart header */}
      <div className="flex items-end justify-between gap-2 h-28 mb-2">
        {[
          { h: '100%', label: 'Budget', color: 'bg-white/30' },
          { h: '72%',  label: 'Commit',  color: 'bg-white/60' },
          { h: '58%',  label: 'Forecast', color: 'bg-white/80' },
          { h: '28%',  label: 'Rest',    color: 'bg-emerald-300/80' },
        ].map((bar) => (
          <div key={bar.label} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${bar.h}`, backgroundColor: 'transparent' }}>
              <div className={`w-full rounded-t-md ${bar.color}`} style={{ height: bar.h }} />
            </div>
            <span className="text-[9px] text-white/60 font-medium">{bar.label}</span>
          </div>
        ))}
      </div>
      {/* Baseline */}
      <div className="h-px bg-white/30 w-full" />
    </div>

    {/* Mini stat chips */}
    <div className="flex gap-2">
      {['Cost Driver', 'Phase', 'Product'].map((label) => (
        <div key={label} className="px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] text-white/70 font-medium">
          {label}
        </div>
      ))}
    </div>
  </div>
);

const CostItemsIllustration: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full px-5 gap-2 select-none">
    {/* Simulated table rows */}
    {[
      { status: 'Approved', statusColor: 'bg-emerald-300/80 text-emerald-900', amount: '125.000' },
      { status: 'Open',     statusColor: 'bg-white/50 text-gray-800',          amount: '48.500'  },
      { status: 'Pending',  statusColor: 'bg-amber-300/80 text-amber-900',     amount: '210.000' },
    ].map((row, i) => (
      <div
        key={i}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border transition-all duration-300 ${
          i === 1
            ? 'bg-white/25 border-white/40 scale-[1.03]'
            : 'bg-white/10 border-white/15'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="h-2 rounded bg-white/40 w-3/4 mb-1" />
          <div className="h-1.5 rounded bg-white/20 w-1/2" />
        </div>
        <div className="flex items-center gap-2 ml-3">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${row.statusColor}`}>
            {row.status}
          </span>
          <span className="text-[10px] font-mono text-white/80 font-bold">{row.amount}</span>
        </div>
      </div>
    ))}
  </div>
);

const FiltersIllustration: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full px-5 gap-4 select-none">
    {/* Filter chips row */}
    <div className="flex flex-wrap gap-2 justify-center">
      {[
        { label: 'Assembly', active: true },
        { label: 'Phase 1', active: true },
        { label: 'Approved', active: false },
        { label: 'Painting', active: false },
        { label: 'Product A', active: true },
      ].map((chip) => (
        <div
          key={chip.label}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
            chip.active
              ? 'bg-white text-indigo-700 border-white shadow-md'
              : 'bg-white/10 text-white/60 border-white/20'
          }`}
        >
          {chip.label}
        </div>
      ))}
    </div>

    {/* Search bar mock */}
    <div className="w-full max-w-[170px] flex items-center gap-2 rounded-lg bg-white/15 border border-white/25 px-3 py-2">
      <div className="w-3 h-3 rounded-full border-2 border-white/50" />
      <div className="flex-1 h-2 rounded bg-white/30" />
      <span className="text-[9px] text-white/40 font-mono">Ctrl+F</span>
    </div>

    {/* Saved views mock */}
    <div className="flex gap-1.5">
      {['My View', 'All Open', '+ Save'].map((v, i) => (
        <div key={v} className={`px-2 py-0.5 rounded text-[9px] font-medium border ${
          i === 0 ? 'bg-indigo-300/30 border-indigo-300/40 text-white' : 'bg-white/10 border-white/15 text-white/50'
        }`}>{v}</div>
      ))}
    </div>
  </div>
);

const ImportExportIllustration: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-5 select-none">
    {/* Excel file icon */}
    <div className="relative">
      <div className="w-16 h-20 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
        <div className="text-center">
          <div className="w-8 h-6 mx-auto rounded bg-emerald-400/80 flex items-center justify-center mb-1">
            <span className="text-[10px] font-black text-white">XLS</span>
          </div>
          <div className="space-y-1">
            <div className="h-1 w-8 mx-auto rounded bg-white/30" />
            <div className="h-1 w-6 mx-auto rounded bg-white/20" />
          </div>
        </div>
      </div>

      {/* Animated arrows */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <div className="w-4 h-px bg-white/50 relative">
          <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 border-t-2 border-r-2 border-white/50 rotate-45" />
        </div>
      </div>
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <div className="w-4 h-px bg-white/50 relative">
          <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 border-t-2 border-r-2 border-white/50 rotate-45" />
        </div>
      </div>
    </div>

    {/* Export format chips */}
    <div className="flex flex-col gap-1.5 w-full max-w-[170px]">
      {['Standard', 'Finance Template', 'Steering Committee'].map((fmt, i) => (
        <div key={fmt} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium ${
          i === 0 ? 'bg-white/25 border-white/40 text-white' : 'bg-white/10 border-white/15 text-white/60'
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
          {fmt}
        </div>
      ))}
    </div>
  </div>
);

const DoneIllustration: React.FC = () => (
  <div className="relative flex flex-col items-center justify-center h-full select-none overflow-hidden">
    {/* Confetti dots */}
    {[
      { top: '10%', left: '20%', size: 10, color: 'bg-yellow-300', delay: '0s'   },
      { top: '20%', left: '70%', size: 8,  color: 'bg-pink-300',   delay: '0.15s' },
      { top: '35%', left: '10%', size: 6,  color: 'bg-emerald-300',delay: '0.3s'  },
      { top: '55%', left: '80%', size: 9,  color: 'bg-sky-300',    delay: '0.1s'  },
      { top: '65%', left: '30%', size: 7,  color: 'bg-orange-300', delay: '0.45s' },
      { top: '75%', left: '60%', size: 8,  color: 'bg-violet-300', delay: '0.25s' },
      { top: '85%', left: '15%', size: 6,  color: 'bg-rose-300',   delay: '0.5s'  },
      { top: '15%', left: '45%', size: 7,  color: 'bg-lime-300',   delay: '0.35s' },
      { top: '45%', left: '55%', size: 5,  color: 'bg-cyan-300',   delay: '0.6s'  },
      { top: '90%', left: '50%', size: 8,  color: 'bg-fuchsia-300',delay: '0.2s'  },
    ].map((dot, i) => (
      <div
        key={i}
        className={`absolute rounded-sm ${dot.color}`}
        style={{
          top: dot.top,
          left: dot.left,
          width: dot.size,
          height: dot.size,
          opacity: 0.85,
          animation: `confettiFall 2s ease-in-out infinite alternate`,
          animationDelay: dot.delay,
          transform: `rotate(${i * 37}deg)`,
        }}
      />
    ))}

    {/* Central checkmark */}
    <div className="relative z-10 w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-2xl">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <path
          d="M7 18L14 25L29 10"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    <p className="relative z-10 mt-5 text-white/70 text-xs font-medium tracking-wider">
      You're ready to plan!
    </p>
  </div>
);

// ---------------------------------------------------------------------------
// Step content definitions
// ---------------------------------------------------------------------------

interface StepContent {
  illustration: React.ReactNode;
  illustrationBg: string;
  title: string;
  description: string;
  chips?: string[];
  tip?: string;
}

const STEPS: StepContent[] = [
  {
    illustration: <WelcomeIllustration />,
    illustrationBg: 'from-indigo-900 via-indigo-800 to-indigo-700',
    title: 'Welcome to CapEx Planner',
    description: 'Your intelligent capital expenditure management platform. Plan, track, and approve your CAPEX budget — all in one place.',
    tip: 'This quick tour takes about 2 minutes.',
  },
  {
    illustration: <DashboardIllustration />,
    illustrationBg: 'from-violet-900 via-violet-800 to-indigo-700',
    title: 'Budget at a Glance',
    description: 'The dashboard shows your total budget vs. committed and forecasted spend. Use the breakdown tabs to see spending by cost driver, phase, or product.',
    chips: ['Budget vs. Forecast', 'Cost Driver view', 'Phase breakdown'],
  },
  {
    illustration: <CostItemsIllustration />,
    illustrationBg: 'from-indigo-900 via-blue-900 to-indigo-800',
    title: 'Manage Cost Items',
    description: 'Each cost item has a status, amount, phase, and cost driver. Click any row to open the detail panel and edit. Approve or reject items directly from the table.',
    chips: ['Status badges', 'Inline editing', 'Side panel'],
  },
  {
    illustration: <FiltersIllustration />,
    illustrationBg: 'from-indigo-800 via-indigo-900 to-slate-900',
    title: 'Filter & Explore',
    description: 'Use filters to focus on specific departments, phases, products or approval statuses. Save your favorite views for quick access. Use Ctrl+F to search.',
    chips: ['Saved views', 'URL-shareable filters', 'Ctrl+F search'],
  },
  {
    illustration: <ImportExportIllustration />,
    illustrationBg: 'from-emerald-900 via-teal-900 to-indigo-900',
    title: 'Import & Export',
    description: 'Import your existing Excel budget data with a single click. Export to Standard, Finance Template, or Steering Committee format from the Export menu in the top right.',
    chips: ['Excel import', 'Finance Template', 'SteerCo export'],
  },
  {
    illustration: <DoneIllustration />,
    illustrationBg: 'from-indigo-900 via-indigo-800 to-violet-900',
    title: "You're all set!",
    description: 'Start adding departments, work areas, and cost items. Your data is saved automatically in the browser.',
    tip: 'Tip: You can restart this tour anytime from Settings.',
  },
];

// ---------------------------------------------------------------------------
// OnboardingModal
// ---------------------------------------------------------------------------

const OnboardingModal: React.FC<OnboardingModalProps> = ({
  currentStep,
  onStepChange,
  onComplete,
  onSkip,
}) => {
  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;
  const progressPct = ((currentStep) / (STEPS.length - 1)) * 100;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      onStepChange(currentStep + 1);
    }
  }, [currentStep, isLast, onComplete, onStepChange]);

  const goPrev = useCallback(() => {
    if (!isFirst) onStepChange(currentStep - 1);
  }, [currentStep, isFirst, onStepChange]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        onSkip();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onSkip]);

  return (
    <>
      {/* CSS keyframes injected via a style tag */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: var(--tw-opacity, 0.5); }
          50% { transform: scale(1.5); opacity: calc(var(--tw-opacity, 0.5) * 0.5); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-12px) rotate(180deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .onboarding-step-content {
          animation: fadeSlideIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onSkip}
        aria-modal="true"
        role="dialog"
        aria-label="Onboarding tour"
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden bg-white flex flex-col"
          style={{ maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar at top */}
          <div className="h-1 bg-gray-100 flex-shrink-0">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Main content area */}
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {/* Left — illustration (40%) */}
            <div
              className={`relative w-2/5 flex-shrink-0 bg-gradient-to-br ${step.illustrationBg} transition-all duration-500`}
              style={{ minHeight: 320 }}
            >
              <div className="absolute inset-0">
                {step.illustration}
              </div>

              {/* Step counter badge */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => onStepChange(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? 'bg-white w-4 h-2'
                          : 'bg-white/40 w-2 h-2 hover:bg-white/60'
                      }`}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right — content (60%) */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Skip button */}
              <div className="flex-shrink-0 flex justify-end px-5 pt-4">
                <button
                  onClick={onSkip}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Skip tour"
                >
                  <X size={13} />
                  Skip tour
                </button>
              </div>

              {/* Step content */}
              <div
                className="onboarding-step-content flex-1 px-7 pb-6 flex flex-col justify-between"
                key={currentStep}
              >
                <div className="mt-2">
                  {/* Sparkle icon for welcome step */}
                  {currentStep === 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
                      <Sparkles size={12} className="text-indigo-500" />
                      <span className="text-xs font-medium text-indigo-600">New to CapEx Planner?</span>
                    </div>
                  )}

                  <h2 className="text-xl font-bold text-gray-900 leading-tight mb-3">
                    {step.title}
                  </h2>

                  <p className="text-sm text-gray-600 leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Feature chips */}
                  {step.chips && step.chips.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {step.chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tip */}
                  {step.tip && (
                    <div className="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 mt-2">
                      <span className="text-gray-400 flex-shrink-0 mt-0.5">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0 3.5c.41 0 .75.34.75.75V11a.75.75 0 0 1-1.5 0V8.25c0-.41.34-.75.75-.75z" />
                        </svg>
                      </span>
                      <p className="text-xs text-gray-500 leading-relaxed">{step.tip}</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  {/* Back button or spacer */}
                  {!isFirst ? (
                    <button
                      onClick={goPrev}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ArrowLeft size={14} />
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    {/* For step 0: two action buttons */}
                    {isFirst ? (
                      <>
                        <button
                          onClick={onSkip}
                          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Skip — I'll explore myself
                        </button>
                        <button
                          onClick={goNext}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
                        >
                          Quick Tour (2 min)
                          <ArrowRight size={14} />
                        </button>
                      </>
                    ) : isLast ? (
                      <button
                        onClick={onComplete}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-md"
                      >
                        Start Planning
                        <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={goNext}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
                      >
                        Next
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingModal;
