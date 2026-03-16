# Meeting-Vorbereitung: Chris (Hauptnutzer CAPEX Budget Tool)

**Erstellt:** 2026-03-16
**Vorbereitet von:** Georg Weis
**Kontext:** Chris ist der Production Planner / IE bei TYTAN Technologies, der das Budget-Tool täglich nutzen wird. Dieses Dokument dient als Vorbereitung für das Erstgespräch, um seine echten Bedürfnisse zu verstehen -- nicht unsere Annahmen zu bestätigen.

---

## TEIL 1: Der Alltag eines Production Planners beim Fabrikaufbau

### Was Chris wahrscheinlich jeden Tag tut

**Morgens (8:00-9:30) -- E-Mail-Triage und Angebotsmanagement**
- Posteingang durchgehen: Neue Angebote von Lieferanten, Rückfragen vom Einkauf, Statusupdates von Spediteuren
- Angebot von Lieferant reinbekommen --> Wo lege ich das ab? Im Dateisystem? Im Excel-Kommentar? Als Anhang in einer Mail die ich nie wieder finde?
- Angebot mit dem Budget abgleichen: "Passt das noch? Haben wir überhaupt noch Luft in dem Work Area?"
- Quick-Check: Welche Bestellungen hatten gestern rausgehen sollen und sind es nicht?

**Vormittags (9:30-12:00) -- Hallenlauf und Realität**
- Durch die Halle laufen: "Der Kran passt da nicht hin, wir brauchen einen kleineren" --> sofort Budget-Implikation
- "Die Bodenplatte halt das Gewicht nicht, wir brauchen Fundamente" --> ungeplante Position, wo buche ich das?
- Lieferant kommt zur Besichtigung: "Aufstellung kostet 15k mehr wegen Hallenhöhe" --> wo notiere ich das?
- Erkenntnis: Die Hälfte der Budget-Änderungen passiert NICHT am Schreibtisch, sondern in der Halle

**Mittags -- Meetings**
- Meeting mit Einkauf: "Welche POs müssen diese Woche raus? Was ist approved?"
- Meeting mit CEO/Geschäftsführung: "Gesamtstatus? Liegen wir im Budget? Wo brennt es?"
- Meeting mit Finance: "Was kommt nächsten Monat an Rechnungen? Cash-Out Forecast aktualisieren."
- Meeting mit Engineering: "Die Produktanderung erfordert eine andere Testanlage" --> 200k Budgetanpassung

**Nachmittags -- Datenarbeit (das Leid)**
- Excel öffnen, beten dass niemand was kaputt gemacht hat
- Zahlen aktualisieren: Neues Angebot eintragen, Status andern, Cash-Out-Datum verschieben
- Querverweise prüfen: Stimmt die Summe noch? Stimmt das Delta?
- Copy-Paste für den Finance-Export: Daten in ein anderes Excel-Format übertragen

**Freitag -- Reporting**
- PowerPoint für Steering Committee vorbereiten
- Zahlen aus Excel zusammensuchen (oder aus dem Summary Sheet, das manuell befüllt ist)
- Grafiken erstellen die in 2 Wochen schon veraltet sind
- "Warum weichen die Zahlen von letzter Woche ab?" -- Weil jemand eine Zeile gelöscht hat.

### Was Chris wahrscheinlich WIRKLICH braucht (aber vielleicht nicht sagt)

**1. Entscheidungsdokumentation**
Nicht nur "wie viel kostet es" sondern "WARUM haben wir das so entschieden?" Warum Lieferant A statt B? Warum diese Maschine und nicht jene? Bei der nächsten Fabrik will man nicht bei Null anfangen.

**2. Traceability -- die ganze Kette**
Vom Bedarf über Angebot --> Freigabe --> Bestellung --> Lieferung --> Rechnung --> Bezahlung. Heute liegt das in 5 verschiedenen Systemen (oder in keinem). Wenn Finance fragt "wofür war diese Rechnung?" muss Chris die ganze Kette rekonstruieren.

**3. Benchmark-Daten für die nächste Fabrik**
"Was kostet eine Montagestation pro Taktplatz?" "Was kostet ein Testing-Bereich pro Produkt?" Diese Kennzahlen hat heute niemand saüber. Sie stecken implizit im Excel, aber niemand extrahiert sie.

