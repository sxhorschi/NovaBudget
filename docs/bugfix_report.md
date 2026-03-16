# Bugfix Report -- UI-Bereinigung

Datum: 2026-03-16

---

## 1. TopBar "Suchen..." Button -- FIXED

**Problem:** Der Suchen-Button in der TopBar hatte keinen `onClick`-Handler. Ein Klick tat nichts.

**Fix:**
- `TopBar.tsx`: Neues Interface `TopBarProps` mit `onSearchClick?: () => void`. Button bekommt `onClick={onSearchClick}`.
- `AppLayout.tsx`: Neues Prop `onSearchClick` wird an `TopBar` durchgereicht.
- `App.tsx`: `AppLayout` bekommt `onSearchClick={openPalette}` -- oeffnet die CommandPalette.

**Dateien:** `TopBar.tsx`, `AppLayout.tsx`, `App.tsx`

---

## 2. Filter Chips -- OK (bereits funktional)

**Pruefung:** FilterChip hat `onClick` zum Oeffnen des Dropdowns. X-Button (`handleClear`) setzt `onChange([])` und schliesst Dropdown. FilterDropdown hat Checkboxen mit `toggleOption`, "Alle auswaehlen", "Auswahl aufheben", Escape-to-close, und Click-outside-to-close.

**Status:** Voll funktional, keine Aenderungen noetig.

---

## 3. Saved Views -- OK (bereits funktional)

**Pruefung:** Jeder View-Button hat `onClick={() => handleApply(view)}` das `onApplyView(view.filters)` aufruft, was `setAllFilters` im CostbookPage ist. Custom Views koennen gespeichert (Name + Enter/OK), geloescht (X-Button mit `handleRemoveCustomView`), und per localStorage persistiert werden. Active-State wird korrekt durch `filtersMatch()` erkannt.

**Status:** Voll funktional, keine Aenderungen noetig.

---

## 4. StatusBadge -- OK (bereits funktional)

**Pruefung:** StatusBadge hat ein Dropdown-Menue mit allen Status-Optionen. Klick auf Badge oeffnet Dropdown (wenn `onChange` Prop vorhanden), Klick auf Option ruft `onChange(newStatus)` auf. `onStatusChange` wird korrekt von CostbookTable -> CostItemRow -> StatusBadge durchgereicht.

**Status:** Voll funktional, keine Aenderungen noetig.

---

## 5. Delete Button -- OK (bereits funktional)

**Pruefung:** CostItemRow hat Trash2-Button mit `onClick` -> `onDelete()` (stopPropagation). CostbookPage hat `handleDeleteRequest` -> setzt `deleteTarget` -> rendert `DeleteConfirmDialog`. Dialog hat "Abbrechen" (`handleClose`) und "Loeschen" (`handleConfirm` -> `deleteCostItem`). Escape schliesst Dialog. Backdrop-Klick schliesst Dialog.

**Status:** Voll funktional, keine Aenderungen noetig.

---

## 6. SidePanel -- OK (bereits funktional)

**Pruefung:** CostItemRow `onClick` -> `onSelectItem(item)` -> `setSelectedItem`. SidePanel rendert wenn `item !== null`. SidePanelForm hat editierbare Felder (Betrag, Phase, Produkt, Status, etc.) mit `onChange` Callbacks. "Speichern"-Button ruft `handleSave` auf (nur geaenderte Felder). Cmd/Ctrl+Enter Shortcut zum Speichern. "Abbrechen" und X-Button schliessen Panel. "Loeschen" im Footer oeffnet DeleteConfirmDialog.

**Status:** Voll funktional, keine Aenderungen noetig.

---

## 7. Tab-Navigation -- OK (bereits funktional)

**Pruefung:** TabBar nutzt `NavLink` von react-router-dom mit `to` Props (`/`, `/cashout`, `/import`). `isActive` steuert visuelle Hervorhebung. App.tsx hat entsprechende Routes.

**Status:** Voll funktional, keine Aenderungen noetig.

---

## 8. Import Page -- OK (bereits funktional)

**Pruefung:** Drag & Drop funktioniert: `onDragOver`, `onDragLeave`, `onDrop` Handler vorhanden. Klick-Upload funktioniert: `onClick` -> `fileInputRef.current?.click()`. `handleFile` sendet POST an `/import/excel` mit FormData. Progress-Tracking via `onUploadProgress`. Erfolg: "Im Costbook ansehen" Button navigiert zu `/`. Fehler: "Erneut versuchen" Button resettet State.

