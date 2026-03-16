# OTTO v3 -- Wie ein Production Planner WIRKLICH denkt

**Von:** OTTO (Industrial Engineer bei TYTAN Technologies, der Typ der die Fabrik baut)
**Datum:** 2026-03-16
**Status:** Nicht mehr nur genervt. Jetzt denke ich strategisch. Und bin IMMER NOCH genervt.

---

## 1. NEUE Use Cases -- Die nächste Ebene

Ich hab euch schon UC-01 bis UC-07 gegeben. Das waren die Basics. Jetzt kommen die Sachen die mir nachts einfallen, wenn ich im Bett liege und an die 5k Factory denke.

---

### UC-08: "Naechste Fabrik planen -- Was hat die 3k gekostet?"

**Situation:** In 3 Monaten startet die Planung für die 5k Factory. Mein Chef sagt: "Georg, mach mal ein Budget für die 5k. Orientier dich an der 3k." Klingt einfach, oder?

**Was ich brauche:** Ich will auf die 3k Factory zurückschauen und sagen: "Assembly Equipment hat bei der 3k insgesamt 2.8M gekostet. Die größten Abweichungen waren beim Förderband (+40% wegen Lieferengpaessen) und bei der Schraubstation (-15% weil wir den Scope reduziert haben). Die durchschnittliche Abweichung war +12%."

**Konkret brauche ich:**
- **Facility-Vergleichsansicht** oder zumindest die Möglichkeit, eine abgeschlossene Facility als "Template" zu exportieren
- Pro Work Area: geplant vs. tatsächlich, mit Delta in % und EUR
- Die größten Abweichungen nach oben und unten auf einen Blick
- "Lessons Learned" als Freitext pro Department oder Work Area (was hat uns überrascht?)
- Export als Basis für die nächste Planung -- mit den TATSAECHLICHEN Kosten, nicht den geplanten

**Warum das wichtig ist:** Wenn ich die 5k Factory plane und nur meine urspruenglichen Budgets als Referenz habe, plane ich die gleichen Fehler nochmal ein. Ich brauche die REALITAET als Basis, nicht den Wunschtraum.

**Was das Tool können muss (Minimum):**
- Eine Facility als "abgeschlossen" markieren
- Alle Daten dieser Facility als Snapshot einfrieren
- Export als Template-CSV mit einer Extra-Spalte "Actual vs. Planned"
- Bonus: Facility-Dropdown um zwischen 3k und 5k umzuschalten

---

### UC-09: "Angebote ablegen -- Woher kommt der Preis?"

**Situation:** Mein Chef steht vor meinem Schreibtisch. "Georg, woher kommen die 245.000 für die Montagestation?" Gute Frage. Ich hab das Angebot. Irgendwo. War eine PDF von Bosch Rexroth. Oder war's Festo? Liegt im SharePoint. In welchem Ordner? War das unter "Assembly" oder unter "Angebote_2026" oder unter "Lieferanten"? Ich scrolle durch SharePoint, Chef wird ungeduldig, ich schwitze.

**Was ich brauche:** Ich klicke auf die Kostenposition "Montagestation A". Im Detail-Panel rechts gibt es einen Tab "Anhange". Da liegt das PDF. Zwei Klicks: Position öffnen, Angebot anklicken. Fertig. Chef ist happy, ich bin nicht verschwitzt.

**Konkret:**
- An JEDER Kostenposition will ich Dateien anhängen können
- PDFs (Angebote), Excel (Kalkulationen), Bilder (Fotos vom Lieferantenbesuch)
- Schnell-Upload: Drag & Drop ins Detail-Panel
- Schnell-Zugriff: Datei-Icons mit Dateiname und Upload-Datum direkt sichtbar
- Suche: "Zeig mir alle Positionen die ein Angebot angehaengt haben" vs. "Zeig mir alle die NOCH KEIN Angebot haben"

**Warum nicht SharePoint?** Weil der Kontext verloren geht. Das Angebot GEHOERT zur Kostenposition. Es ist nicht ein Dokument das irgendwo rumschwirrt. Es ist der BELEG für den Preis. Das muss zusammenleben.

---

### UC-10: "Budget-Anpassung durch Produktänderung -- Nicht meine Schuld!"

**Situation:** Das Produkt-Team ändert was am Bryan. Neues Bauteil, andere Montageschritte, schwereres Gehäuse. Das heisst: der Roboter braucht einen stärkeren Greifer, die Montagelinie braucht eine zusaetzliche Station. Kosten: +80k.