**4. Risk Tracking**
Welche Positionen haben noch kein Angebot? Wo ist das Risiko am höchsten? Welche Lieferanten haben Lieferprobleme? Heute ist das alles im Kopf des Planners -- wenn Chris krank wird, weiss niemand Bescheid.

**5. Timeline-Kopplung**
"Wenn die Anlage am 1. Juni stehen muss und die Lieferzeit 16 Wochen beträgt, wann muss ich SPÄTESTENS bestellen?" Heute rechnet Chris das im Kopf. Das Tool könnte zumindest das Expected-Cash-Out-Datum mit einer Warn-Funktion versehen.

**6. Lastenheft für Einkauf**
Chris definiert WAS gebraucht wird, Einkauf beschafft es. Aber der Informationsfluss ist oft bruchig -- Specs per Mail, Angebote per Mail zuruck, Freigabe per Mail, Bestellung per... Mail.

**7. Varianten- und Szenario-Denke**
"Was wenn wir statt 4 Taktplatzen nur 3 machen?" -- Sofort sehen was das am Budget ändert. Heute: Excel kopieren, Variante durchrechnen, 30 Minuten weg.

---

## TEIL 2: Meeting-Fragen für Chris

### Kategorie 1: Tagliche Arbeit

1. **Wenn du morgens den Rechner aufmachst -- was ist das Erste was du im Excel machst?** Was schaust du dir als erstes an?

2. **Wie oft am Tag öffnest du die Budget-Excel?** Und wie lange brauchst du jeweils, um die Info zu finden die du suchst?

3. **Was machst du, wenn ein Lieferant anruft und sagt "das Angebot hat sich um 20% erhöht"?** Welche Schritte gehst du dann durch?

4. **Wenn du durch die Halle gehst und feststellst, dass was nicht passt -- wie dokumentierst du das?** Notizbuch? Foto? Direkt ins Excel?

5. **Wie viele Stunden pro Woche verbringst du mit dem Excel (ehrlich)?** Und wie viel davon ist produktive Arbeit vs. Datenpflege?

### Kategorie 2: Excel Pain Points

6. **Was war der schlimmste Fehler der je im Excel passiert ist?** Gelöschte Zeile? Kaputte Formel? Falscher Betrag?

7. **Gibt es Line Items die du NICHT ins Excel eintrags, weil es zu umständlich ist?** Kleine Positionen die untergehen?

8. **Wie gehst du mit dem 0.85-Faktor und dem 0.7-Faktor in den Formeln um?** Weisst du immer welcher wo gilt? Oder ist das Trial-and-Error?

9. **Wenn du die Monats-Spalten für Cash-Out aktualisieren musst -- wie lange brauchst du dafür?** Und wie oft passiert das pro Monat?

10. **Hast du schon mal eine Entscheidung auf Basis falscher Excel-Daten getroffen?** Was ist passiert?

### Kategorie 3: Approval Workflow

11. **Wie lauft eine Freigabe heute konkret ab?** Mail an den Chef? Teams-Nachricht? Mündlich im Gang?

12. **Gibt es Betragsgrenzen ab denen jemand anderes freigeben muss?** Zum Beispiel: Bis 10k darfst du selbst, darüber muss der CFO ran?

13. **Wie lange dauert es typischerweise von "ich brauche das" bis "es ist bestellt"?** Tage? Wochen?

14. **Was blockiert Freigaben am häufigsten?** Fehlende Infos? Falscher Ansprechpartner? Urlaub?

15. **Wenn eine Position dringend ist -- wie eskalierst du?** Gibt es einen Fast-Track?

### Kategorie 4: Angebote und Lieferanten

16. **Wo liegen die Angebote heute?** Outlook-Ordner? SharePoint? Lokaler Ordner? Überall ein bisschen?

17. **Wie vergleichst du Angebote für die gleiche Position?** Gibt es ein Vergleichstool oder machst du das im Kopf?

18. **Wie viele offene Angebote hast du gerade gleichzeitig laufen?** 10? 50? 100?

19. **Wie trackst du Lieferzeiten?** Im Excel? In einem separaten Tool? Gar nicht?

### Kategorie 5: Reporting

20. **Wem reportest du was und wie oft?** CEO wöchentlich? Finance monatlich? Board quarterly?

21. **In welchem Format?** PowerPoint? Excel-Ausschnitt? Mündlich? Dashboard?

22. **Was sind die Top-3 Fragen die du in JEDEM Meeting beantworten musst?** Die immer gleichen Fragen die du jedes Mal neu beantworten musst?

