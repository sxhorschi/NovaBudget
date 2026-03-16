# Strategy Assessment: NovaDrive CAPEX Budget Tool

**Prepared by:** McKinsey & Company, Manufacturing & Digital Practice
**Date:** 2026-03-16
**Classification:** Confidential -- Draft for Discussion
**Client:** NovaDrive Motors (EV-Startup, ~50 Mitarbeiter, Fabrikaufbau Phase 1)

---

## 1. Executive Summary

NovaDrive hat ein CAPEX Budget Tool entwickelt, das eine reale operative Luecke schliesst: Kein bestehendes Produkt am Markt adressiert den Sweet Spot zwischen Enterprise-CAPEX-Software (Finario, $100k+/Jahr) und generischen Spreadsheet-Ersatzprodukten (Smartsheet, Monday.com), die CAPEX nicht nativ unterstuetzen. Das Tool hat einen klaren internen Use Case, eine durchdachte Architektur und messbaren ROI (geschaetzt 15-20h/Monat Zeitersparnis fuer einen einzelnen Production Planner). Die strategische Frage ist nicht OB das Tool intern genutzt werden sollte -- das ist ein klares Ja -- sondern ob NovaDrive die Ressourcen hat, es parallel zum Kerngeschaeft (Fahrzeuge bauen) weiterzuentwickeln, und ob eine Kommerzialisierung sinnvoll ist. Unsere Empfehlung: Internes Tool fertigstellen, NICHT kommerzialisieren, aber die Option offenhalten.

---

## 2. Strategic Assessment

### 2.1 Market Opportunity

**Hypothese:** Es existiert eine unterversorgte Nische zwischen Enterprise-CAPEX-Software und Excel.

