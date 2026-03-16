# Factory Builder -- Konzeptpapier

**TYTAN Technologies | CAPEX Budget Tool | Feature Proposal**

**Autor:** Georg Weis, Industrial Engineering
**Datum:** 16. Maerz 2026
**Status:** Konzeptphase
**Klassifikation:** Intern / Vertraulich

---

## Executive Summary

Der Factory Builder ist eine Erweiterung des CAPEX Budget Tools, die es ermoeglicht, **neue Fertigungsstandorte parametrisch zu planen und zu budgetieren** -- basierend auf realen Erfahrungswerten bestehender Fabriken. Anstatt jedes Mal bei Null zu beginnen, nutzt das Tool historische Daten aus der 3k Factory als intelligente Vorlage und skaliert Budgets automatisch auf neue Kapazitaeten, Produktlinien und Automatisierungsgrade.

**Das Versprechen:** Ein Fabrikplaner gibt "5.000 Einheiten/Jahr, 3 Produktlinien, 4 Phasen" ein -- und erhaelt innerhalb von Sekunden eine belastbare Budgetschaetzung von EUR 12-15M mit modularem Bauplan, Cash-Out-Timeline und Confidence Score.

**Strategischer Wert:** TYTAN Technologies baut damit einen proprietaeren Datenvorteil auf. Jede geplante und realisierte Fabrik macht das Modell praeziser. Nach 3-4 Standorten verfuegen wir ueber ein parametrisches Kostentool, das in der Branche seinesgleichen sucht.

---

## 1. Marktanalyse und Positionierung

### 1.1 Bestehende Loesungen am Markt

Die Recherche zeigt, dass der Markt fuer Fabrikplanung fragmentiert ist und keine Loesung existiert, die CAPEX-Budgetierung mit parametrischer Konfiguration verbindet:

| Kategorie | Tools | Staerke | Schwaeche |
|---|---|---|---|
| **Digital Twin / Layout** | Autodesk Factory Design, Prevu3D, visTABLE | 3D-Layoutplanung, Materialfluss-Simulation | Kein CAPEX-Bezug, keine Budgetierung |
| **Parametrische Kostenschaetzung** | 4cost-aces, SEER Manufacturing, aPriori | Produktkosten-Schaetzung, CER-Modelle | Fokus auf Stueckkosten, nicht Fabrik-CAPEX |
| **Greenfield-Beratungstools** | iFactory, Germanedge Factory Zero | Ganzheitliche Fabrikplanung, AI-Roadmaps | Enterprise-Preise, Beratungsabhaengigkeit |
| **ERP/Produktion** | Simio, Emulate3D, ema Software Suite | Prozesssimulation, Digital Twin | Laufende Produktion, nicht Planungsphase |

### 1.2 Die Luecke im Markt

Keines dieser Tools bietet das, was wir brauchen:

- **Erfahrungsbasierte CAPEX-Schaetzung** auf Basis realer, eigener Fabrikdaten
- **Modulare Zusammenstellung** einer Fabrik aus kategorisierten Kostenvorlagen
- **Sofortiges Feedback** bei Parameteraenderungen (Kapazitaet hoch = Budget steigt um X%)
- **Nahtlose Integration** in unser bestehendes Budget-Tool (eine Facility entsteht direkt daraus)

Der Factory Builder schliesst diese Luecke -- nicht als teures Enterprise-Tool, sondern als natuerliche Erweiterung unseres bestehenden Systems.

### 1.3 Wissenschaftliche Grundlage

Das parametrische Modell basiert auf etablierten Methoden der Investitionskostenschaetzung:

- **Cost Estimation Relationships (CERs):** Mathematische Korrelationen zwischen technischen Parametern und Kosten, abgeleitet aus historischen Daten
- **Skalierungsexponenten:** In der Industrie bewaehrt -- Kapazitaetsverdopplung fuehrt typischerweise nicht zu Kostenverdopplung, sondern folgt einem Exponenten von ca. 0,7 (die sogenannte "Six-Tenths Rule")
- **Konfidenzintervalle:** Parametrische Schaetzungen liefern Bandbreiten statt Punktwerte -- ehrlicher und nuetzlicher fuer die Entscheidungsfindung

---

## 2. Vision und Nutzergeschichte

### 2.1 Das Szenario

> **Georg (Industrial Engineer):** "Wir planen einen zweiten Standort mit 5.000 Einheiten/Jahr. Wie viel wird das kosten?"
>
> **Heute:** Georg oeffnet das Excel der 3k Factory. Kopiert die Struktur. Passt manuell 200+ Positionen an. Raet bei Skalierungsfaktoren. Diskutiert 3 Wochen ueber Annahmen. Das Ergebnis hat keine nachvollziehbare Basis.
>
> **Mit Factory Builder:** Georg oeffnet /builder. Waehlt "3k Factory" als Template. Stellt Kapazitaet auf 5.000. Waehlt Automatisierungsgrad "Semi-Automatisch". Das Tool berechnet sofort: EUR 13,2M (+/- 18%). Georg sieht, welche Departments am meisten wachsen, wo die groessten Unsicherheiten liegen, und kann einzelne Module anpassen.