23. **Wie lange brauchst du für die Vorbereitung des Freitags-Reporting?** Und wie viel davon ist Datenzusammensuchen vs. Analyse?

### Kategorie 6: Zielanpassung (Budget-Änderung)

24. **Wie oft passiert eine Zielanpassung pro Monat?** Einmal? Fünfmal? Zehnmal?

25. **Wer initiiert die Zielanpassung?** Engineering wegen Produktanderung? Finance wegen Kürzung? Du selbst weil das Angebot teurer ist?

26. **Wie dokumentierst du den Gründ für eine Zielanpassung heute?** Steht das irgendwo oder ist es nur im Kopf?

27. **Gab es schon Diskussionen im Nachhinein -- "Warum ist das Budget gestiegen?" -- wo du die Antwort nicht sofort hättest?**

### Kategorie 7: Nachste Fabrik

28. **Wenn TYTAN morgen eine zweite Fabrik aufbaut -- was würdest du vom ersten Mal mitnehmen wollen?** Welche Daten? Welche Erkenntnisse?

29. **Gibt es Kennzahlen die du gerne hättest -- z.B. "Kosten pro Taktplatz" oder "Kosten pro m2 Testing-Flache" -- die du heute nicht saüber extrahieren kannst?**

### Kategorie 8: Zusammenarbeit

30. **Wer arbeitet noch mit dem Excel?** Gleichzeitig? Nacheinander? Und wie verhindert ihr Konflikte?

31. **Gibt es Informationen im Excel die andere nicht sehen sollten?** Oder ist alles für alle sichtbar?

### Kategorie 9: Wunschzettel

32. **Wenn du drei Wunsche frei hättest -- was sollte das Tool können was das Excel nicht kann?**

33. **Gibt es ein Tool das du aus einem früheren Job kennst und das gut funktioniert hat?** Oder ein Tool das du dir angeschaut hast?

### Kategorie 10: Deal-Breaker

34. **Was MUSS das Tool können, damit du dein Excel tatsächlich aufgibst?** Was ist der absolute Mindeststandard?

35. **Was wurde dich davon abhalten, das Tool zu nutzen?** Zu langsam? Zu viele Klicks? Fehlende Features?

36. **Wie viel Einarbeitungszeit bist du bereit zu investieren?** 1 Stunde? 1 Tag? 1 Woche?

---

## TEIL 3: Feature-Priorisierung aus Production-Planner-Sicht

### P0 -- Tag 1: Ohne das ist das Tool wertlos

| Feature | Begründung |
|---------|-----------|
| **Dashboard: Budget vs. Committed vs. Remaining pro Department** | DAS ist die Frage die Chris 10x am Tag beantworten muss. Wenn das nicht in 5 Sekunden geht, bleibt er beim Excel. |
| **Tabellenansicht mit dynamischen Filtern und korrekten Summen** | Der Hauptgrund warum Excel versagt. Filter setzen und trotzdem korrekte Summen sehen -- das ist der Kern. |
| **Inline-Edit von Line Items** | Chris muss ständig Werte andern. Wenn jede Änderung 5 Klicks und ein Formular braucht, nutzt er das Tool nicht. |
| **Import der bestehenden Excel-Daten** | Ohne die historischen Daten ist das Tool wertlos. Niemand tippt 200+ Items nochmal ein. |
| **Hierarchie: Department > Work Area > Phase > Line Item** | Das ist die Denkstruktur. Wenn das Tool eine flache Liste zeigt, kann Chris damit nicht arbeiten. |
| **Zielanpassung als separater Datensatz** | Budget-Änderungen müssen transparent sein. "Ursprünglich 500k, +80k Zielanpassung, jetzt 580k" -- ohne das gibt es Diskussionen mit Finance die keiner braucht. |

**Warum P0:** Wenn Chris am Montag morgen das Tool offnet und nicht in 10 Sekunden sehen kann wo er steht, schließt er es wieder und offnet sein Excel. Die P0-Features sind das absolute Minimum um den Excel-Tab zu ersetzen.

### P1 -- Woche 1: Macht es 10x besser als Excel