Das ist KEINE Budget-Überschreitung. Das ist eine Zielanpassung weil sich die Anforderungen geändert haben. Und das muss ich dokumentieren können, ohne dass es so aussieht als haette ICH schlecht geplant.

**Was ich brauche:**
- Zielanpassungen mit einer REFERENZ: "Change Request CR-2026-042" oder "Product Change PC-Bryan-047"
- Kategorie der Anpassung: Produktänderung, Scope-Erweiterung, Preiserhöhung Lieferant, Management-Entscheidung
- Wer hat die Anpassung verursacht? (Produkt-Team, Engineering, Management, extern)
- Wer hat sie genehmigt? (CFO, CEO, Projektleiter)
- Timeline: Wann beantragt, wann genehmigt
- Im Dashboard will ich sehen: "Originalbudget: 500k. Zielanpassungen: +80k (davon +80k Produktänderungen, 0 eigenverschuldet). Aktuelles Budget: 580k."

**Warum das POLITISCH wichtig ist:** Wenn der CFO fragt "Warum seid ihr 80k über Budget?", will ich in 3 Sekunden antworten: "Sind wir nicht. Das Produkt-Team hat CR-2026-042 eingereicht, das wurde am 14.03. genehmigt, und die 80k sind eine genehmigte Zielanpassung. Unser Verbrauch INNERHALB des angepassten Budgets ist bei 87%." DAS ist der Unterschied zwischen "Georg hat sein Budget nicht im Griff" und "Georg ist ein Profi der Änderungen transparent trackt."

---

### UC-11: "Lieferantenvergleich -- 3 Angebote, 1 Entscheidung"

**Situation:** Fuer die Fördertechnik hab ich 3 Angebote angefragt:
- Interroll: 180k, 12 Wochen Lieferzeit, komplett mit Steuerung
- Haro: 165k, 16 Wochen Lieferzeit, ohne Steuerung
- FlexLink: 210k, 10 Wochen Lieferzeit, komplett mit Steuerung + 2 Jahre Wartung

**Was ich brauche:**
- Alle 3 Angebote an der GLEICHEN Kostenposition ("Fördertechnik L3") ablegen
- Strukturierter Vergleich: Preis, Lieferzeit, Scope (was ist enthalten, was nicht)
- Am Ende eins auswaehlen: "Entscheidung: Interroll, weil bestes Preis-Leistungs-Verhältnis"
- Die anderen beiden archivieren, aber NICHT löschen -- falls die Entscheidung hinterfragt wird
- Der Betrag der Kostenposition wird automatisch auf den ausgewählten Anbieter gesetzt

**Warum nicht einfach 3 PDFs anhängen?** Weil der Vergleich dann in meinem KOPF stattfindet oder in einer separaten Excel-Tabelle. Und in 6 Monaten weiß niemand mehr WARUM wir Interroll genommen haben. Die Entscheidungsgrundlage muss Teil des Datensatzes sein.

**Minimum für MVP:** Ehrlich? Fuer den MVP reicht es, 3 PDFs an die Position zu haengen und ein Freitext-Feld "Entscheidungsbegruendung". Der strukturierte Vergleich ist nice-to-have. Aber das Freitext-Feld ist Pflicht.

---

### UC-12: "Ramp-Up Phasenplanung -- Burndown für Budget"

**Situation:** Phase 1 (Bryan-Start) ist die teuerste Phase. 60% des Budgets fließen hier rein. Wir sind mitten in Phase 1 und ich muss wissen: Liegen wir im Plan?

**Was ich brauche:**
- Budget-Burndown-Chart pro Phase
- X-Achse: Zeit (Monate)
- Y-Achse: Budget verbraucht (kumulativ)
- Zwei Linien: PLAN (basierend auf geplanten Cash-Out-Daten) vs. ACTUAL (basierend auf tatsächlichen Zahlungen)
- Wenn die Actual-Linie UEBER der Plan-Linie liegt: wir geben schneller Geld aus als geplant
- Wenn darunter: wir sind hinterher (was auch schlecht sein kann -- heisst eventuell Verzögerungen)

**Warum das wichtig ist:** Der CEO fragt nicht "wie viel haben wir ausgegeben" -- er fragt "liegen wir im Plan". Das ist eine andere Frage. Und die kann ich nur beantworten wenn ich Plan vs. Actual auf einer Zeitachse sehe.

