# Change Management Plan: CAPEX Budget Tool bei NovaDrive

**Erstellt:** 2026-03-16
**Methodik:** McKinsey 7S + ADKAR (pragmatisch adaptiert fuer 50-Personen-Startup)
**Kontext:** NovaDrive baut Fabriken. Das Budget-Tool ersetzt die Excel-basierte CAPEX-Planung. Die Herausforderung ist nicht technisch -- sie ist menschlich.

---

## Executive Summary

Die Einfuehrung des Budget-Tools ist kein IT-Projekt. Es ist ein Verhaltenswandel. 5-8 Kernnutzer muessen ihre taegliche Arbeitsweise aendern -- weg von einem Excel, das sie seit Monaten kennen, hin zu einem Web-Tool, das sich erst beweisen muss.

**Kernthese:** Das Tool gewinnt nicht durch Features, sondern durch einen einzigen Moment: Wenn Chris am Montagmorgen das Dashboard oeffnet und in 5 Sekunden sieht, was im Excel 10 Minuten gedauert hat. Dieser Moment entscheidet alles.

**Zeitrahmen:** 8 Wochen vom ersten Test bis zur Excel-Abloesung.

---

## 1. Stakeholder Map

| Stakeholder | Rolle | Einstellung zum Tool | Einfluss | Primaere Motivation | Strategie |
|-------------|-------|---------------------|----------|---------------------|-----------|
| **Chris (IE/Production Planner)** | Hauptnutzer, taegliche Datenpflege | Positiv -- baut aktiv mit | Hoch | Zeitersparnis: 5h/Woche weniger Datenpflege, keine kaputten Formeln mehr | **Champion machen.** Frueh einbinden, Feedback ernst nehmen, oeffentlich als Experten positionieren. Chris ist der Multiplikator. |
| **CEO** | Sponsor, will Gesamtueberblick | Neutral-Positiv (will Ergebnisse, nicht Tools) | Sehr hoch | 5-Sekunden-Antwort auf "Liegen wir im Plan?" statt 20-Minuten-PowerPoint | **Dashboard-Demo in Woche 3.** Nicht das Tool zeigen -- das ERGEBNIS zeigen. Ampelfarben, Budget-Burndown, Sankey. Der CEO muss sagen: "Zeig mir das naechste Woche wieder." |
| **CFO** | Reporting-Empfaenger, Budget-Freigabe | Skeptisch ("Stimmen die Zahlen?") | Hoch | Pixel-perfekter Finance-Export, keine manuellen Fehler, transparente Zielanpassungen | **Finance-Export perfektionieren.** Wenn der Export nicht EXAKT wie das BudgetTemplate aussieht, sagt der CFO "Mach das nochmal im Excel." Export muss in Woche 3-4 validiert sein. |
| **Einkauf (2-3 Personen)** | Besteller, brauchen "Was soll ich ausschreiben?" | Neutral (nutzen eigene Systeme) | Mittel | Klare Liste: "Alle approved Items die noch nicht bestellt sind" | **Angebote-Feature betonen.** Einkauf bekommt gefilterte Listen statt E-Mail-Ping-Pong. Weniger Rueckfragen = weniger Arbeit fuer alle. |
| **Projektleiter (2-3 pro Department)** | Budgetverantwortliche, fragen "Wie viel hab ich noch?" | Neutral-Positiv | Mittel-Hoch | Remaining Budget in 5 Sekunden statt Chris anrufen | **Saved Views einrichten.** Jeder Projektleiter bekommt einen personalisierten View auf sein Department. Das ist der Hook. |
| **Finance-Team (2 Personen)** | Empfaenger der Monatsreports | Skeptisch-Neutral | Mittel | Automatischer Export statt manuell zusammengesuchter Zahlen | **Frueh validieren.** Finance muss in Woche 4 bestaetigen: "Die Zahlen stimmen." Danach ist der Widerstand gebrochen. |
| **IT (1 Person)** | Setup, Wartung, Backups | Nicht involviert, will keinen Aufwand | Niedrig (aber Veto-Macht bei Infrastruktur) | Einfaches Setup, wenig Wartung, kein Support-Albtraum | **Docker-Setup dokumentieren.** 1-Seiter: So laeuft es, so machst du ein Backup, so startest du es neu. IT darf nicht das Gefuehl haben, ein Monster zu erben. |
| **Produkt-Team** | Verursacht Zielanpassungen (Produktaenderungen) | Desinteressiert | Niedrig | Keine Schuldzuweisung bei Budget-Ueberschreitung | **Zielanpassungs-Kategorien nutzen.** "Produktaenderung" als Kategorie zeigt: Das war nicht Chris' Schuld, das kam vom Produkt-Team. Transparenz schuetzt alle. |