| Feature | Begründung |
|---------|-----------|
| **Cash-Out Monatsansicht (automatisch aus Datum berechnet)** | Heute verbringt Chris Stunden damit, Betrage manuell in Monatsspalten zu verschieben. Wenn das automatisch geht, spart das einen halben Tag pro Monat. |
| **Phasen-Uberblick (Bryan-Start, Bryan-Finish, etc.)** | Jedes Steering-Committee-Meeting fragt danach. Heute: Pivot-Tabelle bauen. Mit dem Tool: Ein Klick. |
| **Excel/CSV Export der gefilterten Ansicht** | Chris wird in den ersten Wochen trotzdem noch Excel brauchen -- für adhoc-Analysen, für Leute die nicht im Tool sind. Export ist die Brücke. |
| **Finance-Export im BudgetTemplate-Format** | Der monatliche Finance-Report kostet heute 2 Stunden Copy-Paste. Das zu automatisieren ist ein konkreter, messbarer Zeitgewinn. |
| **Ampelfarben (Grün/Gelb/Rot) für Budget-Auslastung** | Auf einen Blick sehen wo es eng wird. Kein Rechnen, kein Nachdenken. Rot = Alarm. Das fehlte im Excel komplett. |
| **Status-Tracking (Draft > Requested > Approved > Ordered > Delivered)** | Die 8 Status-Werte existieren schon im Excel. Aber im Tool kann man danach filtern, gruppieren, reporten. Das macht Status erst nützlich. |

**Warum P1:** Diese Features machen das Tool nicht nur "so gut wie Excel" sondern BESSER. Sie sind der Gründ warum Chris sagt "Ja, das lohnt sich." Sie müssen schnell kommen -- innerhalb der ersten Woche nach Go-Live.

### P2 -- Monat 1: Nice to have, klarer Mehrwert

| Feature | Begründung |
|---------|-----------|
| **Audit Log (wer hat wann was geändert)** | Wichtig für Nachvollziehbarkeit, aber nicht Tag-1-kritisch. Wird relevant wenn mehrere Leute im Tool arbeiten. |
| **Kommentare pro Line Item** | "Lieferant hat gesagt Lieferzeit verlängert sich um 4 Wochen" -- heute steht das in einer Mail. Im Tool ware es nachvollziehbar. |
| **Mehrere User mit Rollen (Viewer, Editor, Approver)** | Anfangs arbeitet hauptsächlich Chris im Tool. Rollen werden wichtig wenn Finance, Einkauf, CEO Zugriff bekommen. |
| **Anhange pro Line Item (Angebote, Specs)** | Das lost ein echtes Problem: Wo liegt das Angebot? Aber es ist komplex zu bauen und nicht Tag-1-kritisch. |
| **Konfigurierbarer Budget-Faktor (0.85, 0.7)** | Die Faktoren existieren, aber sie andern sich selten. Hardcoded mit der Möglichkeit sie zu konfigurieren reicht erstmal. |
| **Sortierbare Spalten** | Nutzlich für adhoc-Analysen, aber die Filter decken 80% der Falle ab. |

**Warum P2:** Diese Features machen das Tool robuster und teamfähig. Sie sind der Unterschied zwischen "Chris' Tool" und "TYTAN's Tool". Aber sie blockieren nicht den Start.

### P3 -- Irgendwann: Cool aber nicht dringend

| Feature | Begründung |
|---------|-----------|
| **Approval Workflow (automatische Routing-Logik)** | Klingt gut, aber bei 5 Leuten die miteinander reden braucht man kein BPMN. Status-Dropdown reicht erstmal. |
| **Benchmark-Kennzahlen (Kosten pro Taktplatz, pro m2)** | Mega wertvoll für Fabrik Nr. 2, aber Fabrik Nr. 1 muss erstmal stehen. |
| **Lieferzeit-Tracking mit Warn-Funktion** | "Bestelldeadline in 2 Wochen" ware super, aber das braucht Lieferzeit-Daten die heute niemand pflegt. |
| **Szenario-Vergleich ("Was wenn nur 3 Taktplatze?")** | Wurde Planungsmeetings revolutionieren. Ist aber komplex und braucht eine solide Datenbasis. |
| **Dashboard-Anpassung (Custom Views)** | Die 3-4 Standard-Views decken 90% ab. Customization ist ein Rabbit Hole. |
| **E-Mail Notifications** | Bei 5 Usern: Man redet miteinander. Notifications werden bei 20+ Usern relevant. |
| **API für andere Systeme** | Erst relevant wenn es ein saüberes ERP gibt. Heute: Nicht vorhanden. |
| **Entscheidungslog ("Warum Lieferant A statt B?")** | Langfristig Gold wert. Aber es braucht eine Kultur des Dokumentierens die man nicht mit einem Feature erzwingt. |

