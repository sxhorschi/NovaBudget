# CAPEX Budget Tooling -- Benchmark Research

Stand: 2026-03-16

---

## 1. Was kostet ein EV-Fabrikaufbau? Realistische Zahlen

### Gesamtkosten-Referenzen

| Unternehmen | Fabrik | Investition |
|---|---|---|
| Tesla | Gigafactory Nevada | ~$5 Mrd. |
| Rivian | Normal, Illinois (Retooling) | >$5 Mrd. |
| Rivian | Georgia (pausiert) | $5 Mrd. geplant |
| Lucid | AMP-1, Arizona Phase 1 | $700 Mio. |
| Lucid | AMP-2, Saudi-Arabien | $3.4 Mrd. (Finanzierung) |
| Hyundai | Georgia EV + Battery Plant | $7.6 Mrd. |

Für Battery-Gigafactories: Durchschnitt ~$80/kWh-pa Kapazität global, aber starke regionale Unterschiede (China am günstigsten, USA/Japan 2x+ teurer).

### Typische CAPEX-Kategorien einer EV-Fabrik

Aus verschiedenen Quellen zusammengetragen:

| Kategorie | Anteil (geschaetzt) | Beispiele |
|---|---|---|
| **Manufacturing Equipment** | 50-60% | Roboter, Montagelinien, Testequipment, Batterieassembly |
| **Gebäude/Bau** | 20-30% | Fabrikhalle, Reinräume, Trockenkammern, Büros |
| **Infrastruktur/Utilities** | 10-15% | Strom, Wasser, HVAC, Abfall |
| **IT/Automation** | 5-10% | MES, Netzwerk, Sicherheitssysteme |
| **Sonstiges** | 3-5% | Umwelt-Compliance, Sicherheit, Erstausstattung |

**Takeaway für TYTAN:** Equipment ist der größte Posten (50-60%). Das Budget-Tool muss hier die feinste Granularität bieten. Gebäude/Bau ist typischerweise ein Großprojekt mit eigener Steuerung.

---

## 2. Equipment Procurement -- Der typische Prozess

### Standardprozess (vereinfacht)

```
Bedarf erkennen
    |
    v
Spezifikation erstellen (IE/Production Planner)
    |
    v
Budget-Anfrage / CAPEX Request
    |
    v
Genehmigung (abhängig von Schwellenwerten)
    |
    v
Ausschreibung / RFQ an Lieferanten
    |
    v
Angebotsvergleich + technische Bewertung
    |
    v
Verhandlung + Vergabe
    |
    v
PO / Bestellung
    |
    v
Lieferung + Abnahme
    |
    v
Installation + Inbetriebnahme (Commissioning)
    |
    v
Abnahme / Sign-Off
```

### Genehmigungsschwellen (Best Practice)

Typische Staffelung in der Industrie:

| Betrag | Genehmiger |
|---|---|
| < $10k | Teamlead / Supervisor |
| $10k - $50k | Abteilungsleiter |
| $50k - $250k | VP Operations / Finance |
| $250k - $1M | C-Level / Director |
| > $1M | Board / Executive Committee |

**Takeaway für das Tool:** Der Approval-Workflow muss konfigurierbare Schwellenwerte unterstützen. Jeder Schritt braucht Timestamps und Verantwortliche.

### Dokumente je Phase

- **Bedarf:** Business Case, Kapazitätsanalyse
- **Spezifikation:** Technisches Lastenheft, Raumplanung
- **Ausschreibung:** RFQ-Dokument, Bewertungsmatrix
- **Angebot:** Angebotsvergleich, TCO-Analyse
- **Genehmigung:** CAPEX Approval Form, ROI-Berechnung
- **Bestellung:** Purchase Order, Liefervertrag
- **Lieferung:** Lieferschein, Inspektionsprotokoll
- **Inbetriebnahme:** Abnahmeprotokoll, Schulungsnachweis

**Takeaway für das Tool:** Dokumenten-Upload pro Item und Phase ist ein Muss. Mindestens Links/Attachments pro Budget-Position.

---

## 3. CAPEX Tracking Methoden

### Earned Value Management (EVM) für CAPEX

EVM ist der Industriestandard für Fortschrittsmessung bei Investitionsprojekten:

- **Planned Value (PV)** = Gesamtbudget x geplanter %-Fortschritt
- **Earned Value (EV)** = Gesamtbudget x tatsächlicher %-Fortschritt
- **Actual Cost (AC)** = tatsächlich ausgegebenes Geld

