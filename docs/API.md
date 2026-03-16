# API Referenz — NovaDrive CAPEX Budget Tool

Base URL: `http://localhost:8000`

Interaktive Docs: http://localhost:8000/docs (Swagger UI) | http://localhost:8000/redoc

Authentifizierung: **Aktuell keine.** Für Produktion geplant: JWT-basierte Auth.

---

## Health

### `GET /health`

Prüfen ob der Service laeuft.

**Response:**
```json
{ "status": "ok" }
```

---

## Facilities

### `GET /api/v1/facilities/`

Alle Werke auflisten.

**Response:** `200 OK`
```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Werk Süd — Augsburg",
    "location": "Augsburg, Germany",
    "description": "NovaDrive Motors — Main CAPEX facility",
    "created_at": "2026-01-15T10:00:00",
    "updated_at": "2026-01-15T10:00:00"
  }
]
```

### `GET /api/v1/facilities/{facility_id}`

Einzelnes Werk.

### `POST /api/v1/facilities/`

Neues Werk anlegen.

**Request Body:**
```json
{
  "name": "Werk Nord",
  "location": "Hamburg, Germany",
  "description": "Second plant"
}
```

**Response:** `201 Created`

### `PUT /api/v1/facilities/{facility_id}`

Werk aktualisieren (alle Felder überschreiben).

### `DELETE /api/v1/facilities/{facility_id}`

Werk löschen. **Response:** `204 No Content`

---

## Departments

### `GET /api/v1/departments/`

Alle Departments auflisten.

**Query Parameter:**

| Param         | Typ    | Beschreibung                 |
|---------------|--------|------------------------------|
| `facility_id` | UUID   | Nur Departments dieses Werks |

**Response:** `200 OK`
```json
[
  {
    "id": "d1e2f3...",
    "facility_id": "a1b2c3d4-...",
    "name": "Assembly",
    "budget_total": 3800000.00,
    "created_at": "2026-01-15T10:00:00",
    "updated_at": "2026-01-15T10:00:00"
  }
]
```

### `GET /api/v1/departments/{department_id}`

Einzelnes Department **mit allen Work Areas** (eager loaded).

