# Tech Due Diligence -- CAPEX Budget Tool

**Datum:** 2026-03-16
**Scope:** Full-Stack-Bewertung Frontend, Backend, Infrastruktur, Security, DevOps
**Methodik:** Code-Review, Architektur-Analyse, Dependency-Audit
**Bewertungsmassstab:** Enterprise-Readiness fuer industrielles CAPEX-Tool (TYTAN Technologies)

---

## Executive Summary

Das CAPEX Budget Tool ist ein funktional solides Prototype-Stadium-Produkt mit modernem Tech Stack. Die Architektur-Entscheidungen sind fuer ein Single-Developer-Projekt ueberraschend sauber. **Das Produkt ist jedoch NICHT produktionsreif.** Kritische Luecken in Security (keine Authentifizierung), Testing (0% Coverage) und DevOps (keine Pipeline) verhindern jeglichen produktiven Einsatz. Die technische Schuld ist beherrschbar -- aber nur, wenn sie JETZT adressiert wird.

**Gesamtbewertung: 4.2 / 10** (Prototype, nicht Production)

---

## 1. Architecture Assessment

### 1.1 Tech Stack -- Zeitgemaess? **JA, mit Einschraenkungen.**

| Schicht | Technologie | Bewertung | Kommentar |
|---------|-------------|-----------|-----------|
| Frontend | React 19, TypeScript, Vite 8, TailwindCSS 4 | Cutting-Edge | React 19 und Vite 8 sind neueste Versionen. Gut. |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.0 async | State-of-the-Art | Beste Python-Wahl fuer async APIs. Korrekt. |
| Datenbank | PostgreSQL 16 | Gold-Standard | Industriestandard. Richtige Wahl fuer Finanzdaten. |
| ORM | SQLAlchemy 2.0 + Alembic | Best Practice | Typed Mapped Columns, async Sessions. Sauber. |
| Validation | Pydantic v2 | Best Practice | Schnell, typsicher, native FastAPI-Integration. |

**Risiko:** Vite 8 hat Peer-Dependency-Konflikte mit `@tailwindcss/vite` (erwartet Vite 5-7). Aktuell nur mit `--legacy-peer-deps` installierbar. Fragile Dependency Chain.

**Risiko:** `xlsx` Library hat 1 High-Severity-Vulnerability. Bekanntes Problem, keine Maintenance mehr. Muss ersetzt werden (z.B. durch `exceljs` oder `sheetjs-ce`).

### 1.2 Skalierbarkeit

#### Kann das System 1.000 User bedienen?

**NEIN.** Nicht einmal 10 gleichzeitige User.

| Bottleneck | Problem | Impact |
|-----------|---------|--------|
| Keine Auth | Alle User sehen alles, koennen alles loeschen | KRITISCH |
| Keine Session-Management | Kein Multi-User-State | KRITISCH |
| Kein Connection Pooling Config | Default asyncpg Pool (10 connections) | HOCH |
| Keine Pagination | `GET /cost-items/` liefert ALLE Items | MITTEL |
| Client-Side-Filtering | Alle Daten werden geladen, dann im Browser gefiltert | MITTEL |

#### Kann das System 10.000 Items verwalten?

**NEIN.** Aktuelles Design bricht bei ~500-1.000 Items.

- `useFilteredData()` filtert client-seitig -- bei 10.000 Items ist das ein Performance-Kill
- Kein Server-Side Pagination auf den API-Endpoints
- Kein Virtualisierung der Tabelle (alle DOM-Nodes werden gerendert)
- Summary-Aggregation (`GET /summary/budget`) hat keine Caching-Schicht
- Cash-Out-Timeline berechnet bei jedem Request alle Items neu

### 1.3 Security Posture

**RATING: KRITISCH -- 1/10**

Siehe Abschnitt 5 fuer vollstaendige Analyse.

### 1.4 Data Privacy (DSGVO)

