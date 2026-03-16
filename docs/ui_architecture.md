# UI Architecture -- CAPEX Budget Tool

**Version:** 1.0
**Datum:** 2026-03-16
**Design-Philosophie:** Linear.app meets Stripe. Die Tabelle IST die App. Keine Dashboard-Spielerei.

---

## 1. Page Structure

Drei Seiten. Nicht mehr.

| Route | Seite | Zweck |
|-------|-------|-------|
| `/` | **Costbook** | Die eine Ansicht die alles kann. Tabelle + Filter + KPIs. Default-Landing. |
| `/cashout` | **Cash-Out** | Monatliche Geldabfluss-Heatmap. Gleiche Filtermechanik wie Costbook. |
| `/import` | **Import** | Drag & Drop Excel/CSV. Vorschau. Confirm. Fertig. |

Es gibt **keine** separate Dashboard-Seite. Es gibt **keine** Department-Unterseiten. Das Costbook mit Filtern ersetzt beides. Department ist ein Filter, keine Seite.

---

## 2. Layout System

### Entscheidung: Top Bar only. Keine Sidebar.

Die Sidebar im aktuellen Design listet Departments als Navigation-Items. Das ist falsch. Departments sind Daten, keine Seiten. Eine Sidebar die 5 statische Links zeigt verschwendet 256px horizontalen Platz auf jeder Seite.

