# OTTO v4 — Business Logic Analyse

**Autor:** OTTO (IE, der seine Zahlen kennen muss)
**Datum:** 2026-03-16
**Fokus:** Was bedeuten die Zahlen im Tool WIRKLICH? Und wo luegen sie?

---

## 1. Begriffsdefinitionen — Was ist was?

### Budget

**Definition:** Die genehmigten Gesamtmittel pro Department.

**Wie es GESETZT wird (Excel):**
Im Excel kommt das Budget aus dem BudgetTemplate-Sheet. Die Formel lautet:
```
Department Budget = SUM(BudgetTemplate Unit Costs fuer relevante Zeilen) * 0.85
```
Der 0.85-Faktor ist eine pauschale Reserve (15% Contingency oder Skonto). Die Zuordnung welche BudgetTemplate-Zeilen zu welchem Department gehoeren ist IMPLIZIT ueber Zeilennummern geloest — fragil, aber so ist es.

**Wie es im Tool gesetzt wird:**
`Department.budget_total` — ein einzelner Wert pro Department, manuell gesetzt oder beim Import uebernommen. Es gibt KEINE automatische Berechnung aus dem BudgetTemplate.

**Kann es sich aendern?**
Ja, ueber Zielanpassungen (`BudgetAdjustment`). Das Datenmodell dafuer existiert im Frontend (`types/budget.ts`), aber:

> **PROBLEM:** Die Zielanpassungen werden im `useFilteredData.ts` Hook NICHT beruecksichtigt. `budget = filteredDepartments.reduce((sum, d) => sum + d.budget_total, 0)` nimmt NUR den Basis-Wert. Zielanpassungen addiert niemand drauf. Das heisst: Wenn eine Zielanpassung von +80.000 EUR erfasst wird, aendert sich die angezeigte Budget-Zahl NICHT.

**So sollte es sein:**
```
Aktuelles Budget = department.budget_total + SUM(budget_adjustments fuer dieses department)
```

---

### Committed

**Definition im Tool:** Summe aller `current_amount` aller gefilterten CostItems.

**Code (useFilteredData.ts, Zeile 99):**
```typescript
const committed = items.reduce((sum, ci) => sum + ci.current_amount, 0);
```

**PROBLEM:** Es wird JEDES Item gezaehlt, unabhaengig vom Status. Ein Item mit Status `open` (= Idee, noch nicht mal beantragt) wird genauso "committed" gezaehlt wie ein `approved` Item. Das ist FALSCH.

In der echten Welt:
- **Open / Draft** = Wunsch, keine Verpflichtung
- **Submitted for Approval** = beantragt, aber noch nicht genehmigt
- **Approved** = genehmigt, darf bestellt werden
- **Ordered** (fehlt im Tool!) = bestellt, JETZT ist es "committed"
- **Rejected / Obsolete** = gestrichen, zaehlt GAR NICHT

**Was "Committed" WIRKLICH bedeuten sollte:**
Die Summe aller Items die mindestens den Status `approved` haben. Items mit Status `open`, `submitted_for_approval`, `rejected`, `obsolete` sind NICHT committed — sie sind "geplant" oder "beantragt" oder "tot".

**Backend hat das gleiche Problem:** In `aggregation.py` wird `total_spent` als `SUM(current_amount)` ALLER Items berechnet (Zeile 19-22). Kein Statusfilter.

---

### Spent (Bezahlt)

**Gibt es "Spent" im Tool? NEIN.**

Das Backend-Schema (`BudgetSummary`) hat ein Feld `total_spent`, aber das ist NICHT "bezahlt". Es ist die Summe ALLER `current_amount` — also identisch mit dem was das Frontend "Committed" nennt.

**In der echten Welt sind das ZWEI verschiedene Dinge:**

| Begriff | Bedeutung | Beispiel |
|---------|-----------|---------|
| **Committed** | Vertraglich gebunden, bestellt | PO ist raus, Lieferant baut |
| **Spent** | Tatsaechlich bezahlt, Geld ist weg | Rechnung bezahlt |