### 2.2 Kernfunktionalitaet

```
[Bestehende Facility]                    [Factory Builder]                    [Neue Facility]
        |                                       |                                    |
   3k Factory -----> Template extrahieren ----> Parametrisches Modell -----> 5k Factory (Entwurf)
        |                |                      |                                    |
   - Departments         |              User-Eingabe:                         - Geschaetzte Budgets
   - Work Areas          |              - Kapazitaet                          - Skalierte Cost Items
   - Cost Items          |              - Taktplaetze                         - Cash-Out Timeline
   - Ist-Kosten          |              - Produktlinien                       - Confidence Scores
                         |              - Hallenflaeche                              |
                         |              - Automatisierungsgrad                       |
                         v                                                           v
                  Kostenvorlagen mit                                    "Als Facility anlegen"
                  Skalierungsregeln                                    --> echte Budgetplanung
```

---

## 3. Parametrisches Modell

### 3.1 Kostenkategorisierung

Jede Position aus der bestehenden Fabrik wird in eine von vier Skalierungskategorien eingeteilt:

| Kategorie | Skalierungslogik | Beispiel | Typischer Basiswert |
|---|---|---|---|
| **Fix** | Einmalig, unabhaengig von Kapazitaet | Infrastruktur Grundausstattung, IT-Backbone, Sprinkleranlage | EUR 400k |
| **Pro Taktplatz** | Linear mit Anzahl Taktplaetze | Montagestation, Werkzeugausstattung, Arbeitsplatzbeleuchtung | EUR 45k/Takt |
| **Pro Produktlinie** | Linear mit Anzahl Produktlinien | Pruefstand, produktspezifische Vorrichtungen, Typenspezifische Werkzeuge | EUR 180k/Linie |
| **Pro Flaeche** | Linear/degressiv mit m2 | Foerdertechnik, Bodenbelag, Hallenbeleuchtung | EUR 8k/10m |

### 3.2 Skalierungsformeln

#### Kapazitaetsskalierung (Power Law)

```
Kosten_neu = Kosten_referenz * (Kapazitaet_neu / Kapazitaet_referenz) ^ Exponent
```

- **Exponent = 0,7** fuer Equipment mit Skaleneffekten (Foerdertechnik, Infrastruktur)
- **Exponent = 1,0** fuer linear skalierende Positionen (Taktplaetze, Arbeitsplaetze)
- **Exponent = 1,15** fuer ueberproportional skalierende Positionen (Komplexitaetszuschlag bei hoher Variantenvielfalt)

#### Automatisierungsgrad-Multiplikator

| Grad | Multiplikator Equipment | Multiplikator Personal-Infrastruktur |
|---|---|---|
| Manuell | 0,6x | 1,3x |
| Semi-Automatisch | 1,0x (Referenz) | 1,0x |
| Vollautomatisch | 1,8x | 0,5x |

#### Konfidenz-Berechnung

```
Confidence = Gewichteter Durchschnitt aus:
  - Anzahl realer Datenpunkte fuer diese Kategorie (40%)
  - Abweichung vom Referenz-Szenario (30%)
  - Alter der Referenzdaten in Monaten (20%)
  - Komplexitaet der Skalierung (10%)
```

Ergebnis: Score von 0-100%, dargestellt als Ampel:
- **> 75%** -- Hohe Konfidenz (gruene Positionen)
- **50-75%** -- Mittlere Konfidenz (gelbe Positionen, manuell pruefen)
- **< 50%** -- Niedrige Konfidenz (rote Positionen, Experteneinschaetzung noetig)

### 3.3 Beispielrechnung

**Referenz:** 3k Factory (3.000 Einheiten/Jahr, 12 Taktplaetze, 3 Produktlinien, 2.400 m2)

**Ziel:** 5k Factory (5.000 Einheiten/Jahr, 18 Taktplaetze, 3 Produktlinien, 3.600 m2)