```
+------------------------------------------------------------------+
| TopBar: Logo | Facility | KPI Strip | Search (Cmd+K) | Settings  |
+------------------------------------------------------------------+
| TabBar: [Costbook] [Cash-Out] [Import]                           |
+------------------------------------------------------------------+
|                                                                   |
|  FilterBar: [Department v] [Phase v] [Product v] [Status v] [Q]  |
|                                                                   |
|  SummaryStrip: Budget: 9.4M | Committed: 4.8M | Remaining: 4.6M  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  | TABLE                                                       |  |
|  | Department > Work Area > Items (collapsible)                |  |
|  |                                                             |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

### Warum kein Sidebar?

1. Die Tabelle braucht maximale Breite (Amounts, Descriptions, Status -- das sind viele Spalten)
2. Es gibt nur 3 Seiten -- ein Tab-Bar im Header reicht
3. Department-Navigation wird durch den Department-Filter ersetzt
4. Auf 1440px Screens ist jeder Pixel horizontal wertvoll

### Responsive Breakpoints

| Breakpoint | Verhalten |
|-----------|-----------|
| >= 1280px (xl) | Volle Ansicht. TopBar + TabBar + Filter + Table mit allen Spalten. Side Panel rechts (480px). |
| 1024-1279px (lg) | Table Spalten "Cost Basis" und "Cost Driver" werden versteckt. Side Panel wird Overlay. |
| 768-1023px (md) | FilterBar wird 2-zeilig. KPI Strip wird kompakter (nur Budget/Remaining). Table verliert weitere Spalten. |
| < 768px (sm) | Nicht optimiert. Otto sitzt am Schreibtisch, nicht am Handy. Basis-Funktionalität bleibt nutzbar, aber kein dediziertes Mobile-Design. |

---

## 3. Component Hierarchy

```
App
├── CommandPalette                          # Cmd+K overlay, global
├── KeyboardShortcutProvider                # Context for all shortcuts
├── TopBar
│   ├── Logo                               # "TYTAN Budget" + Facility name
│   ├── KPIStrip                           # 4 KPI pills: Budget | Committed | Remaining | Delta
│   ├── SearchTrigger                      # Cmd+K button that opens CommandPalette
│   └── UserMenu                           # Settings, Export, Logout
├── TabBar
│   ├── Tab "Costbook"                     # -> /
│   ├── Tab "Cash-Out"                     # -> /cashout
│   └── Tab "Import"                       # -> /import
├── <Routes>
│   ├── CostbookPage (/)
│   │   ├── FilterBar
│   │   │   ├── FilterChip "Department"    # Multi-select dropdown
│   │   │   ├── FilterChip "Phase"         # Multi-select dropdown
│   │   │   ├── FilterChip "Product"       # Multi-select dropdown
│   │   │   ├── FilterChip "Status"        # Multi-select dropdown
│   │   │   ├── SearchInput               # Inline text search (filters table)
│   │   │   └── FilterReset               # "Clear all" button
│   │   ├── SummaryStrip
│   │   │   ├── KPICard "Budget"           # Total budget for active filters
│   │   │   ├── KPICard "Committed"        # Sum of current_amount
│   │   │   ├── KPICard "Remaining"        # Budget - Committed
│   │   │   ├── KPICard "Delta"            # Original - Current (variance)
│   │   │   └── KPICard "Items"            # Count of filtered items
│   │   ├── CostbookTable
│   │   │   ├── TableHeader               # Sortable column headers
│   │   │   ├── DepartmentGroup (repeated)
│   │   │   │   ├── DepartmentRow          # Collapsible, with inline ProgressBar + subtotal
│   │   │   │   ├── WorkAreaGroup (repeated)
│   │   │   │   │   ├── WorkAreaRow        # Collapsible, with subtotal
│   │   │   │   │   └── CostItemRow (repeated)
│   │   │   │   │       ├── StatusBadge    # Clickable inline status change
│   │   │   │   │       ├── AmountCell     # Formatted EUR + delta indicator
│   │   │   │   │       └── RowActions     # Edit, Delete (appear on hover)
│   │   │   └── TableFooter               # Grand total row
│   │   └── SidePanel (conditional)
│   │       ├── SidePanelHeader            # Item description + close button
│   │       ├── SidePanelForm              # All editable fields
│   │       │   ├── FieldGroup "Amounts"   # original, current, delta
│   │       │   ├── FieldGroup "Classification" # phase, product, cost_basis, cost_driver
│   │       │   ├── FieldGroup "Approval"  # status, date, zielanpassung
│   │       │   └── FieldGroup "Notes"     # assumptions, basis_description, comments
│   │       └── ActivityFeed               # Change history for this item
│   ├── CashOutPage (/cashout)
│   │   ├── FilterBar                      # Same component, same filters
│   │   ├── SummaryStrip                   # Same component, reacts to filters
│   │   ├── CashOutGrid
│   │   │   ├── MonthColumn (repeated)     # One column per month
│   │   │   │   ├── MonthHeader            # "Apr 2026" + total amount
│   │   │   │   └── DepartmentBar          # Stacked bar per department
│   │   │   └── QuarterSummary (repeated)  # Aggregated Q1-Q4 totals
│   │   └── CashOutTable                   # Tabular fallback: rows=departments, cols=months
│   └── ImportPage (/import)
│       ├── DropZone                        # Drag & drop area
│       ├── ImportPreview                   # Parsed data table preview
│       │   ├── ImportMappingBar           # Column mapping controls
│       │   └── ImportPreviewTable         # First 20 rows
│       └── ImportActions                   # "Import" + "Cancel" buttons
└── DeleteConfirmDialog                    # Global modal (the only modal)
```

---

## 4. Hauptansicht: Costbook

### 4.1 FilterBar

Position: Direkt unter dem TabBar, sticky bei Scroll.

**Filter-Chips statt Dropdowns.** Jeder Filter ist ein Button der ein Dropdown öffnet. Aktive Filter zeigen den Wert als Chip mit X zum Entfernen. Wie Linear.app.

| Filter | Typ | Optionen |
|--------|-----|----------|
| Department | Multi-Select | Assembly Equipment, Testing, Logistics, Facility, Prototyping |
| Phase | Multi-Select | Phase 1, Phase 2, Phase 3, Phase 4 |
| Product | Multi-Select | Bryan, Guenther, Gin-Tonic, Overall |
| Status | Multi-Select | Alle 8 Status-Werte |
| Search | Text Input | Freitext-Suche über Description, Assumptions, Comments |

**Wichtig:** Alle Filter sind Multi-Select (nicht Single-Select wie aktuell). Man will "Phase 1 + Phase 2" oder "Approved + Submitted" gleichzeitig sehen.

Filter-State wird in URL Query Params gespeichert: `/?dept=1,3&phase=phase_1,phase_2&status=approved`. Das erlaubt Bookmarks und Link-Sharing.

### 4.2 SummaryStrip

Position: Direkt unter FilterBar, sticky bei Scroll (zusammen mit FilterBar).

Vier KPI-Karten in einer Zeile. Reagieren dynamisch auf Filter.

```
+------------------+------------------+------------------+------------------+
| BUDGET           | COMMITTED        | REMAINING        | DELTA            |
| EUR 9,400,000    | EUR 4,832,000    | EUR 4,568,000    | EUR -432,000     |
| [===========---] | 51.4%            | 48.6%            | -4.6%            |
+------------------+------------------+------------------+------------------+
```

- **Budget:** Summe `budget_total` aller Departments die im Filter aktiv sind
- **Committed:** Summe `current_amount` aller gefilterten Items
- **Remaining:** Budget - Committed
- **Delta:** Summe (original_amount - current_amount) aller gefilterten Items. Rot wenn negativ, gruen wenn positiv.

Jede Karte hat eine subtile Progress Bar darunter (1px Höhe, farbig).

Farblogik für Remaining:
- Gruen: > 20% remaining
- Gelb: 5-20% remaining
- Rot: < 5% remaining

### 4.3 CostbookTable

**Drei-Level Hierarchie:** Department > Work Area > Cost Item.

Wenn kein Department-Filter gesetzt: Gruppierung Department > Work Area > Items.
Wenn ein Department-Filter gesetzt: Gruppierung Work Area > Items (Department-Ebene entfällt).
Wenn Text-Suche aktiv: Flache Liste, keine Gruppierung.

#### Department Row
```
[v] Assembly Equipment                    EUR 2,180,000 / 4,250,000    [======----] 51.3%
```
- Chevron links (expand/collapse)
- Department-Name (bold)
- Committed / Budget rechts
- Inline Progress Bar (200px breit, inline nach den Zahlen)
- Background: `bg-gray-50`, etwas dunkler als Items

#### Work Area Row
```
    [v] Pre-Assembly I (Standplatz)       EUR 633,500        4 items
