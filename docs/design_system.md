# TYTAN Technologies — CAPEX Budget Tool Design System

> **Version:** 1.0
> **Last updated:** 2026-03-16
> **Design direction:** Stripe / Linear inspired — professional, data-dense, clean.

---

## 1. Visual Language

### Philosophy

The CAPEX Budget Tool is a **professional financial planning tool** for factory infrastructure. The design must:

- Make numbers **instantly readable** — financial data is the primary content
- Communicate **trust and precision** — this is where million-euro decisions are made
- Stay **calm and uncluttered** — reduce cognitive load in data-heavy views
- Feel **modern and fast** — Stripe/Linear tier, not SAP/Oracle tier

### Mood

| Attribute | Our Direction | Avoid |
|-----------|--------------|-------|
| Tone | Professional, confident | Corporate, sterile |
| Density | Compact, information-rich | Sparse, wasteful |
| Color | Muted base, purposeful accents | Rainbow, decoration |
| Motion | Subtle, functional | Flashy, distracting |
| Typography | Clean, numeric-optimized | Decorative, serif |

---

## 2. Color System

### Brand Accent — Indigo

Indigo conveys trust, intelligence, and professionalism. It stands out against the muted gray base without feeling aggressive.

| Token | Value | Usage |
|-------|-------|-------|
| `brand-500` | `#6366f1` | Primary actions, active states |
| `brand-600` | `#4f46e5` | Buttons, links |
| `brand-700` | `#4338ca` | Hover states |
| `brand-100` | `#e0e7ff` | Selected backgrounds |
| `brand-50` | `#eef2ff` | Subtle highlights |

### Neutral Palette — Slate

The neutral scale uses Tailwind Slate for a slightly cool tone that pairs well with Indigo.

| Token | Value | Usage |
|-------|-------|-------|
| `neutral-0` | `#ffffff` | Cards, inputs |
| `neutral-50` | `#f8fafc` | Page background |
| `neutral-200` | `#e2e8f0` | Borders |
| `neutral-500` | `#64748b` | Secondary text |
| `neutral-900` | `#0f172a` | Primary text, sidebar |

### Color Usage Rules

1. **Never use color alone to convey meaning.** Always pair with text, icons, or patterns.
2. **Status colors are reserved.** Do not use green/red/amber for decorative purposes.
3. **The brand accent (Indigo) is for interactive elements only.** Buttons, links, selected states.
4. **Background colors stay muted.** `gray-50` for pages, `white` for cards. Never colored backgrounds for large areas.
5. **Text on colored backgrounds must meet WCAG AA** (4.5:1 for normal text, 3:1 for large text).

### Status Colors

These are semantically locked — each color maps to exactly one approval status:

| Status | Background | Text | Dot |
|--------|-----------|------|-----|
| Entwurf (Draft) | `slate-100` | `slate-600` | `slate-400` |
| Ausstehend (Pending) | `amber-100` | `amber-800` | `amber-500` |
| In Prüfung (In Review) | `blue-100` | `blue-800` | `blue-500` |
| Genehmigt (Approved) | `green-100` | `green-800` | `green-500` |
| Abgelehnt (Rejected) | `red-100` | `red-800` | `red-500` |
| Pausiert (On Hold) | `purple-100` | `purple-800` | `purple-500` |

### Budget Health Gradient

Visual indicator for budget consumption. Applied to progress bars and KPI cards.

| Range | Color | Label |
|-------|-------|-------|
| 0–60 % | `green-500` | Im Rahmen |
| 60–80 % | `yellow-500` | Achtung |
| 80–95 % | `amber-500` | Warnung |
| 95–100 % | `red-500` | Kritisch |
| > 100 % | `red-700` | Überschritten |

---

## 3. Typography

### Font Stack

| Purpose | Font | Fallback |
|---------|------|----------|
| UI Text | **Inter** | system-ui, sans-serif |
| Numbers / Code | **Geist Mono** | JetBrains Mono, monospace |

Inter is loaded with OpenType features `cv02`, `cv03`, `cv04`, `cv11` for a more distinctive character set.

### Type Scale

Base size is **14px** (0.875rem) — optimized for data-dense interfaces.

| Name | Size | Weight | Usage |
|------|------|--------|-------|
| `xs` | 12px | 400–600 | Table headers, captions, meta |
| `sm` | 13px | 400–500 | Secondary text, descriptions |
| `base` | 14px | 400 | Body text, table cells |
| `md` | 16px | 500 | Emphasized text |
| `lg` | 18px | 600 | Card titles |
| `xl` | 20px | 600 | Section headers |
| `2xl` | 24px | 600 | Page titles |
| `3xl` | 30px | 700 | Dashboard hero text |
| `4xl` | 36px | 700 | Big KPI numbers |

### Financial Typography Rules

1. **All currency amounts** use `font-mono tabular-nums text-right`.
2. **KPI hero numbers** use `font-mono tabular-nums tracking-tight font-semibold`.
3. **Table headers** use `text-xs font-semibold uppercase tracking-wider text-slate-500`.
4. **Negative values** display in `red-600` with a minus sign (never parentheses).
5. **Currency formatting** follows German locale: `1.234.567,89 €` (dot as thousands separator, comma as decimal).
6. Numbers always right-align in tables for easy scanning.

---

## 4. Spacing & Layout

### Spacing Scale

Uses Tailwind's default 4px grid. Key stops:

| Token | px | Usage |
|-------|-----|-------|
| `1` | 4px | Tight gaps (icon to text) |
| `2` | 8px | Inline spacing |
| `3` | 12px | Compact padding |
| `4` | 16px | Standard padding |
| `5` | 20px | Card inner padding |
| `6` | 24px | Section spacing |
| `8` | 32px | Large section gaps |
| `12` | 48px | Page section spacing |

