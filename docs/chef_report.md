# Chef-Report: Frontend-Bereinigung

**Datum:** 2026-03-16
**Scope:** Entfernung aller Kill-List Features, deprecated Components, Vite Defaults. TypeScript + Build Fix.

---

## 1. Was wurde ENTFERNT (24 Dateien)

### Kill-List Features (Swarm Consensus: AVG < 5.25)

| Datei | Begruendung |
|-------|-------------|
| `components/visualization/RiskMatrix.tsx` | Risk Matrix ist Backlog (AVG 5.25), nicht MVP. Planner sieht Risiko im PM-Tool. |
| `components/visualization/SCurve.tsx` | Kill-List (AVG 5.25). Budget Burndown auf CashOutPage liefert 80% der gleichen Info. |
| `components/visualization/BudgetSankey.tsx` | Kill-List (AVG 3.75). Vier von vier Rollen: "huebsch aber nutzlos". |
| `components/costbook/NoOfferBanner.tsx` | Risk-Feature. War ein Warn-Banner fuer Positionen ohne Angebot. Nicht im MVP. |
| `components/command/CommandPalette.tsx` | Kill-List (AVG 3.25). Developer-Komfort fuer Non-Developer-Tool. Browser Ctrl+F reicht. |
| `components/help/ShortcutCheatsheet.tsx` | Kill-List (AVG 3.25). Gehoert zu Keyboard Shortcuts. |
| `components/KeyboardShortcutsProvider.tsx` | Kill-List (AVG 3.25). Provider fuer Keyboard Shortcuts. |
| `hooks/useKeyboardShortcuts.ts` | Kill-List. Hook fuer Keyboard Shortcuts. |
| `components/onboarding/OnboardingWizard.tsx` | Nicht im Swarm bewertet, kein MVP-Feature. |

### Deprecated Components (markiert als @deprecated, nie referenziert)

| Datei | Begruendung |
|-------|-------------|
| `components/layout/Sidebar.tsx` | Ersetzt durch TopBar + TabBar. Exportierte `null`. |
| `components/layout/AppShell.tsx` | Ersetzt durch AppLayout. Exportierte `children` direkt. |
| `pages/Dashboard.tsx` | Ersetzt durch CostbookPage als Startseite. |
| `pages/DepartmentView.tsx` | Ersetzt durch CostbookPage mit Department-Filter. |
| `components/dashboard/ApprovalStatusWidget.tsx` | Stub (`return null`). |
| `components/dashboard/BudgetOverview.tsx` | Stub (`return null`). |
| `components/dashboard/CashOutTimeline.tsx` | Stub (`return null`). Nicht zu verwechseln mit CashOutPage! |
| `components/dashboard/DepartmentBreakdown.tsx` | Stub (`return null`). |

### Tote/Unbenutzte Dateien

| Datei | Begruendung |
|-------|-------------|
| `counter.ts` | Vite Default Demo-Datei. |
| `style.css` | Vite Default Demo-CSS (297 Zeilen). |
| `main.ts` | Vite Default Entry-Point (nicht main.tsx). |
| `components/costbook/CostItemDialog.tsx` | Nie importiert. Ersetzt durch SidePanelForm. |
| `components/costbook/FilterBar.tsx` | Duplikat. `filter/FilterBar.tsx` wird stattdessen benutzt. |
| `components/layout/KPIStrip.tsx` | Duplikat von SummaryStrip. Nie importiert. |
| `components/visualization/BudgetBurndown.tsx` | Standalone-Version. CashOutPage hat Burndown inline. |
| `components/visualization/PhaseProgress.tsx` | Standalone-Version. CashOutPage hat Progress inline. |
| `assets/typescript.svg` | Vite Default. |
| `assets/vite.svg` | Vite Default. |
| `assets/hero.png` | Vite Default. |

### Entfernte Verzeichnisse

