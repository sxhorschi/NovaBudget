# UX Research: Budget Dashboard Design Patterns

> Stand: 2026-03-16 | Kontext: CAPEX Budget Tool, ~200 Line Items, 5 Departments, 4 Phasen

---

## 1. Best-in-Class Dashboard Patterns

### 1.1 Stripe: KPI Cards + Progressive Disclosure

Stripe's Dashboard folgt einem klaren Muster:
- **Top-Level KPI Cards** zeigen Kernmetriken auf einen Blick (Total Revenue, Transactions, Avg Order Value, Pending)
- **Progressive Disclosure**: Zusammenfassung oben, Detail-Drill-Down darunter
- **Klare Gruppierung**: Payments, Payouts, Disputes, Customers als separate Bereiche mit eigenen Icons und Farbcodes
- **"Glanceable Zone"**: Alles Wichtige rendert in < 100ms, selbst bei schlechter Verbindung

**Empfehlung für unser Tool:**
- 4 KPI Cards oben: Total Budget, Total Spent, Remaining, Burn Rate
- Darunter: Budget by Phase (horizontaler Balken) + Budget by Department (Donut/Stacked Bar)
- Jede Card ist klickbar und fuehrt zum gefilterten Detail-View

**Referenz:** [Stripe Dashboard Patterns](https://docs.stripe.com/stripe-apps/patterns) | [Dashboard Design Principles (DesignRush)](https://www.designrush.com/agency/ui-ux-design/dashboard/trends/dashboard-design-principles)

### 1.2 Linear: Flat List + Filter + Custom Views

Linear ist die Gold-Referenz für Keyboard-First Data Management:
- **Flat List als Default-View** mit Gruppierung nach Status, Assignee, Project, Priority
- **Mächtige Filter**: Faceted filtering mit AND/OR-Logik, verschachtelte Filtergruppen
- **Custom Views**: Gespeicherte, teilbare Filter-Kombinationen
- **Display Options**: Umschalten zwischen List, Board, Timeline, Split View
- **Keyboard-First**: Arrow Keys navigieren, Enter öffnet, Cmd+K für globale Suche

**Empfehlung für unser Tool:**
- Default View: Flat Table mit Gruppierung nach Department (collapsed)
- Saved Views: "By Phase", "By Department", "Over Budget", "Pending Approval"
- Cmd+K Palette für schnelles Finden von Line Items

**Referenz:** [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) | [Linear Filters](https://linear.app/docs/filters) | [Linear Custom Views](https://linear.app/docs/custom-views)

### 1.3 Notion: Multiple Database Views

Notion's Stärke ist die Flexibilität einer Datenbasis mit vielen Ansichten:
- **Table View**: High-Level Übersicht, gut für Transparenz
- **Board View**: Drag-and-Drop nach Status (Select/Multi-Select Properties)
- **Timeline View**: Visualisiert Projektlaengen mit Start-/End-Datum
- **Gallery View**: Visuelle Karten-Darstellung
- **Prinzip**: Eine Datenbank = Source of Truth, beliebig viele fokussierte Views mit klaren Namen

**Empfehlung für unser Tool:**
- Primaer: Table View (Hauptarbeitsmodus)
- Sekundaer: Board View nach Approval-Status (Draft > Submitted > Approved > Ordered > Delivered)
- Optional: Timeline View für Cash-Out-Planung pro Phase

**Referenz:** [Notion Database Views Guide](https://www.notion.com/help/guides/when-to-use-each-type-of-database-view) | [Views, Filters, Sorts](https://www.notion.com/help/views-filters-and-sorts)

### 1.4 QuickBooks/Xero: Budget vs. Actual

Finance-Tools folgen einem bewährten Muster:
- **Budget Overview Report**: Zusammenfassung nach Account/Kategorie
- **Budget vs. Actuals Report**: Soll/Ist mit Varianz-Anzeige (unter/über Budget)
- **Divisional Budgets**: Tracking nach Klasse, Standort, Business Unit
- **Real-Time Dashboards**: Revenue Streams, Expense Patterns, Cash Flow Dynamics

**Empfehlung für unser Tool:**
- Budget vs. Actual als Kernansicht mit Varianz-Spalte (absolut + prozentual)
- Farbcodierung: Gruen (< 90% verbraucht), Gelb (90-100%), Rot (> 100%)
- Department-Level Rollup mit Drill-Down zu einzelnen Line Items

**Referenz:** [QuickBooks CapEx Budgeting Template](https://coefficient.io/templates/quickbooks-capex-budgeting) | [Fathom Divisional Budgets](https://www.fathomhq.com/blog/divisional-budgets-release)

### 1.5 Figma: Clean Billing/Subscription UI

- Klare Card-basierte Darstellung von Plan/Subscription Details
- Einfache Tabelle für Transaktionshistorie mit Download-Buttons
- Payment-Method Card als eigene Komponente
- Minimalistisch, fokussiert auf Klarheit

---

## 2. Table Design für Hierarchische Daten

### 2.1 Expandable Rows vs. Flat List mit Gruppierung

| Ansatz | Vorteile | Nachteile | Wann nutzen |
|--------|----------|-----------|-------------|
| **Expandable Rows** | Kontext bleibt erhalten, natürliche Hierarchie | Performance bei tiefer Verschachtelung, komplex zu implementieren | Wenn Parent-Child-Beziehung kritisch ist (Department > Category > Item) |
| **Flat List + Gruppierung** | Einfacher zu implementieren, besser filterbar, performanter | Verliert visuelle Hierarchie | Wenn User hauptsaechlich filtert und sucht |
| **Hybrid** | Beste Flexibilität | Komplexere UX | Gruppierung als Default, Expand für Details |

**Empfehlung für unser Tool:**
- **Flat List mit Gruppierung nach Department** als Default (wie Linear)
- Gruppen-Header zeigen: Department Name, Anzahl Items, Subtotal Budget, Subtotal Spent
- Gruppen sind collapsible (Default: expanded)
- Kein tiefes Nesting (max. 1 Ebene: Department > Items)
- Progressive Loading: Wenn eine Gruppe > 20 Items hat, initial 20 zeigen + "Show all X items" Button

**Referenz:** [Pencil & Paper: Enterprise Data Tables](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables) | [Cloudscape: Expandable Rows](https://cloudscape.design/patterns/resource-management/view/table-with-expandable-rows/) | [Designing Nested Tables (Medium)](https://medium.com/design-bootcamp/designing-nested-tables-the-ux-of-showing-complex-data-without-creating-chaos-0b25f8bdd7d9)

### 2.2 Inline Editing vs. Side Panel vs. Modal

| Ansatz | Vorteile | Nachteile | Wann nutzen |
|--------|----------|-----------|-------------|
| **Inline Editing** | Schnell, kein Kontextwechsel, Power-User-freundlich | Validierung komplex, versehentliche Änderungen | Einfache Felder: Betrag, Status, Notiz |
| **Side Panel** | Kontext bleibt sichtbar, Referenz zu anderen Zeilen möglich, skalierbar | Braucht Platz | Detailansicht eines Line Items mit allen Feldern |
| **Modal** | Fokussiert, einfach zu implementieren | Verdeckt Tabelle, kein Vergleich möglich | Destructive Actions (Loeschen), Bulk-Operationen |

**Empfehlung für unser Tool:**
- **Primary: Side Panel** (Drawer von rechts, ~400px breit) für Line Item Details
  - Alle Felder editierbar
  - Historien-Log (wer hat wann was geaendert)
  - Kommentare/Notizen
  - Dokument-Uploads (Angebote, Rechnungen)
- **Secondary: Inline Editing** für Quick-Edits direkt in der Tabelle
  - Double-Click oder Enter auf Zelle aktiviert Edit-Modus
  - Nur für: Betrag, Vendor, Status, kurze Notizen
  - Escape zum Abbrechen, Tab zum naechsten Feld
- **Modal nur für**: Loeschen-Bestaetigung, Bulk-Status-Änderung, Import/Export

**Referenz:** [Eleken: Table Design UX](https://www.eleken.co/blog-posts/table-design-ux) | [Denovers: Enterprise Table UX](https://www.denovers.com/blog/enterprise-table-ux-design) | [PatternFly: Inline Edit](https://www.patternfly.org/components/inline-edit/design-guidelines/)

### 2.3 200+ Zeilen handhabbar machen

**Problem**: 200 Line Items ohne Struktur = endloses Scrollen.

**Lösung (Multi-Layer):**

1. **Gruppierung reduziert visuelle Komplexität**
   - 5 Departments x ~40 Items = 5 Gruppen-Header statt 200 Zeilen
   - Collapsed Groups zeigen nur Subtotals -> User sieht 5 Zeilen statt 200

2. **Virtualisierung (TanStack Virtual)**
   - Rendert nur sichtbare Zeilen im DOM (~20-30 Zeilen)
   - Performance bleibt auch bei 1000+ Zeilen flüssig
   - Bundle Size: ~10KB zusätzlich

3. **Sticky Headers + Frozen Columns**
   - Tabellen-Header bleibt beim Scrollen sichtbar (position: sticky)
   - Erste Spalte (Item Name) bleibt fixiert bei horizontalem Scroll
   - Gruppen-Header bleiben sichtbar wenn Gruppe gescrollt wird

4. **Weder Pagination noch Infinite Scroll**
   - Bei 200 Items ist Pagination störend (staendiges Seitenwechseln)
   - Infinite Scroll suggeriert "unendlich viele Daten" -> falsche Erwartung
   - **Besser: Alles laden, virtualisiert rendern, Gruppierung zum Navigieren nutzen**

5. **Search + Filter als primaere Navigation**
   - Cmd+K reduziert 200 Items sofort auf relevante Ergebnisse
   - Quick-Filters (Department, Phase, Status) in der Toolbar

**Referenz:** [TanStack Virtual](https://tanstack.com/table/latest) | [Virtual Scrolling vs. Pagination (Medium)](https://medium.com/@istvan_77679/lazy-load-pagination-or-virtual-scrolling-which-is-the-best-for-data-grids-67b084172b22)

---

## 3. Filter/Search UX Patterns

### 3.1 Command-K Palette (Global Search)

**Implementierung mit cmdk (React):**
- Oeffnet mit Cmd+K (Mac) / Ctrl+K (Windows)
- Fuzzy-Search über alle Line Items, Departments, Actions
- Keyboard-navigierbar: Arrow Keys + Enter
- Kategorisiert: "Line Items", "Departments", "Actions" (Export, Add Item, etc.)
- Zeigt zuletzt besuchte Items

**Libraries:**
- `cmdk` (headless, von Linear genutzt, ~5KB)
- `kbar` (etwas opinionated, aber schnell)
- shadcn/ui Command Component (basiert auf cmdk)

**Referenz:** [cmdk GitHub](https://github.com/albingroen/react-cmdk) | [shadcn Command](https://www.shadcn.io/ui/command) | [kbar GitHub](https://github.com/timc1/kbar)

### 3.2 Faceted Filters (wie Airtable)

**Aufbau:**
```
[Department v] [Phase v] [Status v] [Budget Range v] [+ Add Filter]
```

- Jeder Filter ist ein Dropdown mit Checkboxen (Multi-Select)
- Aktive Filter zeigen Count-Badge: `Department (2)`
- Filter sind kombinierbar (AND-Logik zwischen Kategorien)
- "Clear all filters" Button wenn Filter aktiv

**Filter-Optionen für unser Tool:**
| Filter | Typ | Optionen |
|--------|-----|----------|
| Department | Multi-Select | Production, R&D, Facility, IT, Admin |
| Phase | Multi-Select | Phase 1, 2, 3, 4 |
| Status | Multi-Select | Draft, Submitted, Approved, Ordered, Delivered |
| Budget Utilization | Range | 0-50%, 50-90%, 90-100%, >100% |
| Vendor | Multi-Select + Search | Dynamisch aus Daten |
| Amount | Range Slider | Min-Max EUR |

**Referenz:** [Eleken: Filter UI Examples](https://www.eleken.co/blog-posts/filter-ux-and-ui-for-saas) | [Pencil & Paper: Filter Patterns](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering) | [Algolia: Search Filter Best Practices](https://www.algolia.com/blog/ux/search-filter-ux-best-practices)

### 3.3 Saved Views / Presets

**Vordefinierte Views (System):**
- "All Items" - Ungefiltert, gruppiert nach Department
- "Over Budget" - Filter: Utilization > 100%
- "Pending Approval" - Filter: Status = Submitted
- "This Phase" - Filter: aktuelle Phase
- "Recent Changes" - Sortiert nach letzter Änderung

**User-Created Views:**
- User kann aktuelle Filter-Kombination als View speichern
- Name + Icon zuweisbar
- Erscheint in der Sidebar unter "My Views"
- Teilbar mit Team-Mitgliedern

### 3.4 Quick Filters vs. Advanced Filter Panel

- **Quick Filters**: Immer sichtbar in der Toolbar (Department, Phase, Status)
- **Advanced Filters**: Ausklappbares Panel für komplexe Abfragen mit AND/OR-Logik
- **Faustregel**: 80% der Nutzer kommen mit Quick Filters aus, 20% brauchen Advanced

---

## 4. Data Visualization für Budgets

### 4.1 Chart-Empfehlungen

| Visualisierung | Use Case | Priorität |
|---------------|----------|------------|
| **Stacked Bar Chart** | Budget vs. Actual pro Department | HIGH - Kernvisualisierung |
| **Waterfall Chart** | Wie sich das Gesamtbudget durch Phasen veraendert | HIGH - Phasen-Übersicht |
| **Horizontal Progress Bars** | Inline in der Tabelle pro Zeile (% genutzt) | HIGH - Sofort sichtbar |
| **Treemap** | Hierarchische Budget-Verteilung (Dept > Category > Item) | MEDIUM - Dashboard |
| **Heatmap** | Cash-Out Timeline (Monat x Department, Farbe = Betrag) | MEDIUM - Cashflow-Planung |
| **Sparklines** | Trend pro Zeile (monatliche Ausgaben) | LOW - Nice-to-have |
| **Donut Chart** | Budget-Verteilung nach Department oder Phase | LOW - Dashboard |

### 4.2 Budget vs. Actual (Kernvisualisierung)

**Grouped/Stacked Bar Chart:**
- X-Achse: Departments (oder Phasen)
- Y-Achse: EUR
- Zwei Balken pro Gruppe: Budget (grau/blau) vs. Actual (farbig)
- Varianz als Label über dem Balken: "+12%" oder "-5%"
- Farbcodierung: Gruen (unter Budget), Rot (über Budget)

**Waterfall Chart für Phasen:**
- Zeigt: Startbudget -> Phase 1 Spent -> Phase 2 Spent -> ... -> Remaining
- Ideal für Management-Praesentationen
- Kumulativer Effekt sofort sichtbar

### 4.3 Inline Progress Bars in der Tabelle

```
Item Name          | Budget    | Spent     | Utilization
CNC Machine        | 250.000   | 230.000   | [=========-] 92%    (gelb)
Laser Cutter       | 180.000   | 120.000   | [======----] 67%    (gruen)
HVAC System        | 95.000    | 102.000   | [==========] 107%   (rot)
```

- Schmaler Balken (4-6px Höhe) direkt in der Utilization-Spalte
- Farbe wechselt bei Schwellenwerten: 0-80% gruen, 80-100% gelb, >100% rot
- Prozent-Zahl rechts neben dem Balken
- PatternFly und Carbon Design System empfehlen: kleine Höhe, keine Labels im Balken

### 4.4 Heatmap für Cash-Out Timeline

```
              Jan   Feb   Mar   Apr   Mai   Jun   Jul   Aug
Production    ███   ██    █     ███   ████  █████ ████  ██
R&D           ██    ██    ███   ██    █     █     ██    ███
Facility      █████ ████  ███   ██    █     █     █     █
IT            █     █     ██    ██    ██    ███   ███   ██
Admin         █     █     █     █     █     █     █     █
```

- Farbintensitaet = Höhe der Ausgaben in dem Monat
- Zeigt Spitzen und Verteilung auf einen Blick
- Hilfreich für Cash-Flow-Planung und Liquiditaetssteuerung

### 4.5 Charting Library Empfehlung

**Recharts** (empfohlen für unser Tool):
- Einfache API, deklarativ, React-native Komponentenstruktur
- Gute Performance für unsere Datenmengen (~200 Items)
- Bar Charts, Treemaps, Sparklines alles verfügbar
- ~40KB Bundle Size
- Grosse Community, viele Beispiele

**Alternative: Nivo** wenn visuelle Qualitaet wichtiger ist:
- Schoenere Default-Styles, eingebautes Theming
- Server-Side Rendering möglich
- SVG + Canvas Rendering
- Etwas steilere Lernkurve

**Referenz:** [Recharts](https://recharts.org) | [Nivo](https://nivo.rocks) | [Finance Alliance: Financial Charts](https://www.financealliance.io/financial-charts-and-graphs/) | [Coupler.io: Financial Data Visualization](https://blog.coupler.io/financial-data-visualization/)

---

## 5. Navigation Patterns

### 5.1 Empfehlung: Collapsible Sidebar + Top Context Bar

**Sidebar (links, 240px, collapsible zu 64px):**
```
[Logo]
--
Dashboard           <- Übersicht mit KPIs + Charts
Budget Table        <- Hauptarbeitsmodus
--
VIEWS
  All Items
  By Phase
  Over Budget
  Pending Approval
  [+ New View]
--
DEPARTMENTS
  Production
  R&D
  Facility
  IT
  Admin
--
[Settings]
[User Avatar]
```

**Top Context Bar:**
```
[Breadcrumb: Dashboard > Budget Table > Production]  [Search: Cmd+K]  [Filters]  [Export]
```

**Begründung:**
- 70% der SaaS-User navigieren primaer über Sidebar
- Sidebar skaliert besser als Top-Navigation (> 5 Items)
- Collapsible spart Platz wenn User im Table arbeitet
- Departments in der Sidebar = 1-Click Filter

### 5.2 Single-Page mit Views (nicht Multi-Page)

**Architektur:**
- SPA mit Client-Side Routing (React Router)
- `/dashboard` - KPI-Übersicht
- `/budget` - Haupt-Table (Default View)
- `/budget?view=over-budget` - Gespeicherte Views als URL-Parameter
- `/budget?dept=production&phase=2` - Filter in URL (shareable, bookmarkable)
- `/budget/:id` - Side Panel öffnet sich (URL aendert sich, Back-Button funktioniert)

**Vorteile gegenüber Multi-Page:**
- Kein Page-Reload bei Filterwechsel
- Smooth Transitions zwischen Views
- State bleibt erhalten (Scroll-Position, offene Gruppen)

### 5.3 Keyboard Navigation

| Shortcut | Aktion |
|----------|--------|
| `Cmd/Ctrl + K` | Command Palette öffnen |
| `j` / `k` oder Arrow Down/Up | Naechste/vorherige Zeile |
| `Enter` | Side Panel für aktive Zeile öffnen |
| `Escape` | Side Panel schliessen / Filter zurücksetzen |
| `e` | Inline-Edit der aktiven Zelle |
| `f` | Filter-Panel öffnen |
| `1-5` | Schnellfilter Department |
| `Cmd/Ctrl + S` | Änderungen speichern |
| `Cmd/Ctrl + E` | Export |
| `?` | Keyboard Shortcuts anzeigen |

**Referenz:** [Merveilleux: SaaS Navigation Types](https://www.merveilleux.design/en/blog/article/comprehensive-guide-for-saas-products-on-ux-navigation-types) | [Pencil & Paper: Navigation UX](https://www.pencilandpaper.io/articles/ux-pattern-analysis-navigation)

---

## 6. Mobile/Responsive Strategy

### 6.1 Responsive Breakpoints

| Breakpoint | Layout | Anpassung |
|-----------|--------|-----------|
| **Desktop** (>1280px) | Full Table + Sidebar + Side Panel | Volle Funktionalitaet |
| **Tablet** (768-1280px) | Table + Collapsed Sidebar, Side Panel als Overlay | Sidebar als Hamburger-Menu |
| **Mobile** (<768px) | Card Layout, kein Table | Komplett anderes Layout |

### 6.2 Mobile: Card Layout statt Table

**Begründung gegen horizontales Scrollen auf Mobile:**
- NN/G Research zeigt: User übersehen Inhalte rechts vom Viewport
- Horizontales Scrollen auf Touch ist unnatürlich in Listen-Kontexten
- Finance-Daten brauchen Kontext -> abgeschnittene Zeilen sind nutzlos

**Card Layout für Mobile:**
```
+-------------------------------+
| CNC Machine           [Draft] |
| Production | Phase 2          |
| Budget: 250.000 EUR          |
| Spent:  230.000 EUR          |
| [=========-] 92%              |
+-------------------------------+
| Laser Cutter       [Approved] |
| R&D | Phase 1                 |
| Budget: 180.000 EUR          |
| Spent:  120.000 EUR          |
| [======----] 67%              |
+-------------------------------+
```

- Jede Card = ein Line Item
- Tap öffnet Detail-View (Full-Screen auf Mobile)
- Swipe-Actions: Quick-Approve, Quick-Edit Status
- Filter als Bottom Sheet (wie iOS Maps)
- Sticky Summary Bar oben: "Total: 2.5M | Spent: 1.8M | 72%"

### 6.3 Tablet: Hybrid-Ansatz

- Table bleibt, aber mit reduzierten Spalten (Name, Budget, Spent, Status)
- Sidebar wird Hamburger-Menu
- Side Panel öffnet als Overlay (volle Höhe, 60% Breite)
- Erste Spalte (Name) bleibt fixiert bei horizontalem Scroll

**Referenz:** [NN/G: Mobile Tables](https://www.nngroup.com/articles/mobile-tables/) | [Medium: Mobile Data Tables](https://medium.com/design-bootcamp/designing-user-friendly-data-tables-for-mobile-devices-c470c82403ad) | [Eleken: Table Design UX](https://www.eleken.co/blog-posts/table-design-ux)

---

## 7. Tech-Stack Empfehlung für die UI

| Bereich | Empfehlung | Begründung |
|---------|-----------|-------------|
| **Table** | TanStack Table + shadcn/ui `<Table>` | Headless, volle Kontrolle, ~15KB, Gruppierung + Virtualisierung eingebaut |
| **Charts** | Recharts | Einfach, deklarativ, React-native, ~40KB |
| **Command Palette** | cmdk + shadcn Command | Battle-tested (Linear nutzt es), ~5KB |
| **Side Panel** | shadcn Sheet/Drawer | Konsistent mit restlichem Design System |
| **Filters** | Custom auf Basis von shadcn Popover + Checkbox | Flexibel, passt sich unserem Datenmodell an |
| **Virtualisierung** | TanStack Virtual | Nahtlose Integration mit TanStack Table |
| **Icons** | Lucide Icons | Default in shadcn, konsistent |

**Referenz:** [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) | [TanStack Table vs AG Grid](https://www.simple-table.com/blog/tanstack-table-vs-ag-grid-comparison)

---

## 8. Zusammenfassung: Konkrete Architektur-Empfehlung

### Page 1: Dashboard (`/dashboard`)
```
+--sidebar--+------------------------------------------+
|            | [KPI] [KPI] [KPI] [KPI]                 |
| Dashboard  |                                          |
| Budget     | [Stacked Bar: Budget vs Actual by Dept]  |
|            |                                          |
| VIEWS      | [Waterfall: Budget durch Phasen]         |
| All Items  |                                          |
| By Phase   | [Heatmap: Cash-Out Timeline]             |
| Over Budget|                                          |
| ...        | [Recent Activity / Änderungen]          |
+------------+------------------------------------------+
```

### Page 2: Budget Table (`/budget`)
```
+--sidebar--+------------------------------------------+-------+
|            | [Filters: Dept | Phase | Status] [Cmd+K] |       |
| Dashboard  |                                          | Side  |
| Budget *   | + Production (12 items)     2.1M | 1.8M | Panel |
|            |   CNC Machine    250K  230K  92% [====]  |       |
| VIEWS      |   Laser Cutter   180K  120K  67% [===]   | Name  |
| All Items  |   ...                                    | Dept  |
| By Phase   |                                          | Amnt  |
| Over Budget| + R&D (8 items)             800K | 650K  | Vendr |
| ...        |   ...                                    | Docs  |
|            |                                          | Hist  |
| DEPARTMENTS| + Facility (15 items)       1.2M | 900K  |       |
| Production |   ...                                    |       |
| R&D        |                                          |       |
| ...        |                                          |       |
+------------+------------------------------------------+-------+
```

### Prioritäten für MVP:
1. **P0**: Table mit Gruppierung + Inline Progress Bars + Side Panel
2. **P0**: Quick Filters (Department, Phase, Status)
3. **P1**: KPI Cards auf Dashboard
4. **P1**: Budget vs. Actual Bar Chart
5. **P1**: Cmd+K Search
6. **P2**: Saved Views
7. **P2**: Heatmap / Waterfall Charts
8. **P2**: Keyboard Navigation (j/k/Enter)
9. **P3**: Mobile Card Layout
10. **P3**: Sparklines pro Zeile
