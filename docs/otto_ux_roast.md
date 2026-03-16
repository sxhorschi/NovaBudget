# OTTO's UX-Roast: Das Mockup ist eine PowerPoint-Folie, kein Werkzeug

**Von:** OTTO (der Typ der damit ARBEITEN muss)
**Datum:** 2026-03-16
**Stimmung:** Enttäuscht. Ich hab euch meine Use Cases gegeben. Ihr habt mir ein Dashboard gebaut.

---

## 1. Was aktuell Scheiße ist -- Component für Component

### Dashboard.tsx -- Die hübsche Lüge

Das Dashboard ist eine **Präsentation**, kein Arbeitswerkzeug. Vier Widgets untereinander, keins davon interaktiv, keins davon beantwortet eine meiner Fragen in unter 10 Sekunden.

**Was ich sehe:** Total Budget, Spent, Approved, Delta. Vier Karten. Toll. Sagt mir GAR NICHTS.

**Was ich BRAUCHE:** Wie viel Budget hat Assembly Equipment NOCH? Nicht "Total Budget 12M" -- das weiß ich. Ich will wissen: "Assembly Equipment hat noch 340k übrig und 5 offene Items für 280k. Du hast also effektiv 60k Luft." DAS ist eine nützliche Zahl.

### BudgetOverview.tsx -- Pie Chart des Grauens

Ein **Pie Chart** das Budget nach Department aufteilt. Wofür? Was MACHE ich mit dieser Information? Nichts. Ich weiß dass Testing mehr Budget hat als Logistics. Das steht in meinem Kopf. Seit Tag 1.

**Was hier stehen sollte:** Eine Tabelle. 5 Zeilen, eine pro Department. Spalten: Budget, Committed, Remaining, % verbraucht, Anzahl offene Items. Mit Ampelfarben. FERTIG. Kein Pie Chart. Nie wieder Pie Charts. Pie Charts sind für Investoren-Decks, nicht für Leute die arbeiten.

### DepartmentBreakdown.tsx -- Budget vs. Spent als Bar Chart

Ein horizontales Bar Chart das Budget vs. Spent zeigt. Cool, sieht aus wie ein Foliensatz für das Quarterly. Aber ich bin kein Investor. Ich bin der Typ der um 8:15 wissen muss ob er den Lieferanten anrufen kann.

**Problem 1:** Keine Interaktion. Ich kann nicht klicken um zu den Items zu kommen.
**Problem 2:** "Spent" ist nicht "Committed". Wo sind die offenen Bestellungen? Die approved-aber-noch-nicht-bezahlten Items?
**Problem 3:** Wo ist der Delta? Wo ist das Remaining? Die EINE Zahl die mich interessiert fehlt.

### CashOutTimeline.tsx -- Hübsch, aber blind

Ein Area Chart mit monatlichem Cash-Out. Sieht gut aus. Bringt mir nichts.

**Problem 1:** Keine Breakdown. Ist das alles zusammen? Pro Department? Pro Phase? Keine Ahnung.
**Problem 2:** Nicht filterbar. "Was ist der Cash-Out für Phase 2 in Q3?" -- KEINE CHANCE das hier rauszulesen.
**Problem 3:** Kein Zusammenhang zu den Line Items. Wenn ich sehe dass im Juli 800k fällig sind, will ich KLICKEN und die Items sehen die das verursachen. Geht nicht.

### ApprovalStatusWidget.tsx -- Zählen ohne Kontext

Zählt die Items nach Status. 12 open, 8 approved, 3 rejected. Okay... und jetzt?

**Problem 1:** Keine Beträge. 3 rejected Items können 5k oder 500k sein. Die ZAHL allein ist wertlos.
**Problem 2:** Nicht klickbar. Wenn ich "12 open" sehe, will ich die 12 Items SEHEN. Sofort. Ein Klick.
**Problem 3:** Keine Trennung nach Department. Sind die 3 rejected Items alle bei Testing oder verteilt?

### DepartmentView.tsx + CostBookTable.tsx -- Das Einzige das ansatzweise funktioniert

Die Tabellenansicht ist der beste Teil. Gruppierung nach Work Area, Filter nach Phase/Product/Status, sortierbare Spalten. Okay. Das geht in die richtige Richtung.

**ABER:**