### Layout Constants

| Element | Value |
|---------|-------|
| Sidebar width | 260px |
| Sidebar collapsed | 64px |
| Header height | 56px |
| Card border-radius | 12px (`rounded-xl`) |
| Button border-radius | 8px (`rounded-lg`) |
| Input border-radius | 8px (`rounded-lg`) |
| Max content width | 1280px |

---

## 5. Component Patterns

### Cards

- White background, 1px `slate-200` border, subtle shadow
- Border-radius: 12px
- Padding: 20px–24px
- On hover: slightly elevated shadow (for interactive cards)
- **No colored card backgrounds** for standard content cards

### Buttons

| Variant | Appearance | Usage |
|---------|-----------|-------|
| Primary | Indigo-600 solid, white text | Main actions (Save, Submit, Create) |
| Secondary | White, slate border | Alternative actions |
| Ghost | Transparent, slate text | Tertiary actions, icon buttons |
| Danger | Red-500 solid, white text | Delete, reject |

All buttons: 8px radius, 500 weight, 14px font, 150ms transition.

### Status Badges

- Pill shape (`rounded-full`)
- Colored dot + label
- Muted background, dark text (never saturated bg with white text)
- Consistent dot size: 6px

### Tables

- No outer border (borderless design)
- 1px bottom border between rows (`slate-200`)
- Sticky header with subtle background (`slate-50`)
- Row hover: `slate-50` background
- Numeric columns: right-aligned, monospace, tabular-nums
- Action column: right-aligned, icon buttons

### Forms / Inputs

- White background, 1px `slate-200` border
- 8px border-radius
- Focus: indigo border + focus ring (3px indigo/15%)
- Error: red border + red focus ring
- Disabled: `slate-100` background, reduced opacity
- Labels: `text-sm font-medium text-slate-700`, placed above input

### Progress / Budget Bars

- 8px height, full rounded
- Track: `slate-200`
- Fill: color determined by `getBudgetHealth()` function
- Smooth width transition (350ms)

---

## 6. Shadows

Shadows are intentionally subtle — this is a professional tool, not a landing page.

| Level | Usage |
|-------|-------|
| `xs` | Inputs, small interactive elements |
| `card` | Default card resting state |
| `card-hover` | Interactive card on hover |
| `dropdown` | Dropdowns, popovers, tooltips |
| `modal` | Modal overlays |

---

## 7. Animations & Transitions

### General Rules

- Default transition: **200ms ease-in-out**
- Hover states: **150ms** (snappy feel)
- Panel open/close: **300ms**
- **Never animate layout properties** (width, height) on scroll-heavy views
- Use `transform` and `opacity` for performance
- Respect `prefers-reduced-motion`

### Easing

| Name | Curve | Usage |
|------|-------|-------|
| Default | `cubic-bezier(0.4, 0, 0.2, 1)` | General transitions |
| Snappy | `cubic-bezier(0.2, 0, 0, 1)` | UI interactions |
| Bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Success animations (sparingly) |

---

## 8. Dark Mode Preparation

Dark mode CSS custom properties are defined in `globals.css` under `[data-theme="dark"]` with placeholder values. When implementing:

1. Toggle `data-theme` attribute on `<html>` element
2. All component styles reference CSS variables — no hardcoded colors
3. Shadows become deeper and more opaque in dark mode
4. Status badge colors may need slight adjustment for dark backgrounds
5. Test contrast ratios for all text/background combinations

---

## 9. Do's and Don'ts

### DO

- Use the design tokens from `design-tokens.ts` — never hardcode colors
- Use CSS custom properties (`var(--*)`) in styles for theme support
- Keep financial numbers in monospace with tabular-nums
- Right-align all numeric columns in tables
- Use status badge component for approval states — never freestyle status indicators
- Use the `getBudgetHealth()` function for budget bar colors
- Format currencies in German locale (`1.234,56 €`)
- Use `focus-visible` for focus styles (keyboard-only)
- Keep interactive areas minimum 44x44px (touch target)
- Test with real data — use realistic euro amounts, not "123"
- Use semantic HTML (`<table>` for data, `<button>` for actions)
- Add `aria-label` to icon-only buttons

### DON'T

- Don't use color as the only way to convey information
- Don't use more than 2 font families (Inter + Geist Mono)
- Don't create custom status colors — use the defined set
- Don't use saturated background colors for large areas
- Don't add decorative animations to data-heavy views
- Don't left-align numbers in tables
- Don't use `outline: none` without providing an alternative focus indicator
- Don't use px-based font sizes — use rem
- Don't mix border-radius values on adjacent elements (cards: 12px, buttons inside: 8px)
- Don't use opacity for disabled states lower than 0.5 (readability)
- Don't hardcode light/dark specific colors — always use CSS variables
- Don't use alert/confirm dialogs — use inline validation and toast notifications
- Don't nest cards inside cards (maximum 1 level of visual elevation)

---

## 10. File Reference

| File | Purpose |
|------|---------|
| `frontend/src/styles/design-tokens.ts` | JS/TS design tokens — colors, typography, spacing, status colors, helpers |
| `frontend/src/styles/globals.css` | CSS custom properties, base styles, component classes, scrollbar, focus, print |
| `frontend/src/index.css` | Tailwind v4 import entry point |

---

## 11. Font Installation

Add to `index.html` `<head>`:

```html
<link rel="preconnect" href="https://rsms.me/">
<link rel="stylesheet" href="https://rsms.me/inter/inter.css">
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/style.css">
```

Or install via npm:

```bash
npm install @fontsource/inter @fontsource/geist-mono
```

Then import in `main.tsx`:

```typescript
import '@fontsource/inter/variable.css';
import '@fontsource/geist-mono/variable.css';
```
