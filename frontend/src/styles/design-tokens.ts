/**
 * CAPEX Budget Tool — Design Tokens
 *
 * Design direction: Stripe / Linear inspired. Clean, professional, data-dense.
 * Light base (gray-50 / white) with Indigo accent.
 * Optimised for financial data: tabular numbers, high-contrast status colors.
 *
 * Usage:
 *   import { colors, typography, spacing } from '@/styles/design-tokens';
 *   // Use tokens as Tailwind class references or in JS where needed.
 *   // CSS custom properties (var(--color-*)) are defined in globals.css.
 */

// ---------------------------------------------------------------------------
// Color Palette
// ---------------------------------------------------------------------------

export const colors = {
  // --- Brand / Accent ---
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // primary accent — Indigo-500
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },

  // --- Neutral / Gray (Tailwind Slate) ---
  neutral: {
    0: '#ffffff',
    25: '#fcfcfd',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // --- Surfaces ---
  surface: {
    page: 'var(--surface-page)',           // gray-50
    card: 'var(--surface-card)',           // white
    cardHover: 'var(--surface-card-hover)', // gray-50
    elevated: 'var(--surface-elevated)',    // white with shadow
    overlay: 'var(--surface-overlay)',      // white
    sidebar: 'var(--surface-sidebar)',      // gray-900 (dark sidebar)
  },

  // --- Text ---
  text: {
    primary: 'var(--text-primary)',     // gray-900
    secondary: 'var(--text-secondary)', // gray-600
    tertiary: 'var(--text-tertiary)',   // gray-400
    inverse: 'var(--text-inverse)',     // white
    brand: 'var(--text-brand)',         // indigo-600
    link: 'var(--text-link)',           // indigo-600
    linkHover: 'var(--text-link-hover)', // indigo-700
  },

  // --- Borders ---
  border: {
    default: 'var(--border-default)',   // gray-200
    strong: 'var(--border-strong)',     // gray-300
    brand: 'var(--border-brand)',       // indigo-500
    focus: 'var(--border-focus)',       // indigo-500
  },
} as const;

// ---------------------------------------------------------------------------
// Status Colors — Approval Workflow
// ---------------------------------------------------------------------------

export const statusColors = {
  draft: {
    bg: '#f1f5f9',     // slate-100
    text: '#475569',   // slate-600
    border: '#cbd5e1', // slate-300
    dot: '#94a3b8',    // slate-400
    label: 'Draft',
  },
  pending: {
    bg: '#fef3c7',     // amber-100
    text: '#92400e',   // amber-800
    border: '#fcd34d', // amber-300
    dot: '#f59e0b',    // amber-500
    label: 'Pending',
  },
  inReview: {
    bg: '#dbeafe',     // blue-100
    text: '#1e40af',   // blue-800
    border: '#93c5fd', // blue-300
    dot: '#3b82f6',    // blue-500
    label: 'In Review',
  },
  approved: {
    bg: '#dcfce7',     // green-100
    text: '#166534',   // green-800
    border: '#86efac', // green-300
    dot: '#22c55e',    // green-500
    label: 'Approved',
  },
  rejected: {
    bg: '#fee2e2',     // red-100
    text: '#991b1b',   // red-800
    border: '#fca5a5', // red-300
    dot: '#ef4444',    // red-500
    label: 'Rejected',
  },
  onHold: {
    bg: '#f3e8ff',     // purple-100
    text: '#6b21a8',   // purple-800
    border: '#d8b4fe', // purple-300
    dot: '#a855f7',    // purple-500
    label: 'On Hold',
  },
} as const;

// ---------------------------------------------------------------------------
// Department Colors — Distinguishable at a glance
// ---------------------------------------------------------------------------

