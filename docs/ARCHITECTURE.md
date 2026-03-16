# Architektur — NovaDrive CAPEX Budget Tool

## High-Level Uebersicht

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Browser (SPA)                                │
│                                                                         │
│  React 19 + TypeScript + TailwindCSS + Recharts                        │
│  URL-basierter Filter-State (useSearchParams)                          │
│                                                                         │
│  Routes:  /           → CostbookPage                                   │
│           /cashout    → CashOutPage                                    │
│           /import     → ImportPage                                     │
└─────────────────────┬───────────────────────────────────────────────────┘
                      │  HTTP / JSON (axios)
                      │  http://localhost:8000/api/v1/*
┌─────────────────────▼───────────────────────────────────────────────────┐
│                        FastAPI Backend                                  │
│                                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │ API      │──▶│ Services     │──▶│ Models       │──▶│ PostgreSQL │  │
│  │ (Router) │   │ (Logik)      │   │ (SQLAlchemy) │   │ 16         │  │
│  └──────────┘   └──────────────┘   └──────────────┘   └────────────┘  │
│                                                                         │
│  Alembic fuer Migrations  │  Pydantic v2 fuer Validation               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Backend Schichten

### 1. API Layer (`app/api/`)

FastAPI Router mit REST-Endpoints. Jede Ressource hat einen eigenen Router:

| Router           | Prefix               | Verantwortung                          |
|------------------|-----------------------|----------------------------------------|
| `facilities`     | `/api/v1/facilities`  | Werke (aktuell: 1 Werk)               |
| `departments`    | `/api/v1/departments` | Abteilungen mit Budget                 |
| `work_areas`     | `/api/v1/work-areas`  | Arbeitsbereiche innerhalb Departments  |
| `cost_items`     | `/api/v1/cost-items`  | Kostenpositionen (Kern-Entitaet)       |
| `summary`        | `/api/v1/summary`     | Aggregierte KPIs und Cash-Out Daten    |
| `import_export`  | `/api/v1/import`      | Excel-Import                           |
| `export`         | `/api/v1/export`      | Standard-, Finance- und SteerCo-Export |
| `attachments`    | `/api/v1/attachments` | Datei-Uploads (Angebote, Specs etc.)   |

Jeder Router nutzt Dependency Injection fuer die DB-Session (`Depends(get_session)`).

### 2. Service Layer (`app/services/`)

Business Logic, getrennt von HTTP-Concerns:

| Service           | Aufgabe                                                   |
|-------------------|-----------------------------------------------------------|
| `aggregation.py`  | Budget-Summen, Department-Summaries, Cash-Out Timeline    |
| `excel_import.py` | Parsen und Importieren von Excel-Dateien                  |
| `excel_export.py` | Standard-Export, Finance-Template, Steering Committee      |
| `file_storage.py` | Datei-Speicherung auf Disk, Validierung, Pfad-Management |

### 3. Model Layer (`app/models/`)

SQLAlchemy 2.0 Mapped Models mit `Mapped[]` Type Annotations:

```
Facility (1)
  └── Department (n)        # budget_total
        └── WorkArea (n)
              └── CostItem (n)   # original_amount, current_amount, status, phase, ...
                    └── Attachment (n)   # file uploads
```

Alle Models nutzen:
- `UUIDPrimaryKeyMixin` — UUID statt Auto-Increment
- `TimestampMixin` — `created_at`, `updated_at`
- Enums definiert in `app/models/enums.py` als Python `str, enum.Enum`

### 4. Schema Layer (`app/schemas/`)

Pydantic v2 Modelle fuer Request/Response Validation:
- `*Create` — POST Body (required fields)
- `*Read` — GET Response (alle Felder + id + timestamps)
- `*Update` — PUT Body (alle Felder optional via `exclude_unset=True`)

---

## Frontend Component Hierarchy

```
App
├── KeyboardShortcutsProvider          # Globale Shortcuts (Cmd+K, J/K, etc.)
├── AppLayout
│   ├── TopBar                         # Logo, KPIStrip, SearchTrigger
│   │   └── KPIStrip                   # Budget | Committed | Remaining | Delta
│   └── TabBar                         # [Costbook] [Cash-Out] [Import]
├── <Routes>
│   ├── CostbookPage (/)
│   │   ├── FilterBar                  # FilterChips + SearchInput + SavedViews
│   │   ├── SummaryStrip               # Gefilterte KPIs
│   │   ├── CostbookTable
│   │   │   ├── DepartmentRow          # Collapsible + ProgressMicro
│   │   │   ├── WorkAreaRow            # Collapsible + Subtotal
│   │   │   ├── CostItemRow            # StatusBadge, AmountCell, RowActions
│   │   │   └── TableFooter            # Grand Total
│   │   └── SidePanel                  # Detail-Ansicht + Edit
│   │       ├── SidePanelForm          # Alle Felder gruppiert
│   │       ├── AttachmentList         # Datei-Anhaenge
│   │       └── DecisionLog            # Aenderungs-Historie
│   ├── CashOutPage (/cashout)
│   │   ├── FilterBar                  # Gleiche Komponente
│   │   └── SummaryStrip
│   └── ImportPage (/import)
│       └── ExcelImport                # DropZone + Preview
├── CommandPalette                     # Cmd+K Overlay
└── DeleteConfirmDialog                # Einziges Modal
```

---

## Data Flow

### Filter → Daten → Darstellung