| Department | 3k Ist-Budget | Skalierungstyp | Faktor | 5k Schaetzung | Konfidenz |
|---|---|---|---|---|---|
| Assembly | EUR 2,1M | Pro Taktplatz (12->18) | 1,50 | EUR 3,15M | 82% |
| Testing | EUR 0,9M | Pro Produktlinie (3->3) + Kapazitaet | 1,38 | EUR 1,24M | 71% |
| Logistics | EUR 0,6M | Pro Flaeche (2400->3600) | 1,35 | EUR 0,81M | 68% |
| Infrastructure | EUR 1,2M | Fix + Kapazitaet^0,7 | 1,39 | EUR 1,67M | 76% |
| IT & Automation | EUR 0,8M | Fix + Automatisierung | 1,20 | EUR 0,96M | 64% |
| Quality | EUR 0,4M | Pro Produktlinie + Kapazitaet | 1,38 | EUR 0,55M | 59% |
| **Gesamt** | **EUR 6,0M** | | | **EUR 8,38M** | **72%** |

**Bandbreite bei 72% Konfidenz:** EUR 7,1M - EUR 9,9M (+/- 18%)

---

## 4. Datenmodell-Erweiterung

### 4.1 Neue Entitaeten

Das bestehende Datenmodell (`Facility > Department > WorkArea > CostItem`) bleibt unveraendert. Der Factory Builder fuegt drei neue Entitaeten hinzu:

#### CostItemTemplate

Eine generische, parametrisierte Version eines CostItems -- ohne konkrete Betraege, aber mit Skalierungsregeln.

```python
class ScalingCategory(str, enum.Enum):
    """Wie skaliert diese Position mit der Fabrikgroesse?"""
    FIXED = "FIXED"                           # Einmalig, kapazitaetsunabhaengig
    PER_TAKT_STATION = "PER_TAKT_STATION"     # Linear mit Taktplaetzen
    PER_PRODUCT_LINE = "PER_PRODUCT_LINE"     # Linear mit Produktlinien
    PER_AREA = "PER_AREA"                     # Linear/degressiv mit Flaeche
    CAPACITY_SCALED = "CAPACITY_SCALED"       # Power Law mit Kapazitaet
    CUSTOM = "CUSTOM"                         # Benutzerdefinierte Formel

class AutomationImpact(str, enum.Enum):
    """Wie reagiert diese Position auf Automatisierungsgrad?"""
    NONE = "NONE"                             # Kein Einfluss
    EQUIPMENT_UP = "EQUIPMENT_UP"             # Steigt mit Automatisierung
    PERSONNEL_DOWN = "PERSONNEL_DOWN"         # Sinkt mit Automatisierung
    MIXED = "MIXED"                           # Komplexe Abhaengigkeit


class CostItemTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cost_item_templates"

    facility_template_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facility_templates.id", ondelete="CASCADE"),
    )

    # Referenz zum Original-CostItem (falls aus realer Facility abgeleitet)
    source_cost_item_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("cost_items.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Beschreibung und Kategorisierung
    description: Mapped[str] = mapped_column(Text, nullable=False)
    department_name: Mapped[str] = mapped_column(String(255), nullable=False)
    work_area_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Referenzwerte aus der Quell-Facility
    reference_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2), nullable=False
    )

    # Skalierungsparameter
    scaling_category: Mapped[ScalingCategory] = mapped_column(
        ScalingCategoryType, nullable=False
    )
    scaling_exponent: Mapped[Decimal] = mapped_column(
        Numeric(precision=4, scale=2), nullable=False, default=1.0
    )
    automation_impact: Mapped[AutomationImpact] = mapped_column(
        AutomationImpactType, nullable=False, default=AutomationImpact.NONE
    )

    # Konfidenz-Metadaten
    data_point_count: Mapped[int] = mapped_column(default=1)
    last_validated: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
```

#### FacilityTemplate

Eine parametrisierte Vorlage, abgeleitet aus einer echten Facility.

```python
class FacilityTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "facility_templates"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Referenz zur Quell-Facility
    source_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Referenz-Parameter der Quell-Facility
    ref_capacity_units_per_year: Mapped[int] = mapped_column(nullable=False)
    ref_takt_stations: Mapped[int] = mapped_column(nullable=False)
    ref_product_lines: Mapped[int] = mapped_column(nullable=False)
    ref_area_sqm: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False
    )
    ref_automation_level: Mapped[str] = mapped_column(
        String(50), nullable=False, default="SEMI_AUTO"
    )
    ref_total_budget: Mapped[Decimal] = mapped_column(
        Numeric(precision=15, scale=2), nullable=False
    )

    # Metadaten
    version: Mapped[int] = mapped_column(default=1)
    is_active: Mapped[bool] = mapped_column(default=True)

    # Relationships
    cost_item_templates: Mapped[list[CostItemTemplate]] = relationship(
        back_populates="facility_template",
        cascade="all, delete-orphan",
    )
```

#### FactoryConfig

Die User-Eingabe fuer eine neue Fabrikkonfiguration samt berechneter Ergebnisse.