Daraus:
- **CPI (Cost Performance Index)** = EV / AC -- über 1.0 = unter Budget
- **SPI (Schedule Performance Index)** = EV / PV -- über 1.0 = vor Zeitplan

### S-Kurve für Budget-Tracking

Die S-Kurve visualisiert den kumulativen Budgetverbrauch über die Zeit:
- **Baseline (Plan):** Die Performance Measurement Baseline
- **Actual:** Tatsaechliche Ausgaben
- **Forecast:** Hochrechnung basierend auf aktuellem Trend

Typisch: Langsamer Start (Planung), steiler Anstieg (Beschaffung/Bau), Abflachung (Inbetriebnahme).

**Takeaway für das Tool:** Eine S-Kurve (Plan vs. Actual vs. Forecast) waere ein starkes Dashboard-Feature. Aktuell tracken wir schon `spent` vs. `budget` -- fehlt noch die Zeitkomponente.

### Contingency / Reserve Management

Best Practices:
- **Contingency Reserve:** 5-15% des Projektbudgets für bekannte Risiken
- **Management Reserve:** zusaetzlich für unbekannte Risiken (oft 5-10%)
- P50-Wert für Contingency, P80/P90 für Management Reserve
- **Contingency soll dynamisch sinken** wenn Risiken mitigiert werden

**Der 0.85-Faktor in unserem Tool:** Das ist de facto ein 15% Contingency-Abschlag auf "Remaining". Das ist sinnvoll, aber:
- Sollte konfigurierbar sein (nicht hardcoded)
- Sollte pro Kategorie unterschiedlich sein können (Bau: höher, Standard-Equipment: niedriger)
- Dokumentation warum 0.85 gewaehlt wurde

---

## 4. Warum Excel für CAPEX Tracking scheitert

### Die harten Fakten

- **~90% aller Spreadsheets enthalten signifikante Fehler** (Studien belegen das konsistent)
- Ein einziger Formelfehler kann das gesamte Budget verfälschen

### Konkrete Probleme

| Problem | Auswirkung | Unser Tool loest das durch... |
|---|---|---|
| **Kein Audit Trail** | Wer hat wann was geändert? Niemand weiss es | Backend-seitiges Change Log |
| **Keine Versionierung** | "Budget_v3_final_FINAL2.xlsx" | Datenbank mit History |
| **Concurrent Access** | Datei gesperrt, jemand hat sie offen gelassen | Web-App, gleichzeitiger Zugriff |
| **Keine Validierung** | Buchstaben in Zahlenfeldern, negative Budgets | Frontend + Backend Validation |
| **Kein Approval Workflow** | Genehmigungen per Email, nicht nachvollziehbar | Status-Workflow im Tool |
| **Keine Live-Daten** | Alle arbeiten mit veralteten Zahlen | Single Source of Truth |
| **Keine Rollenaggregation** | Jede Abteilung hat eigene Datei | Zentrale Datenbank mit Views |
| **Fehleranfälligkeit** | Copy-Paste-Fehler, kaputte Formeln | Berechnete Felder server-seitig |

**Takeaway fürs Meeting mit Chris:** Das sind die Selling Points. Excel ist nicht "schlecht", aber für Multi-User CAPEX Tracking mit Audit-Anforderungen ungeeignet. Unser Tool adressiert genau diese Lücken.

---

## 5. Typischer IE/Production Planner Toolstack

### Was IEs täglich nutzen

| Tool | Zweck | Budget-Relevanz |
|---|---|---|
| **AutoCAD / Visio** | Layout-Planung | Raumplanung bestimmt Equipment-Bedarf |
| **MS Project / Primavera** | Projektplanung | Zeitliche Abfolge der Investitionen |
| **SAP (MM/PM/CO)** | ERP | Bestellungen, Anlagenbuchhaltung |
| **Excel** | Alles andere | Der zu ersetzende Status Quo |
| **Power BI / Tableau** | Reporting | Dashboard-Erwartungen der User |
| **MES-Systeme** | Produktionssteuerung | Equipment-Auslastung, OEE |

### Wie Budget-Tracking in den Workflow passt

```
Layout-Planung (AutoCAD)
    --> Equipment-Liste + Spezifikationen
        --> Budget-Tool (unser Tool!)
            --> Genehmigung
                --> SAP PO
                    --> Lieferung + Commissioning
                        --> Budget-Tool: Status-Update
```

