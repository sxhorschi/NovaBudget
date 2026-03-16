# Executive Summary: CAPEX Budget Tool
## McKinsey Engagement Final Recommendation

**Datum:** 2026-03-16
**Fuer:** CEO, NovaDrive / TYTAN Technologies
**Von:** Engagement Manager, McKinsey Manufacturing & Digital Practice
**Klassifikation:** Vertraulich

---

## Situation

NovaDrive baut seine erste Fabrik. CAPEX-Budget: ~EUR 8-10M, 200+ Einzelpositionen, 5-8 Stakeholder. Das Budget-Tracking laeuft ueber Excel. Ein interner Prototyp eines Web-Tools existiert: React + FastAPI + PostgreSQL, gebaut von einem einzelnen Entwickler. 132 Dateien, 22.000 Zeilen Code, funktionaler Prototyp mit Dashboard, hierarchischer Tabelle, Cash-Out-Timeline, Excel-Import/Export.

Eine zweite Fabrik ist in Planung. Das Tooling-Problem wird groesser, nicht kleiner.

## Complication

**Excel skaliert nicht.** Concurrent Access, Audit Trail, Reporting, Formelfehler -- die bekannten Probleme. Geschaetzte 2-3 Formelfehler pro Monat. 15-20h/Monat Zeitverlust fuer den Production Planner.

**Kein Produkt am Markt trifft den Sweet Spot.** Finario: zu teuer ($100k+/Jahr, Enterprise). ERPNext: CAPEX nicht nativ unterstuetzt. Smartsheet/Monday: keine CAPEX-Logik (Hierarchien, Zielanpassungen, Cash-Out-Forecasts). ~90% der KMUs mit 20-500 Mitarbeitern tracken CAPEX in Excel.

**Der Prototyp ist vielversprechend, aber nicht produktionsreif.** Tech Due Diligence Score: 3.95/10. Keine Authentifizierung, keine Tests (0% Coverage), kein Backup, keine CI/CD-Pipeline. Architektur und Code-Qualitaet sind fuer ein Ein-Personen-Projekt ueberdurchschnittlich gut -- die Infrastruktur ist es nicht.

## Key Findings

| # | Workstream | Kernaussage |
|---|------------|-------------|
| 1 | **Strategy** | Interner Nutzen ist validiert (ROI: 15-20h/Monat Zeitersparnis, Break-Even 8-12 Monate). Kommerzialisierung ist zum jetzigen Zeitpunkt falsch -- TAM zu klein fuer Venture (~EUR 14M DACH), Moat zu duenn, Ablenkung vom Kerngeschaeft. Option offenhalten. |
| 2 | **Tech** | Architektur-Entscheidungen sind solid (Schichtentrennung, UUID, Decimal fuer Finanzdaten, URL-State). Kritische Luecken: Zero Auth, Zero Tests, Zero Backup, Zero CI/CD. Geschaetzter Aufwand bis Produktionsreife: **4-6 Wochen (1 Senior Dev)**. |
| 3 | **UX** | Score 3.3/5 -- "ambitioniert, aber unfertig". Staerken: Filter-State in URL, dynamische Summary, Financial Typography. Schwaichen: Keine Accessibility (WCAG ~35%), kein Inline-Edit, kein Undo. 5 Quick Wins (21h Aufwand) heben die UX um ~50%. |
| 4 | **Financial** | Als SaaS-Produkt: LTV:CAC 5.1:1, CAC Payback 7.8 Monate, ARR Jahr 3 ~$1.6M (Base Case). Solide Unit Economics, aber kleiner Markt. Kapitalbedarf bis Break-Even: ~$650K. Empfehlung: Staged Approach (intern > Open Source > optional SaaS). |
| 5 | **Change Mgmt** | 8-Wochen-Rollout mit klarem Phasenplan. Kritischer Pfad: CEO-Sponsorship + CFO-Validierung in Woche 3-4. Groesstes Risiko: Production Planner kehrt zu Excel zurueck. Gegenmittel: Parallelbetrieb, Excel-Freeze in Woche 7, taegliche Backups als Fallschirm. |

## Recommendation

### CONDITIONAL GO

Das Tool intern fertigstellen und ausrollen. Nicht kommerzialisieren. Die Option offenhalten.

**Bedingungen fuer GO:**

1. **Security-Minimum vor erstem echten User:** JWT-Auth, HTTPS, CORS-Fix, DB-Backup (4-6 Wochen Aufwand)
2. **Frontend-Backend-Integration:** Mock-Daten durch echte API ersetzen (5-8 Tage)
3. **Test-Coverage auf kritischen Pfaden:** Aggregation, CRUD, Import/Export (5-8 Tage, Ziel: 40%)
4. **CEO-Commitment:** Muss das Dashboard im Steering Committee nutzen, nicht PowerPoint