**Response:** `200 OK`
```json
{
  "id": "d1e2f3...",
  "facility_id": "a1b2c3d4-...",
  "name": "Assembly",
  "budget_total": 3800000.00,
  "work_areas": [
    { "id": "w1a2...", "department_id": "d1e2f3...", "name": "Pre-Assembly I" }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

### `POST /api/v1/departments/`

**Request Body:**
```json
{
  "facility_id": "a1b2c3d4-...",
  "name": "Testing",
  "budget_total": 1500000.00
}
```

**Response:** `201 Created`

### `PUT /api/v1/departments/{department_id}`

Department aktualisieren.

### `DELETE /api/v1/departments/{department_id}`

**Response:** `204 No Content`

---

## Work Areas

### `GET /api/v1/work-areas/`

Alle Work Areas auflisten.

**Query Parameter:**

| Param           | Typ    | Beschreibung                    |
|-----------------|--------|---------------------------------|
| `department_id` | UUID   | Nur Work Areas dieses Departments |

### `GET /api/v1/work-areas/{work_area_id}`

Einzelne Work Area **mit allen Cost Items** (eager loaded).

### `POST /api/v1/work-areas/`

**Request Body:**
```json
{
  "department_id": "d1e2f3...",
  "name": "Pre-Assembly I (Standplatz)"
}
```

**Response:** `201 Created`

### `PUT /api/v1/work-areas/{work_area_id}`

Work Area aktualisieren.

### `DELETE /api/v1/work-areas/{work_area_id}`

**Response:** `204 No Content`

---

## Cost Items

Die Kern-Entitaet des Systems. Jede Kostenposition (Maschine, Equipment, etc.).

### `GET /api/v1/cost-items/`

Alle Cost Items auflisten mit optionalen Filtern.

**Query Parameter:**

| Param             | Typ               | Beschreibung                          |
|-------------------|--------------------|---------------------------------------|
| `work_area_id`    | UUID               | Nur Items dieser Work Area            |
| `department_id`   | UUID               | Nur Items dieses Departments (via JOIN) |
| `approval_status` | ApprovalStatus     | z.B. `APPROVED`                       |
| `project_phase`   | ProjectPhase       | z.B. `PHASE_1`                        |
| `product`         | Product            | z.B. `ATLAS`                          |

**Response:** `200 OK`
```json
[
  {
    "id": "c1d2e3...",
    "work_area_id": "w1a2...",
    "description": "Screw-driving station with torque control",
    "original_amount": 185000.00,
    "current_amount": 192500.00,
    "expected_cash_out": "2026-06-15",
    "cost_basis": "INITIAL_SUPPLIER_OFFER",
    "cost_driver": "PRODUCT",
    "basis_description": "Offer from Atlas Copco",
    "assumptions": "Includes 2 spindles, excl. tooling",
    "approval_status": "APPROVED",
    "approval_date": "2026-01-15",
    "project_phase": "PHASE_2",
    "product": "ATLAS",
    "zielanpassung": 7500.00,
    "zielanpassung_reason": "Additional feeder needed",
    "comments": null,
    "created_at": "2026-01-01T10:00:00",
    "updated_at": "2026-03-01T14:30:00"
  }
]
```

### `GET /api/v1/cost-items/{item_id}`

Einzelnes Cost Item.

### `POST /api/v1/cost-items/`

Neues Cost Item erstellen.

**Request Body:**
```json
{
  "work_area_id": "w1a2...",
  "description": "Press-fit unit for bearing insertion",
  "original_amount": 134000.00,
  "current_amount": 134000.00,
  "expected_cash_out": "2026-07-01",
  "cost_basis": "COST_ESTIMATION",
  "cost_driver": "PRODUCT",
  "approval_status": "OPEN",
  "project_phase": "PHASE_2",
  "product": "ATLAS"
}
```

**Response:** `201 Created`

### `PUT /api/v1/cost-items/{item_id}`

Cost Item aktualisieren. **Partial Update** — nur übergebene Felder werden aktualisiert (`exclude_unset=True`).

**Request Body (Beispiel — nur Status ändern):**
```json
{
  "approval_status": "APPROVED",
  "approval_date": "2026-03-16"
}
```

**Response:** `200 OK` — vollständiges Item zurück.

### `DELETE /api/v1/cost-items/{item_id}`

**Response:** `204 No Content`

---

## Summary / Aggregation

### `GET /api/v1/summary/budget`

Globale Budget-Zusammenfassung.

**Response:**
```json
{
  "total_budget": 7700000.00,
  "total_spent": 4832000.00,
  "total_approved": 3200000.00,
  "total_delta": -432000.00,
  "cost_of_completion": 2868000.00
}
```

### `GET /api/v1/summary/departments`

Budget-Zusammenfassung pro Department.

**Response:**
```json
[
  {
    "department_name": "Assembly",
    "budget": 3800000.00,
    "spent": 2180000.00,
    "approved": 1500000.00,
    "delta": -120000.00
  }
]
```

### `GET /api/v1/summary/cash-out`

Cash-Out Timeline — aggregiert pro Monat.

**Response:**
```json
[
  { "month": "2026-04", "amount": 475000.00 },
  { "month": "2026-05", "amount": 620000.00 },
  { "month": "2026-06", "amount": 890000.00 }
]
```

---

## Export

Alle Export-Endpoints liefern `.xlsx`-Dateien als Download.

### `GET /api/v1/export/standard`

Standard-Export: ein Sheet pro Department mit allen gefilterten Items.

**Query Parameter:**

| Param         | Typ    | Beschreibung                                     |
|---------------|--------|--------------------------------------------------|
| `facility_id` | UUID   | **Required** — Welches Werk exportieren          |
| `dept`        | String | Komma-getrennte Department-UUIDs (optional)      |
| `phase`       | String | Projektphase, z.B. `PHASE_1` (optional)          |

**Response:** `200 OK`, Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### `GET /api/v1/export/finance`

Finance-Template Export im Format der Finanzabteilung.

**Query Parameter:**

| Param           | Typ   | Default | Beschreibung                    |
|-----------------|-------|---------|---------------------------------|
| `facility_id`   | UUID  | —       | **Required**                    |
| `budget_factor` | Float | `0.85`  | Budget-Reserve-Faktor           |

### `GET /api/v1/export/steering-committee`

Ein-Seiten-Zusammenfassung für das Steering Committee.

**Query Parameter:**

| Param         | Typ  | Beschreibung   |
|---------------|------|----------------|
| `facility_id` | UUID | **Required**   |

---

## Import

### `POST /api/v1/import/excel`

Excel-Datei importieren und Cost Items anlegen.

**Request:** `multipart/form-data`

| Feld          | Typ          | Beschreibung              |
|---------------|--------------|---------------------------|
| `file`        | File         | `.xlsx` oder `.xls` Datei |
| `facility_id` | UUID         | Ziel-Werk                 |

**Response:** `200 OK`
```json
{
  "departments_created": 5,
  "work_areas_created": 12,
  "cost_items_created": 87,
  "errors": []
}
```

---

## Attachments

### `POST /api/v1/attachments/upload`

Datei hochladen und an ein Item, eine Work Area oder ein Department hängen.

**Request:** `multipart/form-data`

| Feld              | Typ             | Beschreibung                                  |
|-------------------|-----------------|-----------------------------------------------|
| `file`            | File            | **Required** — Die Datei                      |
| `cost_item_id`    | UUID (optional) | Genau EINS der drei Parent-Felder muss gesetzt sein |
| `work_area_id`    | UUID (optional) |                                               |
| `department_id`   | UUID (optional) |                                               |
| `description`     | String          | Optionale Beschreibung                        |
| `attachment_type` | AttachmentType  | Default: `OTHER`. Werte: `OFFER`, `INVOICE`, `SPECIFICATION`, `PHOTO`, `OTHER` |

**Response:** `201 Created`
```json
{
  "id": "att-uuid...",
  "original_filename": "angebot_atlas_copco.pdf",
  "content_type": "application/pdf",
  "file_size": 245760,
  "attachment_type": "OFFER",
  "created_at": "2026-03-16T10:00:00"
}
```

### `GET /api/v1/attachments/`

Attachments auflisten, gefiltert nach Parent.

**Query Parameter:**

| Param           | Typ  | Beschreibung                |
|-----------------|------|-----------------------------|
| `cost_item_id`  | UUID | Attachments dieses Items    |
| `work_area_id`  | UUID | Attachments dieser Work Area |
| `department_id` | UUID | Attachments dieses Departments |

**Response:**
```json
{
  "items": [ /* AttachmentRead[] */ ],
  "total": 3
}
```

### `GET /api/v1/attachments/{attachment_id}/download`

Datei herunterladen. Liefert die Original-Datei mit korrektem Content-Type.

### `DELETE /api/v1/attachments/{attachment_id}`

Attachment löschen (Datei auf Disk + DB-Record).

**Response:** `204 No Content`

---

## Enum-Werte Referenz

Die API verwendet durchgehend UPPER_CASE für Enum-Werte.

### ApprovalStatus
`OPEN` | `SUBMITTED_FOR_APPROVAL` | `APPROVED` | `REJECTED` | `ON_HOLD` | `PENDING_SUPPLIER_NEGOTIATION` | `PENDING_TECHNICAL_CLARIFICATION` | `OBSOLETE`

### ProjectPhase
`PHASE_1` | `PHASE_2` | `PHASE_3` | `PHASE_4`

### Product
`ATLAS` | `ORION` | `VEGA` | `OVERALL`

### CostBasis
`COST_ESTIMATION` | `INITIAL_SUPPLIER_OFFER` | `REVISED_SUPPLIER_OFFER` | `CHANGE_COST`

### CostDriver
`PRODUCT` | `PROCESS` | `NEW_REQ_ASSEMBLY` | `NEW_REQ_TESTING` | `INITIAL_SETUP`

### AttachmentType
`OFFER` | `INVOICE` | `SPECIFICATION` | `PHOTO` | `OTHER`

---

## Fehler-Responses

Alle Fehler folgen dem gleichen Format:

```json
{
  "detail": "Department not found"
}
```

| Status Code | Bedeutung                           |
|-------------|-------------------------------------|
| `400`       | Ungültige Eingabe / Validierungsfehler |
| `404`       | Ressource nicht gefunden            |
| `422`       | Pydantic Validierungsfehler (automatisch von FastAPI) |
| `500`       | Server Error                        |