**Status:** Voll funktional, keine Aenderungen noetig.

---

## 9. NoOfferBanner -- ENTFERNT

**Problem:** Unnoetige Komponente, verwirrt Benutzer. Zeigt Banner fuer Positionen ohne Angebot, aber dies ist keine hilfreiche Information im Hauptview.

**Fix:** Import und Verwendung in `CostbookPage.tsx` entfernt. `NoOfferBanner.tsx` als leerer Export ueberlebt (Datei nicht geloescht, aber Inhalt ersetzt durch Kommentar).

**Dateien:** `CostbookPage.tsx`, `NoOfferBanner.tsx`

---

## 10. RiskMatrix -- ENTFERNT

**Problem:** Risk-Matrix-Widget verwirrte Benutzer, kein echter Mehrwert im CAPEX-Budget-Kontext.

**Fix:** Import und Verwendung in `CostbookPage.tsx` entfernt. `RiskMatrix.tsx` als leerer Export ueberlebt.

**Dateien:** `CostbookPage.tsx`, `RiskMatrix.tsx`

---

## 11. Risk-Level System -- KOMPLETT ENTFERNT

**Problem:** Das gesamte Risk-Level-System (RiskLevel Typ, RISK_LABELS, RISK_COLORS, calculateRiskLevel, Risk Dots in CostItemRow, Risk-Filter in useFilterState/useFilteredData) war zu komplex und verwirrte Benutzer.

**Entfernt aus:**
- `types/budget.ts`: `RiskLevel` Typ, `RISK_LABELS`, `RISK_COLORS`, `calculateRiskLevel()` Funktion
- `hooks/useFilterState.ts`: `riskLevels` aus FilterState, PARAM_KEYS, EMPTY_FILTER, Serialisierung, hasActiveFilters
- `hooks/useFilteredData.ts`: Risk-Level Filterung, `calculateRiskLevel` Import
- `components/costbook/CostItemRow.tsx`: Risk-Dot-Anzeige (farbige Punkte vor Beschreibung), `useMemo` fuer riskLevel, `RISK_DOT_COLORS` Konstante
- `pages/CostbookPage.tsx`: `handleFilterRisk` Callback, `RiskLevel` Import
- `services/clientExport.ts`: Risk-Section im Excel-Export, `calculateRiskLevel` Import

---

## 12. CostBasis-Filter -- ENTFERNT

**Problem:** Zu granularer Filter, verwirrt Benutzer.

**Entfernt aus:**
- `hooks/useFilterState.ts`: `costBases` aus FilterState, PARAM_KEYS, EMPTY_FILTER, Serialisierung
- `hooks/useFilteredData.ts`: CostBasis-Filterung
- `pages/CostbookPage.tsx`: `handleFilterNoOffer` Callback, `CostBasis` Import

**Hinweis:** Der `CostBasis` Typ und `COST_BASIS_LABELS` bleiben in `types/budget.ts` bestehen, da sie im SidePanelForm-Dropdown und im Excel-Export weiterhin verwendet werden.

---

## Zusammenfassung der Aenderungen

| Datei | Aenderung |
|---|---|
| `src/types/budget.ts` | RiskLevel, RISK_LABELS, RISK_COLORS, calculateRiskLevel entfernt |
| `src/hooks/useFilterState.ts` | costBases + riskLevels aus FilterState, PARAM_KEYS, Serialisierung entfernt |
| `src/hooks/useFilteredData.ts` | costBases + riskLevels Filterung + calculateRiskLevel Import entfernt |
| `src/components/layout/TopBar.tsx` | onSearchClick Prop + onClick Handler hinzugefuegt |
| `src/components/layout/AppLayout.tsx` | onSearchClick Prop durchgereicht |
| `src/App.tsx` | openPalette an AppLayout als onSearchClick uebergeben |
| `src/pages/CostbookPage.tsx` | NoOfferBanner, RiskMatrix, handleFilterNoOffer, handleFilterRisk entfernt |
| `src/components/costbook/CostItemRow.tsx` | Risk Dots, calculateRiskLevel, RISK_DOT_COLORS entfernt |
| `src/components/costbook/NoOfferBanner.tsx` | Inhalt durch leeren Export ersetzt |
| `src/components/visualization/RiskMatrix.tsx` | Inhalt durch leeren Export ersetzt |
| `src/services/clientExport.ts` | Risk-Section im Export + calculateRiskLevel Import entfernt |