Ein Lieferant liefert in 3 Monaten. Ab Bestellung ist der Betrag "committed". Bezahlt wird erst nach Lieferung. In der Zwischenzeit ist das Geld committed aber nicht spent. Der Unterschied kann bei CAPEX-Projekten MILLIONEN ausmachen.

**Empfehlung:** Entweder:
- (a) Ein neues Feld `is_paid` oder `payment_date` auf CostItem einfuehren, ODER
- (b) Klar dokumentieren dass das Tool nur "Committed" trackt und "Spent" ein Thema fuer das ERP/Buchhaltung ist

Fuer das MVP ist Option (b) der pragmatische Weg. Aber das Wording muss SAUBER sein. Im Backend `total_spent` in `total_committed` umbenennen.

---

### Remaining (Verbleibend)

**Code (useFilteredData.ts, Zeile 107):**
```typescript
const remaining = budget - committed;
```

**Was es SAGEN soll:** Wie viel Budget ist noch frei?

**Probleme:**
1. `budget` beruecksichtigt keine Zielanpassungen (siehe oben)
2. `committed` zaehlt ALLE Items, auch offene/abgelehnte (siehe oben)
3. Wenn committed > budget, wird remaining NEGATIV — das ist korrekt, aber es fehlt jede visuelle Warnung

**So sollte es sein:**
```
Remaining = (budget_total + SUM(adjustments)) - SUM(current_amount WHERE status IN (approved, ordered))
```

---

### Delta

**Hier wird es RICHTIG verwirrend, weil Frontend und Backend VERSCHIEDENE Dinge "Delta" nennen.**

**Frontend (useFilteredData.ts, Zeile 111):**
```typescript
const delta = items.reduce(
  (sum, ci) => sum + (ci.original_amount - ci.current_amount), 0
);
```
Delta = Summe aller (Original - Aktuell) pro Item.
- Positives Delta = Items sind BILLIGER geworden als geplant
- Negatives Delta = Items sind TEURER geworden (Mehrkosten)

Das ist eine **Kostenveraenderung auf Item-Ebene**. Beispiel: Roboter war mit 120k geplant, Angebot kam mit 140k rein. Delta fuer dieses Item = -20k.

**Backend (aggregation.py, Zeile 33):**
```python
total_delta = total_budget - total_spent
```
Delta = Budget minus Gesamtkosten aller Items. Das ist eigentlich das gleiche wie "Remaining"!

**Excel (F2-Formel):**
```
Delta = Budget - Cost of Completion
```
Wieder was anderes: Budget minus Summe aller Work-Area-Subtotals.

**DREI verschiedene Definitionen fuer "Delta" — das ist ein Chaos.**

**Empfehlung — klare Trennung:**

| Begriff | Berechnung | Bedeutung |
|---------|-----------|-----------|
| **Item-Abweichung** (Variance) | `original_amount - current_amount` | Preisveraenderung einzelner Positionen |
| **Budget-Verbrauch** (Remaining) | `budget - committed` | Wie viel Budget ist noch frei |
| **Budget-Delta** | `budget - cost_of_completion` | Wie das Excel es meint: Budget vs. Gesamtkosten |

Das Frontend-"Delta" ist eigentlich eine **Variance** (Abweichung). Das sollte auch so heissen.

---

### Cost of Completion

**Excel-Definition (F4):**
```
Cost of Completion = SUM(alle Work Area Subtotals) = SUM(alle Line Item Amounts)
```
Das ist die Summe ALLER Items in einem Department. Egal ob approved oder nicht. Das ist die Antwort auf: "Was wird es am Ende kosten, ALLES einzubauen was auf der Liste steht?"

**Backend (aggregation.py, Zeile 36-41):**
```python
cost_of_completion = SUM(current_amount WHERE status != APPROVED)
```
Das ist FALSCH. Cost of Completion im Backend ist "Summe aller NICHT-genehmigten Items". Das ergibt keinen Sinn. "Cost of Completion" heisst: Was kostet es, alles fertigzustellen. Das muss die Summe ALLER aktiven Items sein (also alles ausser `rejected` und `obsolete`).

