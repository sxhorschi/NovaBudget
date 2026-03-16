# Financial Model: CAPEX Budget Tool als SaaS-Produkt

> McKinsey-Style Financial Analysis | Stand: März 2026
> Erstellt fuer TYTAN Technologies / NovaDrive

**Legende:** [A] = Annahme (geschaetzt) | [D] = Datenbasiert (recherchiert) | [C] = Berechnet

---

## 1. Market Sizing

### 1.1 Marktkontext

Der globale Markt fuer Manufacturing Operations Management Software liegt bei **~$15-19 Mrd. (2025)** [D] und waechst mit einer CAGR von **~8-13%** [D]. Der breitere Manufacturing Software Markt wird auf **$24.4 Mrd. (2025)** geschaetzt und soll bis 2029 auf **$46.6 Mrd.** wachsen [D].

Greenfield-Fabrikprojekte haben seit 2021 einen Boom erlebt -- allein in den USA wurden 2024-2025 Investitionen von ueber **$300 Mrd.** in neue Produktionsstaetten angekuendigt (Reshoring, CHIPS Act, IRA) [D].

### 1.2 TAM -- Total Addressable Market

**Frage:** Wie viele Unternehmen weltweit planen und bauen Fabriken/Facilities?

| Segment | Anzahl Unternehmen | CAPEX-Projekte/Jahr | Quelle |
|---|---|---|---|
| Grosse Industrieunternehmen (>$1B Rev) | ~8.000 weltweit | ~3.000-5.000 Greenfield/Brownfield | [A] basierend auf Fortune Global 2000 |
| Mittelstand ($50M-$1B Rev) | ~50.000 weltweit | ~10.000-15.000 Projekte | [A] |
| Startups / Scale-ups mit Hardware | ~5.000 weltweit | ~2.000-3.000 Projekte | [A] |
| **Gesamt** | **~63.000** | **~15.000-23.000** | |

**TAM (Software-Spend):** ~63.000 Unternehmen x $24.000/Jahr durchschnittl. Software-Spend = **~$1.5 Mrd.** [A/C]

> Hinweis: Das ist der Markt fuer spezialisierte CAPEX-Budgetierungs- und Facility-Planning-Software, NICHT der gesamte Manufacturing Software Markt.

### 1.3 SAM -- Serviceable Addressable Market

**Zielgruppe:** Europaeische und nordamerikanische Unternehmen mit CAPEX-Projekten $5M-$500M.

| Filter | Reduktion | Verbleibend |
|---|---|---|
| TAM gesamt | -- | 63.000 |
| Nur Europa + Nordamerika | -50% | 31.500 |
| Mit aktivem CAPEX $5M-$500M | -60% | 12.600 |
| Ohne bestehende Enterprise-Loesungen (SAP, Oracle) | -40% | 7.560 |
| **SAM** | | **~7.500 Unternehmen** |

**SAM (Revenue):** 7.500 x $18.000/Jahr = **~$135 Mio.** [A/C]

### 1.4 SOM -- Serviceable Obtainable Market (3 Jahre)

| Annahme | Wert | Begruendung |
|---|---|---|
| Marktanteil Jahr 3 | 0.5-1.0% des SAM | Realistisch fuer B2B SaaS Startup [A] |
| Kunden Jahr 3 | 40-75 | [C] |
| Revenue Jahr 3 | $720K - $1.35M ARR | [C] |

---

## 2. Pricing Model Optionen

### 2.1 Vergleich der Modelle

| Modell | Beispiel | Preis-Range | Pro | Contra |
|---|---|---|---|---|
| **Per-User/Month** | Notion, Jira | $15-50/User/Monat | Skaliert mit Adoption | CAPEX-Teams oft klein (5-10 Leute) = niedriger ARPU |
| **Per-Facility/Month** | Procore (Construction) | $500-2.000/Facility/Monat | Aligned mit Kundennutzen | Kunden haben wenige Facilities = limitiert |
| **Per-Facility + Per-User** | Hybrid | $300/Facility + $25/User | Balanciert | Komplexe Preisstruktur |
| **Flat Tier Pricing** | Anaplan-Style | $1.000-5.000/Monat | Einfach zu verstehen | Weniger flexibel |
| **Freemium + Premium** | Airtable-Style | Free (1 Projekt) / $99+ | Niedrige Einstiegshuerde | Conversion-Rate typisch 2-5% [D] |