### Stakeholder-Risikomatrix

```
         Einfluss HOCH
              |
    CEO  o    |    o  CFO
              |
   Chris o    |    o  Projektleiter
              |
              |    o  Einkauf
              |
   Produkt o  |    o  Finance
              |
         IT o |
              +------------------------
           Positiv    Neutral    Skeptisch
                 Einstellung
```

**Kritischer Pfad:** CEO und CFO muessen beide in den ersten 4 Wochen "Ja" sagen. Chris allein reicht nicht -- ohne Sponsor von oben stirbt jedes Tool leise.

---

## 2. Widerstandsanalyse

### Die 6 Widerstandstypen -- und wie man sie knackt

Laut Forrester nutzen ueber 60% der Unternehmen im Manufacturing weiterhin Excel als primaere Planungsgrundlage. Excel zu ersetzen ist keine technische, sondern eine emotionale Herausforderung.

#### W1: "Mein Excel funktioniert doch" (Gewohnheit)

**Wer:** Chris, Projektleiter
**Staerke:** Hoch. Chris hat Monate in sein Excel investiert. Er kennt jede Zelle, jede Formel, jede Macke.
**Realitaet:** Das Excel "funktioniert" -- bis jemand eine Zeile loescht, eine Formel kaputt macht, oder zwei Leute gleichzeitig editieren. Es funktioniert wie ein Auto ohne Sicherheitsgurt: Meistens gut. Bis es knallt.

**Gegenstrategie:**
- Nicht gegen Excel argumentieren. FUeR das Tool argumentieren.
- Quick Win in den ersten 60 Minuten: Filter setzen, korrekte Summen sehen. DAS kann Excel nicht.
- "Du verlierst nichts -- du behaeltst alles und bekommst mehr."

#### W2: "Ich will meine Daten auf meinem Rechner" (Kontrollverlust)

**Wer:** Chris, Finance
**Staerke:** Mittel. Die lokale Excel fuehlt sich "sicher" an.
**Realitaet:** Lokal = keine Backups, kein Audit Trail, kein gleichzeitiger Zugriff. Die gefuehlte Sicherheit ist eine Illusion.

**Gegenstrategie:**
- Excel-Export jederzeit moeglich. "Du kannst deine Daten immer runterladen."
- Audit Log zeigen: "Hier siehst du wer wann was geaendert hat. Das hatte dein Excel nie."
- Regelmaessige Backups hervorheben.

#### W3: "Stimmen die Zahlen?" (Vertrauensdefizit)

**Wer:** CFO, Finance, alle
**Staerke:** Sehr hoch. Das ist DER Deal-Breaker.
**Realitaet:** Die Excel-Zahlen stimmen auch nicht immer (kaputte Formeln, geloeschte Zeilen). Aber sie sind VERTRAUT. Vertrauen ist nicht Korrektheit.

**Gegenstrategie:**
- 2 Wochen Parallelbetrieb: Excel UND Tool laufen gleichzeitig. Am Ende vergleichen.
- Finance validiert den Export in Woche 4. Schriftlich. "Die Zahlen stimmen" auf Papier.
- Transparenz: Jede Berechnung im Tool muss nachvollziehbar sein. Keine Black Box.

#### W4: "Schon wieder ein neues Tool lernen" (Aufwand)

**Wer:** Einkauf, Projektleiter, alle Gelegenheitsnutzer
**Staerke:** Mittel. Besonders bei Leuten die das Tool selten nutzen.
**Realitaet:** Wenn ein Tool mehr als 15 Minuten Einarbeitung braucht, nutzt es keiner freiwillig.

**Gegenstrategie:**
- 1-Stunden Live-Demo, nicht mehr.
- Quick Reference Card: 1 Seite, laminiert, auf dem Schreibtisch.
- Das Tool muss so intuitiv sein, dass keine Schulung noetig ist. Wenn wir viel erklaeren muessen, ist die UX schlecht.

#### W5: "Was wenn es nicht funktioniert?" (Angst vor Datenverlust)

**Wer:** Chris, IT
**Staerke:** Mittel-Hoch.
**Realitaet:** Berechtigte Sorge. Ein neues Tool KANN Probleme haben. Der Unterschied: Wir haben einen Fallback-Plan.