| Anforderung | Status | Kommentar |
|-------------|--------|-----------|
| Personenbezogene Daten | UNKLAR | Tool speichert aktuell keine personenbezogenen Daten direkt. Aber: wer hat wann was geaendert? Audit-Log existiert als Router, aber ohne User-Kontext. |
| Datenloesch-Konzept | FEHLT | Keine Retention Policy. Kein "Right to be forgotten". |
| Zugriffskontrolle | FEHLT | Jeder sieht alles. Kein Rollen-Konzept. |
| Datenverarbeitung auf EU-Servern | UNKLAR | Docker Compose existiert, aber kein Deployment-Konzept. |
| Verschluesselung at rest | FEHLT | PostgreSQL ohne Encryption. Uploads auf Disk unverschluesselt. |
| Verschluesselung in transit | FEHLT | Nur HTTP, kein HTTPS/TLS konfiguriert. |

**Bewertung:** Fuer ein internes CAPEX-Tool ohne personenbezogene Daten akzeptabel als Prototyp. Sobald User-Accounts existieren: DSGVO-relevant.

---

## 2. Code Quality

### 2.1 Was ist GUT gebaut

| Aspekt | Bewertung | Begruendung |
|--------|-----------|-------------|
| **Schichten-Trennung Backend** | SEHR GUT | Router > Service > Model > Schema. Saubere Separation of Concerns. |
| **SQLAlchemy 2.0 Usage** | SEHR GUT | Moderne Mapped Columns, async Sessions, korrekte Type Annotations. |
| **UUID als Primary Keys** | GUT | Keine sequentiellen IDs. Verhindert Information Leakage. |
| **Pydantic Create/Read/Update Pattern** | SEHR GUT | Konsistentes Schema-Design mit `exclude_unset=True` fuer Partial Updates. |
| **URL-basierter Filter-State** | SEHR GUT | Bookmarkable, Back-Button funktioniert, kein Hidden State. Profi-Entscheidung. |
| **Kein State-Management-Overkill** | GUT | Bewusster Verzicht auf Redux/Zustand. Fuer die Applikationsgroesse korrekt. |
| **Enum-System** | GUT | Zentrale Enum-Definition, konsistente Nutzung, SAEnum fuer DB-Constraints. |
| **Component-Organisation** | GUT | Klare Ordnerstruktur nach Feature-Bereich. Keine God-Components. |
| **Design-Tokens** | GUT | Zentralisierte Farben/Spacing statt Magic Values. |
| **Decimal fuer Finanzdaten** | SEHR GUT | Keine Float-Rundungsfehler. `Numeric(15,2)` in DB + Pydantic Decimal. Korrekt. |
| **Cascade Delete** | GUT | WorkArea-Loesch cascade auf CostItems. Referentielle Integritaet. |
| **Mock-Modus** | GUT | Frontend entwickelbar ohne laufendes Backend. Beschleunigt UI-Iteration. |

### 2.2 Was ist TECHNISCHE SCHULD