### 2.2 Empfehlung: Tiered Facility-Based Pricing

**Empfohlenes Modell:**

| Tier | Preis/Monat | Enthalten | Zielgruppe |
|---|---|---|---|
| **Starter** | $0 (Free) | 1 Projekt, 3 User, Basic Templates | Startups, Evaluierung |
| **Professional** | $499/Monat ($5.988/Jahr) | 5 Projekte, 15 User, alle Templates, Excel-Import | Mittelstand, einzelne Abteilung |
| **Business** | $1.499/Monat ($17.988/Jahr) | Unlimitierte Projekte, 50 User, API, Approvals | Groessere Unternehmen |
| **Enterprise** | Custom ($3.000+/Monat) | SSO, Custom Integration, Dedicated Support | Konzerne |

**Begruendung:**
1. **Facility-basiert statt User-basiert**, weil CAPEX-Teams klein sind (5-15 Personen) -- Per-User wuerde zu niedrigen ARPUs fuehren [A]
2. **Freemium-Tier**, weil das Tool aus einem realen Bedarf (Excel-Ersatz) geboren ist -- niedrige Einstiegshuerde erzeugt Product-Led Growth [A]
3. **Tiered statt Custom**, weil Self-Service-Pricing die Sales-Kosten drastisch senkt [D]

**Geschaetzter ARPU:** $1.000-1.500/Monat = **$12.000-18.000 ARR** [A]

---

## 3. Unit Economics

### 3.1 Benchmarks (recherchiert)

| Metrik | B2B SaaS Benchmark | Quelle |
|---|---|---|
| LTV:CAC Ratio (Median) | 3.2:1 - 4:1 | [D] SaaS Hero, Optif.ai |
| CAC (Mid-Market B2B) | $400 - $800 | [D] Data-Mania |
| CAC (Enterprise B2B) | $800 - $2.000+ | [D] Data-Mania |
| Monthly Churn (B2B SaaS) | 3.5% (Median) | [D] WeAreFounders |
| Gross Margin (SaaS) | 75-85% | [D] Chargebee |
| CAC Payback Period | 6-12 Monate (gesund) | [D] FinancialModelsLab |

### 3.2 Unit Economics fuer CAPEX Budget Tool

| Metrik | Wert | Berechnung | Typ |
|---|---|---|---|
| **ARPU (monatlich)** | $1.250 | Gewichteter Mix aus Tiers | [A] |
| **ARPU (jaehrlich)** | $15.000 | $1.250 x 12 | [C] |
| **Monthly Churn** | 2.5% | Besser als Median wegen Nische + Wechselkosten | [A] |
| **Customer Lifetime** | 40 Monate | 1 / 0.025 | [C] |
| **LTV (Gross)** | $50.000 | $1.250 x 40 | [C] |
| **Gross Margin** | 82% | SaaS-typisch, cloud-hosted | [A] |
| **LTV (Net)** | $41.000 | $50.000 x 0.82 | [C] |
| **CAC** | $8.000 | Content Marketing + Inside Sales fuer Nische | [A] |
| **LTV:CAC Ratio** | **5.1:1** | $41.000 / $8.000 | [C] |
| **CAC Payback Period** | **7.8 Monate** | $8.000 / ($1.250 x 0.82) | [C] |

> **Bewertung:** LTV:CAC von 5.1:1 ist **excellent** (Benchmark: >3:1 gesund, >5:1 effizient) [D]. CAC Payback von 7.8 Monaten ist **gesund** (Benchmark: <12 Monate) [D].

---

## 4. Revenue Projection (3 Jahre)

### 4.1 Annahmen

