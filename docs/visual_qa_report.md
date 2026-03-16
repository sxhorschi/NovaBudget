# Visual QA Report

**Datum:** 2026-03-16
**Scope:** Frontend-Code Audit aller Layout-, Farb- und Typografie-Probleme

---

## Kritische Bugs (Top 10 -- gefixt)

### BUG-01: DEPT_COLORS inkonsistent zwischen CostbookTable und CashOutPage
- **Dateien:** `src/components/costbook/CostbookTable.tsx` (Zeile 13-18), `src/pages/CashOutPage.tsx` (Zeile 47-53)
- **Problem:** Assembly Equipment ist `#3b82f6` (blue) in CostbookTable, aber `#6366f1` (indigo) in CashOutPage. Logistics ist `#6366f1` (indigo) in CostbookTable, aber `#3b82f6` (blue) in CashOutPage. Die Farben sind vertauscht.
- **Auswirkung:** Benutzer sieht unterschiedliche Farben fuer dieselbe Abteilung auf verschiedenen Seiten.
- **Fix:** CostbookTable DEPT_COLORS an CashOutPage angleichen (CashOutPage als Source of Truth).

### BUG-02: DEPT_COLORS in BudgetSankey nutzt Name-Keys statt ID-Keys mit falschen Namen
- **Datei:** `src/components/visualization/BudgetSankey.tsx` (Zeile 18-24)
- **Problem:** Sankey nutzt `'Assembly'`, `'Intralogistics'`, `'Building & Infrastructure'`, `'Prototyping Lab'` -- das stimmt nicht mit den tatsaechlichen Department-Namen aus mockData ueberein (z.B. `'Assembly Equipment'`, `'Logistics'`, `'Facility'`, `'Prototyping'`). Dadurch fallen alle auf Fallback-Farben zurueck.
- **Auswirkung:** Sankey-Diagram zeigt falsche/zufaellige Farben fuer Departments.
- **Fix:** Keys an die tatsaechlichen Department-Namen anpassen.

### BUG-03: SidePanel DEPT_NAME_COLORS teilweise inkonsistent
- **Datei:** `src/components/sidepanel/SidePanel.tsx` (Zeile 12-18)
- **Problem:** SidePanel nutzt `'Assembly Equipment': '#3b82f6'` und `'Logistics': '#6366f1'` -- gleiche Vertauschung wie CostbookTable. Muss mit CashOutPage (Source of Truth) uebereinstimmen.
- **Fix:** Farben angleichen: Assembly Equipment = `#6366f1`, Logistics = `#3b82f6`.

### BUG-04: FilterBar sticky top-24 (96px) ist falsch fuer CashOutPage
- **Datei:** `src/components/filter/FilterBar.tsx` (Zeile 78)
- **Problem:** `top-24` = 96px, aber TopBar (56px) + TabBar (40px) = 96px. Das klingt korrekt, ABER: In TailwindCSS v4 ist `top-24` = `6rem` = 96px nur wenn 1rem=16px. Das Problem: Die FilterBar ist sticky innerhalb main, aber `top-24` beruecksichtigt nicht, dass die TabBar h-10 (40px = 2.5rem) ist, nicht exakt 2.5rem bei allen Browser-Zoom-Stufen. Zudem fehlt die SummaryStrip-Hoehe in der Berechnung auf CashOutPage, wo FilterBar und SummaryStrip NICHT in einem gemeinsamen sticky Container sind.
- **Auswirkung:** Auf CashOutPage kann die SummaryStrip unter der FilterBar verschwinden/ueberlappen, weil sie nicht sticky ist und nicht im gleichen Container wie die FilterBar steckt.
- **Fix:** CashOutPage: FilterBar und SummaryStrip in einen gemeinsamen sticky Container packen (wie CostbookPage).