```python
class AutomationLevel(str, enum.Enum):
    MANUAL = "MANUAL"
    SEMI_AUTO = "SEMI_AUTO"
    FULL_AUTO = "FULL_AUTO"


class FactoryConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "factory_configs"

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Referenz-Template
    facility_template_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facility_templates.id", ondelete="CASCADE"),
    )

    # User-Eingabe-Parameter
    target_capacity: Mapped[int] = mapped_column(nullable=False)
    target_takt_stations: Mapped[int] = mapped_column(nullable=False)
    target_product_lines: Mapped[int] = mapped_column(nullable=False)
    target_area_sqm: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False
    )
    target_automation_level: Mapped[AutomationLevel] = mapped_column(
        AutomationLevelType, nullable=False
    )
    target_phases: Mapped[int] = mapped_column(default=4)

    # Berechnete Ergebnisse (als JSON fuer Flexibilitaet)
    estimated_total: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=15, scale=2), nullable=True
    )
    estimated_range_low: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=15, scale=2), nullable=True
    )
    estimated_range_high: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=15, scale=2), nullable=True
    )
    overall_confidence: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=5, scale=2), nullable=True
    )
    calculation_details: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )  # Department-Aufschluesselung, Timeline etc.

    # Wurde daraus eine echte Facility erstellt?
    generated_facility_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("facilities.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    facility_template: Mapped[FacilityTemplate] = relationship()
    generated_facility: Mapped[Facility | None] = relationship()
```

### 4.2 ER-Diagramm (Erweiterung)

```
Bestehendes Modell:                    Factory Builder Erweiterung:
==================                     ============================

  Facility                              FacilityTemplate
  +--id                      <------    +--id
  +--name                    source     +--name
  +--location                           +--source_facility_id ---------> Facility
  +--description                        +--ref_capacity_units_per_year
  |                                     +--ref_takt_stations
  +--departments[]                      +--ref_product_lines
     |                                  +--ref_area_sqm
     Department                         +--ref_total_budget
     +--id                              |
     +--name                            +--cost_item_templates[]
     +--budget_total                       |
     |                                     CostItemTemplate
     +--work_areas[]                       +--id
        |                                  +--description
        WorkArea                           +--department_name
        +--id                              +--work_area_name
        +--name                            +--reference_amount
        |                                  +--scaling_category
        +--cost_items[]                    +--scaling_exponent
           |                               +--automation_impact
           CostItem          <------       +--source_cost_item_id -----> CostItem
           +--id             source        +--data_point_count
           +--description
           +--current_amount            FactoryConfig
           +--cost_basis                +--id
           +--cost_driver               +--name
           +--project_phase             +--facility_template_id -------> FacilityTemplate
           +--product                   +--target_capacity
                                        +--target_takt_stations
                                        +--target_product_lines
                                        +--target_area_sqm
                                        +--target_automation_level
                                        +--estimated_total
                                        +--overall_confidence
                                        +--generated_facility_id ------> Facility (neu)
```

---

## 5. API-Design

### 5.1 Neue Endpoints

Alle unter `/api/v1/builder/`.

#### Template-Verwaltung

```
POST   /api/v1/builder/templates
       Erstellt ein FacilityTemplate aus einer bestehenden Facility.
       Body: { facility_id: UUID, name: str, ref_params: {...} }
       Response: FacilityTemplateRead (inkl. generierter CostItemTemplates)

GET    /api/v1/builder/templates
       Listet alle verfuegbaren Templates.
       Response: list[FacilityTemplateRead]

GET    /api/v1/builder/templates/{id}
       Zeigt Template mit allen CostItemTemplates.
       Response: FacilityTemplateRead (deep)

PUT    /api/v1/builder/templates/{id}/items/{item_id}
       Aktualisiert Skalierungsparameter eines CostItemTemplates.
       Body: { scaling_category, scaling_exponent, automation_impact, notes }

DELETE /api/v1/builder/templates/{id}
       Loescht ein Template.
```

#### Konfiguration und Berechnung

```
POST   /api/v1/builder/configure
       Erstellt eine neue Fabrikkonfiguration und berechnet Schaetzung.
       Body: {
         template_id: UUID,
         name: str,
         target_capacity: int,
         target_takt_stations: int,
         target_product_lines: int,
         target_area_sqm: float,
         target_automation_level: "MANUAL" | "SEMI_AUTO" | "FULL_AUTO",
         target_phases: int
       }
       Response: FactoryConfigRead (inkl. Schaetzung, Bandbreite, Konfidenz)

GET    /api/v1/builder/configs
       Listet alle gespeicherten Konfigurationen.

GET    /api/v1/builder/configs/{id}
       Zeigt Konfiguration mit vollstaendiger Aufschluesselung.
       Response: {
         ...config,
         department_breakdown: [...],
         cost_item_estimates: [...],
         cash_out_timeline: [...],
         confidence_details: [...]
       }

PUT    /api/v1/builder/configs/{id}
       Aktualisiert Parameter und berechnet neu.

POST   /api/v1/builder/configs/{id}/generate
       Erstellt eine echte Facility aus der Konfiguration.
       Response: FacilityRead (die neue, budgetierte Facility)

GET    /api/v1/builder/configs/{id}/compare
       Vergleicht Konfiguration mit dem Referenz-Template.
       Response: Detaillierter Vergleich pro Department/Position.
```