Ohne diese 4 Punkte: kein Go-Live. Mit diesen 4 Punkten: Go-Live in 8-10 Wochen realistisch.

## Next Steps

### 30 Tage (Phase 0 -- Produktionsreife)

| # | Aktion | Verantwortlich | Aufwand |
|---|--------|----------------|---------|
| 1 | JWT-Authentifizierung + Rollen (Admin/Planner/Viewer) | Engineering | 6-10 Tage |
| 2 | Frontend-Backend-Integration (Mock-Daten ersetzen) | Engineering | 5-8 Tage |
| 3 | HTTPS/TLS via Reverse Proxy | Engineering/IT | 1 Tag |
| 4 | PostgreSQL-Backup (automatisch, taeglich) | IT | 2 Stunden |
| 5 | CORS-Wildcard fixen, Content-Type-Validierung reaktivieren | Engineering | 2 Stunden |
| 6 | Kritische Business-Logic-Fehler fixen (Committed-Berechnung) | Engineering | 2-3 Tage |

### 90 Tage (Rollout + Stabilisierung)

| # | Aktion | Verantwortlich | Zeitraum |
|---|--------|----------------|----------|
| 7 | Excel-Import mit echten Produktionsdaten validieren | Planner + Engineering | Woche 1-2 |
| 8 | Parallelbetrieb Excel + Tool (Zahlenabgleich auf den Cent) | Planner | Woche 1-4 |
| 9 | CEO-Demo + Finance-Export-Validierung durch CFO | Engineering + Planner | Woche 3-4 |
| 10 | Go/No-Go-Entscheidung basierend auf 3 Kriterien | CEO | Woche 4 |
| 11 | Rollout an Projektleiter + Einkauf | Planner + Engineering | Woche 5-6 |
| 12 | Excel-Freeze: CEO kuendigt Tool als Single Source of Truth an | **CEO** | **Woche 7** |
| 13 | Retrospektive, NPS-Umfrage, Phase-2-Priorisierung | Engineering | Woche 8 |
| 14 | Basic Test Suite (40% Coverage), CI/CD-Pipeline | Engineering | Woche 5-10 |

## Investment Required

| Posten | Aufwand | Kosten (geschaetzt) |
|--------|---------|---------------------|
| Phase 0: Produktionsreife (Security, Integration, Tests) | 6-8 Wochen, 1 Senior Dev | ~EUR 25.000-35.000 |
| Phase 1: Rollout + Stabilisierung | 4-6 Wochen, 0.5 FTE Dev + Planner-Zeit | ~EUR 15.000-20.000 |
| Phase 2: Multi-User, Approval, Inline-Edit, Audit Log | 6-8 Wochen, 1 Dev | ~EUR 25.000-35.000 |
| Laufende Wartung (nach Go-Live) | ~20% Entwicklerzeit, dauerhaft | ~EUR 40.000/Jahr |
| **Gesamt bis produktiver Einsatz (Phase 0+1)** | **10-14 Wochen** | **~EUR 40.000-55.000** |
| **Gesamt inkl. Phase 2** | **16-22 Wochen** | **~EUR 65.000-90.000** |

**Zum Vergleich:** Finario-Lizenz fuer 3 Jahre: ~EUR 180.000. ERPNext-Customizing: ~EUR 117.000. Die Eigenentwicklung ist bei vergleichbarem 3-Jahres-TCO (~EUR 209.000 inkl. Wartung) die passgenaueste Loesung -- vorausgesetzt die Opportunity Cost (Entwicklerzeit fehlt anderswo) ist tragbar.

---

**Bottom Line:** NovaDrive hat ein Tool gebaut, das ein echtes Problem loest. Die Architektur stimmt. Die Feature-Priorisierung ist diszipliniert (Swarm-Konsens mit 4 Rollen). Was fehlt, ist kein Redesign -- es sind 6-8 Wochen Engineering-Arbeit fuer Security, Testing und Integration. Die Investition betraegt ~EUR 55.000 bis zum produktiven Einsatz. Der Return: 15-20h/Monat Zeitersparnis, fehlerfreie Finanzkalkulation fuer EUR 8-10M CAPEX, und ein skalierbares System fuer die zweite Fabrik.

Die Entscheidung ist nicht ob, sondern wann. Und die Antwort ist: jetzt.

---

*Dieses Dokument fasst die Ergebnisse von 5 parallelen Workstreams zusammen: Strategy Assessment, Tech Due Diligence, UX Benchmark, Financial Model und Change Management Plan. Detailanalysen in den jeweiligen Einzeldokumenten (01-05).*