| Aspekt | Severity | Problem |
|--------|----------|---------|
| **CORS: allow_origins=["*"]** | HOCH | `main.py` Zeile 40: Wildcard CORS. Config definiert spezifische Origins in `config.py`, aber die werden ignoriert. Copy-Paste-Fehler oder bewusste Dev-Abkuerzung, die nie gefixt wurde. |
| **Content-Type-Validierung ausgehebelt** | HOCH | `file_storage.py` Zeile 50-51: Content-Type-Check ist auskommentiert (`pass`). Nur Extension-Check. Ein Angreifer kann beliebige Dateien mit umbenannter Extension hochladen. |
| **`datetime.utcnow()` deprecated** | NIEDRIG | Python 3.12 deprecated `utcnow()`. Sollte `datetime.now(UTC)` sein. Funktional harmlos. |
| **@nivo/sankey noch in Dependencies** | NIEDRIG | Laut Chef-Report wurde Sankey entfernt, aber `@nivo/sankey` ist noch in `package.json`. Totes Gewicht im Bundle. |
| **Frontend-Backend nicht integriert** | HOCH | Gesamter Frontend-State laeuft auf Mock-Daten. `BudgetDataContext` ist nicht mit API verbunden. Das ist kein Bug, sondern ein unfertiges Feature -- aber der groesste Single Point of Failure fuer den Go-Live. |
| **Kein Error Boundary** | MITTEL | React hat kein globales Error Boundary. Ein JS-Fehler crashed die gesamte App. |
| **Kein Input Sanitization** | HOCH | Pydantic validiert Typen, aber keine SQL-Injection-Prevention auf Text-Feldern explizit. SQLAlchemy parameterisiert Queries, aber frei-text Felder (`description`, `comments`, `assumptions`) haben keine XSS-Sanitierung im Frontend. |
| **Peer-Dependency-Konflikte** | MITTEL | Vite 8 vs. TailwindCSS erwartet Vite 5-7. Baut aktuell, kann aber bei jedem Update brechen. |

### 2.3 Bundle Size: 1,070 kB JS -- Akzeptabel?

**NEIN fuer Produktion. JA fuer ein internes Tool.**

| Benchmark | Bundle Size |
|-----------|-------------|
| Dieses Tool | 1,070 kB (326 kB gzip) |
| Typische B2B-SPA | 300-500 kB gzip |
| Enterprise Dashboard | 500-800 kB gzip |
| Akzeptabler Threshold | < 500 kB gzip |

**Root Cause:** Recharts (~300 kB) + xlsx (~200 kB) + @nivo/sankey (tot, aber im Bundle) + kein Code-Splitting.

**Fix (geschaetzter Aufwand: 2h):**
1. `React.lazy()` fuer CashOutPage und ImportPage
2. `@nivo/sankey` aus `package.json` entfernen
3. `xlsx` durch Tree-Shakeable Alternative ersetzen

Nach Code-Splitting: geschaetzt 150-200 kB gzip fuer die Hauptseite. Akzeptabel.

### 2.4 Test Coverage: 0%

**ROTES FLAG. Absolutes Dealbreaker-Kriterium fuer Enterprise.**

| Aspekt | Status |
|--------|--------|
| Unit Tests Frontend | 0 Dateien |
| Unit Tests Backend | 0 Dateien |
| Integration Tests | 0 Dateien |
| E2E Tests | 0 Dateien |
| Test-Framework konfiguriert? | Backend: pytest in requirements.txt. Frontend: NEIN (kein Vitest). |

Das bedeutet:
- Jedes Refactoring ist ein Blindflug
- Kein Regressions-Schutz
- Kein Vertrauen in Deployments
- Keine Absicherung der Finanzkalkulations-Logik (Aggregation, Budget-Summen, Cash-Out)

**Besonders kritisch:** Die Aggregation-Logik (`services/aggregation.py`) berechnet Budgetsummen fuer Millionen-Euro-Entscheidungen. Diese Logik hat NULL Tests. In einer Tech Due Diligence waere das ein No-Go fuer jede Investitionsentscheidung.

---

## 3. DevOps Maturity

### DevOps Maturity Model (McKinsey Digital)

| Level | Beschreibung | Dieses Projekt |
|-------|-------------|----------------|
| Level 0 | Manual Everything | **<-- HIER** |
| Level 1 | Basic CI (Lint, Build, Test) | |
| Level 2 | CD to Staging | |
| Level 3 | CD to Production + Monitoring | |
| Level 4 | Full Observability + Auto-Scaling | |

### 3.1 CI/CD Pipeline

**EXISTIERT NICHT.**

- Kein GitHub Actions / GitLab CI / Jenkins
- Kein automatischer Build-Check bei Push
- Kein automatischer Lint/Type-Check
- Kein automatisiertes Deployment
- Kein Branch Protection