- `components/dashboard/` (komplett)
- `components/command/` (komplett)
- `components/onboarding/` (komplett)
- `components/visualization/` (komplett)

---

## 2. Was wurde GEFIXT

### Code-Aenderungen

| Datei | Aenderung |
|-------|-----------|
| `App.tsx` | CommandPalette, OnboardingWizard, ShortcutCheatsheet, KeyboardShortcutsProvider entfernt. AppInner-Wrapper entfernt. Direktes Layout. |
| `components/layout/AppLayout.tsx` | `onSearchClick` Prop entfernt (war fuer CommandPalette). |
| `components/layout/TopBar.tsx` | Search-Button (Cmd+K) entfernt. Nur noch Export + Settings. |
| `pages/CostbookPage.tsx` | BudgetSankey-Import + View-Mode-Toggle entfernt. RiskMatrix + NoOfferBanner entfernt. Sankey-Button raus. |
| `hooks/useFilterState.ts` | `riskLevels` und `costBases` aus FilterState entfernt (vom Linter bereits erledigt). |
| `hooks/useFilteredData.ts` | Risk-Filter-Logik und calculateRiskLevel-Import entfernt (vom Linter bereits erledigt). |
| `components/costbook/CostItemRow.tsx` | Risk-Dot + calculateRiskLevel + RISK_LABELS entfernt (vom Linter bereits erledigt). |
| `types/budget.ts` | RiskLevel, RISK_LABELS, RISK_COLORS, calculateRiskLevel entfernt (vom Linter bereits erledigt). |
| `services/clientExport.ts` | calculateRiskLevel-Import entfernt, Risk-Sektion im SteerCo-Export entfernt (vom Linter bereits erledigt). |

### Dependency Fix

| Problem | Loesung |
|---------|---------|
| `xlsx` Modul nicht installiert (TS2307) | `npm install xlsx --legacy-peer-deps` |

---

## 3. Aktueller Stand

### Dateien: 48 TypeScript/TSX Dateien

```
src/
  App.tsx                          -- Entry: 3 Routen, BudgetDataProvider, ToastProvider
  main.tsx                         -- ReactDOM Render
  types/budget.ts                  -- Alle zentralen Types
  context/BudgetDataContext.tsx     -- Mock-Daten Context
  hooks/useFilterState.ts          -- URL-basierter Filter-State
  hooks/useFilteredData.ts         -- Client-seitige Filterung
  mocks/data.ts                    -- Mock-Daten
  services/clientExport.ts         -- Standard/Finance/SteerCo Export (xlsx)
  styles/design-tokens.ts          -- Design Tokens
  styles/globals.css               -- TailwindCSS Base
  index.css                        -- TailwindCSS Entry
  api/                             -- Axios API Client (4 Dateien)
  pages/                           -- 3 Seiten: CostbookPage, CashOutPage, ImportPage
  components/
    common/                        -- EmptyState, Skeleton, Toast, ToastProvider
    costbook/                      -- CostbookTable, CostItemRow, DepartmentRow, WorkAreaRow,
                                      AmountCell, StatusBadge, DeleteConfirmDialog,
                                      SkeletonLoader, TableFooter
    export/                        -- ExportMenu
    filter/                        -- FilterBar, FilterChip, FilterDropdown, SavedViews, SearchInput
    help/                          -- HelpTooltip
    import/                        -- ExcelImport
    layout/                        -- AppLayout, TopBar, TabBar
    settings/                      -- SettingsPanel
    sidepanel/                     -- SidePanel, SidePanelForm, AttachmentList,
                                      BudgetAdjustmentHistory, DecisionLog
    summary/                       -- SummaryStrip, ProgressMicro
```

### Build-Status

- **TypeScript:** 0 Fehler
- **Vite Build:** Erfolgreich (525ms)
- **Bundle-Groesse:** 1,070 kB JS (326 kB gzip) + 54 kB CSS (11 kB gzip)
- **Warnung:** Bundle > 500 kB -- wird durch Code-Splitting in Phase 2 geloest

