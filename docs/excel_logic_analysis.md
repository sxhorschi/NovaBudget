# Excel Logic Analysis — 260217_CostbookInd_3k.xlsx

**Analysiert:** 2026-03-16
**Zweck:** Alle Formeln, Querverweise und Business Logic dokumentieren (KEINE echten Zahlen)

---

## 1. Sheet-Übersicht & Abhängigkeiten

```
BudgetTemplate19.02.2026  (Finance-Quelle, ~5100 Formeln)
        │
        ├──→ Assembly_Equipment.F3 (Budget)
        ├──→ Testing.F3 (Budget)
        ├──→ Logistics.F3 (Budget)
        │
        ╳    Facility.F3 (LEER - noch kein Budget gesetzt)
        ╳    Prototyping.F3 (LEER - noch kein Budget gesetzt)

Data_Graphic_Assembly  (MANUELL - keine Formeln, Snapshot-Daten)
Summary                (MANUELL Cash-Out + SUM-Formeln in Row 46)
Dropdown               (Enum-Werte, keine Formeln)
2027_FC                (Forecast, gleiche Struktur wie Dept-Sheets)
```

## 2. Department Sheets — Formel-Logik

### Header-Bereich (Rows 2-4)

| Zelle | Formel | Bedeutung |
|-------|--------|-----------|
| **F2** | `=F3-F4` | **Delta** = Budget − Cost of Completion |
| **F3** | `=(BudgetTemplate!M_row1 + M_row2 + ...)*0.85` | **Budget** = Summe relevanter BudgetTemplate-Zeilen × 0.85 |
| **F4** | `=SUM(F6+F22+F37+F53+F64+F75+F94)` | **Cost of Completion** = Summe aller Work Area Subtotals |

### Kritische Erkenntnis: Der 0.85-Faktor
Die Budget-Berechnung multipliziert mit **0.85** — das bedeutet:
- Das BudgetTemplate enthält **Unit Cost** (Brutto-Betrag)
- Die Department-Sheets rechnen mit **85% davon** (15% Reserve/Contingency oder Skontoabzug?)
- **→ Diese Logik muss im Tool abbildbar sein!**

### Work Area Subtotals
```
F6  = SUM(F7:F21)     ← Work Area 1 Subtotal
F22 = SUM(F23:F36)    ← Work Area 2 Subtotal
F37 = SUM(F38:F52)    ← Work Area 3 Subtotal
...usw.
```
Jede Work Area hat einen fixen Bereich (ca. 15 Zeilen) für Line Items.

### Line Item Amounts — Gemischt!
Line Items sind NICHT alle manuell. Viele haben Berechnungsformeln:
- `=(16692+19192)*0.7` — Summe von Einzelpreisen × Faktor
- `=(4*3060)*0.7` — Stückzahl × Stückpreis × Faktor
- `=4*4500` — Stückzahl × Stückpreis
- `=12800*0.7` — Einzelpreis × Faktor
- Einige sind rein manuell (keine Formel)

**→ Der 0.7-Faktor** taucht häufig auf. Vermutlich ein Rabatt/Skontoabzug auf Lieferantenangebote. Nicht alle Items haben ihn.

### Welche Sheets haben Budget-Formeln?
| Sheet | F2 (Delta) | F3 (Budget) | Status |
|-------|-----------|-------------|--------|
| Assembly_Equipment | ✅ Formel | ✅ Referenziert BudgetTemplate | Aktiv |
| Testing | ✅ Formel | ✅ Referenziert BudgetTemplate | Aktiv |
| Logistics | ✅ Formel | ✅ Referenziert BudgetTemplate | Aktiv |
| Facility | ❌ Leer | ❌ Leer | Noch nicht befüllt |
| Prototyping | ❌ Leer | ❌ Leer | Noch nicht befüllt |

## 3. BudgetTemplate19.02.2026 — Die Finance-Quelle

### Struktur
- **Rows 8-56:** Einzelne Budget-Positionen (CAPEX Items)
- **Row 57:** Column-Totals (`=SUM(col8:col56)`)
- **Columns A-O:** Item-Metadaten (Identifier, Account, CC, Description, Date, Unit Cost, Useful Life)
- **Columns P-CI:** Monatliche Beträge (Jan 2025 - Dec 2030)
- **Columns CK-DH:** Quartals-Aggregationen
- **Columns DJ-DO:** Jahres-Totals

### Monatliche Verteilung — DIE Kernformel
```
=IF($L8=P$6, $M8, 0)
```
Bedeutung: **Wenn das Item-Datum (L) = Monatsspalten-Datum (Row 6), dann Unit Cost (M), sonst 0.**

→ Jedes Item wird **komplett in EINEM Monat** gebucht (kein Splitting über Monate).
→ Das Datum in Spalte L bestimmt den Cash-Out-Monat.