**Warum P3:** Diese Features sind strategisch wertvoll, aber jedes einzelne ist ein eigenes Projekt. Sie gehoren auf die Roadmap, nicht in den MVP.

---

## TEIL 4: Risiken und Stolpersteine

### 1. Adoption -- Warum Chris das Tool NICHT nutzen könnte

**"Mein Excel funktioniert doch."**
Chris hat Monate in sein Excel investiert. Er kennt jede Zelle, jede Formel, jede Macke. Das Tool muss am Tag 1 mindestens so gut sein wie sein Excel -- in den Dimensionen die IHM wichtig sind. Nicht uns.

**"Das ist langsamer als mein Excel."**
Wenn eine Inline-Edit im Tool 3 Sekunden braucht statt 0.5 Sekunden im Excel, wird Chris genervt sein. Performance ist kein Nice-to-have, es ist ein Hygienefaktor.

**"Ich kann das nicht offline."**
Was passiert wenn das Internet in der Halle nicht geht? Chris hat sein Excel lokal. Das Web-Tool nicht. Brauchen wir einen Offline-Modus? Wahrscheinlich nicht -- aber wir müssen fragen.

**"Das kann ich nicht mit Ctrl+C kopieren."**
Excel-User lieben Copy-Paste. Wenn das Tool das nicht unterstützt (Zellen kopieren, in ein anderes Excel einfügen), wird es als Einschränkung empfunden.

**"Ich muss das trotzdem nochmal in Excel machen."**
Wenn Chris für irgendeinen Prozess trotzdem noch Excel braucht (weil Finance es so will, weil der CEO es so kennt), dann lauft er zwei Systeme parallel. Das ist schlimmer als eins.

### 2. Daten -- Was passiert wenn der Excel-Import nicht saüber lauft

**Hierarchie-Verlust**
Die Excel hat eine implizite Hierarchie über Zeilenpositionen und Zwischensummen. Wenn beim Import ein Work Area falsch zugeordnet wird, stimmen alle Zahlen nicht. Und Chris vertraut dem Tool nicht mehr.

**Formel-Werte vs. berechnete Werte**
Im Excel stehen z.T. Formeln wie `=(4*3060)*0.7`. Importieren wir das Ergebnis (8568) oder die Logik (4 Stuck x 3060 EUR x 0.7)? Wenn nur das Ergebnis, geht Kontext verloren.

**Fehlende Daten**
Facility und Prototyping haben noch keine Budget-Referenz (F3 ist leer). Wie gehen wir damit um? Zeigen wir "kein Budget definiert"?

**Historische Zielanpassungen**
Gab es schon Zielanpassungen die IM Excel als überschriebene Werte stecken? Dann können wir die Originalwerte nicht mehr rekonstruieren. Wir starten mit dem Status Quo, nicht mit der Historie.

### 3. Erwartungen -- Was Chris erwartet das wir NICHT bauen

**"Kann ich da auch meine Bestellungen tracken?"**
Nein. Wir tracken Budget und Status, nicht den Einkaufsprozess. Aber die Grenze ist fließend und wir müssen sie klar kommunizieren.

**"Kann ich da auch Rechnungen zuordnen?"**
Das ware Invoice Matching -- ein eigenes Produkt. Wir tracken Expected Cash-Out, nicht Actual Cash-Out aus Rechnungen. Zumindest nicht im MVP.

**"Kann Finance direkt darauf zugreifen?"**
Möglicherweise ja, aber nur als Viewer. Finance hat andere Tools (ERP, Buchhaltung). Wir ersetzen nicht deren System, wir liefern ihnen Daten.

**"Kann ich Angebote direkt vom Lieferanten ins Tool uploaden lassen?"**
Das ware ein Supplier Portal. Definitiv nicht MVP. Aber die Erwartung könnte da sein.

**"Macht das Tool automatisch eine Abschreibungsberechnung?"**
Nein. Das ist Finance-Territorium. Wir liefern die Rohdaten (Betrag, Datum, Nutzungsdauer), Finance rechnet ab.

### 4. Change Management -- Wie überzeugt man 5 Leute ihr Excel aufzugeben

