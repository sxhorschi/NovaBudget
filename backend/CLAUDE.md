# Backend — Hinweise fuer Claude Code

## Ueberblick

Python 3.12, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL 16. Alle Routen unter `/api/v1/`.

## Projekt-Struktur

```
backend/
├── app/
│   ├── main.py              # FastAPI App, Router Registration, Lifespan
│   ├── config.py            # Pydantic Settings (DATABASE_URL etc.)
│   ├── db.py                # Engine, Session Factory, get_session Dependency
│   ├── api/                 # Router (ein File pro Ressource)
│   │   ├── facilities.py
│   │   ├── departments.py
│   │   ├── work_areas.py
│   │   ├── cost_items.py
│   │   ├── summary.py
│   │   ├── export.py
│   │   ├── import_export.py
│   │   └── attachments.py
│   ├── models/              # SQLAlchemy 2.0 Mapped Models
│   │   ├── base.py          # Base, UUIDPrimaryKeyMixin, TimestampMixin
│   │   ├── enums.py         # Alle Enums + SAEnum Column Types
│   │   ├── facility.py
│   │   ├── department.py
│   │   ├── work_area.py
│   │   ├── cost_item.py
│   │   └── attachment.py
│   ├── schemas/             # Pydantic v2 Request/Response Modelle
│   │   ├── facility.py
│   │   ├── department.py
│   │   ├── work_area.py
│   │   ├── cost_item.py
│   │   ├── summary.py
│   │   └── attachment.py
│   └── services/            # Business Logic
│       ├── aggregation.py   # Budget Summaries, Cash-Out Timeline
│       ├── excel_import.py  # Excel Parsing und Import
│       ├── excel_export.py  # Standard/Finance/SteerCo Export
│       └── file_storage.py  # Attachment File Handling
├── alembic/                 # Migrationen
├── alembic.ini
├── requirements.txt
├── pyproject.toml
└── Dockerfile
```

## SQLAlchemy 2.0 Patterns

### Model Definition

Alle Models verwenden **SQLAlchemy 2.0 Mapped Columns** mit Type Annotations:

```python
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

class Department(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(Text, nullable=False)
    budget_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

    # Relationship
    work_areas: Mapped[list["WorkArea"]] = relationship(back_populates="department")
```

**Wichtig:**
- Immer `Mapped[T]` + `mapped_column()` verwenden, nicht das alte `Column()` Pattern.
- `UUIDPrimaryKeyMixin` gibt automatisch `id: UUID` als Primary Key.
- `TimestampMixin` gibt automatisch `created_at` und `updated_at`.
- ForeignKeys mit `PG_UUID(as_uuid=True)` fuer PostgreSQL UUID Type.

### Async Session

Alle DB-Operationen sind async:

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def get_items(session: AsyncSession):
    stmt = select(CostItem).where(CostItem.approval_status == ApprovalStatus.APPROVED)
    result = await session.execute(stmt)
    return result.scalars().all()
```

**Keine synchronen Calls** (`session.query(...)` etc.) — nur `select()` + `await session.execute()`.

### Eager Loading

Fuer verschachtelte Daten `selectinload` oder `joinedload` verwenden:

```python
from sqlalchemy.orm import selectinload

stmt = (
    select(Department)
    .options(selectinload(Department.work_areas))
)
```

## Pydantic v2 Schemas

### Konventionen

- `*Create` — POST Body. Alle Pflichtfelder required, optionale mit Default.
- `*Read` — GET Response. Alle Felder + `id` + `created_at` + `updated_at`. Immer `model_config = ConfigDict(from_attributes=True)`.
- `*Update` — PUT Body. Alle Felder optional. Server nutzt `data.model_dump(exclude_unset=True)` fuer Partial Updates.

```python
from pydantic import BaseModel, ConfigDict

class CostItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    current_amount: Decimal
    # ... alle Felder
    created_at: datetime
    updated_at: datetime
```

### Enum-Handling

Backend Enums sind `str, enum.Enum` mit UPPER_CASE Werten:

```python
class ApprovalStatus(str, enum.Enum):
    OPEN = "OPEN"
    APPROVED = "APPROVED"
    # ...
```

Pydantic serialisiert/deserialisiert diese automatisch als Strings.

## Alembic Migrationen

```bash
# Neue Migration erstellen (autogenerate aus Model-Aenderungen)
make migration msg="add attachments table"

# Migrationen ausfuehren
make migrate