**Konkretes Beispiel:**
- Phase 1 Budget: 8.5M, geplanter Verbrauch über 12 Monate
- Monat 6: Plan sagt 4.8M verbraucht, Actual ist 5.2M
- Delta: +400k voraus -- heisst entweder wir kaufen schneller ein (gut) oder die Sachen sind teurer als geplant (schlecht)
- Drill-Down ins Delta: WELCHE Positionen verursachen die Abweichung?

---

### UC-13: "Forecast vs. Actual -- Finance nervt jeden Monat"

**Situation:** Erster Freitag im Monat. Finance schickt eine Mail: "Georg, was war der Plan für März vs. was wurde tatsächlich bezahlt? Und bitte aktualisiere den Forecast für April-Juni."

Jeden. Einzelnen. Monat. Immer. Dieselbe. Frage.

**Was ich brauche:**
- Monatsansicht mit drei Spalten: **Planned** (was hatte ich für diesen Monat als Cash-Out geplant), **Actual** (was wurde tatsächlich bezahlt), **Delta** (Abweichung)
- Pro Department aufgeschluesselt
- Über das ganze Jahr kumulativ
- Export-Button der genau dieses Format als Excel ausspuckt
- Bonus: Wenn ich den Forecast für zukuenftige Monate ändere (weil sich Liefertermine verschieben), soll das Tool die alte Prognose behalten und die neue daneben stellen

**Warum das nervt:** Aktuell mache ich das MANUELL. Ich schaue was geplant war, vergleiche mit den Rechnungen die reingekommen sind, tippe Zahlen in Finance's Template, und schicke es ab. Dauert 2 Stunden. Fuer eine Tabelle die ein Computer in 0.3 Sekunden berechnen koennte.

---

### UC-14: "Quick Status auf dem Flur -- 5 Sekunden"

**Situation:** Ich stehe in der Kaffee-Küche. Mein Chef kommt rein. "Georg, wie stehen wir bei Testing?" Er will keine 5-Minuten-Präsentation. Er will eine Zahl und eine Farbe.

**Was ich brauche:**
- Ich öffne das Tool auf meinem Laptop (der ist hoffentlich noch offen)
- Ich klicke auf "Testing" in der Department-Leiste (1 Klick)
- Ich sehe sofort: "Testing: 890k remaining von 2.1M. 78% verbraucht. 6 offene Items für 340k. Naechster Cash-Out: April, 180k."
- Ich sage: "Testing sieht gut aus, 78% verbraucht, alles im gruenen Bereich." Fertig.

**Oder noch besser -- Saved Views:**
- Ich hab für jeden Department-Chef einen Saved View
- "Quick: Testing" = Department Testing, nur die Key-Zahlen
- Ein Klick und ich hab die Antwort

**Warum "Saved Views" keine Spielerei sind:** Weil ich 5x am Tag spontan Fragen beantworten muss. Und jedes Mal Filter setzen frisst 15 Sekunden die ich nicht habe wenn der CEO im Aufzug neben mir steht.

---

## 2. Mein WIRKLICHER Wochenablauf als IE der eine Fabrik aufbaut

### Montag: "Was ist passiert und was muss diese Woche raus?"

**07:45 -- Ankunft, Kaffee, Laptop auf.**
Erster Blick ins Budget-Tool (wenn es so funktioniert wie ich es will):
- Was hat sich seit Freitag geändert? Neue Bestellungen rausgegangen? Status-Updates von Einkauf?
- Gibt es Positionen die DIESE WOCHE bestellt werden müssen? (Lieferzeiten beachten -- wenn das Ding 16 Wochen Lieferzeit hat und wir es im Juli brauchen, muss die Bestellung JETZT raus)
- Quick-Check: Welche Departments sind im gelben/roten Bereich?

**08:30 -- Stand-Up mit dem Projektteam (15 Min).**
Ich berichte: "Budget ist bei 67% committed, 3 neue Bestellungen letzte Woche, 2 Angebote eingeholt die noch bewertet werden müssen. Assembly Equipment ist bei 91% -- da wird's eng."

Fragen die ich beantworten können muss:
- "Was ist der Status von der Schweißanlage?" -> Quick-Search nach "Schweißanlage", Status ablesen
- "Koennen wir noch eine Prüfstation ergaenzen?" -> Remaining Budget Testing checken