| Parameter | Wert | Typ |
|---|---|---|
| Go-to-Market Start | Q3 2026 | [A] |
| Initiale Kunden (Pilot) | 3 (davon 1 = TYTAN intern) | [A] |
| Monatliche Neukunden (Jahr 1) | 1-2 | [A] |
| Monatliche Neukunden (Jahr 2) | 3-4 | [A] |
| Monatliche Neukunden (Jahr 3) | 5-7 | [A] |
| Monthly Churn | 2.5% | [A] |
| ARPU-Wachstum/Jahr | +10% (Upselling, Tier-Migration) | [A] |

### 4.2 Projektion

| Metrik | Jahr 1 (2027) | Jahr 2 (2028) | Jahr 3 (2029) |
|---|---|---|---|
| **Neukunden (kumuliert)** | 15 | 50 | 110 |
| **Churn (kumuliert)** | 2 | 8 | 20 |
| **Aktive Kunden (Ende)** | 13 | 42 | 90 |
| **ARPU/Monat** | $1.250 | $1.375 | $1.513 |
| **MRR (Ende)** | $16.250 | $57.750 | $136.170 |
| **ARR (Ende)** | **$195.000** | **$693.000** | **$1.634.000** |
| **Jahresumsatz (Summe)** | ~$117.000 | ~$444.000 | ~$1.100.000 |

### 4.3 Szenario-Analyse

| Szenario | Kunden Y3 | ARR Y3 | Annahme |
|---|---|---|---|
| **Bear Case** | 45 | $680K | Langsames Wachstum, hoher Churn (4%) |
| **Base Case** | 90 | $1.6M | Wie oben projiziert |
| **Bull Case** | 150 | $2.7M | Starker Product-Market Fit, Partnerschaften |

---

## 5. Cost Structure

### 5.1 Team & Entwicklung

| Rolle | Anzahl (Y1 / Y2 / Y3) | Kosten/Jahr (pro Kopf) | Typ |
|---|---|---|---|
| Full-Stack Developer | 2 / 3 / 4 | $90.000 (EU-basiert) | [A] |
| Product Manager | 0.5 / 1 / 1 | $80.000 | [A] |
| Designer (UX/UI) | 0.5 / 0.5 / 1 | $70.000 | [A] |
| Sales/BD | 0 / 1 / 2 | $75.000 + Kommission | [A] |
| Customer Success | 0 / 0.5 / 1 | $60.000 | [A] |
| **Team-Kosten gesamt** | **$255K** | **$490K** | **$810K** |

> Hinweis: Jahr 1 nutzt bestehende TYTAN-Ressourcen (Georg + 1 Dev) als Basis. Zusaetzliche Hires nur bei Markterfolg. [A]

### 5.2 Infrastruktur & Operations

| Kostenblock | Jahr 1 | Jahr 2 | Jahr 3 | Typ |
|---|---|---|---|---|
| Cloud Hosting (AWS/Azure) | $6.000 | $18.000 | $48.000 | [A] ~$40/Kunde/Monat |
| SaaS-Tools (Monitoring, CI/CD) | $3.600 | $6.000 | $12.000 | [A] |
| Domain, SSL, CDN | $500 | $500 | $500 | [A] |
| **Infra gesamt** | **$10.100** | **$24.500** | **$60.500** | |

### 5.3 Sales & Marketing

| Kostenblock | Jahr 1 | Jahr 2 | Jahr 3 | Typ |
|---|---|---|---|---|
| Content Marketing / SEO | $12.000 | $24.000 | $48.000 | [A] |
| Messen / Konferenzen | $5.000 | $15.000 | $30.000 | [A] |
| Paid Ads (LinkedIn, Google) | $0 | $12.000 | $36.000 | [A] |
| Partnerships / Referral | $0 | $5.000 | $10.000 | [A] |
| **Marketing gesamt** | **$17.000** | **$56.000** | **$124.000** | |

### 5.4 Gesamtkosten-Uebersicht

| Kostenblock | Jahr 1 | Jahr 2 | Jahr 3 |
|---|---|---|---|
| Team | $255.000 | $490.000 | $810.000 |
| Infrastruktur | $10.100 | $24.500 | $60.500 |
| Sales & Marketing | $17.000 | $56.000 | $124.000 |
| Sonstiges (Legal, Accounting) | $10.000 | $15.000 | $20.000 |
| **Total OpEx** | **$292.100** | **$585.500** | **$1.014.500** |

