"""Python enums and corresponding SQLAlchemy enum types for the CAPEX budget tool."""

import enum

from sqlalchemy import Enum as SAEnum


class CostBasis(str, enum.Enum):
    """Basis on which a cost estimate was determined."""

    COST_ESTIMATION = "COST_ESTIMATION"
    INITIAL_SUPPLIER_OFFER = "INITIAL_SUPPLIER_OFFER"
    REVISED_SUPPLIER_OFFER = "REVISED_SUPPLIER_OFFER"
    CHANGE_COST = "CHANGE_COST"


class ApprovalStatus(str, enum.Enum):
    """Workflow status for cost-item approval."""

    OPEN = "OPEN"
    SUBMITTED_FOR_APPROVAL = "SUBMITTED_FOR_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"
    PENDING_SUPPLIER_NEGOTIATION = "PENDING_SUPPLIER_NEGOTIATION"
    PENDING_TECHNICAL_CLARIFICATION = "PENDING_TECHNICAL_CLARIFICATION"
    OBSOLETE = "OBSOLETE"


class ProjectPhase(str, enum.Enum):
    """Phase of the facility build-out project."""

    PHASE_1 = "PHASE_1"
    PHASE_2 = "PHASE_2"
    PHASE_3 = "PHASE_3"
    PHASE_4 = "PHASE_4"


class Product(str, enum.Enum):
    """Product line a cost item is attributed to."""

    ATLAS = "ATLAS"
    ORION = "ORION"
    VEGA = "VEGA"
    OVERALL = "OVERALL"


class CostDriver(str, enum.Enum):
    """Driver / reason behind a cost item."""

    PRODUCT = "PRODUCT"
    PROCESS = "PROCESS"
    NEW_REQ_ASSEMBLY = "NEW_REQ_ASSEMBLY"
    NEW_REQ_TESTING = "NEW_REQ_TESTING"
    INITIAL_SETUP = "INITIAL_SETUP"


class AdjustmentCategory(str, enum.Enum):
    """Category of a budget adjustment (Zielanpassung)."""

    PRODUCT_CHANGE = "PRODUCT_CHANGE"
    SUPPLIER_CHANGE = "SUPPLIER_CHANGE"
    SCOPE_CHANGE = "SCOPE_CHANGE"
    OPTIMIZATION = "OPTIMIZATION"
    OTHER = "OTHER"


class FacilityStatus(str, enum.Enum):
    """Lifecycle status for a facility."""

    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class FacilityType(str, enum.Enum):
    """Type of facility project."""

    PRODUCTION = "PRODUCTION"
    EXPANSION = "EXPANSION"
    RETROFIT = "RETROFIT"
    PROTOTYPE = "PROTOTYPE"


# ── SQLAlchemy column types (reusable in models) ────────────────────────

CostBasisType = SAEnum(
    CostBasis,
    name="cost_basis",
    create_constraint=True,
    native_enum=True,
)

ApprovalStatusType = SAEnum(
    ApprovalStatus,
    name="approval_status",
    create_constraint=True,
    native_enum=True,
)

ProjectPhaseType = SAEnum(
    ProjectPhase,
    name="project_phase",
    create_constraint=True,
    native_enum=True,
)

ProductType = SAEnum(
    Product,
    name="product",
    create_constraint=True,
    native_enum=True,
)

CostDriverType = SAEnum(
    CostDriver,
    name="cost_driver",
    create_constraint=True,
    native_enum=True,
)

AdjustmentCategoryType = SAEnum(
    AdjustmentCategory,
    name="adjustment_category",
    create_constraint=True,
    native_enum=True,
)

FacilityStatusType = SAEnum(
    FacilityStatus,
    name="facility_status",
    create_constraint=True,
    native_enum=True,
)

FacilityTypeType = SAEnum(
    FacilityType,
    name="facility_type",
    create_constraint=True,
    native_enum=True,
)