# Oder direkt:
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
```

**Workflow bei Model-Aenderungen:**
1. Model in `app/models/` aendern
2. Model in `app/models/__init__.py` importieren (falls neu)
3. `make migration msg="..."` ausfuehren
4. Generierte Migration in `alembic/versions/` pruefen
5. `make migrate` ausfuehren

## Neuen Endpoint anlegen

### 1. Model (falls neue Entitaet)

```python
# app/models/new_entity.py
class NewEntity(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "new_entities"
    # ... Felder
```

In `app/models/__init__.py` importieren.

### 2. Schema

```python
# app/schemas/new_entity.py
class NewEntityCreate(BaseModel):
    # ... Pflichtfelder

class NewEntityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    # ... alle Felder
    created_at: datetime
    updated_at: datetime
```

### 3. Router

```python
# app/api/new_entity.py
from fastapi import APIRouter, Depends
from app.db import get_session

router = APIRouter(prefix="/api/v1/new-entities", tags=["new-entities"])

@router.get("/", response_model=list[NewEntityRead])
async def list_entities(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(NewEntity))
    return result.scalars().all()
```

### 4. Router registrieren

In `app/main.py`:
```python
from app.api.new_entity import router as new_entity_router
app.include_router(new_entity_router)
```

### 5. Migration

```bash
make migration msg="add new_entities table"
make migrate
```

## Enum-Konventionen

- **Datei:** `app/models/enums.py` — zentral fuer alle Enums.
- **Naming:** UPPER_CASE Werte, PascalCase Klassennamen.
- **SQLAlchemy Type:** Fuer jedes Enum ein `SAEnum(...)` Type definieren (z.B. `ApprovalStatusType`).
- **Wiederverwendung:** Enum Klasse in Schemas importieren, SAEnum Type in Models verwenden.

```python
# In enums.py definieren:
class NewStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

NewStatusType = SAEnum(NewStatus, name="new_status", create_constraint=True, native_enum=True)

# In Model verwenden:
status: Mapped[NewStatus] = mapped_column(NewStatusType, nullable=False)

# In Schema verwenden:
from app.models.enums import NewStatus
status: NewStatus
```

## Dependency Injection

Die DB-Session wird via FastAPI `Depends` injected:

```python
from app.db import get_session

@router.get("/")
async def list_items(session: AsyncSession = Depends(get_session)):
    # session ist automatisch eine async context-managed Session
    # Rollback bei Exception, Close am Ende — alles automatisch
    ...
```

Es gibt auch ein `SessionDep` Type Alias in `app/db.py`, aber die meisten Router nutzen `Depends(get_session)` direkt.

## Services

Business Logic gehoert in `app/services/`, nicht in die Router:

- Router: HTTP-Handling, Validation, Response Formatting
- Services: Datenbankabfragen, Berechnungen, Aggregation

Beispiel: `services/aggregation.py` berechnet Budget-Summaries und Cash-Out Timelines — der Router in `api/summary.py` ruft nur die Service-Funktion auf.

## Excel Handling

- **Import:** `services/excel_import.py` — parst `.xlsx`/`.xls` via `openpyxl`, mappt Spalten, erstellt Departments/WorkAreas/CostItems.
- **Export:** `services/excel_export.py` — drei Formate:
  - `generate_standard_export()` — ein Sheet pro Department
  - `generate_finance_export()` — im BudgetTemplate-Format der Finanzabteilung
  - `generate_steering_committee_export()` — Ein-Seiten-Zusammenfassung

## Testen

```bash
# Im Container
docker compose exec backend pytest

# Lokal (venv aktiv)
pytest
```

## Haeufige Fallstricke

1. **Async vergessen** — Alle DB-Calls muessen `await` haben. `session.execute()` ohne `await` gibt ein Coroutine-Objekt zurueck, keine Daten.
2. **Import-Reihenfolge** — Models muessen in `__init__.py` importiert sein, damit Alembic sie fuer Autogenerate findet.
3. **UUID-Format** — Backend nutzt Python `uuid.UUID`, Frontend sendet UUID-Strings. FastAPI konvertiert automatisch.
4. **Decimal vs Float** — Finanzdaten sind `Decimal(15,2)` in der DB und in Pydantic. Keine Floats fuer Geldbetraege.
5. **Cascade Delete** — `CostItem` hat `ondelete="CASCADE"` auf `work_area_id`. Beim Loeschen einer WorkArea werden alle Items mitgeloescht.