**So sollte es sein:**
```
Cost of Completion = SUM(current_amount WHERE status NOT IN (rejected, obsolete, cancelled))
```

---

## 2. Kann Committed > Budget sein?

**Ja, absolut.** Und das WIRD passieren. Gruende:

1. Angebote kommen hoeher rein als die Kostenschaetzung
2. Zusaetzliche Items werden hinzugefuegt die nicht im Original-Budget waren
3. Scope Creep — "Ach, wir brauchen noch eine Pruefstation"
4. Der 0.85-Faktor im Excel war zu optimistisch

**Was zeigt das Tool dann?**

Aktuell:
- `remaining` wird negativ (z.B. -50.000 EUR)
- Die `remainingColor`-Funktion in SummaryStrip.tsx zeigt "rot" (unter 5% remaining)
- Aber es gibt KEINE explizite Warnung oder Aktion

**Was FEHLT:**
- Klare visuelle Kennzeichnung: "BUDGET UEBERSCHRITTEN" in Rot, nicht einfach nur eine negative Zahl
- Anzeige der Ueberschreitung in Prozent
- Hinweis: "Zielanpassung erforderlich"
- Im Idealfall: Automatisch ein Flag setzen das im naechsten SteerCo besprochen werden muss

**Workflow bei Ueberschreitung:**
1. IE sieht rote Zahl → Remaining ist negativ
2. IE analysiert: Welche Items haben sich verteuert? (= negative Item-Variance)
3. IE erstellt eine Zielanpassung mit Begruendung
4. Zielanpassung wird im SteerCo genehmigt
5. Budget wird erhoeht → Remaining wird wieder positiv

**Code-Aenderung noetig in SummaryStrip.tsx:**
Wenn `remaining < 0`, sollte eine Warn-Box erscheinen, nicht nur eine rote Zahl.

---

## 3. Die RICHTIGEN KPIs fuer einen Production Planner

Was Chris WIRKLICH wissen muss, wenn er morgens seinen Rechner aufmacht:

### KPI 1: Budget-Auslastung (%)
```
Auslastung = committed / budget * 100
```
- < 80% = Gruen (Luft vorhanden)
- 80-95% = Gelb (aufpassen)
- > 95% = Rot (fast aufgebraucht oder ueberschritten)

**Status im Tool:** Wird als ProgressMicro-Bar angezeigt, aber nicht als explizite Prozentzahl. FEHLT.

### KPI 2: Offene Betraege ohne Freigabe
```
Offen = SUM(current_amount WHERE status IN (open, submitted_for_approval))
```
Das ist das Geld das "in der Pipeline" ist aber noch nicht genehmigt. Das ist Risiko — es koennte noch steigen oder fallen.

**Status im Tool:** FEHLT komplett. Es gibt keinen separaten KPI dafuer.

### KPI 3: Committed vs. Budget pro Department
Pro Department: Wie viel ist genehmigt/bestellt vs. wie viel Budget gibt es?
Am besten als gestapeltes Balkendiagramm.

**Status im Tool:** Die DepartmentSummary im Backend berechnet das, aber das Frontend zeigt es nur in der SummaryStrip als Aggregat, nicht pro Department.

### KPI 4: Cash-Out Forecast vs. Plan
Wann fliesst wirklich Geld ab? Stimmt das mit dem Plan ueberein?
- **Plan:** `expected_cash_out` Datum pro Item
- **Ist:** Tatsaechliches Zahlungsdatum (haben wir noch nicht)

**Status im Tool:** Cash-Out Timeline existiert als Feature, aber nur als Forecast (Plan). Kein Ist-Vergleich.

### KPI 5: Anzahl Items ohne Angebot (= Risiko)
```
Risiko-Items = COUNT(WHERE cost_basis = 'cost_estimation')
```
Items die nur auf einer Kostenschaetzung basieren sind UNSICHER. Je mehr davon, desto groesser das Risiko dass das Budget nicht reicht.

**Status im Tool:** Die `calculateRiskLevel`-Funktion erfasst das teilweise (cost_estimation = medium/high risk). Aber es gibt keinen aggregierten KPI "X Items / Y EUR ohne Angebotsgrundlage".