**Gegenstrategie:**
- Excel bleibt archiviert. Immer. Wird nie geloescht.
- Taegliche Backups der Tool-Datenbank.
- Klarer Fallback-Plan (siehe Abschnitt 7).

#### W6: "Das ist Chris' Spielzeug, nicht unser Tool" (Ownership-Problem)

**Wer:** Projektleiter, Finance
**Staerke:** Mittel. Wenn nur Chris das Tool nutzt, bleibt es sein Seitenprojekt.
**Realitaet:** Ein Tool das nur ein Mensch nutzt, stirbt wenn dieser Mensch geht.

**Gegenstrategie:**
- CEO muss das Tool im Meeting NUTZEN, nicht nur sehen. "Zeig mir das im Dashboard" statt "Schick mir die PowerPoint."
- Finance muss den Export AUS DEM TOOL bekommen, nicht per E-Mail.
- Saved Views fuer jeden Stakeholder: "Das ist DEIN View. Den hab ich fuer DICH gemacht."

---

## 3. Rollout-Plan (8 Wochen)

### Woche 1-2: "Silent Launch" -- Chris testet allein

| Aktivitaet | Verantwortlich | Erfolgskriterium |
|------------|---------------|------------------|
| Tool mit echten Daten befuellen (Excel-Import) | Georg + Chris | Alle 200+ Line Items importiert, Hierarchie korrekt |
| Chris arbeitet 2 Wochen parallel (Excel + Tool) | Chris | Chris oeffnet das Tool mindestens 3x taeglich |
| Taegliches 15-Min Feedback-Gespraech | Georg + Chris | Bug-Liste < 10 Items, keine Showstopper |
| Performance-Check: Ist das Tool schneller als Excel? | Chris | Inline-Edit < 1 Sekunde, Dashboard-Load < 3 Sekunden |
| Zahlenabgleich: Tool vs. Excel | Chris | Abweichung = 0 EUR bei allen Department-Summen |

**Kernfrage Woche 2:** Wuerde Chris freiwillig sein Excel aufgeben? Ja/Nein. Wenn Nein: Was fehlt?

### Woche 3-4: "Sponsor gewinnen" -- CEO-Demo, Finance-Validierung

| Aktivitaet | Verantwortlich | Erfolgskriterium |
|------------|---------------|------------------|
| CEO-Demo: 20 Minuten, nur Dashboard + Sankey | Georg + Chris | CEO sagt: "Zeig mir das naechste Woche wieder" |
| Finance-Export generieren und an CFO senden | Georg | CFO/Finance bestaetigt: "Format stimmt, Zahlen stimmen" |
| Erste Saved Views fuer Projektleiter einrichten | Georg | 3 Projektleiter haben ihren View |
| Chris beantwortet Fragen im Meeting AUS DEM TOOL | Chris | Mindestens 1 Meeting komplett ohne Excel-Rueckgriff |

**Kernfrage Woche 4:** Hat der CEO den Finance-Export akzeptiert? Ja/Nein. Wenn Nein: Was muss am Export angepasst werden?

**Go/No-Go Entscheidung:** Nach Woche 4 muss klar sein ob wir weitermachen oder nachbessern. Kriterien:
- Chris nutzt das Tool taeglich: JA/NEIN
- CEO hat Dashboard gesehen und positiv reagiert: JA/NEIN
- Finance-Export ist validiert: JA/NEIN

Alle drei muessen JA sein. Sonst: 2 Wochen Nachbesserung vor Weiterfuehrung.

### Woche 5-6: "Verbreiterung" -- Parallelbetrieb mit mehr Nutzern

| Aktivitaet | Verantwortlich | Erfolgskriterium |
|------------|---------------|------------------|
| Projektleiter bekommen Viewer-Zugang | Georg | 3 Projektleiter loggen sich ein |
| Einkauf bekommt gefilterte Listen aus dem Tool | Chris | Einkauf nutzt Tool-Listen statt E-Mail-Anfragen |
| 1-Stunden-Einfuehrung fuer alle neuen Nutzer | Georg | Alle Teilnehmer koennen ihren View oeffnen und filtern |
| Quick Reference Card verteilen | Georg | Liegt bei jedem am Schreibtisch |
| Chris pflegt NUR NOCH das Tool, Excel nur noch als Backup-Export | Chris | Excel wird maximal 1x pro Woche aktualisiert (Sicherheitskopie) |

### Woche 7: "Excel-Freeze" -- Tool wird Primary

