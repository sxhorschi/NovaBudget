# Swarm: CEO Perspective

**Persona:** CEO eines EV-Startups, 50 Mitarbeiter, 20M EUR Series-A, erste Fabrik im Bau
**Prioritaet:** Kapital schuetzen, Board/Investoren Transparenz geben, schnelle Entscheidungen treffen

---

## Feature-Bewertungen

```json
{
  "features": [
    {
      "id": 1,
      "name": "Dashboard mit Budget/Committed/Remaining pro Department",
      "score": 10,
      "reason": "Das ist mein taeglicher Pulscheck - ich muss auf einen Blick sehen, wo meine 20M stehen und welches Department wie viel verbrannt hat."
    },
    {
      "id": 2,
      "name": "Hierarchische Tabelle (Department > Work Area > Items)",
      "score": 9,
      "reason": "Ohne Drill-Down von Department bis zur einzelnen Maschine kann ich im Board-Meeting keine einzige Detailfrage beantworten."
    },
    {
      "id": 3,
      "name": "Multi-Select Filter (Department, Phase, Product, Status)",
      "score": 7,
      "reason": "Brauche ich, um schnell zu filtern was in Phase 1 vs Phase 2 faellt, aber mein IE kann das auch für mich machen."
    },
    {
      "id": 4,
      "name": "Sankey Diagram (Budget-Flow Visualisierung)",
      "score": 4,
      "reason": "Huebsch für Investoren-Decks, aber ich treffe damit keine einzige operative Entscheidung."
    },
    {
      "id": 5,
      "name": "Side Panel zum Editieren von Items",
      "score": 7,
      "reason": "Mein Team muss Daten effizient pflegen koennen, sonst veraltet das Tool in zwei Wochen und keiner nutzt es mehr."
    },
    {
      "id": 6,
      "name": "Excel Import (bestehende Daten uebernehmen)",
      "score": 10,
      "reason": "Wir haben 6 Monate Planungsdaten in Excel - wenn die nicht rein koennen, starten wir bei Null und das Tool ist am ersten Tag tot."
    },
    {
      "id": 7,
      "name": "Finance Export (BudgetTemplate Format)",
      "score": 9,
      "reason": "Mein CFO und die Buchhaltung arbeiten in ihrem Format - wenn die Daten nicht in ihr Template fliessen, fuehren wir doppelte Buecher."
    },
    {
      "id": 8,
      "name": "Steering Committee Export (1-Seiten-Summary)",
      "score": 10,
      "reason": "Alle zwei Wochen sitze ich vor meinen Investoren - ich brauche einen One-Pager den ich in 30 Sekunden generieren kann, nicht eine Stunde PowerPoint basteln."
    },
    {
      "id": 9,
      "name": "Cash-Out Timeline (monatlicher Geldabfluss)",
      "score": 10,
      "reason": "Mit 20M auf dem Konto und 18 Monaten Runway ist Cash-Timing existenziell - ich muss wissen, wann welche Zahlung faellig wird, sonst sind wir ploetzlich illiquid."
    },
    {
      "id": 10,
      "name": "Budget Burndown Chart",
      "score": 8,
      "reason": "Zeigt mir ob wir auf Kurs sind oder ob wir schneller verbrennen als geplant - fruehes Warnsignal bevor es zu spaet ist."
    },
    {
      "id": 11,
      "name": "S-Curve Visualisierung",
      "score": 5,
      "reason": "Klassisches Projektmanagement-Tool, aber der Burndown gibt mir die gleiche Info in einfacher."
    },
    {
      "id": 12,
      "name": "Phase Progress Bars",
      "score": 6,
      "reason": "Nett für den Ueberblick welche Phase wie weit ist, aber ich schaue eher auf Euro als auf Prozent."
    },
    {
      "id": 13,
      "name": "Command Palette (Cmd+K Suche)",
      "score": 2,
      "reason": "Developer-Feature - ich oeffne das Tool zweimal am Tag, da brauche ich keine Power-User-Shortcuts."
    },
    {
      "id": 14,
      "name": "Saved Views (vordefinierte Filter)",
      "score": 5,
      "reason": "Waere praktisch für wiederkehrende Board-Ansichten, aber nicht kritisch wenn mein IE die Filter für mich setzt."
    },
    {
      "id": 15,
      "name": "Keyboard Shortcuts",
      "score": 1,
      "reason": "Absolut irrelevant für mich - ich klicke dreimal und will Zahlen sehen, keine Tastenkuerzel lernen."
    },
    {
      "id": 16,
      "name": "Datei-Anhaenge an Positionen (PDFs, Angebote)",
      "score": 8,
      "reason": "Wenn ich im Steering Committee frage 'Wo ist das Angebot für die Schweissanlage?' muss mein IE sofort draufklicken koennen statt in E-Mails zu suchen."
    },
    {
      "id": 17,
      "name": "Risk Matrix (Items ohne Angebot highlighten)",
      "score": 7,
      "reason": "Ich muss wissen welche Positionen noch Schaetzungen sind - eine 500k-Position ohne Angebot ist ein Risiko das ich managen muss."
    },
    {
      "id": 18,
      "name": "Decision Log (warum wurde was entschieden)",
      "score": 6,
      "reason": "In 6 Monaten fragt der Investor warum wir Anbieter X gewaehlt haben - ohne Log rekonstruieren wir das aus dem Gedaechtnis."
    },
    {
      "id": 19,
      "name": "Status-Workflow (Open > Approved > Ordered)",
      "score": 9,
      "reason": "Ich muss auf einen Blick sehen was bestellt ist, was genehmigt ist und was noch offen ist - ohne das ist das Dashboard blind."
    },
    {
      "id": 20,
      "name": "Zielanpassung (Budget-wirksam Flag mit Historie)",
      "score": 7,
      "reason": "Budgets aendern sich - wenn wir Phase 2 schieben, muss ich das sauber tracken koennen ohne die Vergleichbarkeit zu verlieren."
    },
    {
      "id": 21,
      "name": "Inline-Edit in der Tabelle",
      "score": 6,
      "reason": "Macht die Datenpflege schneller, aber das Side Panel reicht auch - kein Dealbreaker."
    },
    {
      "id": 22,
      "name": "Approval Workflow (automatisches Routing)",
      "score": 3,
      "reason": "Bei 50 Leuten laufe ich zum CFO rueber und sage 'genehmigt' - automatisiertes Routing ist Enterprise-Overkill für uns."
    },
    {
      "id": 23,
      "name": "Multi-User mit Rollen",
      "score": 4,
      "reason": "Aktuell nutzen es vielleicht 3-4 Leute - Rollen und Rechte brauche ich erst wenn wir 200+ Mitarbeiter sind."
    },
    {
      "id": 24,
      "name": "Audit Log (wer hat wann was geaendert)",
      "score": 5,
      "reason": "Gut für Compliance und Nachvollziehbarkeit, aber bei einem kleinen Team mit Vertrauen nicht Prio 1."
    },
    {
      "id": 25,
      "name": "Facility-Vergleich (3k vs 5k Factory)",
      "score": 8,
      "reason": "DAS ist die strategische Frage die mich nachts wach haelt - soll ich kleiner starten und spaeter skalieren oder gleich gross bauen?"
    }
  ]
}
```