### Quartals-Aggregation
```
CN8 = SUM(Y8:AA8)     ← Q4 2025 (Okt-Dez)
CO8 = SUM(AB8:AD8)    ← Q1 2026 (Jan-Mar)
CP8 = SUM(AE8:AG8)    ← Q2 2026 (Apr-Jun)
CQ8 = SUM(AH8:AJ8)    ← Q3 2026 (Jul-Sep)
CR8 = SUM(AK8:AM8)    ← Q4 2026 (Okt-Dez)
```

### Jahres-Totals
```
DJ8 = SUMIFS($CK8:$DH8, $CK$1:$DH$1, DJ$6)
```
SUMIFS über die Quartals-Spalten, gefiltert nach Jahr-Header.

### Wie das Budget in die Department-Sheets fließt
Assembly_Equipment.F3 referenziert z.B.:
```
=(BudgetTemplate!M39 + M41 + M42 + M43 + M44) * 0.85
```
Das sind **spezifische Zeilen** im BudgetTemplate — die Unit-Cost-Spalte (M) bestimmter Items. Nicht alle Items, sondern nur die die zu "Assembly Equipment" gehören.

**→ Die Zuordnung Item↔Department ist IMPLIZIT über die Zeile im BudgetTemplate.**

## 4. Data_Graphic_Assembly Sheet

**Keine einzige Formel.** Alle Werte (Budget, Spent, Approved, Cost of Completion pro Department) sind **manuell eingegeben**. Das ist ein Snapshot der für eine Grafik genutzt wird — NICHT automatisch aktualisiert.

**→ Im neuen Tool: Diese Werte müssen BERECHNET werden, nicht manuell gepflegt.**

## 5. Summary Sheet

### Cash-Out Übersicht (Rows 40-45)
**Ebenfalls keine Formeln.** Die Werte pro Department pro Monat sind **manuell eingetragen**.

Nur Row 46 hat Formeln:
```
C46 = SUM(C40:C45)   ← Summe aller Departments pro Monat
D46 = SUM(D40:D45)
...usw.
```

**→ Die Cash-Out-Verteilung pro Monat wird manuell gepflegt — genau das was Otto hasst.**

### Rows 2-36: Komplett leer (keine Formeln, keine Daten)
Der obere Bereich des Summary-Sheets ist quasi ungenutzt — vermutlich Platzhalter für eine Übersichtstabelle die noch nicht existiert.

## 6. Data Validation (Dropdowns)

Die Department-Sheets haben Data Validation auf folgenden Spalten:
- **C (Project Phase):** Referenziert `Dropdown!$F$4:$F$7` (Phase 1-4)
- **D (Product):** Referenziert `Dropdown!$I$4:$I$7` (Bryan, Günther, Gin-Tonic, Overall)
- **G (Expected Cash Out):** Referenziert `Dropdown!$J$4:$J$27` (Monatsdaten)
- **H (Cost Basis):** Referenziert `Dropdown!$B$4:$B$7` (4 Typen)
- **I (Cost Driver):** Referenziert `Dropdown!$B$23:$B$27` (5 Typen)
- **L (Approval Status):** Referenziert `Dropdown!$D$4:$D$11` (8 Status-Werte)

## 7. Business Logic — Zusammenfassung

### Budget-Berechnung
```
Approved Budget (BudgetTemplate Unit Costs)
    × 0.85 (Reserve-Faktor)
    = Department Budget

Department Budget − Cost of Completion = Delta
```

### Cost of Completion
```
Σ Work Area Subtotals
    = Σ Σ Line Item Amounts
    = Σ Σ (einzelne Kalkulationen oder manuelle Werte)
```

### Cash-Out Timeline
```
Pro Item: Ganzer Betrag fällt in EINEM Monat an (=IF(date=month, amount, 0))
Aggregation: SUM pro Monat, SUM pro Quartal, SUMIFS pro Jahr
```

### Was MANUELL ist und automatisiert werden sollte:
1. **Summary Cash-Out rows** — manuell, sollte aus Expected Cash Out Dates berechnet werden
2. **Data_Graphic_Assembly** — manuell, sollte live aus DB aggregiert werden
3. **Department↔BudgetTemplate Zuordnung** — implizit über Zeilennummern, sollte über FK/Relation laufen
4. **Die 0.85 und 0.7 Faktoren** — hardcoded in Formeln, sollte konfigurierbar sein

### Was im neuen Tool ANDERS sein muss:
1. **Keine impliziten Zeilenzuordnungen** — Relations statt Zellreferenzen
2. **Automatische Aggregation** — kein manuelles Eintragen von Summen
3. **Unveränderliche Budget-Historie** — kein Überschreiben von Werten
4. **Cash-Out basierend auf Datum** — automatisch, nicht manuell pro Monat kopiert
5. **Faktor-Management** — der 0.85 und 0.7 sollten als "Budget Adjustment Factor" konfigurierbar sein