| Aktivitaet | Verantwortlich | Erfolgskriterium |
|------------|---------------|------------------|
| Offizielle Ankuendigung: "Das Tool ist jetzt die Single Source of Truth" | CEO (!) | E-Mail/Teams-Nachricht vom CEO, nicht von Georg |
| Excel wird archiviert (Read-Only auf SharePoint) | IT | Excel ist zugreifbar aber nicht editierbar |
| Finance-Report kommt NUR NOCH aus dem Tool | Chris + Finance | Finance akzeptiert Tool-Export als alleinige Quelle |
| Alle Meetings nutzen das Dashboard | Chris + Projektleiter | Kein Meeting mehr mit Excel-Screenshots |

**Warum der CEO die Ankuendigung machen muss:** Wenn Georg sagt "Nutzt jetzt das Tool", koennen die Leute sagen "Naja, ist ja sein Projekt." Wenn der CEO sagt "Das ist ab jetzt unser System", ist das eine Ansage. Sponsorship ist nicht optional.

### Woche 8: Retrospektive und Verankerung

| Aktivitaet | Verantwortlich | Erfolgskriterium |
|------------|---------------|------------------|
| Retrospektive mit allen Nutzern (30 Min) | Georg | Feedback dokumentiert, Top-3 Verbesserungen identifiziert |
| NPS-Umfrage (1 Frage: "Wuerdest du zurueck zu Excel wollen?") | Georg | > 80% sagen "Nein" |
| Roadmap-Update basierend auf Feedback | Georg | Naechste 3 Features priorisiert |
| Erfolge quantifizieren und an CEO kommunizieren | Georg + Chris | "Report-Erstellung: 2h -> 2 Klicks. Fehlerrate: X -> 0." |

---

## 4. Erfolgsmetriken

### Quantitativ -- Was wir messen koennen

| Metrik | Baseline (Excel) | Zielwert (Tool, Woche 8) | Messmethode |
|--------|-------------------|--------------------------|-------------|
| **Login-Frequenz Chris** | n/a | >= 3x taeglich | Server-Logs |
| **Login-Frequenz andere Nutzer** | n/a | >= 1x woechentlich | Server-Logs |
| **Report-Erstellungszeit (Finance-Export)** | 2 Stunden (manuelles Copy-Paste) | < 2 Minuten (2 Klicks) | Zeitmessung |
| **Meeting-Vorbereitungszeit (Weekly)** | 1 Stunde (Zahlen zusammensuchen) | < 15 Minuten (Saved View oeffnen) | Zeitmessung |
| **Fehlerrate (falsche Summen, kaputte Formeln)** | ~2-3 pro Monat (geschaetzt) | 0 (berechnet, nicht manuell) | Fehlerbericht |
| **Antwortzeit auf Spontanfragen ("Wie steht Testing?")** | 5-10 Minuten (Excel oeffnen, filtern, rechnen) | < 10 Sekunden (Dashboard) | Beobachtung |
| **Parallele Excel-Nutzung** | 100% | 0% (nach Woche 7) | Beobachtung |

### Qualitativ -- Was wir erfragen muessen

| Metrik | Methode | Zeitpunkt | Ziel |
|--------|---------|-----------|------|
| **User-Zufriedenheit Chris** | 1:1 Gespraech | Woche 2, 4, 8 | "Das Tool ist besser als mein Excel" |
| **CEO-Feedback** | Nach Management-Meeting | Woche 4, 8 | "Ich will das jede Woche sehen" |
| **CFO-Vertrauen** | Nach Finance-Export-Validierung | Woche 4 | "Die Zahlen stimmen. Ich brauche kein Excel mehr." |
| **Einkauf-Zufriedenheit** | Kurzes Feedback | Woche 6 | "Die Listen aus dem Tool sind klarer als Chris' E-Mails" |
| **NPS (1 Frage)** | Anonyme Umfrage | Woche 8 | "Wuerdest du zurueck zu Excel wollen?" > 80% Nein |

### Kill-Metriken -- Wann wir eingreifen muessen

| Signal | Schwelle | Reaktion |
|--------|----------|----------|
| Chris oeffnet Excel oefter als das Tool | > 50% Excel-Nutzung in Woche 3-4 | Sofort-Gespraech: Was fehlt im Tool? |
| Finance lehnt den Export ab | Nach Woche 4 | Export-Format innerhalb 1 Woche anpassen |
| CEO fragt nicht nach dem Dashboard | Nach Woche 4 | Dashboard-Inhalte ueberarbeiten, CEO erneut pitchen |
| Mehr als 5 kritische Bugs in Woche 1-2 | 5+ Bugs die Arbeit blockieren | Rollout pausieren, Bugfixing priorisieren |