---

## Top 5 (Must-Have, ohne die geht nichts)

| Rang | ID | Feature | Score |
|------|----|---------|-------|
| 1 | 1 | Dashboard mit Budget/Committed/Remaining | 10 |
| 2 | 6 | Excel Import | 10 |
| 3 | 8 | Steering Committee Export | 10 |
| 4 | 9 | Cash-Out Timeline | 10 |
| 5 | 19 | Status-Workflow | 9 |

**Zusammenfassung:** Ich brauche Transparenz ueber mein Kapital (Dashboard, Cash-Out), muss bestehende Daten uebernehmen koennen (Excel Import), Investoren bedienen (SteerCo Export), und den Status jeder Position kennen (Workflow). Ohne diese fuenf Features investiere ich keinen Euro mehr in dieses Tool.

## Bottom 5 (Nice-to-Have oder irrelevant)

| Rang | ID | Feature | Score |
|------|----|---------|-------|
| 21 | 15 | Keyboard Shortcuts | 1 |
| 22 | 13 | Command Palette | 2 |
| 23 | 22 | Approval Workflow | 3 |
| 24 | 4 | Sankey Diagram | 4 |
| 25 | 23 | Multi-User mit Rollen | 4 |

**Zusammenfassung:** Keyboard Shortcuts und Command Palette sind Developer-Komfort, nicht CEO-relevant. Approval Workflow und Rollen-Management sind Enterprise-Features die bei 50 Mitarbeitern Overkill sind. Das Sankey Diagram ist huebsch aber liefert keinen Entscheidungswert.