---

## 6. Break-Even Analysis

### 6.1 Monatlicher Break-Even

| Metrik | Berechnung | Wert |
|---|---|---|
| Monatliche Fixkosten (Y2-Niveau) | $585.500 / 12 | ~$48.800/Monat |
| Gross Margin | 82% | [A] |
| Benoetigter MRR fuer Break-Even | $48.800 / 0.82 | **~$59.500 MRR** |
| Benoetigte Kunden (bei $1.375 ARPU) | $59.500 / $1.375 | **~43 Kunden** |

### 6.2 Zeitpunkt Break-Even

| Szenario | Break-Even Zeitpunkt | Kumulierter Verlust bis dahin |
|---|---|---|
| **Bear Case** | Monat 36+ (oder nie) | >$1.2M |
| **Base Case** | **Monat 24-28** (~Mitte Jahr 2) | **~$650K** |
| **Bull Case** | Monat 18-20 | ~$400K |

### 6.3 Kapitalbedarfs-Kurve

```
Kumulierter Cash Flow (Base Case):

Monat  1-6:   -$146K  (Aufbau, kein/wenig Revenue)
Monat  7-12:  -$292K  (kumuliert, erste Kunden)
Monat 13-18:  -$520K  (kumuliert, Team waechst)
Monat 19-24:  -$650K  (kumuliert, Peak Burn)
Monat 25-30:  -$580K  (Revenue uebersteigt Kosten)
Monat 31-36:  -$350K  (kumuliert, Annaeherung an Gesamt-Break-Even)
```

**Gesamter Kapitalbedarf bis Break-Even: ~$650K** [C]

---

## 7. Investitions-Empfehlung

### 7.1 Zusammenfassung der Kernmetriken

| Metrik | Wert | Bewertung |
|---|---|---|
| LTV:CAC | 5.1:1 | Excellent (>3:1) |
| CAC Payback | 7.8 Monate | Gesund (<12 Mo.) |
| Gross Margin | 82% | SaaS-typisch |
| ARR Jahr 3 (Base) | $1.6M | Solide fuer Nischen-SaaS |
| Kapitalbedarf | ~$650K | Moderat |
| Break-Even | ~24-28 Monate | Akzeptabel |
| Marktgroesse (SAM) | $135M | Nische, aber tragfaehig |

### 7.2 Pro: Tool zum Produkt machen

1. **Starke Unit Economics.** LTV:CAC von 5.1:1 und Payback unter 8 Monaten sind ueberdurchschnittlich [C/D].
2. **Echter Schmerzpunkt.** Excel-basierte CAPEX-Planung ist der Status quo bei >70% der Zielkunden -- das Tool loest ein reales Problem [A].
3. **Built-in Referenz.** TYTAN/NovaDrive als erster Power-User liefert Glaubwuerdigkeit und eine Case Study vom Tag 1 [A].
4. **Defensible Nische.** Generische Tools (Anaplan, SAP) sind zu komplex/teuer fuer den Mittelstand. Spezialisierte Konkurrenz ist duenn [D].
5. **Niedriger Churn erwartet.** Einmal integriert in CAPEX-Workflows sind die Wechselkosten hoch [A].

### 7.3 Contra: Besser intern nutzen

1. **Opportunitaetskosten.** Jede Stunde, die Georg und das Team in SaaS-Produktisierung investieren, fehlt bei NovaDrive's Kerngeschaeft (Autos bauen) [A].
2. **Kleiner Markt.** SAM von $135M ist fuer VCs uninteressant -- muesste gebootstrapped werden [A].
3. **Langer Weg zu relevanten Umsaetzen.** $1.6M ARR in Jahr 3 ist fuer ein Autounternehmen ein Rundungsfehler [A].
4. **Ablenkung.** SaaS erfordert eigene DNA (Support, Sales, Product) -- das ist ein anderes Geschaeft [A].
5. **Timing.** 2026-2027 ist Peak-Zeit fuer NovaDrives Fabrikaufbau. Fokus auf Kerngeschaeft koennte strategisch wichtiger sein [A].