---

## 5. Kommunikationsplan

### Leitprinzip: "Show, Don't Tell"

Keiner will eine E-Mail lesen die erklaert warum das neue Tool toll ist. Die Leute muessen es SEHEN. Ein Screenshot sagt mehr als ein Absatz. Ein Live-Klick sagt mehr als ein Screenshot.

### Key Messages pro Stakeholder -- "What's in it for me?"

| Stakeholder | Kernbotschaft | Kanal | Timing |
|-------------|---------------|-------|--------|
| **Chris** | "Du bekommst deine Freitagabende zurueck. Kein Copy-Paste-Export mehr. Keine kaputten Formeln. Und wenn jemand fragt 'Wie steht Testing?' -- 1 Klick." | 1:1 Gespraech | Woche 0 (vor dem Start) |
| **CEO** | "Sie sehen den Gesamtstatus Ihrer Fabrik in 5 Sekunden. Ampelfarben, Budget-Burndown, alles auf einem Screen. Keine PowerPoint mehr noetig." | Live-Demo, 20 Min | Woche 3 |
| **CFO** | "Der Finance-Export kommt automatisch im richtigen Format. Keine manuellen Fehler. Zielanpassungen sind transparent -- Sie sehen woher jede Aenderung kommt." | E-Mail mit Export-Sample + kurzes Gespraech | Woche 3-4 |
| **Einkauf** | "Ihr bekommt eine saubere Liste: Was ist approved und muss bestellt werden? Kein Hin-und-Her per E-Mail mit Chris." | Einkauf-Meeting | Woche 5 |
| **Projektleiter** | "Euer Budget-Remaining auf einen Blick. Kein Anruf bei Chris mehr noetig. Euer eigener View, immer aktuell." | Im regulaeren Meeting + Saved View einrichten | Woche 5-6 |
| **IT** | "Docker-Container, ein Befehl zum Starten, automatische Backups. Wartungsaufwand: ~30 Min pro Monat." | 1-Seiter Dokumentation | Woche 1 |
| **Produkt-Team** | "Wenn ihr eine Produktaenderung macht die das Budget betrifft, wird das transparent als 'Produktaenderung' getaggt. Keine Schuldzuweisung." | Beilaeufig im Meeting erwaehnen | Woche 6-7 |

### Kommunikations-Timeline

| Woche | Aktion | Absender | Empfaenger |
|-------|--------|----------|------------|
| 0 | Kickoff-Gespraech: "Wir testen etwas Neues" | Georg | Chris |
| 2 | Kurzes Update: "Chris testet seit 2 Wochen, laeuft gut" | Georg | CEO (informal) |
| 3 | CEO-Demo | Georg + Chris | CEO |
| 4 | Finance-Export-Validierung | Georg | CFO + Finance |
| 5 | Ankuendigung: "Neues Budget-Tool im Testbetrieb" | Georg | Alle Nutzer (Teams-Channel) |
| 5 | Einfuehrungs-Session (1 Stunde) | Georg | Projektleiter + Einkauf |
| 7 | **Offizielle Ankuendigung: Tool ist Primary** | **CEO** | **Alle** |
| 8 | Retrospektive + Ergebnisse teilen | Georg | Alle Nutzer |

### Was wir NICHT kommunizieren

- Keine Feature-Versprechen die wir nicht halten. "Approval Workflow kommt bald" -- NEIN. "Das ist auf der Roadmap, aber erstmal machen wir das hier richtig."
- Keine Kritik an der Excel. Leute haben Monate damit gearbeitet. "Das Excel hat uns hierher gebracht. Jetzt gehen wir den naechsten Schritt."
- Kein Technologie-Jargon. Nicht "React Frontend mit FastAPI Backend und PostgreSQL." Sondern: "Ein Tool das funktioniert."

---

## 6. Training Plan

### Prinzip: Minimaler Aufwand, maximaler Impact

Das Tool muss so intuitiv sein, dass Training fast ueberfluessig ist. Wenn wir eine 2-Tages-Schulung brauchen, haben wir die UX falsch gebaut. Trotzdem brauchen die Leute Orientierung -- nicht weil das Tool komplex ist, sondern weil es NEU ist.

### Stufe 1: Live-Demo (1 Stunde, einmalig)

**Teilnehmer:** Alle kuenftigen Nutzer (5-8 Personen)
**Zeitpunkt:** Woche 5
**Aufbau:**