```
- Eingerückt (padding-left: 24px)
- Subtotal rechts
- Item-Count als Badge
- Background: weiss, aber mit left-border (2px, department-color)

#### Cost Item Row
```
        Screw-driving station with torque control    EUR 192,500    Phase 2    Bryan    [Approved]    2026-06    [edit] [del]
```
- Eingerückt (padding-left: 48px)
- Spalten: Description | Current Amount | Phase | Product | Status | Cash-Out | Actions
- Actions (Edit/Delete) nur sichtbar on hover (opacity transition)
- Klick auf die Zeile öffnet Side Panel
- Amount-Zelle zeigt delta als kleinen Pfeil wenn original != current: `EUR 192,500 (+7,500)`

#### Table Columns (Sortierbar)

| Column | Width | Sortierbar | Inhalt |
|--------|-------|-----------|--------|
| Description | flex (min 300px) | Ja | Item description, truncated with ellipsis |
| Amount | 140px | Ja | current_amount, EUR formatted. Delta als Suffix wenn != original. |
| Phase | 90px | Ja | Phase badge |
| Product | 100px | Ja | Product name |
| Status | 130px | Ja | Clickable StatusBadge mit inline Dropdown |
| Cash-Out | 90px | Ja | YYYY-MM format |
| Actions | 70px | Nein | Edit + Delete icons, hover-only |

#### Table Footer
```
TOTAL (32 items)                                    EUR 4,832,000
```
Grand total der aktuell sichtbaren (gefilterten) Items.

### 4.4 Quick Actions pro Row

- **Klick auf StatusBadge:** Inline-Dropdown zum Status aendern (besteht bereits)
- **Klick auf Amount:** Inline-Edit (Zelle wird zu Input, Enter speichert, Esc verwirft)
- **Klick auf Cash-Out:** Inline Month Picker
- **Hover -> Edit Icon:** Oeffnet Side Panel im Edit-Mode
- **Hover -> Delete Icon:** Oeffnet DeleteConfirmDialog

---

## 5. Side Panel

**Position:** Rechts, 480px breit, slides in von rechts. Der Table-Bereich wird schmaler (nicht überlappt).

**Oeffnet bei:** Klick auf eine CostItem-Zeile (nicht auf Status-Badge oder Actions).

**Schliesst bei:** Esc, Klick auf X, Klick ausserhalb.

### 5.1 Side Panel Layout

```
+----------------------------------------------+
| [X]  Screw-driving station with torque ctrl  |
|      Pre-Assembly I > Assembly Equipment      |
+----------------------------------------------+
|                                               |
| AMOUNTS                                       |
| Original:    EUR 185,000                      |
| Current:     [EUR 192,500        ]  (edit)    |
| Delta:       +EUR 7,500  (+4.1%)              |
|                                               |
| CLASSIFICATION                                |
| Phase:       [Phase 2          v]             |
| Product:     [Bryan            v]             |
| Cost Basis:  [Initial Supplier Offer   v]     |
| Cost Driver: [Product          v]             |
|                                               |
| APPROVAL                                      |
| Status:      [Approved         v]             |
| Approved:    2026-01-15                       |
| Zielanp.:    [x] Additional feeder needed...  |
|                                               |
| DETAILS                                       |
| Basis:       Offer from Atlas Copco           |
| Assumptions: Includes 2 spindles              |
| Comments:    [                          ]     |
|              [                          ]     |
|                                               |
| Cash-Out:    [2026-06          v]             |
|                                               |
+----------------------------------------------+
| ACTIVITY                                      |
| Mar 1  Status changed to "Approved"           |
| Feb 10 Amount updated: 185k -> 192.5k         |
| Nov 1  Item created                           |
+----------------------------------------------+
|                       [Save]  [Cancel]        |
+----------------------------------------------+
```

### 5.2 Edit-Verhalten

- Alle Felder sind sofort editierbar (kein separater "Edit Mode" Toggle)
- Dropdowns für Enums (Phase, Product, Status, Cost Basis, Cost Driver)
- Text inputs für Freitext (Comments, Assumptions, Basis Description)
- Number input für Current Amount
- Month Picker für Cash-Out
- Checkbox + Text für Zielanpassung
- Save/Cancel Buttons am unteren Rand (sticky)
- Save ist `Cmd+Enter`

### 5.3 Activity Feed

Chronologische Liste aller Änderungen an diesem Item. Zeigt:
- Datum
- Was geaendert wurde (Feld + alter Wert -> neuer Wert)
- Wer (wenn Multi-User implementiert)

Im MVP: Basierend auf `created_at` und `updated_at`. Später: Vollständiger Audit Log.

---

## 6. Cash-Out View

Route: `/cashout`

Teilt sich FilterBar und SummaryStrip mit dem Costbook (gleiche Komponenten, gleicher State via URL params).

### 6.1 Layout

```
+------------------------------------------------------------------+
| FilterBar (gleich wie Costbook)                                   |
| SummaryStrip (gleich wie Costbook)                                |
+------------------------------------------------------------------+
| VIEW TOGGLE: [Heatmap] [Table]                                   |
+------------------------------------------------------------------+
|                                                                   |
| Heatmap View:                                                     |
| +------+------+------+------+------+------+------+------+------+ |
| |Jan 26|Feb 26|Mar 26|Apr 26|May 26|Jun 26|Jul 26|Aug 26|Sep 26| |
| | 185k | 220k | 310k | 475k | 620k | 890k | 780k | 950k |1.12M| |
| |      |      |  ##  |  ##  | ###  | #### | ###  | #### | #####| |
| +------+------+------+------+------+------+------+------+------+ |
|                                                                   |
| Table View:                                                       |
| Dept          | Apr  | May  | Jun  | Jul  | Aug  | Sep  | Total  |
| Assembly Eq.  | 82k  | 225k | 255k | 233k | 225k | 345k | 1.36M |
| Testing       |  -   |  54k | 165k | 256k | 165k | 435k |  915k |
| ...           |      |      |      |      |      |      |        |
| TOTAL         | 475k | 620k | 890k | 780k | 950k |1.12M | 4.83M |
+------------------------------------------------------------------+
```

### 6.2 Heatmap

- Ein Block pro Monat (Jan 2026 - Dec 2026, erweiterbar)
- Blockhoehe oder Farbintensitaet proportional zum Betrag
- Farbe: Blau-Gradient (hell = wenig, dunkel = viel)
- Hover: Tooltip mit Breakdown nach Department
- Klick: Filtert Costbook auf diesen Monat (navigiert zu `/?cashout=2026-06`)

### 6.3 Tabelle

- Rows = Departments
- Columns = Monate
- Cells = Summe current_amount aller Items mit expected_cash_out in diesem Monat
- Letzte Spalte: Row-Total
- Letzte Zeile: Column-Total
- Cells farbcodiert: Heatmap-Style (heller Hintergrund für niedrige Werte, dunkler für hohe)

---

## 7. Import View

Route: `/import`

Minimale Seite. Kein Filter, kein Summary. Nur der Import-Flow.

### 7.1 Flow

```
Step 1: Upload
+------------------------------------------+
|                                          |
|   +----------------------------------+   |
|   |                                  |   |
|   |  Drag & Drop your Excel/CSV      |   |
|   |  or click to browse              |   |
|   |                                  |   |
|   |  Supported: .xlsx, .csv          |   |
|   +----------------------------------+   |
|                                          |
+------------------------------------------+