#### Analyse

```
GET    /api/v1/builder/configs/{id}/timeline
       Cash-Out-Timeline basierend auf typischen Lieferzeiten und Phasen.
       Response: { phases: [{ phase, start, end, budget, items: [...] }] }

GET    /api/v1/builder/configs/{id}/sankey
       Daten fuer Sankey-Visualisierung der Budget-Verteilung.
       Response: { nodes: [...], links: [...] }

GET    /api/v1/builder/configs/{id}/sensitivity
       Sensitivitaetsanalyse: Welcher Parameter hat den groessten Einfluss?
       Response: { parameters: [{ name, impact_low, impact_high }] }
```

### 5.2 Pydantic Schemas (Auszug)

```python
# --- Request Schemas ---

class FactoryConfigCreate(BaseModel):
    template_id: UUID
    name: str
    target_capacity: int = Field(ge=100, le=100000)
    target_takt_stations: int = Field(ge=1, le=200)
    target_product_lines: int = Field(ge=1, le=20)
    target_area_sqm: Decimal = Field(ge=100, le=100000)
    target_automation_level: AutomationLevel
    target_phases: int = Field(ge=1, le=8, default=4)


class CostItemTemplateUpdate(BaseModel):
    scaling_category: ScalingCategory | None = None
    scaling_exponent: Decimal | None = Field(None, ge=0.1, le=3.0)
    automation_impact: AutomationImpact | None = None
    notes: str | None = None


# --- Response Schemas ---

class CostItemEstimate(BaseModel):
    """Eine einzelne geschaetzte Position in der neuen Fabrik."""
    model_config = ConfigDict(from_attributes=True)

    template_item_id: UUID
    description: str
    department_name: str
    work_area_name: str
    reference_amount: Decimal
    estimated_amount: Decimal
    scaling_factor: Decimal
    confidence_score: Decimal
    confidence_level: str      # "HIGH" | "MEDIUM" | "LOW"
    scaling_explanation: str   # z.B. "18 Takt / 12 Takt * 1.0 = 1.50"


class DepartmentBreakdown(BaseModel):
    """Budget-Zusammenfassung pro Department."""
    department_name: str
    reference_budget: Decimal
    estimated_budget: Decimal
    estimated_range_low: Decimal
    estimated_range_high: Decimal
    item_count: int
    avg_confidence: Decimal
    share_of_total: Decimal     # Prozentanteil am Gesamtbudget


class FactoryConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    target_capacity: int
    target_takt_stations: int
    target_product_lines: int
    target_area_sqm: Decimal
    target_automation_level: AutomationLevel
    target_phases: int

    # Berechnete Ergebnisse
    estimated_total: Decimal | None
    estimated_range_low: Decimal | None
    estimated_range_high: Decimal | None
    overall_confidence: Decimal | None

    # Aufschluesselung
    department_breakdown: list[DepartmentBreakdown]
    item_estimates: list[CostItemEstimate]

    created_at: datetime
    updated_at: datetime
```

---

## 6. UI-Konzept

### 6.1 Neue Seite: `/builder`

#### Schritt 1: Template waehlen

```
+------------------------------------------------------------------+
|  FACTORY BUILDER                                                  |
|                                                                   |
|  Waehle eine Referenz-Fabrik als Ausgangsbasis:                  |
|                                                                   |
|  +------------------------+   +------------------------+          |
|  | 3k Factory             |   | + Neues Template       |          |
|  | 3.000 Einh./Jahr       |   |   erstellen            |          |
|  | 12 Taktplaetze          |   |                        |          |
|  | EUR 6,0M Budget        |   |                        |          |
|  | 147 Positionen          |   |                        |          |
|  | [Auswaehlen]            |   |                        |          |
|  +------------------------+   +------------------------+          |
+------------------------------------------------------------------+
```

#### Schritt 2: Parameter konfigurieren (Wizard mit Live-Preview)