**Takeaway:** Unser Tool sitzt zwischen Layout-Planung und SAP. Es muss:
- Equipment-Listen importieren können (CSV/Excel Import existiert schon!)
- Export für SAP-Bestellungen liefern können (zukuenftiges Feature)
- Dashboard bieten das Power BI / Tableau ersetzt (für diesen Usecase)

---

## 6. Konkrete Empfehlungen fürs Tool und fürs Meeting

### Sofort umsetzbar (Quick Wins)

1. **Contingency-Faktor konfigurierbar machen** (aktuell hardcoded 0.85)
2. **Approval-Status pro Item** (Draft -> Requested -> Approved -> Ordered -> Delivered -> Commissioned)
3. **Change History / Audit Log** sichtbar machen (Backend trackt vermutlich schon)
4. **S-Kurve Dashboard** (Plan vs. Actual über Zeit)

### Mittelfristig (Meeting mit Chris besprechen)

5. **Approval-Workflow mit Schwellenwerten** (wer darf was genehmigen?)
6. **Dokument-Attachments pro Budget-Position** (Angebote, POs, Abnahmeprotokolle)
7. **EVM-Metriken** (CPI, SPI) als Dashboard-KPIs
8. **Export-Funktion** für Management-Reporting (PDF, Excel)

### Langfristig (Roadmap)

9. **SAP-Integration** (oder zumindest SAP-kompatibler Export)
10. **Multi-Projekt-Vergleich** (verschiedene Facility-Phasen vergleichen)
11. **Monte-Carlo-Simulation** für Contingency-Berechnung
12. **Rollenbasierte Dashboards** (IE sieht Equipment-Details, CFO sieht Zusammenfassung)

---

## Quellen

- [EV Battery Manufacturing Startup Costs](https://startupfinancialprojection.com/blogs/capex/ev-battery-manufacturing)
- [EV Manufacturing Startup Costs: $94M CAPEX](https://financialmodelslab.com/blogs/startup-costs/electric-car-manufacturing)
- [Battery Gigafactory Capex Costs - Thunder Said Energy](https://thundersaidenergy.com/downloads/battery-gigafactory-capex-costs/)
- [Lucid Motors Completes $700M Factory - TechCrunch](https://techcrunch.com/2020/12/01/lucid-motors-completes-700m-factory-to-produce-its-first-electric-vehicles/)
- [Rivian CEO Sees Further Progress on Cost Cuts - IndustryWeek](https://www.industryweek.com/leadership/companies-executives/article/55241612/rivian-ceo-sees-further-progress-ahead-on-cost-cuts)
- [CapEx Approval Process Explained - Fluix](https://fluix.io/workflows/capex-approval-workflow)
- [The CapEx Procurement Process: 5 Transformative Workflows - IQX](https://www.iqxbusiness.com/iqx-blog/unlock-value-in-your-procurement-process-with-these-5-digital-transformation-workflows/)
- [CapEx Approval Process Best Practices 2025 - Aufait](https://aufaittechnologies.com/blog/capex-approval-process-best-practices/)
- [Capex Procurement Explained - Procurement Tactics](https://procurementtactics.com/capex-procurement/)
- [Capital Project Management in Manufacturing - Cerri](https://cerri.com/capital-project-management-in-manufacturing-tools-and-kpis-that-matter/)
- [Essential CAPEX KPIs for Asset Owners - Archdesk](https://archdesk.com/blog/capex-kpi-asset-owners-archdesk)
- [S-Curve in Construction - Gather Insights](https://www.gatherinsights.com/blog/everything-you-need-to-know-about-s-curves)
- [Earned Value Management - Wikipedia](https://en.wikipedia.org/wiki/Earned_value_management)
- [Why Spreadsheets Are Failing Your CapEx Tracking - ClickTime](https://www.clicktime.com/spreadsheet-sabotaging-your-capex-tracking)
- [Fixing Spreadsheet Problems - NextProcess](https://www.nextprocess.com/capital-expense-management/handling-financial-spreadsheets-errors/)
- [Managing Contingency Budgets - Cleopatra Enterprise](https://cleopatraenterprise.com/blog/managing-contingency-budgets-a-comprehensive-guide/)
- [Cost Contingency Calculation - Project Control Academy](https://www.projectcontrolacademy.com/cost-contingency-calculation/)
- [Automobile Manufacturing Startup Costs - Financial Models Lab](https://financialmodelslab.com/blogs/startup-costs/car-manufacturing)
