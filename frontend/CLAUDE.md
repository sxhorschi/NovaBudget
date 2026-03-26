# Frontend — Hinweise für Claude Code

## Überblick

React 19 SPA mit TypeScript, Vite 8, TailwindCSS 4. Drei Seiten: Costbook (`/`), Cash-Out (`/cashout`), Import (`/import`).

## Patterns

### Components

- **Nur Functional Components** mit Hooks. Keine Class Components.
- Props-Interface direkt über der Component definieren oder in `types/budget.ts`.
- `React.FC<Props>` ist optional — explizite Return-Types auch ok.
- Neue Components in den passenden Unterordner von `src/components/`:
  - `costbook/` — Tabelle, Rows, StatusBadge, AmountCell, DeleteConfirmDialog
  - `filter/` — FilterBar, FilterChip, FilterDropdown, SavedViews, SearchInput
  - `layout/` — AppLayout, TopBar, TabBar
  - `sidepanel/` — SidePanel, SidePanelForm, AttachmentList, BudgetAdjustmentHistory, DecisionLog
  - `summary/` — SummaryStrip, ProgressMicro
  - `import/` — ExcelImport
  - `common/` — EmptyState, Skeleton, Toast, ToastProvider
  - `help/` — HelpTooltip
  - `settings/` — SettingsPanel

### Styling

- **Nur TailwindCSS.** Keine CSS-in-JS, kein styled-components, keine separate CSS-Module.
- TailwindCSS v4 — Konfiguration via CSS (`src/index.css`), nicht via `tailwind.config.js`.
- Design Tokens in `src/styles/design-tokens.ts` für konsistente Farben/Spacing.
- Farb-Zuordnungen für Status in `src/types/budget.ts` (`STATUS_COLORS`).

### State Management

- **Globaler Daten-State** via `BudgetDataContext` (`src/context/BudgetDataContext.tsx`).
  - Stellt `functionalAreas`, `workAreas`, `costItems` bereit + CRUD-Mutations.
  - **Backend-API ist Source of Truth** — alle CRUD-Operationen gehen ueber die REST API.
  - Optimistische Updates fuer schnelle UI, Rollback bei API-Fehler.
- **Facility-State** via `FacilityContext` (`src/context/FacilityContext.tsx`).
  - Laedt Facilities von `GET /api/v1/facilities`.
  - CRUD ueber Backend-API.
  - Facility-Auswahl wird in localStorage gespeichert (UI-Praeferenz).
- **Config-State** via `ConfigContext` (`src/context/ConfigContext.tsx`).
  - Laedt von `GET /api/v1/config`, cached in localStorage.
- **Filter-State** lebt in URL Query Params via `useFilterState()` Hook (`src/hooks/useFilterState.ts`).
  - Ändere nie Filter über `useState` direkt — immer über `setFilter(field, values)`.
- **UI-State** (Panel offen, Table expanded) via React `useState` — lokal in der Component.
- **Kein Redux, kein Zustand.** Bewusste Entscheidung.

### API Client

- Axios-basiert, Konfiguration in `src/api/client.ts`.
- Endpunkt-spezifische Module in `src/api/`:
  - `facilities.ts`, `functionalAreas.ts`, `workAreas.ts`, `costItems.ts` — CRUD
  - `budgetAdjustments.ts`, `transfers.ts`, `attachments.ts` — Spezial-APIs
  - `mappers.ts` — Enum-Case-Mapping (Backend UPPER_CASE ↔ Frontend lowercase)
- Base URL: `http://localhost:8000/api/v1`
- **Kein CLIENT_ONLY_MODE mehr** — Backend muss laufen (`docker compose up`).

## Types

Alle zentralen TypeScript-Typen in **`src/types/budget.ts`**:
- Enums als String Union Types: `ApprovalStatus`, `ProjectPhase`, `Product`, `CostBasis`, `CostDriver`
- Interfaces: `Facility`, `FunctionalArea`, `WorkArea`, `CostItem`, `Attachment`, `BudgetSummary`, `FunctionalAreaSummary`, `CashOutEntry`, `BudgetAdjustment`
- Label Maps: `STATUS_LABELS`, `PHASE_LABELS`, `PRODUCT_LABELS`, `COST_BASIS_LABELS`, `COST_DRIVER_LABELS`
- Farb Maps: `STATUS_COLORS`, `ADJUSTMENT_CATEGORY_COLORS`

**Wichtig:** Frontend verwendet lowercase Enums (`approved`, `phase_1`), Backend verwendet UPPER_CASE (`APPROVED`, `PHASE_1`). Die API-Schicht muss ggf. transformieren.

## Hooks

| Hook                   | Datei                           | Zweck                                           |
|------------------------|---------------------------------|-------------------------------------------------|
| `useFilterState`       | `hooks/useFilterState.ts`       | Filter lesen/setzen via URL Params              |
| `useFilteredData`      | `hooks/useFilteredData.ts`      | Daten client-seitig nach FilterState filtern    |

## Neue Component anlegen

1. Erstelle Datei im passenden Unterordner: `src/components/<kategorie>/<ComponentName>.tsx`
2. Definiere Props-Interface
3. Nutze TailwindCSS für Styling
4. Wenn die Component Filterdaten braucht: `useFilterState()` verwenden
5. Fuer Zugriff auf Daten: `useBudgetData()` aus `context/BudgetDataContext`
6. Exportiere als `default export`

## Routing

Drei Routen, definiert in `src/App.tsx`:

| Route       | Page Component  | Beschreibung            |
|-------------|-----------------|-------------------------|
| `/`         | `CostbookPage`  | Hauptansicht (Default)  |
| `/cashout`  | `CashOutPage`   | Cash-Out Timeline       |
| `/import`   | `ImportPage`    | Excel Import            |

Navigation über `TabBar` Component (react-router-dom `NavLink`).

## Build & Dev

```bash
npm run dev       # Vite Dev Server mit HMR (Port 5173)
npm run build     # TypeScript Check + Vite Production Build
npm run preview   # Production Build lokal testen
```

**Hinweis:** `npm install` erfordert `--legacy-peer-deps` wegen Peer-Dependency-Konflikt zwischen `@tailwindcss/vite@4.2.1` und `vite@8.0.0`.

## Abhängigkeiten

- `react` / `react-dom` 19 — UI Framework
- `react-router-dom` 7 — Routing
- `@tanstack/react-table` 8 — Table Logic (Sorting, Grouping)
- `recharts` 3 — Charts (CashOutPage: AreaChart, ComposedChart)
- `xlsx` — Excel Export (Standard, Finance, SteerCo)
- `axios` — HTTP Client
- `lucide-react` — Icon Library
- `tailwindcss` 4 — Utility-first CSS

## Entfernte Features (Kill-List, nicht wiederherstellen)

Folgende Features wurden am 2026-03-16 bewusst entfernt (siehe `docs/chef_report.md` + `docs/swarm_consensus.md`):
- **Risk Matrix / RiskLevel / calculateRiskLevel** — Backlog, nicht MVP
- **S-Curve Visualisierung** — Redundant mit Budget Burndown
- **Sankey Diagram** — Alle Stakeholder: "huebsch aber nutzlos"
- **Command Palette (Cmd+K)** — Developer-Komfort in Non-Developer-Tool
- **Keyboard Shortcuts** — Zielgruppe sind Maus-User
- **OnboardingWizard** — Nicht priorisiert