### KPI 6: Groesste Einzelpositionen
Top 5 oder Top 10 Items nach `current_amount`. Weil eine einzelne teure Position das ganze Budget sprengen kann.

**Status im Tool:** FEHLT. Die Tabelle ist sortierbar, aber es gibt keine hervorgehobene "Top Items" Ansicht.

### KPI 7: Variance-Trend
Wie entwickeln sich die Abweichungen ueber die Zeit? Werden die Items eher teurer oder billiger?
```
Trend = SUM(original - current) letzte 30 Tage vs. vorherige 30 Tage
```

**Status im Tool:** FEHLT. Kein Zeitverlauf der Abweichungen.

---

## 4. Welche Berechnungen sind FALSCH oder UNKLAR?

### FEHLER 1: Committed zaehlt ALLE Items (KRITISCH)

**Datei:** `frontend/src/hooks/useFilteredData.ts`, Zeile 99
```typescript
const committed = items.reduce((sum, ci) => sum + ci.current_amount, 0);
```

**Problem:** Zaehlt Items mit Status `open`, `rejected`, `obsolete` als committed. Ein abgelehntes Item mit 500k ist NICHT committed.

**Fix:**
```typescript
const COMMITTED_STATUSES = new Set([
  'approved', 'submitted_for_approval',
  'pending_supplier_negotiation', 'pending_technical_clarification'
]);
const committed = items
  .filter(ci => COMMITTED_STATUSES.has(ci.approval_status))
  .reduce((sum, ci) => sum + ci.current_amount, 0);
```

Oder noch strenger (nur wirklich gebundene Betraege):
```typescript
const HARD_COMMITTED = new Set(['approved']);
```

Welche Variante haengt von der Geschaeftspolitik ab. Vorschlag: Zwei Werte anzeigen:
- **Fest committed** = approved
- **Pipeline** = submitted + pending

### FEHLER 2: Budget ignoriert Zielanpassungen (KRITISCH)

**Datei:** `frontend/src/hooks/useFilteredData.ts`, Zeile 102-105
```typescript
const budget = filteredDepartments.reduce(
  (sum, d) => sum + d.budget_total, 0
);
```

**Problem:** `budget_total` ist der Ausgangswert. Zielanpassungen (`BudgetAdjustment`) werden nicht addiert.

**Fix:** Die Mock-Daten oder der API-Call muessen Zielanpassungen liefern und hier addieren:
```typescript
const adjustments = mockBudgetAdjustments
  .filter(adj => filteredDeptIds.has(adj.department_id))
  .reduce((sum, adj) => sum + adj.amount, 0);
const budget = baseBudget + adjustments;
```

### FEHLER 3: Delta-Definition inkonsistent (MITTEL)

**Frontend:** `delta = SUM(original - current)` = Item-Variance
**Backend:** `delta = budget - spent` = Budget-Remaining
**Excel:** `delta = budget - cost_of_completion`

Drei verschiedene Berechnungen, ein Name. Das fuehrt zu Verwirrung.

**Fix:** Umbenennen:
- Frontend-Delta → `variance` (Kostenabweichung)
- Backend-Delta → `remaining` (Budgetrest)
- Oder Backend-Delta streichen, weil es redundant zu `remaining` ist

### FEHLER 4: Cost of Completion im Backend falsch (MITTEL)

**Datei:** `backend/app/services/aggregation.py`, Zeile 36-41
```python
cost_of_completion = SUM(current_amount WHERE status != APPROVED)
```

**Problem:** "Alles was nicht approved ist" ergibt keinen Sinn als "Cost of Completion". Cost of Completion = Gesamtkosten aller noch aktiven/relevanten Items.

**Fix:**
```python
EXCLUDED = {ApprovalStatus.REJECTED, ApprovalStatus.OBSOLETE}
coc_result = await session.execute(
    select(func.coalesce(func.sum(CostItem.current_amount), 0)).where(
        CostItem.approval_status.notin_(EXCLUDED)
    )
)
```