**Problem 1:** Ich muss ERST ein Department in der Sidebar wählen. Warum? Warum kann ich nicht ALLE Items sehen und nach Department filtern? Ich hab 200+ Items über 5 Departments. Wenn ich suche "was kostet die Montagestation", will ich nicht erst raten in welchem Department die liegt.

**Problem 2:** Keine dynamischen Summen. Die Tabelle zeigt Items, aber wo ist die Summe die sich mit meinen Filtern ändert? Wenn ich nach "Phase 2" filtere, will ich SOFORT sehen: "Phase 2 gesamt: 3.2M, davon 1.8M approved, 1.4M offen."

**Problem 3:** Keine Inline-Bearbeitung. Ich muss wahrscheinlich irgendein Modal öffnen. Jeder zusätzliche Klick kostet mich Lebenszeit.

**Problem 4:** Die Spalte "Zielanp." zeigt ein Häkchen oder Strich. Das ist NUTZLOS. Ich will sehen: Originalbudget, Zielanpassung, aktueller Betrag. Nicht ein boolesches Feld.

### Sidebar.tsx -- Starre Navigation aus 2018

Jedes Department ist ein eigener Link. Das skaliert nicht und dupliziert Logik.

**Problem:** Wenn ich von Assembly zu Testing wechsle, verliere ich meinen Filter-Kontext. Phase 2 gefiltert? Weg. Status "open"? Weg. Ich fange bei jedem Department von vorne an.

### AppShell.tsx -- Okay, kein Kommentar

Layout ist Layout. Sidebar links, Content rechts. Funktioniert. Einzige Komponente die mich nicht nervt.

---

## 2. Wie MEIN Arbeitstag wirklich aussieht

### Morgens, 8:00 -- "Was ist der Stand?"

Ich öffne das Tool und will in **5 Sekunden** sehen:
- Gesamtbudget remaining (eine Zahl, groß, oben)
- Pro Department: Budget, Committed, Remaining, Ampelfarbe
- Was hat sich seit gestern geändert? Neue Items? Status-Änderungen? Beträge geändert?

**Was das aktuelle Dashboard mir gibt:** Vier generische Karten und ein Pie Chart. Ich muss in jedes Department einzeln klicken um den echten Stand zu sehen. Das sind 5 Klicks MINIMUM bevor ich anfangen kann zu arbeiten.

### Wöchentlich, Dienstag 9:00 -- Management-Meeting vorbereiten

Ich brauche eine **Liste aller offenen Items** (nicht approved, nicht ordered). Gruppiert nach Department. Mit Beträgen. Sortiert nach Priorität oder Betrag.

**Was ich aktuell tun muss:** 5 Department-Views durchklicken, jeweils Status-Filter setzen, mental die Zahlen zusammenrechnen. Oder: zurück zu Excel. Weil Excel kann wenigstens alles auf einer Seite filtern.

**Was ich brauche:** EIN View. Filter: Status != Approved AND Status != Ordered. Gruppierung: Department. Summen pro Gruppe und Total. Copy-Paste oder Export für die PowerPoint.

### Ad-hoc, Mittwoch 14:30 -- "Was kostet uns Phase 2 bei Testing?"

Der CEO fragt. Ich hab 10 Sekunden.

**Was ich aktuell tun muss:** Sidebar -> Testing -> Filter Phase -> "Bryan-Finish" -> Summe... wo ist die Summe? Muss ich die Zahlen im Kopf addieren? 4 Klicks + Kopfrechnen = zu langsam.

**Was ich brauche:** Eine Tabelle mit ALLEN Items. Filter: Department = Testing, Phase = Bryan-Finish. Oben steht sofort: "14 Items, Summe: 2.1M, davon 1.4M approved." Fertig. Antwort in 3 Sekunden.

### Monatlich, 1. Freitag -- Finance will Cash-Out-Forecast

Finance braucht: Pro Monat, wie viel fließt ab. Im Format ihres Templates.

**Was ich aktuell tun muss:** Das Area Chart anschauen (das mir keine Zahlen gibt, nur eine hübsche Kurve), dann doch zurück zu Excel, manuell Beträge in Monatsspalten eintragen. 2 Stunden Arbeit. Für eine TABELLE.

**Was ich brauche:** Cash-Out View, gruppiert nach Monat, mit Department-Breakdown. Export-Button. Fertig in 2 Klicks.