**Konsequenz:** Ein `git push` mit TypeScript-Error oder kaputter Migration geht direkt auf `master`. Keine Qualitaetsschleuse.

### 3.2 Monitoring / Observability

**EXISTIERT NICHT.**

| Aspekt | Status |
|--------|--------|
| Application Logging | Kein strukturiertes Logging. Kein Log-Level-Konzept. |
| Error Tracking (Sentry o.ae.) | FEHLT |
| Performance Monitoring (APM) | FEHLT |
| Health Checks | Minimal: `GET /health` liefert `{"status": "ok"}`. Kein DB-Health-Check. |
| Alerting | FEHLT |
| Request Tracing | FEHLT |
| Metrics / Dashboards | FEHLT |

**Konsequenz:** Wenn die App crasht, weiss es niemand. Wenn Queries langsam werden, weiss es niemand. Wenn Daten korrupt sind, weiss es niemand.

### 3.3 Backup Strategy

**EXISTIERT NICHT.**

- PostgreSQL laeuft in einem Docker-Volume (`pgdata`). Kein Backup.
- File-Uploads liegen auf Disk im Container-Filesystem. Kein Backup.
- Ein `docker compose down -v` loescht ALLE Daten unwiderruflich.
- Kein Point-in-Time Recovery.
- Kein Disaster Recovery Plan.

**Konsequenz:** Bei einem Server-Ausfall, Container-Crash oder versehentlichem `docker compose down -v` sind alle CAPEX-Daten weg. Fuer ein Tool, das Millionen-Euro-Budgets verwaltet, ist das inakzeptabel.

---

## 4. Scalability Path

### 4.1 Stufe 1: 10 User (Interne Pilotgruppe)

| Massnahme | Aufwand | Prioritaet |
|-----------|---------|------------|
| Authentifizierung (JWT/OAuth2) | 3-5 Tage | P0 -- BLOCKER |
| Rollen-Konzept (Admin, Planner, Viewer) | 3-5 Tage | P0 -- BLOCKER |
| HTTPS/TLS (Reverse Proxy) | 1 Tag | P0 -- BLOCKER |
| CORS auf spezifische Origins | 30 Min | P0 |
| Frontend-Backend-Integration (Mock-Daten ersetzen) | 5-8 Tage | P0 -- BLOCKER |
| PostgreSQL Backup (pg_dump Cron) | 2h | P0 |
| Basic Error Tracking (Sentry) | 2h | P1 |
| Environment-Config (.env, Secrets Management) | 1 Tag | P1 |

**Geschaetzter Gesamtaufwand: 3-4 Wochen (1 Entwickler)**

### 4.2 Stufe 2: 100 User (Abteilungsuebergreifend)

| Massnahme | Aufwand | Prioritaet |
|-----------|---------|------------|
| Server-Side Pagination + Filtering | 3-5 Tage | P0 |
| Virtualisierte Tabelle (react-virtuoso / TanStack Virtual) | 2-3 Tage | P1 |
| Caching Layer (Redis) fuer Summary-Aggregation | 2-3 Tage | P1 |
| Connection Pool Tuning | 1 Tag | P1 |
| CI/CD Pipeline (GitHub Actions) | 2-3 Tage | P0 |
| Test Suite (Minimum 60% Coverage) | 10-15 Tage | P0 |
| Code-Splitting | 1-2 Tage | P2 |

**Geschaetzter Gesamtaufwand: 6-8 Wochen (1 Entwickler)**

### 4.3 Stufe 3: 10 Facilities, 100.000 Items

| Massnahme | Aufwand |
|-----------|---------|
| Database Indexing Strategy (Composite Indices auf Filter-Kombinationen) | 2-3 Tage |
| Materialized Views fuer Summary/Aggregation | 3-5 Tage |
| Async Task Queue (Celery/ARQ) fuer Excel-Import/-Export | 3-5 Tage |
| CDN fuer Static Assets | 1 Tag |
| Read Replicas fuer Reporting-Queries | 2-3 Tage |
| Horizontal Scaling (Kubernetes) | 5-10 Tage |