```
URL Query Params                    React Components
─────────────────                   ────────────────
?dept=1,3&phase=phase_1&q=robot
        │
        ▼
  useFilterState()                  Deserialisiert URL → FilterState
        │
        ▼
  useFilteredData()                 Filtert Mock/API-Daten client-seitig
        │
        ▼
  ┌─────┴──────────────┐
  │                     │
  ▼                     ▼
SummaryStrip         CostbookTable
(aggregierte KPIs)   (gefilterte Zeilen)
```

### FilterState Interface

```typescript
interface FilterState {
  departments: number[];          // Department IDs, leer = alle
  phases: ProjectPhase[];         // z.B. ['phase_1', 'phase_2']
  products: Product[];            // z.B. ['atlas', 'vega']
  statuses: ApprovalStatus[];     // z.B. ['approved', 'open']
  costBases: CostBasis[];         // z.B. ['cost_estimation']
  riskLevels: RiskLevel[];        // z.B. ['high']
  search: string;                 // Freitext
}
```

### URL Parameter Mapping

| FilterState Feld | URL Param | Beispiel                              |
|------------------|-----------|---------------------------------------|
| `departments`    | `dept`    | `?dept=1,3`                           |
| `phases`         | `phase`   | `?phase=phase_1,phase_2`              |
| `products`       | `product` | `?product=atlas`                      |
| `statuses`       | `status`  | `?status=approved,submitted_for_approval` |
| `costBases`      | `basis`   | `?basis=cost_estimation`              |
| `riskLevels`     | `risk`    | `?risk=high,medium`                   |
| `search`         | `q`       | `?q=screw`                            |

Alle Parameter sind optional. Leere/fehlende Parameter = kein Filter (zeige alles).

---

## State Management

Bewusst einfach gehalten — kein Redux, kein Zustand.

| State                | Wo gespeichert                  | Warum                                    |
|----------------------|---------------------------------|------------------------------------------|
| Filter               | URL Query Params (`useSearchParams`) | Bookmarkbar, Back-Button funktioniert |
| Selektiertes Item    | URL Query Param (`?item=5`)     | Deep-Link zu einem Item moeglich         |
| Table Expansion      | React `useState` (lokal)        | Kein Persistence noetig                  |
| Globale Daten        | Mock-Daten / API Calls          | Spaeter: TanStack Query                  |
| Command Palette      | React `useState` (lokal)        | Einfacher Toggle                         |

---

## Datenbank-Schema (vereinfacht)

```
facilities
├── id (UUID, PK)
├── name, location, description
└── created_at, updated_at

departments
├── id (UUID, PK)
├── facility_id (FK → facilities)
├── name
├── budget_total (Decimal 15,2)
└── created_at, updated_at

work_areas
├── id (UUID, PK)
├── department_id (FK → departments)
├── name
└── created_at, updated_at

cost_items
├── id (UUID, PK)
├── work_area_id (FK → work_areas, CASCADE)
├── description (Text)
├── original_amount, current_amount (Decimal 15,2)
├── expected_cash_out (Date, nullable)
├── cost_basis (Enum), cost_driver (Enum)
├── basis_description, assumptions (Text, nullable)
├── approval_status (Enum, default: OPEN)
├── approval_date (Date, nullable)
├── project_phase (Enum), product (Enum)
├── zielanpassung (Decimal, nullable)
├── zielanpassung_reason (Text, nullable)
├── comments (Text, nullable)
└── created_at, updated_at

attachments
├── id (UUID, PK)
├── cost_item_id / work_area_id / department_id (FKs, genau einer gesetzt)
├── filename, original_filename, content_type, file_size
├── storage_path, description
├── attachment_type (Enum: OFFER, INVOICE, SPECIFICATION, PHOTO, OTHER)
└── created_at, updated_at
```

---

## Enums

| Enum              | Werte                                                                                      |
|-------------------|---------------------------------------------------------------------------------------------|
| `ApprovalStatus`  | OPEN, SUBMITTED_FOR_APPROVAL, APPROVED, REJECTED, ON_HOLD, PENDING_SUPPLIER_NEGOTIATION, PENDING_TECHNICAL_CLARIFICATION, OBSOLETE |
| `ProjectPhase`    | PHASE_1, PHASE_2, PHASE_3, PHASE_4                                                        |
| `Product`         | ATLAS, ORION, VEGA, OVERALL                                                                |
| `CostBasis`       | COST_ESTIMATION, INITIAL_SUPPLIER_OFFER, REVISED_SUPPLIER_OFFER, CHANGE_COST               |
| `CostDriver`      | PRODUCT, PROCESS, NEW_REQ_ASSEMBLY, NEW_REQ_TESTING, INITIAL_SETUP                         |
| `AttachmentType`  | OFFER, INVOICE, SPECIFICATION, PHOTO, OTHER                                                 |

Backend verwendet UPPER_CASE, Frontend verwendet lowercase (z.B. `APPROVED` vs. `approved`).

---

## Design-Entscheidungen

1. **Keine Sidebar** — Die Tabelle braucht maximale Breite. Drei Seiten werden ueber den TabBar navigiert. Departments sind ein Filter, keine Navigation.

2. **Filter in URL** — Jede Filteransicht ist ein teilbarer Link. Back-Button funktioniert. Keine Hidden State.

3. **Side Panel statt Modal** — Item-Details oeffnen als Panel rechts, die Tabelle bleibt sichtbar und wird schmaler.

4. **UUID als Primary Key** — Verteilte ID-Generierung, keine Sequential-Leak Information.

5. **Mock-Modus** — Frontend laeuft mit `USE_MOCKS = true` komplett ohne Backend. Erlaubt UI-Entwicklung ohne laufende Infrastruktur.