| Zeit | Inhalt | Methode |
|------|--------|---------|
| 0-10 Min | "Warum wir das machen" -- 3 Pain Points aus dem Excel-Alltag | Chris erzaehlt (nicht Georg!) |
| 10-30 Min | Live-Walkthrough: Dashboard, Tabelle, Filter, Inline-Edit | Georg zeigt am Beamer |
| 30-45 Min | Haende-on: Jeder oeffnet sein Laptop, findet sein Department, setzt einen Filter | Alle gleichzeitig |
| 45-55 Min | Finance-Export live demonstrieren | Georg zeigt, CFO validiert live |
| 55-60 Min | Fragen + "Wo finde ich Hilfe?" | Offene Runde |

**Warum Chris die Einleitung macht:** Wenn Georg sagt "Excel ist schlecht", denken die Leute "Der will halt sein Tool verkaufen." Wenn Chris sagt "Ich hab 5 Stunden pro Woche mit Excel-Datenpflege verbracht und das Tool macht das in 5 Minuten", ist das glaubwuerdig. Peer-to-Peer schlaegt Top-Down.

### Stufe 2: Quick Reference Card (1-Seiter, laminiert)

**Format:** A4, doppelseitig, laminiert, liegt auf dem Schreibtisch

**Vorderseite: Die 5 wichtigsten Aktionen**
1. Dashboard oeffnen: `[URL]` -> Gesamtstatus in 5 Sekunden
2. Mein Department filtern: Tabelle -> Filter "Department" -> [auwaehlen]
3. Line Item aendern: Doppelklick auf Zelle -> Wert aendern -> Enter
4. Finance-Export: Menu -> Export -> Finance Template -> Download
5. Saved View laden: Dropdown oben rechts -> [View-Name]

**Rueckseite: Haeufige Fragen**
- "Wie viel Budget ist noch uebrig?" -> Dashboard, erste Zeile
- "Was muss bestellt werden?" -> Filter: Status = Approved, nicht Ordered
- "Warum ist das Budget gestiegen?" -> Zielanpassungen Tab
- "Ich brauche die Daten in Excel" -> Export -> CSV/Excel
- "Etwas stimmt nicht" -> Georg anrufen/Teams-Nachricht

### Stufe 3: Video-Walkthrough (5 Minuten)

**Format:** Screenrecording mit Voiceover (Loom oder OBS)
**Inhalt:** Die gleichen 5 Aktionen wie auf der Quick Reference Card, live gezeigt
**Verteilt via:** Teams-Channel, als Link auf der Quick Reference Card (QR-Code)
**Ziel:** Fuer Leute die in der Live-Demo nicht dabei waren oder sich spaeter erinnern wollen

### Stufe 4: FAQ-Dokument (lebendes Dokument)

**Format:** SharePoint-Seite oder Notion-Page
**Start-Inhalt:** 10 Fragen aus den ersten 2 Wochen (von Chris gesammelt)
**Pflege:** Georg aktualisiert nach jeder neuen Frage
**Ziel:** Innerhalb 8 Wochen die 20 haeufigsten Fragen abgedeckt

### Was wir NICHT machen

- Kein E-Learning-Kurs. Kein LMS. Kein Zertifikat. Wir sind 50 Leute, nicht Siemens.
- Kein 50-seitiges Benutzerhandbuch. Wenn das Tool ein Handbuch braucht, ist es zu komplex.
- Keine verpflichtende Schulung. Wer dabei war, hat einen Vorsprung. Wer nicht, bekommt die Quick Reference Card und das Video.

---

## 7. Fallback-Plan

### Prinzip: Kein Fallschirm bedeutet kein Sprung

Die Leute geben ihr Excel nur auf, wenn sie wissen, dass sie im Notfall zurueckkoennen. Paradoxerweise macht das den Wechsel WAHRSCHEINLICHER, nicht unwahrscheinlicher.

### Szenario A: Tool funktioniert, aber wird nicht genutzt (Adoption-Failure)

**Symptome:**
- Chris oeffnet die Excel oefter als das Tool (Woche 3-4)
- Projektleiter loggen sich nicht ein
- CEO fragt weiter nach PowerPoints

**Diagnose:**
- 1:1 mit Chris: "Was fehlt? Was nervt? Was kann das Excel besser?"
- Review der P0-Features: Sind alle implementiert und performant?
- Ist die UX das Problem? Zu viele Klicks? Zu langsam?