### 4.4 Performance Bottlenecks (aktuell)

| Bottleneck | Wo | Impact bei Scale |
|-----------|-----|-----------------|
| Client-Side-Filtering | `useFilteredData()` | O(n) bei jedem Render. Bei 10k Items: spuerbare Latenz. |
| Aggregation ohne Cache | `services/aggregation.py` | Jeder Summary-Call iteriert ueber alle Items. O(n). |
| Kein DB-Index auf Filter-Spalten | cost_items Tabelle | Full Table Scan bei Filter-Queries. |
| Synchroner File-Write | `file_storage.py` (trotz async Signatur) | `write_bytes()` blockiert den Event Loop. |
| Kein Pagination-Limit | Alle List-Endpoints | 100.000 Items in einer JSON-Response = Timeout. |

---

## 5. Security Gaps (KRITISCH)

### Security Severity Matrix

| # | Vulnerability | Severity | CVSS-Equivalent | Exploitation Difficulty |
|---|--------------|----------|-----------------|------------------------|
| S1 | Keine Authentifizierung | KRITISCH | 10.0 | Trivial |
| S2 | Keine Autorisierung | KRITISCH | 10.0 | Trivial |
| S3 | CORS Wildcard (`*`) | HOCH | 7.5 | Einfach |
| S4 | Keine Rate Limiting | HOCH | 7.0 | Einfach |
| S5 | File Upload ohne Content-Validation | HOCH | 7.5 | Mittel |
| S6 | File Upload ohne Virus Scan | HOCH | 8.0 | Mittel |
| S7 | Kein HTTPS/TLS | HOCH | 7.5 | Einfach (MITM) |
| S8 | DB-Credentials Hardcoded | MITTEL | 5.5 | Requires Access |
| S9 | Keine Input-Laengen-Limits auf Text-Feldern | MITTEL | 5.0 | Einfach |
| S10 | Keine XSS-Sanitierung im Frontend | MITTEL | 6.0 | Mittel |
| S11 | Kein Audit-Trail mit User-Kontext | MITTEL | 4.0 | N/A |
| S12 | Kein CSRF-Schutz | MITTEL | 5.0 | Mittel |
| S13 | DELETE-Endpoints ohne Soft-Delete | NIEDRIG | 3.0 | N/A |

### Detail: S1 + S2 -- Authentifizierung / Autorisierung

Die gesamte API ist OFFEN. Jeder mit Netzwerkzugang kann:
- Alle Budgetdaten lesen (`GET /api/v1/cost-items/`)
- Alle Budgetdaten aendern (`PUT /api/v1/cost-items/{id}`)
- Alle Budgetdaten loeschen (`DELETE /api/v1/cost-items/{id}`)
- Neue Facilities/Departments anlegen
- Excel-Dateien importieren (und damit bestehende Datenstrukturen ueberschreiben)
- Dateien hochladen (bis 50 MB, beliebig oft)
- Alle Datei-Anhaenge herunterladen

**Angriffsvektor:** Ein simpler `curl DELETE http://server:8000/api/v1/facilities/{id}` loescht das gesamte Werk mit allen Departments, Work Areas und Cost Items (Cascade Delete).

### Detail: S5 -- File Upload

`file_storage.py` hat Extension-Whitelisting (gut), aber:
- Content-Type-Validierung ist DEAKTIVIERT (Zeile 50-51: `pass`)
- Kein Magic-Byte-Check (ein `.pdf` kann eine `.exe` sein)
- Kein Virus-Scan
- Kein Upload-Rate-Limiting
- Upload-Verzeichnis liegt innerhalb des Backend-Projekts (`backend/uploads/`)

### Detail: S8 -- Hardcoded Credentials

