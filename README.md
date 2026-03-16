# NovaDrive CAPEX Budget Tool

<!-- TODO: Screenshot der Costbook-Ansicht einfügen -->

## Was ist das?

CAPEX Budget Management Tool für Fabrikaufbau-Projekte. Ersetzt Excel-basiertes Budget-Tracking mit einer modernen Web-App.

Entwickelt für **NovaDrive Motors** — ein EV-Startup das eine Produktionsstaette aufbaut und ~200 Kostenpositionen über 5 Departments tracken muss. Das Tool löst konkrete Probleme: dynamische Summen bei Filtern, nachvollziehbare Zielanpassungen, und ein Cash-Out Export der nicht 2 Stunden manuelle Arbeit bedeutet.

## Features

- **3-Level Costbook** — Department > Work Area > Cost Items in einer hierarchischen Tabelle
- **Dynamische Filter** mit URL-State (bookmarkbar, teilbar): Department, Phase, Produkt, Status, Cost Basis, Risk Level
- **KPI Summary Strip** — Budget, Committed, Remaining, Delta reagieren live auf Filter
- **Cash-Out Timeline** mit Heatmap-Ansicht und tabellarischer Darstellung
- **Budget Sankey Diagram** — Geldfluss-Visualisierung
- **Budget Burndown + S-Curve** — Fortschritts-Tracking
- **Excel Import/Export** + Finance Template Export + Steering Committee Export
- **Side Panel** für Item-Details (ersetzt Modals)
- **Command Palette** (Cmd+K) — globale Suche über Items, Departments, Aktionen
- **Datei-Anhaenge** — Angebote, Rechnungen, Specs pro Item/Work Area/Department
- **Risk Tracking** — automatische Risikobewertung basierend auf Cost Basis und Status
- **Keyboard Shortcuts** — J/K Navigation, N für neues Item, 1/2/3 für Tabs

## Quick Start

### Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) und Docker Compose

### Setup

```bash
# Repository klonen
git clone <repo-url>
cd budget-tool

# Environment konfigurieren
cp .env.example .env

# Container bauen und starten
make build
make up

# Datenbank initialisieren
make migrate

# (Optional) Testdaten laden
make seed
```

### URLs

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| API Docs | http://localhost:8000/docs |

### Befehle

```bash
make dev          # Start mit Live-Reload (Development Mode)
make up           # Start (Production Mode)
make down         # Alle Services stoppen
make logs         # Logs anzeigen
make migrate      # Datenbank-Migrationen ausführen
make migration msg="add xyz"   # Neue Migration erstellen
make seed         # Datenbank mit Testdaten befüllen
make reset-db     # Datenbank komplett zurücksetzen (Vorsicht!)
```

## Tech Stack

| Schicht        | Technologie                                              |
|----------------|----------------------------------------------------------|
| Frontend       | React 19, TypeScript 5.9, Vite 8, TailwindCSS 4, Recharts 3, TanStack Table 8 |
| Backend        | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Datenbank      | PostgreSQL 16                                            |
| Migrations     | Alembic                                                  |
| Infrastructure | Docker Compose                                           |

## Projekt-Struktur

```
budget-tool/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── api/                 # API Client (axios)
│   │   ├── components/
│   │   │   ├── command/         # CommandPalette
│   │   │   ├── costbook/        # CostbookTable, Rows, StatusBadge, AmountCell
│   │   │   ├── dashboard/       # Legacy — wird entfernt
│   │   │   ├── export/          # ExportMenu
│   │   │   ├── filter/          # FilterChip, FilterDropdown, SearchInput
│   │   │   ├── import/          # ExcelImport
│   │   │   ├── layout/          # AppLayout, TopBar, TabBar
│   │   │   ├── sidepanel/       # SidePanel, SidePanelForm, AttachmentList
│   │   │   ├── summary/         # SummaryStrip, ProgressMicro
│   │   │   └── visualization/   # Sankey, Burndown, SCurve, RiskMatrix
│   │   ├── hooks/               # useFilterState, useFilteredData, useKeyboardShortcuts
│   │   ├── mocks/               # Mock-Daten für Offline-Entwicklung
│   │   ├── pages/               # CostbookPage, CashOutPage, ImportPage
│   │   ├── styles/              # Design Tokens
│   │   └── types/               # TypeScript Interfaces (budget.ts)
│   └── package.json
├── backend/
│   └── app/
│       ├── api/                 # FastAPI Router (departments, cost_items, etc.)
│       ├── models/              # SQLAlchemy Models
│       ├── schemas/             # Pydantic Schemas
│       └── services/            # Business Logic (aggregation, excel_import/export)
├── docs/                        # Architektur, Use Cases, Design Research
├── docker-compose.yml           # Production Setup
├── docker-compose.dev.yml       # Development Overrides (Hot Reload)
└── Makefile                     # Convenience Commands
```

## Entwicklung (ohne Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# PostgreSQL muss lokal laufen oder via Docker:
docker compose up -d db

# Migrationen
alembic upgrade head

# Server starten
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                      # Startet auf http://localhost:5173
```

Der Frontend Dev-Server proxied API-Calls an `http://localhost:8000`.

**Mock-Modus:** In `src/mocks/data.ts` ist `USE_MOCKS = true` gesetzt. Damit läuft das Frontend komplett ohne Backend mit realistischen Testdaten.

## Environment Variables

| Variable        | Default  | Beschreibung                 |
|-----------------|----------|------------------------------|
| `DATABASE_URL`  | siehe .env.example | PostgreSQL Connection String (asyncpg) |
| `BACKEND_PORT`  | `8000`   | Backend Port                 |
| `FRONTEND_PORT` | `5173`   | Frontend Port                |
| `POSTGRES_PORT` | `5432`   | PostgreSQL Port              |
| `DEBUG`         | `true`   | Debug-Modus                  |

## API-Dokumentation

FastAPI generiert automatisch interaktive API-Docs:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

Details zu allen Endpoints: siehe [`docs/API.md`](docs/API.md)

## Architektur

Siehe [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) für High-Level Architektur, Component Hierarchy und Data Flow.