### 7.4 Empfehlung

**Empfehlung: Staged Approach -- "Open Source + Optional SaaS"**

| Phase | Zeitraum | Aktion | Investition |
|---|---|---|---|
| **Phase 1: Intern nutzen** | Q2-Q4 2026 | Tool fuer TYTAN perfektionieren, als internen Wettbewerbsvorteil nutzen | $0 extra |
| **Phase 2: Open Source** | Q1 2027 | Core-Tool als Open Source veroeffentlichen. Community aufbauen, Feedback sammeln | ~$20K (Docs, Landing Page) |
| **Phase 3: Hosted SaaS** | Q3 2027 | Gehostete Version mit Premium-Features (SSO, Collaboration, Templates) | ~$150K (1 Dev + Infra) |
| **Phase 4: Skalieren oder einstellen** | Q1 2028 | Bei >20 zahlenden Kunden: Spin-off erwaegen. Sonst: Open Source weiterlaufen lassen | Abhaengig von Traktion |

**Begruendung:**

> *"The best SaaS products are born from real pain, not market research."*

1. **Kein Entweder-Oder noetig.** Open Source kostet fast nichts und baut Markenbekanntheit auf.
2. **De-risked.** Statt $650K upfront zu committen, wird schrittweise investiert basierend auf Marktsignalen.
3. **Fokus bleibt auf Autos.** Georg kann 90% seiner Zeit fuer NovaDrive nutzen und das SaaS nebenbei validieren.
4. **Optionalitaet.** Wenn der Markt zieht, kann ein Spin-off oder Verkauf an einen Strategic Buyer (z.B. Procore, Autodesk) sehr attraktiv sein.

**Bottom Line:** Das CAPEX Budget Tool hat solide Unit Economics und loest ein echtes Problem. Aber fuer ein Unternehmen, das Autos baut, ist ein SaaS-Spin-off eine Ablenkung -- es sei denn, man geht den gestuften Weg. Open Source zuerst, SaaS bei nachgewiesener Nachfrage.

---

## Quellen

- [SaaS Financial Model Template (10XSheets)](https://www.10xsheets.com/templates/saas-financial-model/)
- [SaaS Financial Model (Chargebee)](https://www.chargebee.com/blog/saas-financial-models/)
- [SaaS Financial Model: Key Components (Founderpath)](https://founderpath.com/blog/saas-financial-model)
- [15 Best CapEx Software 2026 (The CFO Club)](https://thecfoclub.com/tools/best-capex-software/)
- [Finario Pricing (Capterra)](https://www.capterra.co.uk/software/182306/finario)
- [Anaplan CapEx Management](https://www.anaplan.com/use-case/capex-management-software/)
- [B2B SaaS LTV Benchmarks (Optif.ai)](https://optif.ai/learn/questions/b2b-saas-ltv-benchmark/)
- [CAC Benchmarks B2B Tech 2025 (Data-Mania)](https://www.data-mania.com/blog/cac-benchmarks-for-b2b-tech-startups-2025/)
- [LTV:CAC Ratio Benchmarks 2026 (SaaS Hero)](https://www.saashero.net/strategy/b2b-saas-ltv-cac-benchmarks/)
- [SaaS Churn Rates 2026 (WeAreFounders)](https://www.wearefounders.uk/saas-churn-rates-and-customer-acquisition-costs-by-industry-2025-data/)
- [Manufacturing Software Market (Cognitive Market Research)](https://www.cognitivemarketresearch.com/manufacturing-software-market-report)
- [Manufacturing Operations Management Market (IMARC)](https://www.imarcgroup.com/manufacturing-operations-management-software-market)
- [Digital Manufacturing Software Market (MRFR)](https://www.marketresearchfuture.com/reports/digital-manufacturing-software-market-31545)
- [Greenfield Manufacturing (Deloitte)](https://www.deloitte.com/us/en/services/consulting/articles/greenfield-manufacturing.html)
- [7 SaaS KPIs (FinancialModelsLab)](https://financialmodelslab.com/blogs/kpi-metrics/saas)