### FEHLER 5: Negatives Remaining ohne Warnung (NIEDRIG)

**Datei:** `frontend/src/components/summary/SummaryStrip.tsx`

Die `remainingColor`-Funktion gibt "rot" zurueck wenn remaining < 5% des Budgets. Aber es gibt keinen Unterschied zwischen "5% Rest" und "30% ueberschritten". Beides ist einfach rot.

**Fix:** Wenn `remaining < 0`, eigene Darstellung:
```typescript
if (remaining < 0) return 'over-budget'; // Neuer Zustand
```
Mit rotem Hintergrund, Warnsymbol und Text "Budget ueberschritten um X EUR".

### FEHLER 6: Fehlender Status "Ordered" (MITTEL)

Die `ApprovalStatus`-Enum hat keinen Status `ordered`. Im CAPEX-Kontext ist der Ablauf:
```
Open → Submitted → Approved → Ordered → Delivered → Paid
```

"Ordered" ist der Punkt an dem Geld WIRKLICH committed ist (PO ist raus, Vertrag ist unterschrieben). Ohne diesen Status kann man nicht unterscheiden zwischen "darf bestellt werden" und "ist bestellt".

**Fix:** `ordered` und `delivered` als Status hinzufuegen:
```typescript
export type ApprovalStatus =
  | 'open'
  | 'submitted_for_approval'
  | 'approved'
  | 'ordered'          // NEU
  | 'delivered'        // NEU
  | 'rejected'
  | 'on_hold'
  | 'pending_supplier_negotiation'
  | 'pending_technical_clarification'
  | 'obsolete';
```

---

## 5. Empfehlungen — Konkrete Aenderungen

### Prioritaet 1: Committed-Berechnung fixen (SOFORT)

Die aktuelle Berechnung ist schlicht falsch. Rejected und Obsolete Items als committed zu zaehlen verzerrt alle KPIs.

**Dateien:**
- `frontend/src/hooks/useFilteredData.ts` — Filter auf committed Items
- `backend/app/services/aggregation.py` — `total_spent` mit Statusfilter

### Prioritaet 2: Zielanpassungen in Budget einrechnen (SOFORT)

Ohne das zeigt das Budget eine FALSCHE Zahl an. Wenn eine Zielanpassung von +200k genehmigt wurde, muss das Budget auch 200k hoeher sein.

**Dateien:**
- `frontend/src/hooks/useFilteredData.ts` — Budget-Berechnung erweitern
- `frontend/src/mocks/data.ts` — Mock-Adjustments in Budget einrechnen

### Prioritaet 3: Delta umbenennen in Variance (DIESE WOCHE)

"Delta" ist mehrdeutig. "Variance" oder "Kostenabweichung" ist eindeutig.

**Dateien:**
- `frontend/src/hooks/useFilteredData.ts` — Feld umbenennen
- `frontend/src/components/summary/SummaryStrip.tsx` — Label aendern
- `backend/app/schemas/summary.py` — Feld umbenennen

### Prioritaet 4: Budget-Ueberschreitung visuell kennzeichnen (DIESE WOCHE)

Wenn Remaining < 0: Roten Banner mit Warnung anzeigen, nicht nur eine negative Zahl.

**Datei:**
- `frontend/src/components/summary/SummaryStrip.tsx`

### Prioritaet 5: Cost of Completion im Backend fixen (DIESE WOCHE)

Die aktuelle Berechnung ist falsch (nur nicht-approved Items statt alle aktiven Items).

**Datei:**
- `backend/app/services/aggregation.py`

### Prioritaet 6: Status "Ordered" und "Delivered" einfuehren (NAECHSTE WOCHE)

Ohne diese Status kann man Committed nicht sauber von "nur genehmigt" trennen.

**Dateien:**
- `backend/app/models/enums.py`
- `frontend/src/types/budget.ts`
- Neue Alembic Migration

### Prioritaet 7: Fehlende KPIs ergaenzen (NAECHSTE WOCHE)

Mindestens diese drei KPIs in die SummaryStrip oder ein eigenes Dashboard:
- Budget-Auslastung in %
- Offene Pipeline (Betrag ohne Freigabe)
- Anzahl Items ohne Angebotsgrundlage