**09:00 -- Angebote durcharbeiten.**
Die Post (E-Mail) bringt 2-3 neue Angebote pro Woche. Ich muss:
1. Angebot lesen und verstehen
2. Mit der Kostenposition im Budget vergleichen (geplant vs. angeboten)
3. Wenn Delta: Entscheiden ob wir verhandeln, den Scope reduzieren, oder das Budget anpassen
4. Angebot an der Position ablegen (UC-09)
5. Status auf "Angebot erhalten" setzen

**14:00 -- Werksbesichtigung / Baustellenrundgang.**
Ich bin nicht den ganzen Tag am Schreibtisch. Ich stehe in der Halle, schaue mir den Baufortschritt an, rede mit Lieferanten die anliefern. Danach zurück am Desk: Notizen eintragen, Status-Updates machen.

---

### Dienstag: "Management Meeting vorbereiten und überleben"

**08:00 -- Vorbereitung Management-Meeting (1 Stunde).**
Das Dienstags-Meeting ist der wichtigste Termin der Woche. Der CEO, CFO und alle Projektleiter sitzen drin. Ich muss praesentieren:

1. **Budget-Gesamtüberblick:** Geplant, Committed, Remaining, Ampelfarben pro Department
2. **Änderungen seit letzter Woche:** Neue Bestellungen, Status-Änderungen, Zielanpassungen
3. **Eskalationen:** Positionen die Genehmigung brauchen (>50k brauchen CFO-Freigabe)
4. **Forecast-Update:** Verschiebt sich was? Wird was teurer?

Fuer dieses Meeting brauche ich den Saved View "Weekly Meeting": Alle offenen Items, gruppiert nach Department, mit Betraegen und Status. Export als Excel oder PDF für die Präsentation.

**09:00-10:00 -- Management Meeting.**
Typische Fragen die kommen:
- CEO: "Liegen wir im Plan für Phase 1?" -> UC-12 Burndown
- CFO: "Wie sieht der Cash-Out für Q2 aus?" -> UC-13 Forecast
- Projektleiter Assembly: "Ich brauche eine zusaetzliche Schweißvorrichtung, 35k. Geht das?" -> Remaining Budget Assembly checken
- CFO: "Warum ist Testing 90k über Plan?" -> UC-10 Zielanpassungen zeigen: "Davon 80k Produktänderung, 10k Preiserhöhung Lieferant"

**Nachmittag: Meetings mit Lieferanten.**
2-3 Lieferanten-Termine pro Woche. Scope besprechen, Preise verhandeln, Lieferzeiten klaeren. Ergebnisse: Neue oder aktualisierte Angebote. Zurück am Desk: Positionen im Tool updaten.

---

### Mittwoch: "Operativer Tag -- Bestellen, Nachverfolgen, Probleme loesen"

**Morgens: Bestellungen vorbereiten.**
Positionen die genehmigt sind müssen bestellt werden. Das heisst:
- Status von "Approved" auf "Ordered" ändern
- Bestellnummer hinterlegen
- Erwartetes Lieferdatum aktualisieren
- Cash-Out-Datum ggf. anpassen (Zahlungsziel 30 Tage nach Lieferung)

**Mittags: Einkauf-Meeting.**
Einkauf fragt: "Georg, welche Positionen sollen wir diese Woche ausschreiben?" Ich brauche eine Liste: Alle Positionen mit Status "Approved" die noch nicht bestellt sind, sortiert nach Dringlichkeit (= wann brauchen wir das Ding?).

**Nachmittags: Probleme loesen.**
- Lieferant meldet Verzögerung -> Lieferdatum im Tool ändern, Cash-Out verschiebt sich
- Angebot ist 20% teurer als geplant -> Verhandeln oder Budget anpassen?
- Produktteam hat wieder was geändert -> Neue Zielanpassung erfassen (UC-10)

---

### Donnerstag: "Blick nach vorne -- Naechste Wochen planen"

**Morgens: Forecast-Update.**
- Welche Bestellungen kommen in den nächsten 4 Wochen?
- Welche Lieferungen werden erwartet?
- Stimmen die Cash-Out-Termine noch?
- Muss ich Finance warnen dass im April 800k statt geplante 500k fällig werden?