---

## 3. Wie das UI WIRKLICH aussehen sollte -- Meine Vision

### Die Startseite: KEIN Dashboard. Eine TABELLE.

Hört auf mit Dashboard-Widgets. Mein Werkzeug ist die **Tabelle**. Das Dashboard soll die Tabelle SEIN -- mit einer Zusammenfassung oben drüber.

**Oben:** 3 Zahlen, groß, immer sichtbar:
1. **Remaining Budget** (Gesamtbudget minus alle Committed Items) -- DIE wichtigste Zahl
2. **Offene Items** (Anzahl + Summe der Items die noch keinen finalen Status haben)
3. **Nächster großer Cash-Out** (Monat + Betrag des nächsten großen Abflusses)

**Darunter:** Department-Leiste. 5 kleine Karten nebeneinander. Pro Department: Name, Remaining, Ampelfarbe (grün/gelb/rot basierend auf %-Verbrauch). Ein Klick filtered die Tabelle darunter.

**Hauptbereich:** EINE große Tabelle. ALLE Items. Alle Departments. Mit Filtern.

### Brauchen wir separate Department-Views?

**NEIN.** Eine Tabelle mit Filtern ist besser als 5 identische Seiten.

Warum:
- Ich verliere keinen Kontext beim Wechseln
- Cross-Department-Suche funktioniert (Suche nach "Montagestation" über alle Departments)
- Die Filter-Kombination Department + Phase + Status + Product ergibt JEDE Ansicht die ich brauche
- Weniger Code, weniger Bugs, weniger Wartung

### Wie organisiert man 200+ Line Items?

So wie **Linear** es macht: Eine flache Liste mit genialen Filtern und Gruppierung.

**Gruppierung:** Ich will wählen können wonach gruppiert wird:
- Nach Department (Default)
- Nach Phase
- Nach Status
- Nach Product
- Nach Cash-Out-Monat

Jede Gruppe hat eine Zusammenfassungszeile mit Summen. Gruppen sind ein-/ausklappbar.

**Filter:** Oben eine Filter-Bar wie bei Notion/Linear:
- Mehrere Filter gleichzeitig (AND-Verknüpfung)
- Filter als "Chips" sichtbar, einzeln entfernbar
- Freitext-Suche über Description

**Saved Views:** Wie Notion Database Views. Ich definiere eine Kombination aus Filtern/Gruppierung und speichere sie:
- "Weekly Meeting" = Status nicht approved, gruppiert nach Department
- "Cash-Out Q3" = Cash-Out Juli-September, gruppiert nach Monat
- "Testing Phase 2" = Department Testing + Phase Bryan-Finish

### Die 3 wichtigsten Zahlen die IMMER sichtbar sein müssen

Egal welcher Filter aktiv ist, egal welche Gruppierung -- diese 3 Zahlen stehen IMMER oben:

1. **Remaining Budget** (filtered) -- "Bei deiner aktuellen Filterung sind noch X übrig"
2. **Summe der gefilterten Items** -- "Du schaust gerade auf Y an Kosten"
3. **Anzahl Items** -- "Das sind Z Positionen"

Diese Zahlen MÜSSEN sich dynamisch anpassen wenn ich filtere. Das ist DER Killer-Feature. Das ist der Grund warum Excel stirbt.

---

## 4. Inspirationen -- Was andere richtig machen

### Linear.app -- Flat List mit genialen Filtern
Linear zeigt Issues in einer flachen Liste. Kein verschachteltes Navigations-Chaos. Filter sind erstklassige UI-Elemente, nicht versteckt in einem Submenu. Du kannst nach Status, Assignee, Priority, Label filtern -- und die Filter sind als Chips sichtbar. Mehrere Display-Formate (List, Board, Timeline) auf denselben Daten. Genial.

**Was wir klauen sollten:**
- Filter-Chips oben in der Tabelle
- Gruppierung als Toggle (nach Department, nach Status, nach Phase)
- Keyboard Shortcuts für schnelles Filtern
- Side Panel für Details (klick auf Item -> Detail-Panel rechts, Tabelle bleibt sichtbar)