```
+------------------------------------------------------------------+
|  NEUE FABRIK KONFIGURIEREN           Basis: 3k Factory            |
|                                                                   |
|  Kapazitaet          [====|==============] 5.000 Einh./Jahr      |
|  Taktplaetze          [======|==========] 18                      |
|  Produktlinien       [==|================] 3                      |
|  Hallenflaeche        [=====|===========] 3.600 m2                |
|  Automatisierung     ( ) Manuell  (x) Semi  ( ) Voll             |
|  Phasen              [===|==============] 4                       |
|                                                                   |
|  +-----------------------+   +-------------------------------+    |
|  | GESCHAETZTES BUDGET   |   | BUDGET-VERTEILUNG             |   |
|  |                       |   |                               |    |
|  | EUR 8,38M             |   |  Assembly    ========== 38%   |   |
|  | Bandbreite:           |   |  Infrastr.   ======     20%   |   |
|  | EUR 7,1M - 9,9M       |   |  Testing     =====     15%   |   |
|  |                       |   |  IT & Auto   ====      11%   |    |
|  | Konfidenz: 72%        |   |  Logistics   ====      10%   |    |
|  | [====|===] Mittel     |   |  Quality     ==         7%   |    |
|  +-----------------------+   +-------------------------------+    |
|                                                                   |
|  [Detailansicht]  [Timeline]  [Sensitivitaet]                    |
+------------------------------------------------------------------+
```

#### Schritt 3: Detail-Ansicht und Anpassung

```
+------------------------------------------------------------------+
|  DETAIL: Assembly Department           Konfidenz: 82%             |
|                                                                   |
|  Referenz (3k): EUR 2,10M  -->  Schaetzung (5k): EUR 3,15M      |
|  Skalierungsfaktor: 1,50x (18/12 Taktplaetze)                   |
|                                                                   |
|  Position                    Referenz    Faktor   Schaetzung  OK |
|  --------------------------------------------------------------- |
|  Montagestation Typ A        EUR 35k     x1,50    EUR 52,5k  V  |
|  Montagestation Typ B        EUR 42k     x1,50    EUR 63k    V  |
|  Werkzeugausstattung/Takt   EUR 12k     x1,50    EUR 18k    V  |
|  Druckluft-Versorgung       EUR 85k     x1,35    EUR 115k   !  |
|  Absauganlage               EUR 120k    x1,00    EUR 120k   V  |
|  ...                                                             |
|                                                                   |
|  [!] = Konfidenz < 70% -- manuelle Pruefung empfohlen            |
|                                                                   |
|  [Alle akzeptieren]  [Markierte anpassen]  [Zurueck]             |
+------------------------------------------------------------------+
```

#### Schritt 4: Cash-Out Timeline

```
+------------------------------------------------------------------+
|  CASH-OUT TIMELINE                                                |
|                                                                   |
|  EUR M                                                           |
|  3,5 |                                                           |
|  3,0 |              ####                                         |
|  2,5 |        ####  ####                                         |
|  2,0 |  ####  ####  ####  ####                                   |
|  1,5 |  ####  ####  ####  ####                                   |
|  1,0 |  ####  ####  ####  ####                                   |
|  0,5 |  ####  ####  ####  ####                                   |
|      +---Phase1--Phase2--Phase3--Phase4----->                     |
|         EUR 1,8M EUR 2,7M EUR 2,5M EUR 1,4M                     |
|                                                                   |
|  Gesamtlaufzeit: ~24 Monate                                     |
|  Peak Cash-Out: Phase 2 (Equipment-Bestellungen)                 |
+------------------------------------------------------------------+
```

#### Schritt 5: Facility erstellen

```
+------------------------------------------------------------------+
|  ZUSAMMENFASSUNG                                                  |
|                                                                   |
|  "5k Factory -- Standort Sued"                                   |
|                                                                   |
|  Kapazitaet:        5.000 Einheiten/Jahr                         |
|  Budget:            EUR 8,38M (+/- 18%)                          |
|  Departments:       6                                             |
|  Positionen:        183                                           |
|  Konfidenz:         72% (Mittel)                                 |
|                                                                   |
|  Hinweis: Es werden 183 Cost Items als Schaetzungen angelegt.    |
|  Jede Position erhaelt den Vermerk "Factory Builder Estimate"    |
|  und kann anschliessend individuell verfeinert werden.            |
|                                                                   |
|  [ Als Facility anlegen ]         [ Zurueck ]                     |
+------------------------------------------------------------------+
```

### 6.2 Frontend-Komponenten (React/TypeScript)