**Nachmittags: Planung nächste Phase.**
Wenn Phase 1 sich dem Ende nähert, muss ich Phase 2 vorbereiten:
- Welche Positionen in Phase 2 brauchen zuerst Angebote?
- Welche Lieferanten von Phase 1 können wir für Phase 2 wieder nehmen?
- Grobe Budget-Verteilung für Phase 2 mit dem Projektleiter abstimmen

---

### Freitag: "Reporting und Aufraumen"

**Morgens: Finance-Report.**
Erster Freitag im Monat: Forecast vs. Actual Report (UC-13). Sollte 2 Klicks dauern, nicht 2 Stunden.

Jeden Freitag: Wochen-Summary für den CEO. Eine Seite. Nicht mehr.
- Gesamtstatus: Sind wir im Plan?
- Top 5 Risiken (Positionen mit größtem Delta oder Verzögerung)
- Entscheidungen die nächste Woche anstehen
- Naechste große Cash-Outs

**Nachmittag: Tool aufraumen.**
- Alte Status-Änderungen überpruefen: Ist "Ordered" wirklich bestellt? Ist "Delivered" wirklich geliefert?
- Angebote die älter als 4 Wochen sind: Noch gültig? Nachfassen?
- Positionen ohne Angebot identifizieren: "Zeig mir alles über 50k das noch kein Angebot hat" -- DAS ist ein Filter den ich brauche

---

### Spontane Fragen -- Wer fragt mich was?

| Wer | Frage | Wie oft | Was ich brauche |
|-----|-------|---------|-----------------|
| **CEO** | "Liegen wir im Plan?" | 2x/Woche | Budget-Burndown, Phase-Überblick. Ampelfarbe reicht meistens. |
| **CFO** | "Was ist der Cash-Out für nächsten Monat?" | 1x/Woche | Cash-Out Forecast, monatlich aggregiert |
| **CFO** | "Warum ist Department X über Budget?" | Spontan | Zielanpassungs-Historie, Abweichungs-Analyse |
| **Einkauf** | "Welche Positionen sollen wir ausschreiben?" | 2x/Woche | Filter: Status = Approved, noch nicht bestellt |
| **Projektleiter** | "Wie viel Budget hab ich noch in meinem Bereich?" | 3x/Woche | Department-Remaining, Work Area Breakdown |
| **Projektleiter** | "Kann ich mir noch eine Anlage X leisten?" | Spontan | Remaining Budget vs. Kosten der Anlage |
| **Produkt-Team** | "Was kostet die Produktänderung im Budget?" | Bei jeder Änderung | UC-10: Impact-Analyse Produktänderung |
| **Lieferant** | "Wann bestellen Sie?" | Ständig | Status der Position, geplantes Bestelldatum |
| **Ich selbst** | "Wo brennt es am meisten?" | Täglich | Top-5 Positionen nach Risiko/Delta/Dringlichkeit |

---

## 3. Sankey-Diagram -- Budget-Fluesse SEHEN

### Was ist die Idee?

Stell dir vor du schaust auf das gesamte Budget und siehst wie das Geld FLIESST. Nicht als Zahl in einer Tabelle, sondern als STROM. Von links nach rechts:

```
TOTAL BUDGET (14.2M)
    |
    |----> Assembly Equipment (3.4M) -----> Bryan-Start (2.1M)
    |                                  |--> Bryan-Finish (0.8M)
    |                                  |--> Guenther-Start (0.3M)
    |                                  |--> Automation (0.2M)
    |
    |----> Testing (2.1M) --------------> Bryan-Start (1.4M)
    |                                  |--> Bryan-Finish (0.5M)
    |                                  |--> Automation (0.2M)
    |
    |----> Logistics (1.8M) ------------> Bryan-Start (0.9M)
    |                                  |--> Bryan-Finish (0.6M)
    |                                  |--> Guenther-Start (0.3M)
    |
    |----> Facilities (3.2M) -----------> Bryan-Start (2.8M)
    |                                  |--> Automation (0.4M)
    |
    |----> Prototyping (3.7M) ----------> Bryan-Start (2.4M)
                                       |--> Bryan-Finish (0.8M)
                                       |--> Guenther-Start (0.5M)
```

### Was würde das für mich tun?

**1. Sofort sehen wo das Geld hinfließt.**
Nicht "Assembly hat 3.4M". Sondern: "Assembly gibt 62% für Bryan-Start aus und nur 6% für Automation. Ist das richtig? Muessen wir für Automation mehr einplanen?"