Quellen: [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui), [Linear Filters Docs](https://linear.app/docs/filters)

### Notion Databases -- Flexible Views auf dieselben Daten
Notion lässt dich EINE Datenbank mit verschiedenen Views anschauen: Table, Board, Calendar, Gallery. Jeder View hat seine eigenen Filter, Sortierung, Gruppierung. Du wechselst zwischen Views mit einem Tab-Klick. Die Daten sind immer dieselben.

**Was wir klauen sollten:**
- Saved Views als Tabs über der Tabelle
- Jeder View merkt sich seine Filter/Gruppierung
- Gruppierung mit ein-/ausklappbaren Sektionen und Summen pro Gruppe
- "View Options" Menu das Filter, Sort und Group an einem Ort bündelt

Quellen: [Notion Views, Filters, Sorts & Groups](https://www.notion.com/help/views-filters-and-sorts), [Notion Database Views Guide](https://www.notion.com/help/guides/using-database-views)

### Stripe Dashboard -- KPIs oben, Details unten
Stripe macht es richtig: Oben die wichtigsten Zahlen als Scorecards. Darunter die Details. Alles anpassbar -- du entscheidest welche Widgets du siehst. Und: du kannst in jede Zahl REINLICKEN um die zugrundeliegenden Transaktionen zu sehen.

**Was wir klauen sollten:**
- Scorecards oben die sich an Filter anpassen
- Drill-Down: Klick auf "12 offene Items" -> Tabelle filtered sich automatisch
- Clean Layout ohne visuellen Müll

Quellen: [Stripe Dashboard Basics](https://docs.stripe.com/dashboard/basics), [Dashboard UX Best Practices](https://www.lazarev.agency/articles/dashboard-ux-design)

### Airtable -- Multiple Views, eine Datenbasis
Airtable lässt dich dieselbe Tabelle als Grid, Kanban, Calendar, Gallery anzeigen. Jeder View hat eigene Filter, Gruppierung, Spalten-Sichtbarkeit. Du kannst Felder ein-/ausblenden pro View.

**Was wir klauen sollten:**
- View-Tabs oben (aber wir brauchen nur Table -- kein Kanban, kein Calendar)
- Spalten ein-/ausblendbar (ich brauch nicht immer "Cost Driver" sehen)
- Gruppierung mit Zwischensummen

Quellen: [Airtable Views Guide](https://support.airtable.com/docs/getting-started-with-airtable-views), [Airtable Custom Views](https://www.airtable.com/guides/build/create-custom-views-of-data)

### CFO Budget Dashboards -- Best Practices
Die besten CFO-Dashboards folgen einem Muster: Oben Scorecards mit KPIs (Budget vs. Actuals, Remaining, Variance). Ampelfarben für schnelle Bewertung. Drill-Down in Details. Kontextuelle Notizen für Abweichungen. Kein Informations-Overload -- fokussierte KPIs statt 50 Metriken.

**Was wir klauen sollten:**
- Ampelfarben (Grün <80%, Gelb 80-95%, Rot >95% verbraucht)
- Budget vs. Actuals als Kernmetrik
- Pro Business-Bereich eine eigene Zeile mit KPIs
- Drill-Down statt separate Seiten

Quellen: [Essential CFO Dashboard Guide](https://theexpertcfo.com/the-essential-cfo-dashboard-guide/), [10 Innovative CFO Dashboards 2026](https://www.fanruan.com/en/blog/innovative-cfo-dashboard-examples)

### Figma Billing Dashboards -- Layout-Inspiration
Die Figma Community hat dutzende Billing-Dashboard-Templates. Gemeinsames Muster: Linke Sidebar für Navigation, oben Scorecards, Hauptbereich ist eine Tabelle mit Transaktionen/Rechnungen. Details öffnen sich in einem Side Panel oder Modal. Einfach, sauber, funktional.

Quellen: [Billing & Invoicing Dashboard (Figma)](https://www.figma.com/community/file/1354410454948535236/billing-invoicing-dashboard), [Dashboard Billing Page (Figma)](https://www.figma.com/community/file/1559616695086316507/dashboard-billing-page)

---

## 5. Konkreter Redesign-Vorschlag -- So will ich das haben

### Screen-Übersicht

```
Nur 3 Screens. Nicht 8. Drei.

1. HAUPTANSICHT (Startseite + Tabelle + alles)
2. CASH-OUT VIEW (Monatsansicht für Finance)
3. IMPORT/EXPORT (Admin-Kram)
```

### Screen 1: HAUPTANSICHT (90% meiner Zeit hier)

```
+------------------------------------------------------------------+
| TYTAN Budget                                           [Export v] |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  | REMAINING BUDGET |  | OFFENE ITEMS     |  | NAECHSTER CASH-  | |
|  |    2.340.000 EUR |  |   34 Items       |  | OUT: April 2026  | |
|  |   von 14.2M ges. |  |   1.890.000 EUR  |  |     780.000 EUR  | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
|  +--- Department-Leiste (klickbar = Filter) -------------------+ |
|  | [Alle]  [Assembly **] [Testing *] [Logistics] [Facil] [Proto]| |
|  |          2.1M rem     890k rem    420k rem   1.2M     1.8M  | |
|  |          #### rot     ### gelb    ## grün   ## grün ## grün| |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--- Filter-Bar ----------------------------------------------+ |
|  | + Filter hinzufügen   [Phase: Bryan-Finish x] [Status: Open x]|
|  |                                                              | |
|  | Gruppieren nach: [Department v]    Suche: [____________]     | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--- Saved Views (Tabs) --------------------------------------+ |
|  | [* Alle Items] [Weekly Meeting] [Cash-Out Q3] [+ Neuer View] | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--- Tabelle --------------------------------------------------+|
|  | Description    | Dept    | Amount   | Phase  | Status | Cash  ||
|  |----------------------------------------------------------------||
|  | v Assembly Equipment (12 Items)          Summe: 3.420.000 EUR ||
|  |   Montagestation A | Assemb | 245.000 | Ph2   | Open   | Apr  ||
|  |   Förderband L3   | Assemb | 180.000 | Ph2   | Appr   | Mai  ||
|  |   ...                                                         ||
|  |----------------------------------------------------------------||
|  | v Testing (8 Items)                      Summe: 1.890.000 EUR ||
|  |   Prüfstand X     | Test   | 420.000 | Ph1   | Open   | Mar  ||
|  |   ...                                                         ||
|  +---------------------------------------------------------------+|
|                                                                   |
|  147 Items gefiltert | Summe: 8.430.000 EUR | Seite 1 von 4      |
+-------------------------------------------------------------------+
```

**Interaktionen:**

- **Department-Leiste klicken** = Filter auf Department (Toggle, mehrere wählbar)
- **Filter-Chips** = Dropdown-Auswahl, als Chip sichtbar, X zum Entfernen
- **Gruppieren-nach** = Dropdown (Department, Phase, Status, Product, Cash-Out-Monat)
- **Saved Views** = Tabs oben, klick = lädt Filter+Gruppierung, "+" = aktuellen Filter speichern
- **Zeile klicken** = Side Panel rechts mit allen Details + Edit-Möglichkeit
- **Doppelklick auf Zelle** = Inline Edit (Amount, Status, Cash-Out-Datum)
- **Gruppen-Header klicken** = auf/zuklappen
- **Scorecards oben** = passen sich an aktive Filter an!
- **Export-Button** = Exportiert die aktuelle Ansicht (mit Filtern) als Excel/CSV

### Screen 2: CASH-OUT VIEW

```
+------------------------------------------------------------------+
| TYTAN Budget > Cash-Out Forecast                       [Export v] |
+------------------------------------------------------------------+
|                                                                   |
|  +--- Zeitraum-Auswahl ----------------------------------------+ |
|  | [2026 v]   [Alle Departments v]   [Alle Phasen v]           | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--- Cash-Out Balkendiagramm ---------------------------------+ |
|  |                                                              | |
|  |  Jan  ===== 420k                                             | |
|  |  Feb  ======== 680k                                          | |
|  |  Mar  ============ 1.1M                                      | |
|  |  Apr  ====== 520k                                            | |
|  |  Mai  === 280k                                               | |
|  |  Jun  ======= 610k                                           | |
|  |  ...                                                         | |
|  |                                              Gesamt: 8.4M   | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--- Detail-Tabelle (nach Monat gruppiert) -------------------+ |
|  | v März 2026 (14 Items)                  Summe: 1.100.000   | |
|  |   Prüfstand X      | Testing  | 420.000 | Approved          | |
|  |   Förderband L2    | Assembly | 310.000 | Open              | |
|  |   ...                                                        | |
|  | v April 2026 (9 Items)                     Summe: 520.000   | |
|  |   ...                                                        | |
|  +--------------------------------------------------------------+ |
+-------------------------------------------------------------------+
```

**Warum ein eigener Screen?** Weil Finance eine ANDERE Perspektive braucht: zeitlich statt organisatorisch. Und weil der Export hier ein anderes Format hat (Monats-Spalten statt Item-Liste).

### Screen 3: IMPORT/EXPORT (selten benutzt)

```
+------------------------------------------------------------------+
| TYTAN Budget > Import / Export                                    |
+------------------------------------------------------------------+
|                                                                   |
|  +--- Import --------------------------------------------------+ |
|  | Excel-Datei hochladen: [Datei wählen]  [Importieren]       | |
|  | Letzter Import: 16.03.2026, 247 Items, 0 Fehler             | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--- Export ---------------------------------------------------+ |
|  | [Aktuelle Ansicht als CSV]                                    | |
|  | [Finance-Template Export (BudgetTemplate-Format)]              | |
|  | [Vollständiger Export (alle Felder)]                          | |
|  +--------------------------------------------------------------+ |
|                                                                   |
|  +--- Zielanpassungen ------------------------------------------+|
|  | [+ Neue Zielanpassung]                                        |
|  |                                                               |
|  | Datum      | Department | Betrag     | Begründung  | Von    |
|  | 15.02.2026 | Assembly   | +80.000    | Neue Anlage  | CFO    |
|  | 01.03.2026 | Testing    | -25.000    | Storno PX3   | IE     |
|  | ...                                                           |
|  +---------------------------------------------------------------+|
+-------------------------------------------------------------------+
```

### Navigation -- Minimal

```
Sidebar (schmal, 200px):

  TYTAN Budget
  ---------------------
  > Hauptansicht        <- Die Tabelle. 90% der Zeit.
  > Cash-Out Forecast   <- Monatsansicht für Finance.
  > Import / Export     <- Admin.
  ---------------------
  Saved Views:
    Weekly Meeting
    Testing Phase 2
    Cash-Out Q3
  ---------------------
  [+ Neuer View]
```

KEINE Department-Links in der Sidebar. Departments sind FILTER, keine Seiten.

Saved Views sind in der Sidebar UND als Tabs über der Tabelle. Doppelter Zugang, weil ich manchmal über die Sidebar navigiere und manchmal über die Tabs.

### Zusammenfassung: Was sich ändern MUSS

| Aktuell | Neu |
|---------|-----|
| Dashboard mit 4 Widgets die nichts beantworten | 3 Scorecards die sich an Filter anpassen |
| Pie Chart | Weg damit |
| Bar Chart Budget vs. Spent | Department-Leiste mit Ampelfarben |
| Area Chart Cash-Out (nicht filterbar) | Eigener Cash-Out Screen mit Detail-Tabelle |
| Approval Status Widget (nur Counts) | Weg -- Status ist ein Filter, kein Widget |
| 5 separate Department-Views | EINE Tabelle mit Department als Filter |
| Starre Sidebar mit Department-Links | Schlanke Sidebar mit 3 Seiten + Saved Views |
| Keine dynamischen Summen | Summen die sich mit jedem Filter ändern |
| Keine Inline-Bearbeitung | Doppelklick auf Zelle = Edit |
| Kein Export | Export-Button auf jeder Ansicht |
| Keine Saved Views | Notion-Style Saved Views |

---

## Schlusswort

Leute, ich weiß ihr habt euch Mühe gegeben. Das Mockup sieht HÜBSCH aus. Aber hübsch ist nicht nützlich. Ich brauche kein Tool das gut aussieht. Ich brauche ein Tool das mich um 8:15 die Antwort auf "wie viel Budget haben wir noch" in 5 Sekunden finden lässt. Das aktuelle Dashboard braucht dafür 5 Klicks und Kopfrechnen.

Baut mir eine Tabelle. Eine GUTE Tabelle. Mit Filtern die funktionieren und Summen die sich anpassen. Den Rest können wir später machen.

Und bitte: Nie. Wieder. Pie Charts.

---

*Geschrieben um 23:47 von einem IE der morgen wieder sein Excel aufmachen muss weil das "neue Tool" seine Fragen nicht beantworten kann.*