`docker-compose.yml`:
```
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
```

`config.py`:
```
DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/budget_tool"
```

Default-Credentials im Code. Keine `.env`-Datei fuer Secrets-Management in Produktion.

---

## 6. Technical Debt Score

### Bewertung pro Schicht (1 = katastrophal, 10 = exzellent)

| Schicht | Score | Begruendung |
|---------|-------|-------------|
| **Frontend -- Architektur** | 7/10 | Saubere Component-Struktur, gute State-Entscheidungen, URL-based Filters. Solide. |
| **Frontend -- Implementation** | 5/10 | Mock-Modus statt echter Integration. Bundle zu gross. Kein Error Boundary. Kein Code-Splitting. |
| **Backend -- Architektur** | 8/10 | Vorbildliche Schichtentrennung. Router > Service > Model > Schema. Async-first. |
| **Backend -- Implementation** | 6/10 | Sauber, aber CORS-Wildcard, deaktivierte Validierung, keine Logging-Strategie. |
| **Datenbank** | 7/10 | Sauberes Schema mit UUIDs, Timestamps, Enums. Aber: keine Indices, kein Backup. |
| **Infrastruktur** | 3/10 | Docker Compose existiert. Sonst nichts. Kein TLS, kein Reverse Proxy, kein Monitoring. |
| **Tests** | 0/10 | Null. Nichts. Nada. |
| **Security** | 1/10 | Offene API ohne Auth. CORS Wildcard. Hardcoded Credentials. Deaktivierte File-Validierung. |
| **DevOps** | 1/10 | Kein CI/CD. Kein Monitoring. Kein Backup. Kein Deployment-Konzept. |
| **Dokumentation** | 8/10 | Hervorragend. ARCHITECTURE.md, API.md, CLAUDE.md, Chef-Report. Selten so gut dokumentiert. |

### Gewichteter Gesamtscore

| Schicht | Gewicht | Score | Gewichtet |
|---------|---------|-------|-----------|
| Frontend | 20% | 6.0 | 1.20 |
| Backend | 20% | 7.0 | 1.40 |
| Datenbank | 10% | 7.0 | 0.70 |
| Infrastruktur | 15% | 3.0 | 0.45 |
| Tests | 15% | 0.0 | 0.00 |
| Security | 15% | 1.0 | 0.15 |
| DevOps | 5% | 1.0 | 0.05 |

**Gesamt: 3.95 / 10** -- Prototype-Stadium

---

## 7. Roadmap-Empfehlung

### PHASE 0: VOR dem ersten echten User (BLOCKER)

**Zeitrahmen: 4-6 Wochen (1 Senior Developer)**

| # | Massnahme | Aufwand | Begruendung |
|---|-----------|---------|-------------|
| 1 | **JWT-Authentifizierung** | 3-5 Tage | Ohne Auth ist das Tool ein offenes Datenleck. Kein Go-Live ohne. |
| 2 | **Rollen-System** (Admin / Planner / Viewer) | 3-5 Tage | Wer darf Budgets aendern? Wer nur lesen? Wer loeschen? |
| 3 | **Frontend-Backend-Integration** | 5-8 Tage | Mock-Daten durch echte API-Calls ersetzen. TanStack Query. |
| 4 | **HTTPS/TLS** (nginx Reverse Proxy) | 1 Tag | Finanzdaten duerfen nicht unverschluesselt ueber das Netzwerk. |
| 5 | **CORS auf spezifische Origins** | 30 Min | `allow_origins=["*"]` durch `settings.CORS_ORIGINS` ersetzen. |
| 6 | **PostgreSQL Backup** (automatisch, taeglich) | 2h | Ein `docker compose down -v` darf nicht Millionen-Daten loeschen. |
| 7 | **Content-Type-Validierung fixen** | 1h | `pass` in `file_storage.py` durch echten Check ersetzen. |
| 8 | **Basic Test Suite** (kritische Pfade) | 5-8 Tage | Aggregation, CRUD, Import/Export. Minimum 40% Coverage. |
| 9 | **Error Tracking** (Sentry) | 2h | Wissen, wenn die App crashed. |
| 10 | **Environment-Config** (.env fuer Secrets) | 1 Tag | Credentials raus aus dem Code. |