**2. Ungleichgewichte erkennen.**
Wenn ein Department fast sein ganzes Budget in Phase 1 steckt, sehe ich das SOFORT an der Breite der Bänder. "Testing hat fast nichts für Automation eingeplant -- aber wir wollen doch in Phase 4 automatisierte Prüfstaende?" Das faellt in einer Tabelle nicht auf. Im Sankey springt es ins Auge.

**3. Farbcodierung für Status.**
Die Bänder sind nicht einfach grau. Sie sind:
- **Gruen:** Budget approved und im Plan
- **Gelb:** Budget committed aber noch ausstehende Genehmigungen
- **Rot:** Über Budget oder kritische Abweichungen
- **Grau:** Noch nicht zugewiesen (Reserve)

Wenn ich das Sankey öffne und ein fettes rotes Band von Assembly nach Bryan-Start sehe, weiß ich: DA muss ich hinschauen. Ohne eine einzige Zahl gelesen zu haben.

**4. Interaktiv, nicht statisch.**
- Hover über ein Band: Tooltip mit Betrag, Anzahl Items, Status-Breakdown
- Klick auf ein Band: Filtert die Haupttabelle auf genau diese Kombination (z.B. Assembly + Bryan-Start)
- Toggle zwischen "Budget" und "Actual": Wie sieht der tatsächliche Geldfluss aus vs. der geplante?

### Wo gehört das Sankey hin?

**NICHT auf die Hauptansicht.** Die Hauptansicht ist die Tabelle. Die ist mein tägliches Werkzeug.

Das Sankey gehört auf eine eigene Ansicht: **"Budget-Übersicht"** oder **"Strukturansicht"**. Ein vierter Screen -- oder ein Tab innerhalb der Hauptansicht.

Wann öffne ich es?
- Management-Meeting: "Hier sehen Sie wie das Budget über Departments und Phasen verteilt ist"
- Quartals-Review: "So hat sich der Geldfluss seit letztem Quartal verändert"
- Naechste Fabrik planen (UC-08): "So sah die Verteilung bei der 3k aus, so planen wir die 5k"

Es ist ein **Kommunikations-Tool**, kein Arbeits-Tool. Es hilft mir Geschichten zu erzaehlen, nicht Tabellen auszufuellen. Und genau das macht es wertvoll -- im richtigen Moment.

### Technische Umsetzung

- Bibliothek: D3.js Sankey Plugin oder eine React-Sankey-Komponente (z.B. `recharts` hat kein natives Sankey, aber `@nivo/sankey` ist gut)
- Daten kommen aus derselben API -- es ist nur eine andere Visualisierung derselben Hierarchie
- Responsive: Auf kleinen Screens macht ein Sankey keinen Sinn -- da zeige ich stattdessen eine Treemap oder eine einfache Tabelle
- Performance: Bei 200 Items und 5 Departments ist das kein Problem. Das rennt.

---

## 4. Attachment-System -- Einfach aber mächtig

### Was will ich anhängen?

| Dateityp | Beispiel | Wie oft | Wichtigkeit |
|----------|----------|---------|-------------|
| **PDF** | Angebote von Lieferanten | 3-5x pro Woche | KRITISCH -- das ist der Beleg für den Preis |
| **PDF** | Rechnungen | 2-3x pro Woche | Wichtig für Actual-Tracking |
| **Excel** | Detailkalkulationen, Vergleichstabellen | 1-2x pro Woche | Wichtig für Nachvollziehbarkeit |
| **Bilder** | Fotos vom Lieferantenbesuch, Maschinenbilder | Selten | Nice-to-have, aber manchmal Gold wert |
| **PDF** | Technische Datenblätter | Bei Neupositionen | Kontext für später |

### Wo haenge ich es an?

**Primär: An der Kostenposition (Cost Item).** Das ist der natürlichste Ort. "Diese PDF gehört zu dieser Position." Punkt.

**Sekundär: Am Work Area.** Manchmal hab ich ein Dokument das für mehrere Positionen gilt. Z.B. ein Layout-Plan für die Montagelinie, der für alle Assembly-Positionen in Work Area "Main Line" relevant ist.

**NICHT am Department.** Das ist zu hoch. Wenn ich ein Dokument am ganzen Department "Assembly" anhänge, ist es nicht spezifisch genug. Dann kann ich es auch in SharePoint lassen.

### Datenmodell