Step 2: Preview & Mapping
+------------------------------------------+
| File: 260217_CostbookInd_3k.xlsx         |
| Sheets detected: 5                       |
|                                          |
| Column Mapping:                          |
| [Description v] [Amount v] [Phase v] ... |
|                                          |
| Preview (first 20 rows):                 |
| +--------------------------------------+ |
| | Description    | Amount  | Phase     | |
| | Screw-driving  | 192,500 | Phase 2   | |
| | Press-fit unit | 134,000 | Phase 2   | |
| | ...            |         |           | |
| +--------------------------------------+ |
|                                          |
| 32 items found. 0 errors.               |
|                                          |
|              [Cancel]  [Import 32 items] |
+------------------------------------------+

Step 3: Result
+------------------------------------------+
| Import complete!                         |
| 32 items imported across 5 departments.  |
|                                          |
| [View in Costbook ->]                    |
+------------------------------------------+
```

---

## 8. Keyboard Shortcuts

Implementiert via `KeyboardShortcutProvider` (React Context + useEffect auf keydown).

| Shortcut | Aktion | Kontext |
|----------|--------|---------|
| `Cmd+K` / `Ctrl+K` | Command Palette öffnen | Global |
| `N` | Neues Item erstellen (öffnet Side Panel mit leerem Form) | Costbook, kein Input fokussiert |
| `J` | Naechste Zeile selektieren | Costbook |
| `K` | Vorherige Zeile selektieren | Costbook |
| `Enter` | Side Panel für selektierte Zeile öffnen | Costbook, Zeile selektiert |
| `Esc` | Side Panel schliessen / Command Palette schliessen / Filter-Dropdown schliessen | Global |
| `Cmd+Enter` | Save im Side Panel | Side Panel offen |
| `Cmd+E` | Export (aktueller View mit Filtern) | Global |
| `F` | FilterBar fokussieren | Costbook, kein Input fokussiert |
| `1` | Tab Costbook | Kein Input fokussiert |
| `2` | Tab Cash-Out | Kein Input fokussiert |
| `3` | Tab Import | Kein Input fokussiert |

### Command Palette (Cmd+K)

Sucht über:
- Cost Items (Description, Assumptions)
- Departments
- Work Areas
- Aktionen ("New item", "Export", "Import", "Filter by Phase 1")

Ergebnis-Typen:
- **Item:** Navigiert zu Costbook + öffnet Side Panel für das Item
- **Department/Work Area:** Setzt Filter
- **Aktion:** Führt Aktion aus

---

## 9. Component-Liste

### Layout Components

#### `TopBar`
- **Props:** keine (liest Facility + Budget aus Context/Store)
- **Beschreibung:** Horizontaler Header. Zeigt Logo, Facility-Name, globale KPIs, Search-Trigger, User-Menu.
- **Kinder:** `Logo`, `KPIStrip`, `SearchTrigger`, `UserMenu`

#### `TabBar`
- **Props:** keine (liest aktive Route aus React Router)
- **Beschreibung:** Horizontale Tab-Leiste unter TopBar. Drei Tabs: Costbook, Cash-Out, Import. Aktiver Tab ist visuell hervorgehoben.
- **Kinder:** `Tab` (x3)

#### `Tab`
- **Props:** `{ label: string; to: string; icon: LucideIcon }`
- **Beschreibung:** Einzelner Tab-Link. NavLink-Wrapper mit aktiv-Styling.
- **Kinder:** keine

### KPI Components

#### `KPIStrip`
- **Props:** `{ budget: number; committed: number; remaining: number; delta: number; itemCount?: number }`
- **Beschreibung:** Horizontale Reihe von 4-5 KPI-Karten. Wird sowohl in TopBar (globale KPIs) als auch im SummaryStrip (gefilterte KPIs) verwendet.
- **Kinder:** `KPICard` (x4-5)

#### `KPICard`
- **Props:** `{ label: string; value: number; format: 'currency' | 'percent' | 'number'; trend?: 'up' | 'down' | 'neutral'; color?: 'green' | 'yellow' | 'red' | 'default' }`
- **Beschreibung:** Einzelne KPI-Anzeige. Zahl gross, Label klein. Optionaler farbiger Indikator. Schmale Progress Bar am unteren Rand.
- **Kinder:** `ProgressMicro`

#### `ProgressMicro`
- **Props:** `{ value: number; max: number; color: 'green' | 'yellow' | 'red' }`
- **Beschreibung:** 2px hoher Progress Bar. Wird in KPICard und in Department/WorkArea Rows verwendet.
- **Kinder:** keine

### Filter Components

#### `FilterBar`
- **Props:** `{ filters: FilterState; onChange: (filters: FilterState) => void; onReset: () => void }`
- **Beschreibung:** Horizontale Leiste mit Filter-Chips und Text-Suche. Sticky beim Scrollen. Wird auf Costbook und Cash-Out Seite wiederverwendet.
- **Kinder:** `FilterChip` (x4), `SearchInput`, `FilterReset`

```typescript
interface FilterState {
  departments: number[];        // Department IDs, empty = all
  phases: ProjectPhase[];       // empty = all
  products: Product[];          // empty = all
  statuses: ApprovalStatus[];   // empty = all
  search: string;               // freetext
}
```

#### `FilterChip`
- **Props:** `{ label: string; options: { value: string; label: string }[]; selected: string[]; onChange: (selected: string[]) => void }`
- **Beschreibung:** Button der ein Multi-Select Dropdown öffnet. Zeigt Anzahl selektierter Werte als Badge. Aktive Filter haben farbigen Hintergrund.
- **Kinder:** `FilterDropdown`

#### `FilterDropdown`
- **Props:** `{ options: { value: string; label: string }[]; selected: string[]; onChange: (selected: string[]) => void; onClose: () => void }`
- **Beschreibung:** Popover mit Checkbox-Liste. Suche innerhalb der Optionen. "Select All" / "Clear" Buttons.
- **Kinder:** keine

#### `SearchInput`
- **Props:** `{ value: string; onChange: (v: string) => void; placeholder?: string }`
- **Beschreibung:** Text Input mit Lupe-Icon. Debounced (300ms). Shortcut-Hinweis "Cmd+K" als Suffix.
- **Kinder:** keine

#### `FilterReset`
- **Props:** `{ hasActiveFilters: boolean; onReset: () => void }`
- **Beschreibung:** "Clear all" Button. Nur sichtbar wenn mindestens ein Filter aktiv.
- **Kinder:** keine

### Costbook Table Components

#### `SummaryStrip`
- **Props:** `{ filters: FilterState; departments: Department[]; workAreas: WorkArea[] }`
- **Beschreibung:** Berechnet Budget/Committed/Remaining/Delta basierend auf aktiven Filtern. Zeigt 4 KPICards in einer Zeile. Sticky unter FilterBar.
- **Kinder:** `KPIStrip`

#### `CostbookTable`
- **Props:** `{ workAreas: WorkArea[]; departments: Department[]; filters: FilterState; onSelectItem: (item: CostItem) => void; selectedItemId: number | null }`
- **Beschreibung:** Die Haupt-Tabelle. Drei-Ebenen Gruppierung (Department > Work Area > Item). Sortierbar. Collapsible Groups. Zeile hervorheben wenn selektiert.
- **Kinder:** `TableHeader`, `DepartmentGroup[]`, `TableFooter`

#### `TableHeader`
- **Props:** `{ columns: ColumnDef[]; sorting: SortingState; onSortingChange: (sorting: SortingState) => void }`
- **Beschreibung:** Sticky Table Header. Klick auf Spalte toggled Sortierung. Pfeil-Icons zeigen Sortierrichtung.
- **Kinder:** keine

#### `DepartmentGroup`
- **Props:** `{ department: Department; workAreas: WorkArea[]; expanded: boolean; onToggle: () => void; onSelectItem: (item: CostItem) => void; selectedItemId: number | null }`
- **Beschreibung:** Collapsible Department-Zeile mit Subtotal und Progress Bar. Enthaelt WorkAreaGroups.
- **Kinder:** `DepartmentRow`, `WorkAreaGroup[]`

#### `DepartmentRow`
- **Props:** `{ name: string; committed: number; budget: number; itemCount: number; expanded: boolean; onToggle: () => void }`
- **Beschreibung:** Einzelne Department-Header-Zeile. Zeigt Name, Committed/Budget, Inline ProgressMicro, Item-Count.
- **Kinder:** `ProgressMicro`

#### `WorkAreaGroup`
- **Props:** `{ workArea: WorkArea; expanded: boolean; onToggle: () => void; onSelectItem: (item: CostItem) => void; selectedItemId: number | null }`
- **Beschreibung:** Collapsible Work Area-Zeile mit Subtotal. Enthaelt CostItemRows.
- **Kinder:** `WorkAreaRow`, `CostItemRow[]`

#### `WorkAreaRow`
- **Props:** `{ name: string; total: number; itemCount: number; expanded: boolean; onToggle: () => void }`
- **Beschreibung:** Work Area-Header-Zeile. Eingerückt. Subtotal und Item-Count rechts.
- **Kinder:** keine

#### `CostItemRow`
- **Props:** `{ item: CostItem; selected: boolean; onClick: () => void; onStatusChange: (newStatus: ApprovalStatus) => void; onQuickEdit: (field: string, value: any) => void }`
- **Beschreibung:** Einzelne Kostenposition. Eingerückt. Zeigt Description, Amount (mit Delta), Phase, Product, Status, Cash-Out. Actions on hover. Hervorgehoben wenn selected.
- **Kinder:** `AmountCell`, `StatusBadge`, `RowActions`

#### `AmountCell`
- **Props:** `{ original: number; current: number }`
- **Beschreibung:** Zeigt current_amount formatiert. Wenn original != current: kleiner Delta-Text in grau (+7,500 oder -3,000). Rot wenn current > original.
- **Kinder:** keine

#### `StatusBadge`
- **Props:** `{ status: ApprovalStatus; onChange?: (newStatus: ApprovalStatus) => void }`
- **Beschreibung:** Farbiger Pill-Badge. Klick öffnet Inline-Dropdown mit allen Status-Optionen. Besteht bereits, wird wiederverwendet.
- **Kinder:** keine

#### `RowActions`
- **Props:** `{ onEdit: () => void; onDelete: () => void }`
- **Beschreibung:** Edit + Delete Icons. Nur sichtbar on hover (parent row). Opacity-Transition.
- **Kinder:** keine

#### `TableFooter`
- **Props:** `{ totalAmount: number; itemCount: number }`
- **Beschreibung:** Grand-Total Zeile am Ende der Tabelle. Sticky am unteren Rand.
- **Kinder:** keine

### Side Panel Components

#### `SidePanel`
- **Props:** `{ item: CostItem | null; workArea: WorkArea; department: Department; onSave: (data: Partial<CostItem>) => void; onClose: () => void; onDelete: (item: CostItem) => void }`
- **Beschreibung:** Rechtes Panel, 480px breit. Slide-in Animation. Zeigt alle Details eines Cost Items. Formular zum Editieren. Activity Feed unten. Schliesst mit Esc.
- **Kinder:** `SidePanelHeader`, `SidePanelForm`, `ActivityFeed`, `SidePanelActions`

#### `SidePanelHeader`
- **Props:** `{ description: string; workAreaName: string; departmentName: string; onClose: () => void }`
- **Beschreibung:** Titel (Item Description), Breadcrumb (Department > Work Area), Close-Button.
- **Kinder:** keine

#### `SidePanelForm`
- **Props:** `{ item: CostItem; onChange: (field: string, value: any) => void }`
- **Beschreibung:** Formular mit allen editierbaren Feldern, gruppiert in Sections. Dropdowns für Enums, Inputs für Text/Number.
- **Kinder:** `FieldGroup[]`

#### `FieldGroup`
- **Props:** `{ label: string; children: ReactNode }`
- **Beschreibung:** Visuelle Gruppierung von Formular-Feldern mit Section-Header.
- **Kinder:** beliebige Form-Elemente

#### `ActivityFeed`
- **Props:** `{ itemId: number; entries: ActivityEntry[] }`
- **Beschreibung:** Chronologische Liste von Änderungen. Zeigt Datum, Feld, alter Wert, neuer Wert. Neueste oben.
- **Kinder:** `ActivityEntry[]`

#### `SidePanelActions`
- **Props:** `{ onSave: () => void; onCancel: () => void; onDelete: () => void; hasChanges: boolean }`
- **Beschreibung:** Sticky Footer im Side Panel. Save (primary, Cmd+Enter), Cancel, Delete (danger). Save ist disabled wenn keine Änderungen.
- **Kinder:** keine

### Cash-Out Components

#### `CashOutGrid`
- **Props:** `{ data: CashOutMonth[]; departments: Department[]; onMonthClick: (month: string) => void }`
- **Beschreibung:** Visuelles Heatmap/Bar-Grid. Ein Block pro Monat. Höhe proportional zum Betrag. Farbcodiert nach Intensität.
- **Kinder:** `MonthBlock[]`

```typescript
interface CashOutMonth {
  month: string;          // "2026-04"
  total: number;
  byDepartment: { departmentId: number; amount: number }[];
}
```

#### `MonthBlock`
- **Props:** `{ month: string; total: number; breakdown: { name: string; amount: number; color: string }[]; onClick: () => void }`
- **Beschreibung:** Einzelner Monatsblock im Grid. Stacked Bars für Departments. Tooltip on hover mit Breakdown.
- **Kinder:** keine

#### `CashOutTable`
- **Props:** `{ data: CashOutMonth[]; departments: Department[] }`
- **Beschreibung:** Tabellarische Cash-Out Ansicht. Rows = Departments, Columns = Monate. Cell-Hintergrund als Heatmap. Totals in letzter Zeile/Spalte.
- **Kinder:** keine

### Import Components

#### `DropZone`
- **Props:** `{ onFile: (file: File) => void; accept: string[] }`
- **Beschreibung:** Drag & Drop Area. Akzeptiert .xlsx und .csv. Visuelles Feedback bei Drag-Over. Click-to-Browse Fallback.
- **Kinder:** keine

#### `ImportPreview`
- **Props:** `{ data: ParsedImportData; onMappingChange: (mapping: ColumnMapping) => void; onConfirm: () => void; onCancel: () => void }`
- **Beschreibung:** Zeigt geparste Daten als Tabelle. Column-Mapping Dropdowns oben. Fehler-Markierung für ungültige Zeilen. Item-Count und Error-Count.
- **Kinder:** `ImportMappingBar`, `ImportPreviewTable`, `ImportActions`

### Global Components

#### `CommandPalette`
- **Props:** `{ open: boolean; onClose: () => void }`
- **Beschreibung:** Cmd+K Overlay. Zentriertes Modal mit Suchfeld. Ergebnisse gruppiert nach Typ (Items, Departments, Actions). Keyboard-Navigation (Arrow Up/Down, Enter).
- **Kinder:** keine

#### `KeyboardShortcutProvider`
- **Props:** `{ children: ReactNode }`
- **Beschreibung:** React Context Provider. Registriert globale Keydown-Handler. Deaktiviert Shortcuts wenn ein Input fokussiert ist. Stellt `useShortcut(key, handler)` Hook bereit.
- **Kinder:** beliebig

#### `DeleteConfirmDialog`
- **Props:** `{ itemDescription: string; onConfirm: () => void; onClose: () => void }`
- **Beschreibung:** Das einzige Modal in der App. Bestätigung vor dem Löschen. Besteht bereits, wird beibehalten.
- **Kinder:** keine

---

## 10. State Management

Kein Redux. Kein Zustand. Einfaches React mit URL-State und Context.

### Filter State
- **Gespeichert in:** URL Query Parameters (`useSearchParams`)
- **Warum:** Bookmarkable, shareable, browser-back funktioniert
- **Beispiel:** `/?dept=1,3&phase=phase_1&status=approved,submitted_for_approval&q=robot`

### Selected Item State
- **Gespeichert in:** URL Query Parameter (`?item=5`)
- **Warum:** Deep-Link zu einem spezifischen Item moeglich

### Table Expansion State
- **Gespeichert in:** React useState (lokal)
- **Default:** Alle Departments expanded, alle Work Areas expanded

### Data
- **Gespeichert in:** React Context (`BudgetDataProvider`)
- **Warum:** Wird von Costbook, Cash-Out und SummaryStrip geteilt
- **Später:** React Query / TanStack Query für Server-State

---

## 11. Was wird gelöscht

Folgende bestehende Komponenten/Seiten werden entfernt oder ersetzt:

| Bestehend | Aktion | Ersetzt durch |
|-----------|--------|---------------|
| `Sidebar` | **Entfernen** | `TopBar` + `TabBar` |
| `AppShell` (Sidebar-Layout) | **Umbauen** | Neues Layout ohne Sidebar |
| `Dashboard` Page | **Entfernen** | `CostbookPage` ist die Startseite |
| `DepartmentView` Page | **Entfernen** | `CostbookPage` mit Department-Filter |
| `BudgetOverview` Component | **Entfernen** | `SummaryStrip` / `KPIStrip` |
| `DepartmentBreakdown` Component | **Entfernen** | Department-Gruppierung in `CostbookTable` |
| `CashOutTimeline` Component | **Entfernen** | `CashOutGrid` / `CashOutTable` |
| `ApprovalStatusWidget` Component | **Entfernen** | Status-Filter in `FilterBar` |
| `CostItemDialog` (Modal) | **Entfernen** | `SidePanel` |
| `FilterBar` (aktuell) | **Umbauen** | Neue `FilterBar` mit Multi-Select Chips |
| `CostBookTable` (aktuell) | **Umbauen** | Neue `CostbookTable` mit 3-Level Hierarchie |
| `StatusBadge` | **Beibehalten** | Wird wiederverwendet |
| `DeleteConfirmDialog` | **Beibehalten** | Wird wiederverwendet |

---

## 12. Implementierungs-Reihenfolge

1. **TopBar + TabBar + neues Layout** (AppShell umbauen)
2. **FilterBar mit Multi-Select Chips** + URL-State
3. **CostbookTable mit 3-Level Hierarchie** (Department > Work Area > Item)
4. **SummaryStrip** (reagiert auf Filter)
5. **SidePanel** (ersetzt CostItemDialog)
6. **Keyboard Shortcuts** (Cmd+K, J/K Navigation)
7. **CashOutPage** (Heatmap + Table)
8. **Command Palette**
9. **Import Page** (bereits vorhanden, überarbeiten)

Jeder Schritt ist einzeln deploybar und testbar.