### PHASE 1: Kann warten (nach Go-Live mit Pilotgruppe)

**Zeitrahmen: 6-8 Wochen**

| # | Massnahme | Aufwand |
|---|-----------|---------|
| 11 | CI/CD Pipeline (GitHub Actions) | 2-3 Tage |
| 12 | Server-Side Pagination + Filtering | 3-5 Tage |
| 13 | Code-Splitting (React.lazy) | 1-2 Tage |
| 14 | `xlsx` durch sichere Alternative ersetzen | 1-2 Tage |
| 15 | Strukturiertes Logging (JSON, Log-Levels) | 2 Tage |
| 16 | Test Coverage auf 60% erhoehen | 10-15 Tage |
| 17 | Rate Limiting (Slowapi) | 1 Tag |
| 18 | Audit-Trail mit User-Kontext | 2-3 Tage |
| 19 | Dead Dependencies entfernen (@nivo/sankey) | 30 Min |

### PHASE 2: Skalierung (bei > 50 Usern / > 5 Facilities)

| # | Massnahme |
|---|-----------|
| 20 | Redis Caching fuer Aggregation |
| 21 | Database Indexing Strategy |
| 22 | Virtualisierte Tabelle |
| 23 | Async Task Queue fuer Excel-Verarbeitung |
| 24 | Read Replicas |
| 25 | Kubernetes Deployment |

---

## Appendix A: Positive Highlights

Es waere nicht fair, nur Defizite aufzuzeigen. Folgende Aspekte sind fuer ein Single-Developer-Projekt ueberdurchschnittlich gut:

1. **Architektur-Dokumentation** -- ARCHITECTURE.md, API.md und CLAUDE.md sind detailliert, aktuell und nuetzlich. Das ist selten.
2. **Backend-Schichtentrennung** -- Die Router/Service/Model/Schema-Trennung ist lehrbuchartig sauber.
3. **Bewusste Entscheidungen** -- Der Verzicht auf Redux, das URL-State-Pattern, UUIDs, Mock-Modus -- alles durchdacht und dokumentiert.
4. **Feature-Priorisierung** -- Die Swarm-Bewertung und Kill-List zeigen Disziplin. Features wurden aktiv entfernt statt aufgeblaet.
5. **Datenmodell** -- Decimal fuer Finanzdaten, Enums fuer Status-Maschine, Timestamp-Mixins. Professionelle Choices.

## Appendix B: Risk Summary fuer Entscheider

| Risiko | Eintrittswahrscheinlichkeit | Impact | Massnahme |
|--------|----------------------------|--------|-----------|
| Datenverlust (kein Backup) | HOCH | KATASTROPHAL | Phase 0, Punkt 6 |
| Unbefugter Zugriff (keine Auth) | HOCH bei Netzwerk-Exposure | KRITISCH | Phase 0, Punkt 1+2 |
| Datenmanipulation (keine Autorisierung) | HOCH | KRITISCH | Phase 0, Punkt 2 |
| Kalkulations-Fehler (keine Tests) | MITTEL | HOCH | Phase 0, Punkt 8 |
| Vendor Lock-in | NIEDRIG | NIEDRIG | Standard-Stack, keine proprietaeren Abhaengigkeiten |
| Key-Person-Risk (1 Developer) | HOCH | HOCH | Gute Doku mildert. Trotzdem: Bus-Faktor = 1. |

---

*Dieses Dokument wurde im Rahmen einer Tech Due Diligence erstellt und gibt den Stand vom 2026-03-16 wieder.*