```
src/
  pages/
    FactoryBuilderPage.tsx          # Hauptseite mit Wizard-Steuerung

  features/
    factory-builder/
      components/
        TemplateSelector.tsx         # Template-Auswahl (Schritt 1)
        ParameterSliders.tsx         # Slider-Eingaben (Schritt 2)
        BudgetPreview.tsx            # Live-Kostenvorschau
        DepartmentBreakdown.tsx      # Balkendiagramm Verteilung
        DetailTable.tsx              # Position-fuer-Position (Schritt 3)
        CashOutTimeline.tsx          # Phasen-Chart (Schritt 4)
        SensitivityChart.tsx         # Tornado-Diagramm
        SankeyBudget.tsx             # Sankey-Visualisierung
        ConfigSummary.tsx            # Zusammenfassung (Schritt 5)
        ConfidenceBadge.tsx          # Ampel-Anzeige

      hooks/
        useFactoryConfig.ts          # State Management fuer Konfiguration
        useBudgetEstimate.ts         # API-Call + Live-Update bei Slider-Change
        useTemplates.ts              # Template CRUD

      api/
        builderApi.ts                # API-Client fuer /builder Endpoints

      types/
        builder.types.ts             # TypeScript Interfaces
```

---

## 7. AI-Layer (Zukunftsvision v3+)

### 7.1 Muster-Erkennung

Ein LLM analysiert die historischen CostItems aller Facilities und erkennt Verteilungsmuster:

> "Bei der 3k Factory entfallen 48% des Budgets auf Assembly. Bei einer 5k Factory mit Semi-Automatisierung empfehle ich 44%, da die Assembly-Kosten degressiv skalieren, waehrend IT & Automation ueberproportional wachsen."

### 7.2 Anomalie-Erkennung

Das System warnt bei untypischen Budgetverteilungen:

> "Ihr Testing-Budget liegt mit 8% deutlich unter dem Benchmark von 14%. Bei 5.000 Einheiten/Jahr und 3 Produktlinien empfehlen wir mindestens EUR 1,1M fuer Testing."

### 7.3 Lieferanten-Intelligenz

Basierend auf historischen CostItem-Daten mit Lieferanteninformationen:

> "Fuer Montagestationen haben Sie bei der 3k Factory EUR 35k/Stueck bezahlt. Bei 18 Stueck (statt 12) koennen Sie Mengenrabatte von 8-12% erwarten. Geschaetzter Stueckpreis: EUR 31k."

### 7.4 Technische Umsetzung AI-Layer

```
POST /api/v1/builder/configs/{id}/ai-analysis
Response: {
  recommendations: [
    {
      type: "BUDGET_DISTRIBUTION",
      department: "Assembly",
      message: "...",
      suggested_adjustment: -4%,
      confidence: 0.73,
      basis: "Analyse von 2 Referenz-Facilities"
    }
  ],
  anomalies: [
    {
      type: "UNDER_BUDGET",
      department: "Testing",
      current_share: 0.08,
      benchmark_share: 0.14,
      severity: "HIGH",
      message: "..."
    }
  ]
}
```

---

## 8. Implementierungs-Roadmap

### MVP (v1) -- 4-6 Wochen Entwicklung

**Ziel:** Template-Export einer bestehenden Facility als Startkonfiguration fuer eine neue.

| Woche | Aufgabe |
|---|---|
| 1-2 | Datenmodell (CostItemTemplate, FacilityTemplate, FactoryConfig), Migrationen |
| 2-3 | Backend: Template-Erstellung aus Facility, einfache lineare Skalierung |
| 3-4 | Backend: Konfiguration berechnen, Facility generieren |
| 4-5 | Frontend: Wizard UI, Parameter-Slider, Ergebnis-Tabelle |
| 5-6 | Frontend: Budget-Balkendiagramm, Zusammenfassung, "Als Facility anlegen" |

**Lieferumfang MVP:**
- Template aus 3k Factory erstellen
- 5 Parameter-Slider (Kapazitaet, Taktplaetze, Produktlinien, Flaeche, Automatisierung)
- Tabelle mit geschaetzten Kosten pro Department
- "Als Facility anlegen" Button
- Keine Konfidenz-Berechnung, keine AI, keine Sankey-Visualisierung

### v2 -- 3-4 Wochen nach MVP

**Ziel:** Parametrisches Modell mit Skalierungsfaktoren und Konfidenz.

- Individuelle Skalierungsexponenten pro CostItemTemplate
- Konfidenz-Score pro Position und Department
- Cash-Out Timeline basierend auf Projektphasen
- Sensitivitaetsanalyse (Tornado-Diagramm)
- Vergleichsansicht: Konfiguration vs. Referenz
- Sankey-Visualisierung der Budget-Verteilung

### v3 -- 4-6 Wochen nach v2

**Ziel:** AI-basierte Empfehlungen und Muster-Erkennung.

- LLM-Integration fuer Analyse bestehender Cost Items
- Anomalie-Erkennung bei Budgetverteilung
- Automatische Kategorisierung neuer Cost Items
- Benchmark-Datenbank aus mehreren Facilities
- Export als Management-Praesentation (PowerPoint)

### v4 -- Langfristversion