**Massnahmen:**
1. Rollout pausieren (NICHT abbrechen)
2. Top-3 Probleme identifizieren und fixen (1-2 Wochen)
3. Neustart ab Woche 3 (CEO-Demo verschieben)
4. Wenn nach 2 Nachbesserungs-Zyklen immer noch Adoption < 50%: Ehrliches Gespraech mit Chris und CEO -- brauchen wir ein fundamental anderes Konzept?

### Szenario B: Technisches Versagen (Datenverlust, Ausfaelle)

**Symptome:**
- Tool ist nicht erreichbar (Server down)
- Daten sind inkonsistent oder fehlen
- Performance ist inakzeptabel (> 5 Sekunden fuer Dashboard)

**Sofortmassnahmen:**
1. Excel-Backup ist IMMER vorhanden (letzter Export, maximal 1 Woche alt)
2. Chris exportiert taeglich eine CSV als Sicherheitskopie (automatisierbar)
3. IT stellt Server innerhalb 4 Stunden wieder her (Docker-Restart)
4. Datenbank-Backup wird taeglich gezogen

**Zurueck zur Excel ohne Datenverlust:**
1. Letzten CSV-Export aus dem Tool importieren in die Original-Excel
2. Aenderungen seit dem letzten Export: Chris rekonstruiert aus Gedaechtnis/E-Mails (worst case: 1 Tag Arbeit fuer 1 Woche Aenderungen)
3. Excel auf SharePoint reaktivieren (Read-Only aufheben)
4. Allen kommunizieren: "Wir arbeiten voruebergehend wieder mit der Excel. Das Tool wird repariert."

**Maximal akzeptabler Datenverlust:** 1 Arbeitstag. Deshalb: Taegliche Backups sind Pflicht, nicht Nice-to-have.

### Szenario C: Politisches Scheitern (Sponsor verloren)

**Symptome:**
- CEO verliert Interesse ("Schick mir einfach die PowerPoint")
- CFO lehnt den Export ab ("Die Zahlen stimmen nicht")
- Chris wird auf ein anderes Projekt abgezogen

**Massnahmen:**
- Wenn CEO: Neuen Quick Win finden. Das Sankey-Diagram ist oft der Wow-Moment.
- Wenn CFO: Finance-Export pixel-perfekt nachbessern. Kein Kompromiss.
- Wenn Chris weg: SOFORT einen zweiten Power-User aufbauen. Ein-Personen-Abhaengigkeit ist der groesste Risikofaktor.

### Reissleinen-Kriterien -- Wann brechen wir ab?

| Kriterium | Schwelle | Konsequenz |
|-----------|----------|------------|
| Chris kehrt dauerhaft zu Excel zurueck | Nach Woche 6, trotz Nachbesserung | Projekt auf Eis legen, Root Cause analysieren |
| CEO entzieht Unterstuetzung | Explizit oder durch Nicht-Nutzung | Ohne Sponsor kein Rollout. Pause bis neuer Sponsor gefunden. |
| Technische Probleme > 3 Ausfaelle in 2 Wochen | 3+ Ausfaelle | Rollout pausieren, Infrastruktur stabilisieren |
| Finance-Export nach 2 Iterationen nicht akzeptiert | Nach Woche 6 | Export-Strategie ueberdenken (ggf. anderes Format) |

---

## 8. Risikomatrix -- Top 10 Risiken

| # | Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|--------|-------------------|--------|------------|
| 1 | Chris kehrt zu Excel zurueck weil P0-Features fehlen | Mittel | Kritisch | Alle P0-Features vor Woche 1 fertig. Kein Kompromiss. |
| 2 | Excel-Import verliert Hierarchie oder Daten | Hoch | Hoch | Import-Validierung: Summen Tool vs. Excel muessen auf den Cent stimmen |
| 3 | CFO lehnt Finance-Export ab | Mittel | Hoch | Export in Woche 2 bauen, in Woche 3-4 validieren, 1 Woche Puffer fuer Nachbesserung |
| 4 | CEO ignoriert das Tool | Mittel | Hoch | Dashboard muss "Wow" sagen. Sankey-Diagram als Hook. |
| 5 | Performance zu langsam (> 3s pro Aktion) | Niedrig | Hoch | Performance-Tests in Woche 1. Bei 200 Items sollte alles < 1s sein. |
| 6 | Nur Chris nutzt es -- "Chris' Spielzeug" | Hoch | Mittel | Saved Views fuer Projektleiter. CEO muss es im Meeting nutzen. |
| 7 | Parallelbetrieb wird zum Dauerzustand | Hoch | Mittel | Harte Deadline: Woche 7 = Excel-Freeze. CEO kuendigt es an. |
| 8 | Widerstand vom Einkauf ("Wir haben unsere eigenen Tools") | Mittel | Niedrig | Einkauf bekommt nur READ-Zugriff + gefilterte Listen. Kein Zwang. |
| 9 | IT blockiert Infrastruktur | Niedrig | Mittel | Docker-Setup so einfach wie moeglich. 1-Seiter Dokumentation. |
| 10 | Chris wird krank / abgezogen | Niedrig | Kritisch | Ab Woche 5: Zweiten Power-User aufbauen (Projektleiter mit hoechster Motivation) |