**Die 3-Wochen-Regel**
Die ersten 3 Wochen entscheiden. Wenn Chris in dieser Zeit ofter zum Excel zurückgreift als das Tool nutzt, ist es vorbei. Wir brauchen einen Champion -- und Chris IST dieser Champion.

**Schrittweise Migration, nicht Big Bang**
Nicht am Montag Excel abschalten. Stattdessen: 2 Wochen parallel fahren. Chris pflegt beides. Nach 2 Wochen: "Stimmen die Zahlen überein?" Wenn ja: Excel archivieren.

**Sichtbarer Quick Win in der ersten Stunde**
Chris muss innerhalb der ersten 60 Minuten etwas können was im Excel nicht ging. Zum Beispiel: Filter setzen und korrekte Summen sehen. Oder: Dashboard öffnen und sofort den Status aller Departments sehen. DAS ist der Moment wo er sagt "Ok, das ist besser."

**CEO muss es nutzen (oder zumindest sehen)**
Wenn Chris dem CEO das Dashboard zeigt und der CEO sagt "Zeig mir das nächste Woche wieder" -- dann hat das Tool einen Sponsor. Wenn der CEO sagt "Schick mir einfach die PowerPoint" -- dann hat das Tool ein Problem.

**Finance muss den Export akzeptieren**
Wenn der Finance-Export aus dem Tool nicht EXAKT so aussieht wie das BudgetTemplate, wird Finance sagen "Mach das nochmal im Excel." Und Chris wird es tun. Der Export muss pixel-perfekt sein.

**Keine Feature-Versprechen die wir nicht halten**
Wenn Chris fragt "Kommt da noch ein Approval Workflow?" und wir sagen "Ja, bald" -- dann wartet er darauf. Besser: "Das ist auf der Roadmap, aber erstmal machen wir das hier richtig." Untertreiben und überliefern.

---

## Checkliste für das Meeting

- [ ] Meeting aufnehmen (mit Chris' OK) -- für Details die man sonst vergisst
- [ ] Chris seine Bildschirm zeigen lassen -- "Zeig mir mal wie du das heute im Excel machst"
- [ ] Nicht das Tool präsentieren -- ZUHOREN. Wir sind hier um zu lernen, nicht zu verkaufen
- [ ] Konkretes Beispiel durchspielen: "Letzte Woche kam ein neues Angebot rein -- fuhr mich da mal durch"
- [ ] Am Ende zusammenfassen: "Das sind die 3 wichtigsten Dinge die ich gehoert habe -- stimmt das?"
- [ ] Nächster Schritt vereinbaren: "In 2 Wochen zeige ich dir einen Prototyp mit deinen echten Daten"

---

*Dieses Dokument wurde erstellt um ein Meeting vorzübereiten, nicht um eine Software-Spec zu schreiben. Die Fragen sind bewusst offen formuliert -- wir wollen verstehen wie Chris arbeitet, nicht ihm erzahlen wie er arbeiten sollte.*

---

Sources (Recherche-Gründlage):
- [Manufacturing CapEx Formula and Success](https://pacificblueengineering.com/manufacturing-capex-formula-success/)
- [Financial Management Strategies for CAPEX Managers in Manufacturing](https://www.granta-automation.co.uk/news/financial-management-strategies-for-capex-managers-in-manufacturing/)
- [CapEx Planning Best Practices (Limelight)](https://www.golimelight.com/blog/capex-planning)
- [CapEx Approval Process Explained (Fluix)](https://fluix.io/workflows/capex-approval-workflow)
- [How to Create an Effective CapEx Approval Process](https://www.stratexonline.com/blog/capex-approval-process/)
- [Construction Cost Tracking Best Practices 2026](https://smartbarrel.io/blog/construction-cost-tracking-best-practices-tools-methods/)
- [Manufacturing Facility Planning (The Productivity Team)](https://productivityteam.com/2024/09/manufacturing-facility-planning/)
- [EV Manufacturing Startup Costs](https://financialmodelslab.com/blogs/startup-costs/electric-car-manufacturing)
- [6 Steps To Improve Manufacturing CapEx Budgeting](https://www.linkedin.com/pulse/6-steps-improve-your-manufacturing-businesss-capex-budgeting-godick)
- [Finario: Trends in Manufacturing Capital Planning](https://www.finario.com/deep-dive-a-capital-planning-executives-perspectives-on-trends-in-the-manufacturing-industry/)