- Multi-Facility-Vergleich und Lerneffekte
- Lieferanten-Datenbank mit Preistrends
- Integration mit CAD/BIM fuer Layout-Planung
- Szenario-Vergleich ("Was waere wenn vollautomatisch?")
- Rollenbasierter Zugriff (Planer, Finance, Management)

---

## 9. Risiken und Mitigationen

| Risiko | Eintrittswahrscheinlichkeit | Auswirkung | Mitigation |
|---|---|---|---|
| Zu wenige Datenpunkte fuer belastbare Skalierung | Hoch (nur 1 Facility) | Schaetzungen ungenau | Transparente Konfidenz-Scores, manuelle Override-Moeglichkeit |
| User vertrauen Schaetzungen blind | Mittel | Fehlentscheidungen | Pflicht-Review aller Positionen mit Konfidenz < 70%, Warnhinweise |
| Skalierungsmodell zu simpel | Mittel | Abweichungen bei extremen Parametern | Validierung gegen reale Daten nach Fabrik 2, iterative Verbesserung |
| Feature Creep beim AI-Layer | Hoch | Verzoegerung des MVP | Strikte Phasentrennung, MVP ohne AI ausliefern |
| Datenqualitaet der 3k Factory nicht ausreichend | Niedrig | Templates unbrauchbar | Validierungs-Workflow beim Template-Erstellen |

---

## 10. Erfolgskennzahlen

| KPI | Zielwert | Messbarkeit |
|---|---|---|
| Zeit fuer erste Budgetschaetzung einer neuen Fabrik | < 1 Stunde (statt 3 Wochen) | Timestamp: Config erstellt bis Facility angelegt |
| Abweichung Schaetzung vs. Ist (nach Fabrik 2) | < 20% | Vergleich Factory Builder Estimate vs. Final Budget |
| Anzahl manuell angepasster Positionen | < 30% | Tracking im Generated Facility |
| User Adoption | 100% der Fabrikplaner nutzen Builder | Usage Analytics |
| Konfidenz-Score Verbesserung pro Facility | +15% pro neuer Referenz-Facility | Durchschnittlicher Konfidenz-Score |

---

## 11. Fazit

Der Factory Builder transformiert das CAPEX Budget Tool von einem **Dokumentations-Werkzeug** zu einem **strategischen Planungsinstrument**. Jede gebaute Fabrik macht das System intelligenter. Nach 3-4 Standorten verfuegt TYTAN Technologies ueber ein proprietaeres Kostenschaetzungstool, das:

1. **Wochen an Planungszeit** auf Stunden reduziert
2. **Erfahrungswissen** in Algorithmen konserviert (unabhaengig von Personalfluktuation)
3. **Entscheidungsqualitaet** durch datenbasierte Schaetzungen mit Konfidenzintervallen erhoeht
4. **Szenario-Faehigkeit** bietet ("Was kostet es, wenn wir voll automatisieren?")

Die bestehende Codebase (FastAPI + React + PostgreSQL) bietet die ideale Grundlage. Das Datenmodell wird erweitert, nicht ersetzt. Der MVP ist in 4-6 Wochen lieferbar und bietet sofortigen Mehrwert.

**Der Factory Builder ist nicht nur ein Feature -- er ist der Grundstein fuer eine datengetriebene Fabrikplanungs-Plattform.**

---

*Dieses Konzeptpapier basiert auf der Analyse des bestehenden CAPEX Budget Tools (Stand Maerz 2026), Marktrecherche zu Factory Planning Tools und etablierten Methoden der parametrischen Kostenschaetzung.*

### Quellen und Referenzen

- [4cost-aces -- Parametrische Kostenschaetzung](https://www.4cost.de/en/costing-software/4cost-aces-parametric-cost-estimate/)
- [Galorath SEER -- Cost Modeling & Estimation Software](https://galorath.com/parametric-cost-estimating/)
- [Autodesk Factory Design](https://www.autodesk.com/solutions/factory-design)
- [iFactory -- Greenfield Consulting Software](https://ifactoryapp.com/greenfield-consulting/)
- [Prevu3D -- Factory Layout Planning](https://www.prevu3d.com/digital-twin-use-cases/factory-layout/)
- [CAPEX Estimation Scaling Method](https://myengineeringtools.com/Data_Diagrams/CAPEX_Estimation_Scaling.html)
- [Capexium -- Parametric Estimate](https://www.capexium.com/parametric-estimate)
- [Germanedge -- Greenfield Projects](https://www.germanedge.com/en/greenfield-projects/)
- [Mitsubishi -- Smart Factory Blueprint 2026](https://www.mitsubishimanufacturing.com/smart-factory-guide-2026/)
- [ema Software Suite -- Digital Factory Planning](https://imk-ema.com/en/digital-factory-planning/)