---

## 9. Die 3-Wochen-Regel

Die ersten 3 Wochen nach dem Parallelbetrieb-Start entscheiden ueber Erfolg oder Scheitern. Die Forschung zu digitaler Transformation im Manufacturing zeigt konsistent: Wenn Nutzer in den ersten 3 Wochen oefter zum alten System zurueckgreifen als das neue nutzen, ist die Adoption verloren.

### Was in diesen 3 Wochen passieren MUSS:

1. **Tag 1:** Chris oeffnet das Tool und sieht sein Dashboard. In 5 Sekunden weiss er wo er steht. Quick Win. Dopamin.
2. **Woche 1:** Chris beantwortet eine Spontanfrage AUS DEM TOOL statt aus der Excel. Er merkt: "Das ging schneller."
3. **Woche 2:** Chris erstellt den Finance-Export mit 2 Klicks statt 2 Stunden. Er denkt: "Dafuer allein hat sich der Wechsel gelohnt."
4. **Woche 3:** Chris geht ins Management-Meeting, oeffnet das Dashboard, zeigt die Ampelfarben. CEO sagt: "So will ich das jede Woche sehen." Chris weiss: Das Tool bleibt.

### Was in diesen 3 Wochen NICHT passieren darf:

- Kein Bug der die Arbeit blockiert (-> Bugfixing-Kapazitaet bereithalten)
- Kein Feature das fehlt und Chris zurueck zur Excel zwingt (-> P0 muss komplett sein)
- Kein Meeting in dem jemand sagt "Zeig mir das mal in der Excel" (-> CEO muss mitspielen)

---

## Fazit

Dieses Change Management ist kein 6-Monats-Programm mit Workshops, Coaches und Cultural Transformation Journeys. Das waere fuer Siemens. NovaDrive ist ein 50-Personen-Startup das eine Fabrik baut.

**Was es braucht:**
1. Ein Tool das am Tag 1 besser ist als die Excel (in den Dimensionen die Chris wichtig sind)
2. Einen CEO der sagt "So will ich das sehen" (Sponsorship)
3. Einen CFO der sagt "Die Zahlen stimmen" (Vertrauen)
4. 8 Wochen disziplinierten Rollout (nicht 8 Monate)
5. Den Mut, die Excel in Woche 7 einzufrieren (Excel-Freeze)

Der Rest ist Handwerk, nicht Magie.

---

Sources (Recherche-Grundlage):
- [Digital Transformation in Manufacturing: Trading Excel Files for a Data-Centric Strategy](https://www.openbom.com/blog/digital-transformation-in-manufacturing-trading-excel-files-for-a-data-centric-strategy)
- [Digital Transformation in Manufacturing and Overcoming Resistance to Change](https://masisstaffing.com/digital-transformation-in-manufacturing-and-overcoming-resistance-to-change)
- [Top Strategies for Successful Digital Transformation: Overcoming Resistance in Manufacturing](https://www.radixeng.com/post/the-human-side-of-digital-transformation-why-change-management-makes-or-breaks-your-project)
- [How To Effectively Overcome Resistance to Digital Transformation in Your Manufacturing Plant](https://www.reliableplant.com/Read/32471/how-to-effectively-overcome-resistance-to-digital-transformation-in-your-manufacturing-plant)
- [Best Change Management Practices for Manufacturing](https://www.qualityze.com/blogs/manufacturing-change-management)
- [Top 5 Change Management Software in the Manufacturing Industry 2025](https://www.compliancequest.com/bloglet/manufacturing-change-management-software/)
- [10 Best Practices for Change Management in Organizations](https://www.rezolve.ai/blog/10-best-practices-for-change-management-in-organizations)
- [Excel vs. AchieveIt for Strategic Planning](https://www.achieveit.com/resources/blog/excel-vs-achieveit-for-strategic-planning/)
- [Change Management in Digital Transformation: Overcome Resistance](https://willdom.com/blog/change-management-in-digital-transformation/)