export const departmentColors = {
  engineering: { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  production: { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  quality: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  logistics: { bg: '#e0e7ff', text: '#4338ca', dot: '#6366f1' },
  facilities: { bg: '#fce7f3', text: '#be185d', dot: '#ec4899' },
  it: { bg: '#cffafe', text: '#0e7490', dot: '#06b6d4' },
  rnd: { bg: '#f3e8ff', text: '#7e22ce', dot: '#a855f7' },
  management: { bg: '#f1f5f9', text: '#334155', dot: '#64748b' },
} as const;

/**
 * Department accent colors by numeric ID.
 * Single source of truth — import this instead of hardcoding colors.
 */
export const DEPT_ACCENT_COLORS: Record<string, string> = {
  'd-001': '#6366f1',
  'd-002': '#f59e0b',
  'd-003': '#3b82f6',
  'd-004': '#ec4899',
  'd-005': '#a855f7',
};

/** Returns the accent color for a department ID, with a slate fallback. */
export function getDeptColor(deptId: string): string {
  return DEPT_ACCENT_COLORS[deptId] ?? '#64748b';
}

// ---------------------------------------------------------------------------
// Phase Colors — Factory Planning Phases
// ---------------------------------------------------------------------------

export const phaseColors = {
  planning: { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
  design: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  procurement: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  construction: { bg: '#ffedd5', text: '#9a3412', dot: '#f97316' },
  installation: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  commissioning: { bg: '#cffafe', text: '#155e75', dot: '#06b6d4' },
  completed: { bg: '#f1f5f9', text: '#475569', dot: '#64748b' },
} as const;

// ---------------------------------------------------------------------------
// Budget Health Colors — Green -> Yellow -> Red based on % spent
// ---------------------------------------------------------------------------

export const budgetHealth = {
  /** 0-60 % spent — healthy */
  healthy: {
    bg: '#dcfce7',
    text: '#166534',
    bar: '#22c55e',
    label: 'On Track',
  },
  /** 60-80 % spent — caution */
  caution: {
    bg: '#fef9c3',
    text: '#854d0e',
    bar: '#eab308',
    label: 'Caution',
  },
  /** 80-95 % spent — warning */
  warning: {
    bg: '#fef3c7',
    text: '#92400e',
    bar: '#f59e0b',
    label: 'Warning',
  },
  /** 95-100 % spent — critical */
  critical: {
    bg: '#fee2e2',
    text: '#991b1b',
    bar: '#ef4444',
    label: 'Critical',
  },
  /** > 100 % — over budget */
  overBudget: {
    bg: '#fef2f2',
    text: '#7f1d1d',
    bar: '#b91c1c',
    label: 'Over Budget',
  },
} as const;

/**
 * Returns the appropriate budget health tier for a given percentage.
 */
export function getBudgetHealth(percentSpent: number) {
  if (percentSpent <= 60) return budgetHealth.healthy;
  if (percentSpent <= 80) return budgetHealth.caution;
  if (percentSpent <= 95) return budgetHealth.warning;
  if (percentSpent <= 100) return budgetHealth.critical;
  return budgetHealth.overBudget;
}

// ---------------------------------------------------------------------------
// Typography Scale
// ---------------------------------------------------------------------------

export const typography = {
  /** Font families */
  fontFamily: {
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
    mono: '"Geist Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace',
    display: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  },

  /** Font sizes — [fontSize, lineHeight, letterSpacing] */
  scale: {
    'xs':    ['0.75rem',  '1rem',     '0.01em'],   // 12px — captions, labels
    'sm':    ['0.8125rem','1.25rem',   '0.005em'],  // 13px — secondary text
    'base':  ['0.875rem', '1.375rem',  '0em'],      // 14px — body text (dense UI)
    'md':    ['1rem',     '1.5rem',    '-0.006em'],  // 16px — emphasized body
    'lg':    ['1.125rem', '1.75rem',   '-0.011em'],  // 18px — card titles
    'xl':    ['1.25rem',  '1.75rem',   '-0.017em'],  // 20px — section headers
    '2xl':   ['1.5rem',   '2rem',      '-0.022em'],  // 24px — page titles
    '3xl':   ['1.875rem', '2.25rem',   '-0.025em'],  // 30px — dashboard hero
    '4xl':   ['2.25rem',  '2.5rem',    '-0.028em'],  // 36px — big numbers
  },

  /** Font weights */
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  /** Specific presets for financial data */
  financial: {
    /** Use for all currency amounts — tabular nums keep columns aligned */
    amount: 'font-mono tabular-nums text-right',
    /** Large hero KPI numbers on dashboard */
    kpi: 'font-mono tabular-nums tracking-tight font-semibold',
    /** Percentage values */
    percentage: 'font-mono tabular-nums',
    /** Table header */
    tableHeader: 'text-xs font-semibold uppercase tracking-wider text-slate-500',
    /** Table cell */
    tableCell: 'text-sm text-slate-700',
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing Scale (matches Tailwind 4 spacing)
// ---------------------------------------------------------------------------

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------

export const radius = {
  none: '0',
  sm: '0.25rem',    // 4px — inputs, small elements
  DEFAULT: '0.5rem', // 8px — cards, buttons
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px — modals, popovers
  xl: '1rem',       // 16px — large cards
  '2xl': '1.5rem',  // 24px — feature sections
  full: '9999px',   // pills, avatars
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.03)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.03)',
  /** Card resting state */
  card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
  /** Card hover / elevated */
  cardHover: '0 4px 12px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.03)',
  /** Dropdown / Popover */
  dropdown: '0 10px 30px -5px rgb(0 0 0 / 0.1), 0 4px 10px -4px rgb(0 0 0 / 0.04)',
  /** Modal */
  modal: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
  /** Inner glow for inputs */
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
  /** Focus ring */
  focusRing: '0 0 0 3px rgb(99 102 241 / 0.15)',
} as const;

// ---------------------------------------------------------------------------
// Animation / Transition Presets
// ---------------------------------------------------------------------------

export const transitions = {
  /** Duration presets */
  duration: {
    instant: '75ms',
    fast: '150ms',
    DEFAULT: '200ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  /** Easing curves */
  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',   // ease-in-out
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Snappy — good for UI interactions */
    snappy: 'cubic-bezier(0.2, 0, 0, 1)',
    /** Bouncy — for attention-grabbing animations */
    bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  /** Ready-to-use transition strings */
  preset: {
    /** Default for hover states, color changes */
    base: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    /** Faster — for small interactive elements */
    fast: 'all 150ms cubic-bezier(0.2, 0, 0, 1)',
    /** For modals, drawers, panels */
    panel: 'all 300ms cubic-bezier(0.2, 0, 0, 1)',
    /** For page transitions */
    page: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
    /** Color only */
    colors: 'color 150ms ease, background-color 150ms ease, border-color 150ms ease',
    /** Transform only */
    transform: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    /** Opacity only */
    opacity: 'opacity 200ms ease',
  },
} as const;

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 10,
  sticky: 20,
  header: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
  max: 9999,
} as const;

// ---------------------------------------------------------------------------
// Breakpoints (reference — these mirror Tailwind defaults)
// ---------------------------------------------------------------------------

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