---

## 6. Glossar — Finanzbegriffe im CAPEX Budget Tool

### Deutsch-Englisch Glossar

| Deutsch | Englisch im Tool | Definition |
|---------|-----------------|------------|
| **Budget** | Budget | Genehmigte Gesamtmittel fuer ein Department. Setzt sich zusammen aus dem Basis-Budget (bei Projektstart festgelegt) plus allen genehmigten Zielanpassungen. |
| **Basis-Budget** | Budget Total | Der urspruenglich genehmigte Betrag pro Department. Kommt aus dem BudgetTemplate der Finanzabteilung. Kann NICHT nachtraeglich geaendert werden. |
| **Zielanpassung** | Budget Adjustment | Eine genehmigte Erhoehung (+) oder Kuerzung (-) des Budgets. Wird als separater Datensatz erfasst mit Grund, Datum und Genehmiger. Ist unveraenderlich. Aktuelles Budget = Basis-Budget + Summe aller Zielanpassungen. |
| **Committed (Gebundene Mittel)** | Committed | Summe aller Kostenpositionen die mindestens den Status "Approved" haben. Das ist Geld das verplant und/oder vertraglich gebunden ist. NICHT identisch mit "bezahlt". |
| **Pipeline (Geplante Mittel)** | Pipeline | Summe aller Kostenpositionen mit Status "Open" oder "Submitted for Approval". Das ist Geld das voraussichtlich benoetigt wird, aber noch nicht genehmigt ist. |
| **Bezahlt** | Spent | Tatsaechlich abgeflossene Zahlungen. DERZEIT NICHT IM TOOL ABGEBILDET. Wird erst relevant wenn ein ERP oder Buchhaltungssystem angebunden ist. |
| **Verbleibend** | Remaining | Budget minus Committed. Zeigt wie viel Geld noch frei verfuegbar ist. Kann negativ sein = Budget ueberschritten. |
| **Kostenabweichung** | Variance | Differenz zwischen dem urspruenglich geplanten Betrag (original_amount) und dem aktuellen Betrag (current_amount) einer Position. Positiv = billiger geworden. Negativ = teurer geworden (Mehrkosten). |
| **Gesamtkosten** | Cost of Completion | Summe aller aktuellen Betraege (current_amount) aller aktiven Positionen (alles ausser rejected/obsolete). Beantwortet: "Was kostet es, alles fertigzustellen was auf der Liste steht?" |
| **Kostenposition** | Cost Item / Line Item | Eine einzelne geplante Ausgabe. Hat einen Betrag, ein erwartetes Zahlungsdatum, einen Genehmigungsstatus und gehoert zu einer Work Area in einem Department. |
| **Ursprungsbetrag** | Original Amount | Der erste geplante Betrag einer Kostenposition, zum Zeitpunkt der Erfassung. Wird nie ueberschrieben. Dient als Referenz fuer die Kostenabweichung. |
| **Aktueller Betrag** | Current Amount | Der aktuelle (ggf. angepasste) Betrag einer Kostenposition. Aendert sich wenn ein neues Angebot reinkommt oder der Scope sich aendert. |
| **Kostenbasis** | Cost Basis | Woher kommt der Betrag? Kostenschaetzung, erstes Lieferantenangebot, ueberarbeitetes Angebot, oder Aenderungskosten. Je besser die Basis, desto zuverlaessiger die Zahl. |
| **Kostentreiber** | Cost Driver | Warum wird diese Ausgabe benoetigt? Produkt, Prozess, neue Anforderung Assembly/Testing, oder initialer Aufbau. |
| **Genehmigungsstatus** | Approval Status | Wo steht diese Position im Freigabeprozess? Moegliche Werte: Open, Submitted, Approved, Ordered, Delivered, Rejected, On Hold, Pending Supplier, Pending Technical, Obsolete. |
| **Erwarteter Zahlungstermin** | Expected Cash Out | Wann wird das Geld voraussichtlich abfliessen? Bestimmt die Position in der Cash-Out Timeline. Ein Datum pro Position (kein Splitting ueber Monate). |
| **Cash-Out Timeline** | Cash-Out Timeline | Aggregierte Ansicht: Wie viel Geld fliesst pro Monat ab? Basiert auf den Expected Cash-Out Daten aller Positionen. Wird fuer den Liquiditaetsplan der Finanzabteilung benoetigt. |
| **Risikolevel** | Risk Level | Automatisch berechnete Einschaetzung. High = Kostenschaetzung ueber 50k EUR (keine Angebotsgrundlage, hoher Betrag). Medium = offene Position ueber 20k oder jede Kostenschaetzung. Low = alles andere. |
| **Work Area** | Work Area | Untergliederung eines Departments. Beispiel: Department "Assembly" hat Work Areas "Chassis Assembly", "Drivetrain Station", "Battery Pack Line" etc. |
| **Department** | Department | Organisatorische Einheit mit eigenem Budget. Beispiele: Assembly, Testing, Intralogistics, Building & Infrastructure, Prototyping Lab. |
| **Phase** | Project Phase | In welcher Projektphase wird die Position benoetigt? Phase 1 bis Phase 4 (ehemals Bryan-Start, Bryan-Finish, Guenther-Start, Automation). |
| **Produkt** | Product | Fuer welches Produkt/Fahrzeugprojekt ist die Position? Atlas, Orion, Vega oder Overall (produktuebergreifend). |
| **Reserve-Faktor** | Budget Adjustment Factor | Der 0.85-Faktor aus dem Excel: 15% werden vom BudgetTemplate-Betrag abgezogen als Reserve/Contingency. Im neuen Tool sollte dieser Faktor konfigurierbar sein, nicht hardcoded. |