### BUG-05: CashOutPage SummaryStrip nicht sticky
- **Datei:** `src/pages/CashOutPage.tsx` (Zeile 333-339)
- **Problem:** Auf CostbookPage sind SavedViews + FilterBar + SummaryStrip in einem gemeinsamen `sticky top-[56px]` Container. Auf CashOutPage sind FilterBar und SummaryStrip separate Elemente -- die SummaryStrip scrollt weg.
- **Auswirkung:** Benutzer verliert KPI-Uebersicht beim Scrollen auf CashOutPage.
- **Fix:** SummaryStrip in den sticky Container der FilterBar integrieren.

### BUG-06: CostbookTable thead sticky top-0 kollidiert mit uebergeordnetem sticky Container
- **Datei:** `src/components/costbook/CostbookTable.tsx` (Zeile 177)
- **Problem:** Die Table-Header-Zeile hat `sticky top-0`, aber die Tabelle befindet sich unter dem sticky SavedViews/Filter/Summary Container. Wenn die Tabelle scrollt, klebt der Header an top-0 des scroll-Containers (dem overflow-auto div), was korrekt ist -- aber NUR wenn die Tabelle selbst in einem overflow-auto Container ist. Das ist der Fall (Zeile 171: `overflow-auto`). Aber: der z-index (z-10) ist niedriger als der uebergeordnete sticky Container (z-20), was bei bestimmten Scroll-Positionen zu visuellen Artefakten fuehrt.
- **Status:** Minor -- funktioniert innerhalb des overflow-Containers. Kein Fix noetig.

### BUG-07: CostItemRow description truncation ohne max-width
- **Datei:** `src/components/costbook/CostItemRow.tsx` (Zeile 49)
- **Problem:** `max-w-0` auf der td ist ein Hack fuer truncation in Tabellenzellen, funktioniert aber nur in Kombination mit `truncate` auf dem Kind-Element. Das Kind-Element (`span.truncate`) ist korrekt. ABER: Die aeussere `span` hat `flex` und `items-center`, was in manchen Browsern die truncation bricht wenn die Description + Risk-Dot breiter als die Zelle werden.
- **Auswirkung:** Bei sehr langen Beschreibungen (>60 Zeichen) kann horizontal overflow entstehen.
- **Fix:** `overflow-hidden` auf die td hinzufuegen.

### BUG-08: Kein Empty State auf CashOutPage
- **Datei:** `src/pages/CashOutPage.tsx`
- **Problem:** Wenn alle Filter aktiv sind und keine Items passen, zeigt CashOutPage leere Charts und eine leere Heatmap ohne erklaerenden Text. CostbookTable hat einen "Keine Kostenpositionen gefunden" Empty State, aber CashOutPage nicht.
- **Auswirkung:** Benutzer sieht leere weisse Flaechen ohne Erklaerung.
- **Fix:** Empty State hinzufuegen wenn filteredItems.length === 0.

### BUG-09: PhaseProgress nutzt `bg-green-500`/`bg-yellow-500` statt `bg-emerald-500`/`bg-amber-500`
- **Datei:** `src/components/visualization/PhaseProgress.tsx` (Zeile 27-31)
- **Problem:** CashOutPage nutzt `bg-emerald-500` und `bg-amber-500` fuer Progress-Bars. PhaseProgress nutzt `bg-green-500` und `bg-yellow-500`. Inkonsistente Farbpalette.
- **Auswirkung:** Unterschiedliche Gruen-/Gelb-Toene fuer die gleiche Semantik.
- **Fix:** PhaseProgress an emerald/amber angleichen.

### BUG-10: SummaryStrip EUR-Werte nutzen font-mono, CashOutPage Heatmap nicht ueberall
- **Datei:** `src/components/summary/SummaryStrip.tsx` (Zeile 83), `src/pages/CashOutPage.tsx` (Zeile 478)
- **Problem:** SummaryStrip KPI-Werte haben `font-mono tabular-nums`. Die Quarterly-Summary-Cards in CashOutPage (Zeile 478) haben nur `tabular-nums` aber kein `font-mono`, was zu unterschiedlicher Schriftdarstellung fuehrt.
- **Fix:** `font-mono` zu den Quarterly-Summary-Cards hinzufuegen.