```
Attachment:
  - id: UUID
  - file_name: "Angebot_Interroll_Förderband_L3_2026-03.pdf"
  - file_type: "application/pdf"  (MIME type)
  - file_size: 2.4 MB
  - uploaded_at: 2026-03-14T09:23:00Z
  - uploaded_by: "Georg Weis"
  - category: "Angebot" | "Rechnung" | "Datenblatt" | "Kalkulation" | "Foto" | "Sonstiges"
  - note: "Angebot gültig bis 30.04.2026, inkl. Steuerung"  (Freitext, optional)
  - linked_to: cost_item_id oder work_area_id
  - is_selected: boolean  (bei mehreren Angeboten: welches wurde gewählt?)
  - storage_path: S3/Azure Blob/lokaler Pfad
```

### Wie finde ich es wieder?

1. **Am naheliegendsten:** Ich öffne die Kostenposition -> Tab "Anhänge" -> da sind alle Dateien
2. **Per Suche:** Freitext-Suche über Dateinamen und Notizen. "Interroll" -> findet alle Anhänge mit "Interroll" im Namen oder in der Notiz
3. **Per Filter:** "Zeig mir alle Positionen OHNE Angebot" = Filter: has_attachment(category="Angebot") = false. DAS ist Gold wert für die Wochen-Review: Welche großen Positionen haben noch kein Angebot?
4. **Per Kategorie:** "Zeig mir alle Rechnungen" = Filter: attachment.category = "Rechnung"

### Brauche ich Versionierung?

**Jein.**

Was ich BRAUCHE: Wenn ein Lieferant ein aktualisiertes Angebot schickt, will ich das neue hochladen OHNE das alte zu löschen. Beide sollen da sein. Das alte mit einem Marker "superseded" oder einfach chronologisch sortiert.

Was ich NICHT brauche: Git-artige Versionierung mit Diffs und Branches. Das ist Overkill.

**Einfachste Lösung:** Mehrere Dateien pro Position erlauben, chronologisch sortiert (neueste oben), mit der Möglichkeit eine als "aktiv/gewählt" zu markieren. Die anderen bleiben als Historie. Fertig.

### Upload-UX

- **Drag & Drop** ins Detail-Panel der Kostenposition. Ich hab die PDF im Downloads-Ordner, ziehe sie rein, fertig.
- **Kategorie waehlen** (Dropdown: Angebot, Rechnung, Datenblatt, ...) -- Default ist "Angebot" weil das der häufigste Fall ist
- **Optionale Notiz** (Freitext, z.B. "Gueltig bis 30.04.2026")
- **Upload-Limit:** 20 MB pro Datei reicht. Wenn jemand ein 50-seitiges Lastenheft hochladen will, soll er es komprimieren.
- **Maximale Dateien pro Position:** Kein hartes Limit, aber realistically braucht keine Position mehr als 10 Dateien

### Storage

Fuer den MVP: **Lokaler Filesystem-Speicher** auf dem Server. Die Dateien liegen in einem strukturierten Ordner:
```
/attachments/{facility_id}/{department_id}/{cost_item_id}/{filename}
```

Spaeter: S3 oder Azure Blob Storage. Aber für 5 User und ein paar hundert PDFs brauchen wir kein Cloud-Storage. Ein Ordner auf dem Server tut's.

---

## 5. Was NICHT wichtig ist -- Update nach weiterem Nachdenken

### Immer noch NICHT wichtig:

| Feature | Warum immer noch nicht | Confidence |
|---------|----------------------|------------|
| **ERP-Integration** | Wir haben IMMER NOCH kein sauberes ERP. Das ändert sich nicht in 3 Monaten. | 100% |
| **Multi-Currency** | Euro. Immer noch Euro. Und wenn ein Lieferant in CHF anbietet, rechne ich das im Kopf um. | 100% |
| **Mobile App** | Ich bau keine Fabrik auf dem Handy. Selbst auf dem Flur hab ich meinen Laptop dabei. | 95% |
| **AI-basierte Forecasts** | Mein Forecast basiert auf Angeboten, Lieferzeiten und Erfahrung. Nicht auf einem Algorithmus der meine historischen Daten nicht kennt. | 100% |
| **Gantt Charts** | Wir haben MS Project. Das Budget-Tool trackt GELD, nicht ZEIT. Wenn ich wissen will wann die Schweißanlage kommt, schaue ich in den Projektplan, nicht ins Budget-Tool. | 95% |
| **Supplier Portal** | Lieferanten kriegen keinen Login. Die schicken mir PDFs per Mail und ich lege sie ab. So läuft das. | 100% |
| **Custom Report Builder** | Wenn die 4-5 Views die wir definieren nicht reichen, dann haben wir die Views falsch definiert. Kein Drag-and-Drop-Report-Editor. | 90% |
| **Notification System** | Wir sind 5-8 Leute. Wenn sich was ändert, schreibe ich eine Teams-Nachricht. Kein Grund dafür ein Notification-System zu bauen. | 85% (bei 20+ Usern würde ich anders denken) |
| **Approval Workflow Engine** | Status-Dropdown reicht. "Georg setzt Status auf Approved" ist unser Workflow. Kein BPMN, kein 4-Augen-Prinzip im Tool. Das läuft per E-Mail und Unterschrift. | 90% |
| **Dark Mode** | Ernsthaft? Ich sitze in einer Fabrikhalle mit Neonröhren. Dark Mode ist für Entwickler um 2 Uhr nachts. | 100% |
| **Dashboard-Widgets customizen** | Nein. Definiert die richtigen 3 Scorecards und lasst sie so. Kein Widget-Editor. Kein Drag-and-Drop-Dashboard. | 95% |
| **Automatische Wechselkurs-Updates** | Siehe Multi-Currency. Brauchen wir nicht. | 100% |
| **Budget-Szenarien / What-If** | Fuer die 3k Factory brauche ich keine Szenarien. Fuer die 5k Factory VIELLEICHT. Aber dann reicht ein Export + Excel. | 80% |

### Neu: Was ich DOCH brauche (obwohl ich es erst nicht dachte):

| Feature | Warum doch | Priorität |
|---------|-----------|------------|
| **Datei-Anhänge** | War "nice to have" in UC-01 bis UC-07. Jetzt ist es Pflicht. Angebote MÜSSEN an der Position leben. | HOCH |
| **Zielanpassungs-Kategorien** | War nur "Betrag + Begründung". Jetzt brauche ich auch: Verursacher, Referenz (CR-Nummer), Kategorie. Weil ich mich politisch absichern muss. | HOCH |
| **Facility-Vergleich / Template** | Hab ich in v1 und v2 nicht erwähnt. Jetzt wo die 5k Factory naeher rückt, wird es dringend. | MITTEL (in 3 Monaten HOCH) |
| **Saved Views** | War "nice to have". Jetzt ist es Pflicht. Weil ich 5x am Tag spontane Fragen beantworten muss und nicht jedes Mal 4 Filter setzen kann. | HOCH |
| **Budget-Burndown pro Phase** | Hatte ich nicht auf dem Schirm. Aber der CEO fragt dauernd "liegen wir im Plan" und das kann ich ohne Burndown nicht beantworten. | MITTEL |

---

## 6. Zusammenfassung -- Was OTTO v3 will

Ich bin kein Finance-Controller der Quartalsberichte macht. Ich bin ein IE der eine Fabrik aufbaut. Mein Tag besteht aus: Angebote bewerten, Entscheidungen treffen, spontane Fragen beantworten, und am Freitag reporten.

Mein Tool muss deshalb:

1. **SCHNELL sein** -- 5 Sekunden bis zur Antwort, nicht 5 Klicks
2. **KONTEXTREICH sein** -- Das Angebot lebt an der Position, nicht in SharePoint
3. **EHRLICH sein** -- Zielanpassungen zeigen woher die Änderung kommt, nicht nur DASS es eine gibt
4. **VERGLEICHBAR machen** -- Plan vs. Actual, diese Fabrik vs. nächste Fabrik
5. **EXPORTIERBAR sein** -- Weil am Ende doch alles in einer PowerPoint oder einem Excel bei Finance landet

Baut mir kein Dashboard. Baut mir ein **Werkzeug**. Eins das so funktioniert wie mein Schraubenschlüssel: Ich greife hin, es passt, ich drehe, fertig.

Und bitte: Das Sankey-Diagram. Das wird der Moment wo der CEO sagt "Wow, das ist übersichtlich." Und ich sage: "Ja. Und jetzt klicken Sie mal auf das rote Band."

---

*Geschrieben am Sonntagabend von einem IE der morgen früh wieder 3 Angebote bewerten, 2 Lieferanten anrufen und 1 CFO beruhigen muss. Das Tool sollte mir dabei HELFEN, nicht im Weg stehen.*