---

## 4. MVP Feature-Check

| # | Feature | Status | Komponente |
|---|---------|--------|------------|
| 1 | Dashboard/KPIs | VORHANDEN | SummaryStrip (Budget, Committed, Remaining, Delta) |
| 2 | Hierarchische Tabelle | VORHANDEN | CostbookTable mit Department > WorkArea > CostItem |
| 3 | Multi-Select Filter | VORHANDEN | FilterChip, FilterDropdown, SavedViews, SearchInput |
| 4 | Excel Import | VORHANDEN | ExcelImport Komponente + ImportPage |
| 5 | Standard Export | VORHANDEN | clientExport.ts exportStandard() |
| 6 | Finance Export | VORHANDEN | clientExport.ts exportFinance() |
| 7 | SteerCo Export | VORHANDEN | clientExport.ts exportSteeringCommittee() |
| 8 | Cash-Out Timeline | VORHANDEN | CashOutPage (Stacked Area + Heatmap + Burndown) |
| 9 | Status-Workflow | VORHANDEN | StatusBadge mit Dropdown, handleStatusChange |
| 10 | Side Panel | VORHANDEN | SidePanel + SidePanelForm + AttachmentList |
| 11 | Datei-Anhaenge | VORHANDEN | AttachmentList + api/attachments.ts |
| 12 | Zielanpassung | VORHANDEN | BudgetAdjustmentHistory im SidePanel |

**Alle 10 MVP-Features + 2 Bonus-Features (Zielanpassung, Datei-Anhaenge) sind implementiert.**

---

## 5. Naechste Schritte (Top 5 Prioritaeten)

### Prio 1: Backend-Integration
Der gesamte Frontend-State laeuft auf Mock-Daten. `BudgetDataContext` muss auf API-Calls umgestellt werden (TanStack Query). Das Backend (FastAPI) existiert bereits.

### Prio 2: Visual QA Bugs fixen
`docs/visual_qa_report.md` listet 16 Bugs. Die kritischsten:
- BUG-04/05: Sticky-Container auf CashOutPage (FilterBar + SummaryStrip)
- BUG-14: SidePanel ueberdeckt TopBar (z-index + top)
- BUG-15/16: colSpan Summen in DepartmentRow/WorkAreaRow

### Prio 3: Code-Splitting
Bundle ist 1 MB. CashOutPage und ImportPage sollten lazy-loaded werden (`React.lazy` + `Suspense`). Recharts (Charting Library) macht den Grossteil aus.

### Prio 4: Inline-Edit (Phase 2 Feature, AVG 7.0)
Planner-Produktivitaet. Direkte Bearbeitung in der Tabelle statt immer ueber SidePanel.

### Prio 5: Multi-User + Rollen (Phase 2 Feature, AVG 7.0)
Grundvoraussetzung fuer produktiven Mehrbenutzerbetrieb. Backend hat bereits User-Modelle.

---

## 6. Offene Baustellen

- **Peer-Dependency Konflikt:** `@tailwindcss/vite@4.2.1` erwartet `vite@^5.2.0 || ^6 || ^7`, aber `vite@8.0.0` ist installiert. Funktioniert aktuell, aber `npm install` scheitert ohne `--legacy-peer-deps`. Entweder Vite downgraden oder auf naechstes TailwindCSS-Update warten.
- **`xlsx` Vulnerability:** 1 high severity vulnerability im xlsx-Paket. Alternative: `exceljs` oder `sheetjs-ce`.
- **CostBasis-Filter:** Wurde aus FilterState entfernt (war im Linter-Pass). Wenn noetig, kann er fuer CashOutPage wiederhergestellt werden.
- **`style.css` Referenzen:** In `globals.css` gibt es noch einen Kommentar `/* --- Sidebar --- */`. Harmloses Relikt.