---

## Weitere Findings (Lower Priority)

### BUG-11: AmountCell erstellt bei jedem Render eine neue Intl.NumberFormat Instanz
- **Datei:** `src/components/costbook/AmountCell.tsx` (Zeile 11-17)
- **Problem:** `formatEUR()` erstellt bei jedem Aufruf ein neues `Intl.NumberFormat` Objekt. Bei 30+ Rows in der Tabelle ist das Performance-Verschwendung.
- **Fix:** Formatter als Modul-Konstante extrahieren (wie in SummaryStrip/CashOutPage bereits gemacht).

### BUG-12: FilterBar auf CashOutPage hat kein flex-wrap
- **Datei:** `src/components/filter/FilterBar.tsx` (Zeile 79)
- **Problem:** `flex items-center gap-2` ohne `flex-wrap`. Auf schmalen Viewports (<1024px) koennen die FilterChips horizontal ueberlaufen.
- **Fix:** `flex-wrap` hinzufuegen.

### BUG-13: SavedViews horizontal scroll hat kein visuelles Fade
- **Datei:** `src/components/filter/SavedViews.tsx` (Zeile 201)
- **Problem:** `overflow-x-auto scrollbar-hide` verbirgt die Scrollbar. Benutzer erkennt nicht, dass weitere Views rechts existieren.
- **Status:** UX-Verbesserung, nicht kritisch.

### BUG-14: SidePanel fixed position ueberlappt TopBar
- **Datei:** `src/components/sidepanel/SidePanel.tsx` (Zeile 119)
- **Problem:** `fixed right-0 top-0 h-full` -- das Panel startet bei top-0 und ueberdeckt TopBar + TabBar. Zwar hat TopBar z-30 > SidePanel z-40, also wird TopBar ueberdeckt.
- **Auswirkung:** TopBar und TabBar werden vom SidePanel verdeckt.
- **Fix:** `top-0` zu `top-[96px]` und `h-full` zu `h-[calc(100vh-96px)]` aendern, oder z-index anpassen.

### BUG-15: DepartmentRow colSpan Summe
- **Datei:** `src/components/costbook/DepartmentRow.tsx` (Zeile 41, 56)
- **Problem:** Erste td hat `colSpan={4}`, zweite td hat `colSpan={4}`. Gesamt: 8 Spalten. CostbookTable definiert 7 Spalten (6 COLUMNS + 1 Actions). colSpan 4+4=8 > 7.
- **Auswirkung:** Kann in manchen Browsern zu Layout-Shifts fuehren.
- **Fix:** colSpan auf 4+3=7 korrigieren.

### BUG-16: WorkAreaRow colSpan
- **Datei:** `src/components/costbook/WorkAreaRow.tsx` (Zeile 37, 49, 55)
- **Problem:** colSpan={6} + 1 + 1 = 8. Sollte 5 + 1 + 1 = 7 sein.
- **Fix:** Ersten colSpan auf 5 aendern.

---

## Zusammenfassung

| Kategorie | Kritisch | Mittel | Niedrig |
|-----------|----------|--------|---------|
| Farbkonsistenz | 3 (BUG-01, 02, 03) | 1 (BUG-09) | 0 |
| Sticky/Layout | 2 (BUG-04, 05) | 2 (BUG-14, 15/16) | 1 (BUG-06) |
| Empty States | 1 (BUG-08) | 0 | 0 |
| Typografie/Zahlen | 1 (BUG-10) | 1 (BUG-11) | 0 |
| Overflow/Truncation | 1 (BUG-07) | 1 (BUG-12) | 1 (BUG-13) |