**Evidenz dafuer:**
- Finario ist der einzige reine CAPEX-Anbieter -- und positioniert sich im Enterprise-Segment ($100k+/Jahr, Multi-Entity, Multi-Currency)
- ERPNext unterstuetzt CAPEX nicht nativ (offener GitHub-Issue #22789, Workaround ueber Custom Accounts)
- Banner (YC-backed) adressiert nur Commercial Real Estate, nicht Manufacturing
- Smartsheet/Monday.com sind generische Tools ohne CAPEX-spezifische Logik (Hierarchien, Zielanpassungen, Cash-Out-Forecasts)
- ~90% der Unternehmen mit 20-500 Mitarbeitern tracken CAPEX in Excel (Branchenschaetzung)

**Marktluecke:** Manufacturing-Mittelstand (20-500 MA), der eine Fabrik aufbaut oder modernisiert und weder Finario-Budget noch ERPNext-Kompetenz hat.

**Einschraenkung:** Die Luecke ist real, aber schmal. CAPEX-Budget-Tracking ist ein episodisches Problem (Fabrikaufbau alle 5-10 Jahre), kein taegliches SaaS-Problem. Das limitiert die Retention und damit den Customer Lifetime Value.

### 2.2 Competitive Landscape

| Dimension | NovaDrive Tool | Finario | ERPNext | Smartsheet |
|-----------|---------------|---------|---------|------------|
| **CAPEX-Fit** | Hoch (purpose-built) | Sehr hoch | Niedrig (Workaround) | Mittel (manuell) |
| **Startup/KMU-Fit** | Sehr hoch | Niedrig (Enterprise) | Mittel | Hoch |
| **UX/Time-to-Value** | Hoch (5-Sek-Dashboard) | Hoch | Niedrig | Mittel |
| **Preis** | Intern (Entwicklungskosten) | $$$$$ | Free/$ | $$ |
| **ERP-Integration** | Keine | Ja | Nativ | Nein |
| **Multi-User/Rollen** | In Entwicklung | Ja | Ja | Ja |
| **Approval Workflow** | Phase 2 | Ja | Ja | Nein |

**Differenzierung des NovaDrive Tools:**
1. **Manufacturing-CAPEX-Datenmodell:** Department > Work Area > Phase > Line Item -- diese Hierarchie existiert in keinem generischen Tool
2. **Zielanpassungen als immutable Records** -- kein anderes KMU-Tool bietet auditfaehige Budget-Aenderungen
3. **Cash-Out Timeline aus Einzelpositionen** -- automatische Monatsaggregation statt manueller Monatsspalten
4. **Finance-Export im Kundenformat** -- kein ETL-Prozess zwischen Budget-Tool und Finanzabteilung

### 2.3 Moat (Wettbewerbsvorteil)

**Ehrliche Einschaetzung: Der Moat ist duenn.**

- **Kein Technologie-Moat:** React + FastAPI + PostgreSQL ist Standard-Stack. Jeder kompetente Entwickler kann das in 3-6 Monaten nachbauen.
- **Kein Netzwerk-Effekt:** Budget-Tools haben keinen viralen Loop. Nutzer laden keine anderen Nutzer ein.
- **Kein Daten-Moat:** Die Daten gehoeren dem Kunden. Kein Lock-in ausser Wechselkosten.
- **Einziger potenzieller Moat: Domain Knowledge.** Die Business Logic (Committed vs. Pipeline vs. Spent, Zielanpassungen, Phasen-Modell, Contingency-Faktoren) stammt aus echtem Fabrikalltag. Dieses Wissen ist nicht trivial zu replizieren -- aber auch nicht unmoeglich.

**Implikation:** Wenn Finario ein "Finario Lite" fuer KMUs launcht oder ein YC-Startup den gleichen Schmerzpunkt entdeckt, ist der Vorsprung in 12-18 Monaten eingeholt.

---

## 3. Product-Market Fit

### 3.1 Idealer Kunde

**Primaerer Zielkunde (Hypothese):**

| Kriterium | Profil |
|-----------|--------|
| **Unternehmensgroesse** | 20-200 Mitarbeiter |
| **Branche** | Manufacturing (Automotive, Maschinenbau, Halbleiter, Food & Beverage) |
| **Situation** | Greenfield-Fabrikaufbau oder grosse Modernisierung |
| **CAPEX-Volumen** | 5-50 Mio. EUR |
| **IT-Reife** | Kein SAP/Oracle, oder SAP vorhanden aber CAPEX nicht abgebildet |
| **Entscheider** | Production Planner / IE, CFO als Budget-Gatekeeper |
| **Schmerz** | Excel-basiertes CAPEX-Tracking mit >100 Positionen, mehrere Stakeholder |

**Warum NICHT Enterprise (>500 MA):** Haben bereits Finario, SAP PS, Oracle Primavera oder eigene Loesungen. Der Vertriebszyklus ist 6-12 Monate mit Procurement-Prozessen. NovaDrive hat keine Sales-Organisation dafuer.

**Warum NICHT Micro (<20 MA):** Zu wenige Positionen, Excel reicht. Kein Budget fuer ein SaaS-Tool. Kein dedizierter Production Planner.

### 3.2 Total Addressable Market (TAM)

**Top-Down-Schaetzung (DACH-Raum als Startmarkt):**

| Parameter | Wert | Quelle/Annahme |
|-----------|------|----------------|
| Produzierende Unternehmen DACH (20-500 MA) | ~80.000 | Statistisches Bundesamt, KMU-Segment |
| Davon mit relevantem CAPEX-Volumen (>2 Mio. EUR/Jahr) | ~15% | Branchenschaetzung |
| = Adressierbarer Markt | ~12.000 Unternehmen | |
| Davon aktuell im Fabrikaufbau/-modernisierung | ~10% pro Jahr | Investitionszyklus |
| = Markt in einem gegebenen Jahr | ~1.200 Unternehmen | |
| Zahlungsbereitschaft SaaS (500-2.000 EUR/Monat) | 12.000 EUR ARR | Mittleres Segment |
| **TAM (DACH, jaehrlich)** | **~14 Mio. EUR** | |

**Realistischer SAM (erreichbar in 3 Jahren):** 50-100 Kunden x 12.000 EUR = **600k-1.2 Mio. EUR ARR.** Das ist ein Lifestyle-Business, kein Venture-Case.

### 3.3 Pricing Model Empfehlung (hypothetisch)

| Tier | Preis/Monat | Umfang | Zielkunde |
|------|-------------|--------|-----------|
| **Starter** | 499 EUR | 1 Projekt, 5 User, 500 Items | Kleines Startup |
| **Professional** | 999 EUR | 3 Projekte, 15 User, unbegrenzt Items, Approval Workflow | Mittelstand |
| **Enterprise** | 2.499 EUR | Unbegrenzt, SSO, API, Custom Exports, Dedicated Support | Grosser Mittelstand |

**Benchmark:** Finario liegt bei geschaetzt 5.000-15.000 EUR/Monat. Smartsheet Business bei ~25 EUR/User/Monat. Der Sweet Spot fuer ein spezialisiertes CAPEX-Tool liegt bei 500-2.500 EUR/Monat pauschal (nicht per-seat, da die Nutzeranzahl bei CAPEX-Tracking klein ist).

---

## 4. Build vs. Buy Decision

### 4.1 Empfehlung: Weiterbauen (mit Einschraenkungen)

**Die Entscheidung zu bauen war korrekt.** Kein bestehendes Tool deckt den NovaDrive-Use-Case ab, ohne massive Anpassungen oder Overkill-Kosten. Die relevante Frage ist nicht mehr "Build vs. Buy" sondern "Wie viel weiterbauen vs. wann stoppen?"

### 4.2 TCO-Vergleich (3 Jahre)

| Kostenkategorie | Eigenbau (NovaDrive Tool) | Finario | ERPNext (Custom) |
|-----------------|--------------------------|---------|-------------------|
| **Lizenzkosten** | 0 EUR | ~180.000 EUR (5k/Monat) | 0 EUR (Open Source) |
| **Entwicklung initial** | ~80.000 EUR (geschaetzt, 2 Entwickler x 3 Monate) | 0 EUR | ~40.000 EUR (Customizing) |
| **Hosting/Infra** | ~3.600 EUR (100 EUR/Monat, Docker auf VM) | 0 EUR (SaaS) | ~7.200 EUR (200 EUR/Monat, Self-hosted) |
| **Wartung/Weiterentwicklung** | ~40.000 EUR/Jahr (20% Entwicklerzeit) | Im Lizenzpreis | ~20.000 EUR/Jahr (Community + Custom) |
| **Onboarding/Training** | ~5.000 EUR | ~15.000 EUR (Vendor-geführt) | ~10.000 EUR |
| **Opportunity Cost** | **HOCH** -- Entwicklerzeit fehlt fuer Kerprodukt | Niedrig | Mittel |
| **3-Jahres-TCO** | **~208.600 EUR** | **~195.000 EUR** | **~117.200 EUR** |

**Kernaussage:** Finanziell ist der Eigenbau nicht guenstiger als Finario. Der Vorteil liegt in der **Passgenauigkeit** und der **Unabhaengigkeit**. Der Nachteil liegt in den **Opportunity Costs** -- jede Stunde, die ein Entwickler am Budget-Tool arbeitet, fehlt am Fahrzeug-Produkt.

### 4.3 Decision Matrix

| Kriterium (Gewicht) | Eigenbau | Finario | ERPNext |
|---------------------|----------|---------|---------|
| Feature-Fit (30%) | 9/10 | 7/10 | 4/10 |
| Time-to-Value (20%) | 7/10 (laeuft bereits) | 5/10 (Onboarding) | 3/10 (Customizing) |
| TCO (20%) | 5/10 | 5/10 | 8/10 |
| Skalierbarkeit (15%) | 6/10 | 9/10 | 7/10 |
| Opportunity Cost (15%) | 3/10 | 9/10 | 6/10 |
| **Gewichteter Score** | **6.3** | **6.7** | **5.4** |

**Ergebnis:** Die Scores liegen eng beieinander. Der Eigenbau gewinnt beim Feature-Fit, verliert bei Opportunity Cost. Finario waere die rationale Wahl -- WENN NovaDrive das Budget haette und WENN Finario fuer 5 User skaliert. Beides ist fragwuerdig.

---

## 5. Go-to-Market (hypothetisch, falls Kommerzialisierung)

### 5.1 Vertriebsstrategie

**Empfehlung: Product-Led Growth (PLG) mit Content Marketing.**

- **Kanal 1: SEO/Content** -- "CAPEX Budget Tool fuer Mittelstand", "Excel ersetzen CAPEX Tracking", "Fabrikaufbau Budget planen". Keywords mit geringem Wettbewerb, hoher Kaufintention.
- **Kanal 2: Manufacturing Communities** -- LinkedIn-Gruppen fuer IEs, VDMA-Events, Hannover Messe.
- **Kanal 3: Referral** -- Jeder Fabrikplaner kennt 5 andere. Ein zufriedener Kunde = 2-3 Leads.

**KEIN Enterprise Sales.** NovaDrive hat keine Sales-Organisation und sollte auch keine aufbauen. Der Vertriebszyklus im Mittelstand ist kuerzer (4-8 Wochen) und benoetigt keinen AE.

### 5.2 Erstes Kundensegment

**EV-Startups und CleanTech-Scale-ups im DACH-Raum.**

Begruendung:
- Gleicher Use Case wie NovaDrive (Fabrikaufbau)
- Gleiche Schmerzen (Excel, kein ERP, begrenzte Ressourcen)
- Gemeinsame Netzwerke (EV-Ecosystem, Foerderprogramme, VCs)
- Referenzierbar: "NovaDrive nutzt es selbst fuer ihren Fabrikaufbau"

**Konkrete Zielliste (erste 10 Prospects):** EV-Startups mit kuerzlich angekuendigtem Fabrikaufbau, Battery-Startups, Wasserstoff-Technologie-Unternehmen mit Hardware-Produktion.

### 5.3 Pricing (Go-to-Market)

**Einstiegspreis: 499 EUR/Monat, all-inclusive.**

- Kein Per-Seat-Modell (CAPEX-Teams sind klein, 3-10 User)
- 14-Tage-Trial mit echtem Excel-Import (der "Aha-Moment" ist: Daten hochladen, Dashboard sehen)
- Jaehrliche Zahlung mit 20% Rabatt (Retention-Hebel)
- Kein Free Tier (die Zielgruppe hat Budget, kein Free-Tier-Mindset)

---

## 6. Risk Assessment

### 6.1 Technische Risiken

| Risiko | Eintrittswahrscheinlichkeit | Impact | Mitigation |
|--------|---------------------------|--------|------------|
| **Kritische Business-Logic-Fehler** (Committed zaehlt alle Items, Budget ignoriert Zielanpassungen) | EINGETRETEN | Hoch -- falsche Entscheidungsgrundlagen | Sofort fixen. 6 dokumentierte Fehler im Business-Logic-Audit, 2 davon kritisch. |
| **Skalierung auf >1000 Items** | Mittel | Mittel | PostgreSQL + Indexing reicht fuer 10.000+ Items. Frontend-Performance (TanStack Table) ist der Engpass. |
| **Datenverlust bei Migration** | Niedrig | Sehr hoch | Excel-Import-Validierung mit Checksummen. Parallelbetrieb 2 Wochen. |
| **Security (kein Auth im MVP)** | Hoch | Hoch | Basic Auth oder SSO als Phase-1-Feature. Internes Tool auf VPN beschraenken. |

### 6.2 Adoption-Risiken

| Risiko | Eintrittswahrscheinlichkeit | Impact | Mitigation |
|--------|---------------------------|--------|------------|
| **Production Planner kehrt zu Excel zurueck** | Mittel-Hoch | Sehr hoch (Projekt-Kill) | 3-Wochen-Regel: Parallelbetrieb, dann Cut-over. CEO muss Dashboard im SteerCo nutzen. |
| **Finance akzeptiert Export nicht** | Mittel | Hoch | Finance-Export muss pixel-perfekt zum BudgetTemplate passen. Vor Go-Live validieren. |
| **CEO sieht keinen Mehrwert** | Niedrig | Hoch | SteerCo-Export und Dashboard sind CEO-Killer-Features (Swarm-Score 9.75/10). |
| **Kein Champion nach Personalwechsel** | Mittel | Sehr hoch | Dokumentation, Multi-User-Faehigkeit, kein Single-Point-of-Knowledge. |

### 6.3 Opportunity Cost

**Die wichtigste strategische Frage: Baut NovaDrive Tools oder Autos?**

- Geschaetzte Entwicklerkapazitaet am Budget-Tool: 0.5-1 FTE
- Bei 50 Mitarbeitern ist das 1-2% der Gesamtkapazitaet
- Aber: Die Entwickler sind vermutlich NICHT austauschbar -- wer React/FastAPI kann, koennte auch am Fahrzeug-MES, an der Produktions-IT oder an der Supply-Chain-Software arbeiten

**Quantifizierung:**
- Zeitersparnis durch das Tool: ~15-20h/Monat (1 Production Planner)
- Entwicklungsaufwand: ~160h/Monat (1 Entwickler, initial), dann ~40h/Monat (Wartung)
- **Break-Even intern: ~8-12 Monate** (wenn man nur die Planner-Zeit rechnet)
- Wenn man den Wert besserer Entscheidungen einrechnet (falsche CAPEX-Zahlen koennen 6-stellige Fehlentscheidungen verursachen), ist der ROI deutlich schneller positiv

---

## 7. Empfehlung

**Klare Aussage: Das Tool intern fertigstellen. Nicht kommerzialisieren. Die Option offenhalten.**

### Begruendung (MECE):

**A. Interner Nutzen ist validiert.**
- Realer Schmerzpunkt (Excel versagt bei >100 CAPEX-Positionen mit mehreren Stakeholdern)
- 4 von 4 Stakeholder-Rollen bewerten die Kern-Features mit 9-10/10
- Geschaetzter ROI: 15-20h/Monat Zeitersparnis + bessere Entscheidungsqualitaet
- Der Break-Even der Entwicklungsinvestition liegt bei 8-12 Monaten

**B. Kommerzialisierung ist nicht der richtige Zeitpunkt.**
- TAM ist zu klein fuer einen Venture-Case (~14 Mio. EUR DACH)
- Der Moat ist duenn (kein Tech-Lock-in, kein Netzwerkeffekt)
- NovaDrive hat keine Sales/Marketing-Organisation
- Opportunity Cost: Jeder Euro und jede Stunde, die in Kommerzialisierung fliesst, fehlt beim Fabrikaufbau
- Das Produkt hat noch kritische Business-Logic-Fehler (2 von 6 sind "kritisch")

**C. Die Option offenhalten bedeutet konkret:**
1. Saubere Architektur beibehalten (Multi-Tenant-faehig, API-first)
2. Generische Begriffe verwenden (nicht "NovaDrive-spezifisch" hardcoden)
3. In 12-18 Monaten evaluieren: Ist die erste Fabrik fertig? Gibt es Pull vom Markt (Anfragen von anderen Unternehmen)?
4. Wenn ja: Spin-off oder Side-Project evaluieren. Wenn nein: Internes Tool bleibt internes Tool.

### Naechste Schritte (30-60-90 Tage):

| Zeitraum | Aktion | Verantwortlich |
|----------|--------|----------------|
| **0-30 Tage** | Kritische Business-Logic-Fehler fixen (Committed-Berechnung, Zielanpassungen) | Engineering |
| **0-30 Tage** | Excel-Import validieren mit echten Produktionsdaten | Production Planner + Engineering |
| **30-60 Tage** | Go-Live intern mit 2-Wochen-Parallelbetrieb neben Excel | Production Planner |
| **30-60 Tage** | Finance-Export validieren mit Finance-Team | Production Planner + Finance |
| **60-90 Tage** | Phase-2-Features (Multi-User, Approval Workflow) basierend auf Nutzerfeedback | Engineering |
| **90+ Tage** | Entscheidung: Weiterentwicklung stoppen (Wartungsmodus) oder strategische Expansion | CEO + CTO |

---

*Dieses Dokument dient als Diskussionsgrundlage. Alle Marktschaetzungen basieren auf oeffentlich verfuegbaren Daten und Annahmen, nicht auf primaerer Marktforschung. Eine vertiefte Marktstudie (TAM/SAM-Validierung, 20+ Kundeninterviews) waere Voraussetzung fuer eine belastbare Kommerzialisierungsentscheidung.*
