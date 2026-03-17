# Multi-Facility / Multi-Project Implementation Plan

## Executive Summary

Transform the CAPEX Budget Tool from single-facility to a multi-facility workspace platform. Users can manage multiple factory projects, clone existing facilities as templates, transfer items between projects, and use historical data for planning.

---

## Current State

- Backend `Facility` model exists, API is already facility-scoped
- Frontend hardcoded to single `mockFacility` — no switcher, no multi-facility awareness
- Backend is ~80% ready, frontend needs the most work

---

## Phase 1: Foundation (Multi-Facility Switching)

### Backend

**`backend/app/models/enums.py`** — Add:
```python
class FacilityStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"

class FacilityType(str, enum.Enum):
    PRODUCTION = "PRODUCTION"
    EXPANSION = "EXPANSION"
    RETROFIT = "RETROFIT"
    PROTOTYPE = "PROTOTYPE"
```

**`backend/app/models/facility.py`** — Add fields:
```python
status: Mapped[FacilityStatus] = mapped_column(default=FacilityStatus.PLANNING)
facility_type: Mapped[FacilityType] = mapped_column(default=FacilityType.PRODUCTION)
source_facility_id: Mapped[uuid.UUID | None]  # cloned from
start_date: Mapped[date | None]
completion_date: Mapped[date | None]
archived_at: Mapped[datetime | None]
sort_order: Mapped[int] = mapped_column(default=0)
```

**`backend/app/api/facilities.py`** — Add:
- `PATCH /facilities/{id}/status` — lifecycle transitions
- `?status=` filter on `GET /facilities/`

**Alembic migration** — Add columns, set existing facilities to `status=ACTIVE`

### Frontend

**`frontend/src/types/budget.ts`** — Update `Facility` interface, add `FacilityStatus`/`FacilityType` types. Change all IDs from `number` to `string` (UUID).

**`frontend/src/context/FacilityContext.tsx`** (NEW) — Manages facility list, current selection, persists to localStorage.

**`frontend/src/components/layout/FacilitySwitcher.tsx`** (NEW) — Dropdown in TopBar showing all facilities grouped by status. "New Facility" button at bottom.

**`frontend/src/context/BudgetDataContext.tsx`** — Accept `facilityId` prop, reload data when facility changes. In mock mode: maintain data per facility.

**`frontend/src/mocks/data.ts`** — Add second facility ("5k Factory - Planning") with sample data.

### Deliverable
Users can see multiple facilities, switch between them, create new empty ones.

---

## Phase 2: Clone & Template

### Backend

**`backend/app/services/facility_ops.py`** (NEW) — `clone_facility()`:
1. Load source with all relationships (departments → work areas → cost items)
2. Deep-copy entire hierarchy with new UUIDs
3. Options: `include_amounts` (copy $ or zero), `reset_statuses` (all to OPEN)
4. Set `source_facility_id` on clone

**`backend/app/api/facilities.py`** — Add:
- `POST /facilities/{id}/clone` — Clone entire facility

### Frontend

**`frontend/src/components/facility/CloneFacilityDialog.tsx`** (NEW) — Modal: Name, include amounts?, reset statuses?

After clone: auto-switch to new facility, show "Cloned from: 3k Factory" badge.

### Deliverable
Georg clones 3k Factory → gets 5k Factory skeleton with real reference data.

---

## Phase 3: Transfer Items Between Facilities

### Backend

**`backend/app/models/transfer_log.py`** (NEW):
```python
class TransferLog(Base):
    entity_type: str          # "cost_item", "work_area", "department"
    source_entity_id: UUID
    target_entity_id: UUID
    source_facility_id: UUID
    target_facility_id: UUID
    transfer_mode: str        # "copy" or "move"
    created_by: str | None
    notes: str | None
```

**`backend/app/api/transfers.py`** (NEW):
- `POST /transfers/cost-items` — Copy/move items to target work area
- `POST /transfers/work-areas` — Copy/move work areas to target department
- `POST /transfers/departments` — Copy/move departments to target facility
- `GET /transfers/log` — Audit trail

**`backend/app/services/transfer.py`** (NEW):
- Copy mode: duplicate entities with new UUIDs in target
- Move mode: re-parent entities, update FKs
- Options: reset status to OPEN, reset amounts to 0
- Log every transfer

### Frontend

**`frontend/src/components/transfer/TransferDialog.tsx`** (NEW) — Multi-step modal:
1. Select target facility
2. Select target location (department + work area)
3. Options (copy/move, reset status, reset amounts)
4. Confirm

Triggered from:
- Bulk action bar in CostbookTable ("Transfer selected...")
- Work area / department row action menus

### Deliverable
Cherry-pick items from 3k Factory into 5k Factory plan.

---

## Phase 4: Historical Data & Comparison

### Backend

**`backend/app/api/comparison.py`** (NEW):
- `GET /compare/facilities?ids=UUID1,UUID2` — Side-by-side KPIs
- `GET /compare/departments?facility_ids=...&names=Assembly` — Match by name

**Read-only enforcement** for COMPLETED facilities:
- Reject PUT/DELETE on cost items/departments/work areas
- Return `403 Forbidden: This facility is completed and read-only`

### Frontend

**`frontend/src/pages/FacilitiesPage.tsx`** (NEW) — Route: `/facilities`
- Card grid of all facilities
- Status badges, KPI summaries
- Actions: Open, Clone, Compare, Change Status, Delete

**`frontend/src/components/facility/FacilityComparisonView.tsx`** (NEW):
- Side-by-side: select 2 facilities
- Match departments by name
- Show deltas: "Assembly: 3k planned 1.9M → actual 2.1M (+10.5%)"

**Completed facility UI:**
- Banner: "This facility is completed. Data is read-only."
- Hide edit controls
- Show "planned vs actual" on items that had original_amount ≠ current_amount

### Deliverable
"Assembly at 3k cost 2.1M actual vs 1.9M planned" → informed 5k planning.

---

## Key Architecture Decisions

### ID Migration (number → string)
All frontend interfaces change from `id: number` to `id: string`. Mechanical but touches many files. Do in one PR before any multi-facility work.

### Facility Switching Behavior
1. Warn about unsaved changes
2. Update URL: `/?facility=UUID` (clear filters — dept IDs are facility-specific)
3. Reload BudgetDataContext
4. Persist last-used facility in localStorage

### Completed Facility = Frozen Snapshot
- No edits allowed (enforced backend + frontend)
- Serves as historical reference and clone source
- Shows "planned vs actual" comparisons

---

## File Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | `FacilityContext.tsx`, `FacilitySwitcher.tsx` | `facility.py`, `enums.py`, `budget.ts`, `BudgetDataContext.tsx`, `TopBar.tsx`, `App.tsx`, `data.ts` |
| 2 | `facility_ops.py`, `CloneFacilityDialog.tsx` | `facilities.py` (API) |
| 3 | `transfer_log.py`, `transfers.py`, `transfer.py`, `TransferDialog.tsx` | `CostbookTable.tsx` (bulk actions) |
| 4 | `comparison.py`, `FacilitiesPage.tsx`, `FacilityComparisonView.tsx` | `facilities.py` (read-only enforcement), `TabBar.tsx` |
