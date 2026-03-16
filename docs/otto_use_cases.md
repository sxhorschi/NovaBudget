# OTTO's Use Cases & MVP Requirements
## CAPEX Budget Tool — Weil Excel einfach nicht mehr reicht

**Autor:** OTTO (genervter Industrial Engineer, kein Finance-Typ)
**Datum:** 2026-03-16
**Status:** Ehrlich, direkt, und ein bisschen wütend

---

## 1. Marktrecherche: Was machen die anderen?

### Finario — Der Enterprise-Goldstandard
[Finario](https://www.finario.com/) ist das einzige Tool das sich traut zu sagen: "Wir machen NUR CAPEX." End-to-end: Budgeting, Approvals, Forecasting, Reporting. Unified Interface, ERP-Integration, Ad-hoc Query Builder.

**Was die gut machen:**
- Single Source of Truth für CAPEX — kein Rumgesuche in 17 Tabs
- Approval Workflows eingebaut, nicht draufgefrickelt
- Actuals kommen automatisch aus dem ERP rein
- Variance Reporting out-of-the-box

**Was für uns Overkill ist:**
- Enterprise-Pricing (wir sind ein Startup, kein DAX-Konzern)
- ERP-Integration — wir HABEN noch kein ERP das sauber läuft
- Multi-Entity, Multi-Currency Consolidation — wir haben EINE Fabrik

### Banner (YC) — CRE-fokussiert, aber gute Ideen
[Banner](https://withbanner.com/) baut Software für Commercial Real Estate Owner um Capital Spend zu managen. Budgets erstellen, Projects bidding, Schedule Tracking, Contracting, Invoicing — alles in einem System.

**Was die gut machen:**
- "Replace spreadsheets, file sharing, and emails" — exakt unser Problem
- 80%+ administrative Arbeit automatisiert
- Purpose-built und fully customizable

**Was für uns nicht passt:**
- CRE-Kontext (Gebäude kaufen/verkaufen), nicht Manufacturing Equipment
- Wir brauchen keine Bidding/Contracting Workflows
- Aber die DENKWEISE ist richtig: Ein System statt 5 Tools

### ERPNext Budget Module — Open Source, aber halbgar
[ERPNext Budgeting](https://docs.erpnext.com/docs/user/manual/en/budgeting) hat ein Budget-Modul mit Cost Centers, Monthly Distribution, Variance Reporting und Budget Controls (Stop/Warn/Ignore).

**Was die gut machen:**
- Open Source, self-hosted möglich
- Monthly Distribution für Budget-Planung
- Warn/Stop Controls wenn Budget überschritten wird

**Was problematisch ist:**
- [CAPEX Budgeting wird NICHT nativ unterstützt](https://github.com/frappe/erpnext/issues/22789) — nur OPEX über P&L Accounts
- Workaround nötig über Custom Expense Accounts
- UI ist... funktional. Nicht inspirierend.
- Overkill als Gesamtsystem wenn man nur Budget-Tracking braucht

### Smartsheet — Fancy Excel, aber immer noch Excel-Denke
[Smartsheet](https://www.smartsheet.com/content/it-budget-templates) hat CapEx vs. OpEx Templates, Project Budget Tracking, Dashboards, Automated Alerts.

**Was die gut machen:**
- Real-time Updates und Collaboration
- CapEx/OpEx Trennung eingebaut
- Dashboards die tatsächlich nützlich sind
- Line-by-line Variance Tracking (budgeted vs. actual)

**Was nervt:**
- Es ist im Kern immer noch eine Tabelle mit Makeup
- Hierarchien (Department → Work Area → Phase → Line Item) sind möglich aber fummelig
- Cash-Out Planung über Monate? Manuell oder mit Formeln die keiner versteht

### Monday.com — Hübsch, aber für Budget ein Witz
[Monday.com](https://support.monday.com/hc/en-us/articles/115005311969-Manage-your-budget-with-monday-com) kann Numbers Columns für Budgets. Das war's eigentlich.

**Was die gut machen:**
- UI ist clean, Leute benutzen es gerne
- Dashboards sehen gut aus
- Real-time Collaboration funktioniert

**Was NICHT geht:**
- Keine native CAPEX/OPEX Kategorisierung
- Keine Budget-Strukturen, keine Forecasts
- Braucht Third-Party Apps wie [Budgety](https://www.deiser.com/apps/budgety) um überhaupt brauchbar zu sein
- Datensilos weil Budget-Felder nicht Teil des Board-Designs sind

### Zusammenfassung der Recherche

| Tool | CAPEX-fit | Startup-fit | UX | Preis |
|------|-----------|-------------|-----|-------|
| Finario | ★★★★★ | ★★☆☆☆ | ★★★★☆ | $$$$$ |
| Banner | ★★★☆☆ | ★★★★☆ | ★★★★★ | $$$ |
| ERPNext | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ | Free/$ |
| Smartsheet | ★★★☆☆ | ★★★★☆ | ★★★☆☆ | $$ |
| Monday.com | ★☆☆☆☆ | ★★★★☆ | ★★★★★ | $$ |

**Erkenntnis:** Kein Tool trifft unseren Sweet Spot — CAPEX für ein Startup das eine Fabrik aufbaut. Finario kann's, kostet aber wie ein Kleinwagen. Der Rest ist entweder nicht CAPEX-fähig oder zu generisch. Also bauen wir's selbst. Fokussiert. Minimal. Funktional.

---

## 2. Use Cases — Aus der Perspektive eines genervten IE

### UC-01: "Wie viel Budget hab ich noch?"
**Als** IE der gerade ein Angebot für eine Montagestation auf dem Tisch hat,
**will ich** in EINER Ansicht sehen: Gesamtbudget, bereits committed, noch verfügbar — pro Department und Work Area,
**damit ich** in 5 Sekunden entscheiden kann ob ich das Angebot weiterverfolge oder erstmal den CFO anrufe.

**Warum Excel hier versagt:** Ich muss das Summary Sheet öffnen, dann querverweisen mit dem Detail-Sheet, hoffen dass die Formeln stimmen, und beten dass nicht jemand eine Zeile gelöscht hat. Das kostet 10 Minuten statt 5 Sekunden.

---

### UC-02: "Was ist noch nicht approved?"
**Als** IE der das Weekly mit dem Management vorbereitet,
**will ich** eine gefilterte Liste aller Line Items die NICHT den Status "Approved" oder "Ordered" haben, gruppiert nach Department,
**damit ich** weiß welche Items ich eskalieren muss und welche noch in der Pipeline stecken.

**Warum Excel hier versagt:** Ich filtere die Spalte, aber dann sind die Summen kaputt. Ich kopiere es in ein neues Sheet, aber dann ist es nicht mehr aktuell. Ich mache SUBTOTAL-Formeln, aber die versteht nach mir keiner mehr.

---

### UC-03: "Cash-Out Planung ohne Copy-Paste-Hölle"
**Als** IE der dem Finance-Team monatliche Cash-Out Forecasts liefern muss,
**will ich** pro Line Item ein Expected Cash-Out Datum setzen und dann eine aggregierte Monatsansicht sehen (wie viel fließt wann ab),
**damit ich** das einfach als Report exportieren kann statt jedes Mal manuell Beträge in Monatsspalten zu verschieben.

**Warum Excel hier versagt:** Die BudgetTemplate hat Monate als Spalten (Jan 2025 bis Dez 2030). Wenn sich ein Liefertermin verschiebt, muss ich den Betrag aus einer Zelle in eine andere MANUELL verschieben. Bei 200+ Items. Jeden Monat. Ich werde wahnsinnig.

---

### UC-04: "Zielanpassung tracken ohne Formel-Angst"
**Als** IE der Budget-Änderungen transparent halten muss,
**will ich** Zielanpassungen (Budget-Erhöhungen oder -Kürzungen) als eigene Einträge erfassen, die das Original-Budget nicht überschreiben sondern ADDITIV wirken,
**damit ich** jederzeit sehen kann: "Ursprünglich waren 500k geplant, dann kam +80k Zielanpassung, aktuelles Budget ist 580k" — und niemand kann mir eine Formel kaputtmachen.

**Warum Excel hier versagt:** Jemand ändert den Betrag direkt in der Zelle. Weg ist die Historie. Oder jemand fügt eine Spalte ein und alle SUMME-Formeln verweisen ins Nirvana. Schon dreimal passiert. DREIMAL.

---

### UC-05: "Phasen-Überblick für die Geschäftsleitung"
**Als** IE der dem CEO erklären muss wo wir stehen,
**will ich** eine Ansicht die nach Phase gruppiert (Bryan-Start, Bryan-Finish, Günther-Start, Automation) und pro Phase zeigt: geplant, committed, bezahlt, delta,
**damit ich** in 2 Minuten ein Bild malen kann statt 20 Minuten Zahlen zusammenzusuchen.

**Warum Excel hier versagt:** Die Phasen-Info steckt in einer Spalte. Ich muss Pivot-Tabellen bauen. Die Pivot-Tabelle refreshed nicht automatisch. Das Resultat sieht aus wie eine Steuererklärung.

---

### UC-06: "Ich will filtern und die Summen müssen stimmen"
**Als** IE der nach verschiedenen Dimensionen schneiden will (Department, Phase, Status, Produkt),
**will ich** interaktive Filter die sofort die aggregierten Zahlen (Summe, Remaining Budget, Cash-Out) anpassen,
**damit ich** ad-hoc Fragen beantworten kann wie "Was haben wir für Günther im Testing-Bereich committed?"

**Warum Excel hier versagt:** Excel-Filter + SUMME = Lüge. SUBTOTAL hilft, aber bei verschachtelten Hierarchien wird's ein Albtraum. Und wenn zwei Leute gleichzeitig filtern... ja, genau.

---

### UC-07: "Export für Finance — aber ohne dass ich es nochmal umformatiere"
**Als** IE der die Budgetdaten ins Finance-Template überführen muss,
**will ich** einen Export der die Daten im Format des BudgetTemplates ausspuckt (Account, Cost Center, monatliche Verteilung, Abschreibung),
**damit ich** nicht jeden Monat 2 Stunden mit Copy-Paste und SVERWEIS verbringe.

**Warum Excel hier versagt:** Weil das Finance-Template ein ANDERES Excel ist mit einer ANDEREN Struktur. Und ich bin der menschliche ETL-Prozess dazwischen. Das ist unwürdig.

---

## 3. MVP Requirements — Tag 1, sonst bleib ich bei Excel

### MUSS HABEN (Deal-Breaker)

#### 3.1 Datenmodell
- **Hierarchie:** Department → Work Area → Phase → Line Item
- **Line Item Felder:** Description, Amount (€), Expected Cash-Out Date, Cost Basis, Cost Driver, Assumptions (Freitext), Approval Status, Zielanpassung
- **Enums fest definiert:**
  - Phase: `Bryan-Start`, `Bryan-Finish`, `Günther-Start`, `Automation`
  - Status: Die 8 bestehenden Werte aus der Excel (z.B. Draft, Requested, Approved, Ordered, Delivered, Cancelled, On Hold, Rejected)
  - Produkt: `Bryan`, `Günther`, `Gin-Tonic`, `Overall`
- **Zielanpassung als separater Datensatz**, nicht als Überschreibung. Original bleibt erhalten.

#### 3.2 Dashboard / Hauptansicht
- **Ein Screen** der mir zeigt:
  - Gesamtbudget vs. Committed vs. Remaining — pro Department
  - Ampelfarben: Grün (<80%), Gelb (80-95%), Rot (>95%)
  - Anzahl offener (nicht-approved) Items
- Kein Klick nötig um den Gesamtstatus zu erfassen. KEIN. EINZIGER. KLICK.

#### 3.3 Tabellenansicht mit echten Filtern
- Alle Line Items in einer Tabelle
- Filter nach: Department, Work Area, Phase, Status, Produkt
- **Summen passen sich dynamisch an die Filter an** — das ist DER Grund warum Excel versagt
- Sortierbar nach jeder Spalte
- Inline-Edit (Doppelklick auf Zelle → ändern → fertig)

#### 3.4 Cash-Out Monatsansicht
- Aggregierte Ansicht: Wie viel Cash fließt pro Monat ab?
- Basiert auf dem Expected Cash-Out Date der Line Items
- Balkendiagramm oder Tabelle — Hauptsache auf einen Blick
- Wenn ich ein Datum verschiebe, aktualisiert sich die Monatsansicht SOFORT

#### 3.5 Zielanpassung
- Pro Department (oder Work Area) kann eine Zielanpassung erfasst werden
- Felder: Betrag (+/-), Datum, Begründung, Approved By
- Das Dashboard zeigt: `Original Budget + Σ Zielanpassungen = Aktuelles Budget`
- Historie ist unveränderlich. Kein Löschen, kein Editieren alter Einträge.

#### 3.6 Import aus Excel
- Einmaliger Import der bestehenden Excel-Daten (alle 5 Departments)
- Muss nicht fancy sein — CSV Upload reicht
- Aber die Hierarchie muss erhalten bleiben

#### 3.7 Export
- Excel/CSV Export der aktuellen Ansicht (mit aktiven Filtern)
- Ein dedizierter "Finance Export" der ins BudgetTemplate-Format mapped

### NICE TO HAVE (Woche 2-4)

- Approval Workflow (Status-Übergänge mit Berechtigungen)
- Audit Log (wer hat wann was geändert)
- Mehrere User mit Rollen (Viewer, Editor, Approver)
- Kommentare pro Line Item
- Anhänge (Angebote, Specs) pro Line Item

---

## 4. Anti-Requirements — Was wir NICHT bauen

### Klingt cool, ist Zeitverschwendung im MVP:

| Feature | Warum nicht |
|---------|------------|
| **ERP-Integration** | Wir haben kein sauberes ERP. Punkt. Wenn wir eins haben, reden wir nochmal. |
| **Multi-Currency** | Wir arbeiten in Euro. Fertig. |
| **Multi-Entity / Multi-Site** | Eine Fabrik. Ein Budget. Wenn wir zweite Fabrik bauen haben wir andere Probleme. |
| **Automatische Abschreibungsberechnung** | Das macht Finance. Nicht mein Job. Nicht im Tool. |
| **AI-basierte Forecasts** | Bitte nicht. Meine Forecasts basieren auf Angeboten und Erfahrungswerten, nicht auf einem LLM das halluziniert dass die Montagelinie 30% günstiger wird. |
| **Gantt Charts / Projekt-Timeline** | Wir haben MS Project dafür. Das Budget-Tool trackt GELD, nicht ZEIT. |
| **Supplier Management** | Kein Lieferantenportal. Kein Bidding. Kein RFQ-Prozess. |
| **Inventory / Asset Tracking** | Das ist NACH dem Kauf. Wir tracken VOR dem Kauf. Anderes Problem. |
| **Mobile App** | Ich stehe nicht an der Produktionslinie und genehmige CAPEX-Items auf dem Handy. Ich sitze am Schreibtisch. Web reicht. |
| **Notifications / E-Mail Alerts** | Im MVP? Nein. Wir sind 5 Leute. Wir reden miteinander. |
| **Custom Reports Builder** | Die 3-4 Views die wir definieren reichen. Kein Drag-and-Drop Report Designer. |
| **Integration mit Smartsheet/Monday/Jira** | Wir ERSETZEN die Tools, wir integrieren sie nicht. |
| **Budget-Versionierung** | "Was wäre wenn" Szenarien klingen toll. Im MVP reicht: Was IST. |
| **Workflow Engine** | Status-Änderungen per Dropdown reichen. Kein BPMN-Editor. |

---

## 5. Erfolgs-Kriterien

Ich schmeiße meine Excel weg wenn:

1. **Ich in <10 Sekunden** weiß wie viel Budget in jedem Department übrig ist
2. **Ich in <30 Sekunden** eine gefilterte Liste aller offenen Items für mein Weekly habe
3. **Cash-Out Updates** keine manuelle Arbeit mehr erfordern — Datum ändern, fertig
4. **Zielanpassungen** transparent und unveränderlich getrackt werden
5. **Der Finance-Export** maximal 2 Klicks braucht statt 2 Stunden
6. **Niemand** mir eine Formel kaputt machen kann. NIEMAND.

---

## 6. Tech-Rahmenbedingungen (Vorschlag)

Kein Over-Engineering. Wir sind ein Startup.

- **Frontend:** React oder Vue, irgendwas mit einer guten Table-Komponente (AG Grid, TanStack Table)
- **Backend:** Python (FastAPI) oder Node (Express) — was das Team kann
- **Datenbank:** PostgreSQL — weil relationale Hierarchien unser Brot und Butter sind
- **Deployment:** Docker auf einem einfachen Server oder Cloud-VM. Kein Kubernetes für 5 User.
- **Auth:** Basic Auth oder SSO über bestehenden Provider. Kein eigenes Identity Management.

---

*Dieses Dokument wurde geschrieben von einem IE der seine Excel-Datei hasst, aber respektiert was sie geleistet hat. Es ist Zeit für was Besseres. Kein Feature-Bloat. Kein Enterprise-Tool. Einfach ein Tool das FUNKTIONIERT.*

---

Sources:
- [Finario CAPEX Software](https://www.finario.com/)
- [Finario Capital Planning](https://www.finario.com/capital-planning-software/)
- [Banner (YC)](https://withbanner.com/)
- [Banner YC Profile](https://www.ycombinator.com/companies/banner)
- [ERPNext Budgeting Docs](https://docs.erpnext.com/docs/user/manual/en/budgeting)
- [ERPNext CAPEX Issue #22789](https://github.com/frappe/erpnext/issues/22789)
- [Smartsheet IT Budget Templates](https://www.smartsheet.com/content/it-budget-templates)
- [Monday.com Budget Management](https://support.monday.com/hc/en-us/articles/115005311969-Manage-your-budget-with-monday-com)
- [Budgety for Monday.com](https://www.deiser.com/apps/budgety)
- [15 Best CapEx Software 2026](https://thecfoclub.com/tools/best-capex-software/)
- [CAPEX Planning Best Practices (Limelight)](https://www.golimelight.com/blog/capex-planning)
- [CapEx Budgeting Smart Steps](https://www.gsquaredcfo.com/blog/capex-budgeting-smart-steps-for-business-owners)