### Status-Lifecycle einer Kostenposition

```
Open                          Position erfasst, noch keine Aktion
  |
  v
Submitted for Approval        Zur Freigabe eingereicht
  |
  +---> Rejected              Abgelehnt (zaehlt NICHT als committed)
  +---> On Hold               Zurueckgestellt (zaehlt NICHT als committed)
  |
  v
Approved                      Freigegeben, darf bestellt werden
  |                           (zaehlt als committed)
  v
Ordered (NEU)                 Bestellt, PO ist raus
  |                           (zaehlt als HART committed)
  v
Delivered (NEU)               Geliefert, Abnahme erfolgt
  |
  v
[Bezahlt - erst mit ERP]      Rechnung bezahlt

Sonderstatus:
- Pending Supplier Negotiation  = Warten auf Lieferant
- Pending Technical Clarification = Technische Klaerung offen
- Obsolete                       = Nicht mehr relevant (zaehlt NICHT)
```

---

## Zusammenfassung der kritischen Findings

| # | Finding | Schwere | Status |
|---|---------|---------|--------|
| 1 | Committed zaehlt ALLE Items inkl. rejected/obsolete | KRITISCH | Falsch |
| 2 | Budget ignoriert Zielanpassungen | KRITISCH | Falsch |
| 3 | "Delta" hat 3 verschiedene Definitionen (FE/BE/Excel) | MITTEL | Verwirrend |
| 4 | Cost of Completion im Backend falsch berechnet | MITTEL | Falsch |
| 5 | Kein Status "Ordered"/"Delivered" | MITTEL | Fehlt |
| 6 | Negative Remaining ohne explizite Warnung | NIEDRIG | Unvollstaendig |
| 7 | "Spent" wird als Begriff verwendet, existiert aber nicht | NIEDRIG | Irrefuehrend |
| 8 | Budget-Auslastung in % fehlt als KPI | NIEDRIG | Fehlt |
| 9 | Pipeline-KPI (offene Betraege) fehlt | NIEDRIG | Fehlt |
| 10 | Kein Glossar/Hilfe im Tool | NIEDRIG | Fehlt |

**Bottom Line:** Die Zahlen im SummaryStrip sind aktuell NICHT verlaesslich. Ein IE der darauf basierend Entscheidungen trifft, arbeitet mit falschen Zahlen. Die Fixes 1 und 2 sind SOFORT noetig.
