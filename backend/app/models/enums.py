"""Python enums and corresponding SQLAlchemy enum types for the CAPEX budget tool.

Only workflow-related enums remain here. Classification enums (Product, Phase,
CostBasis, CostDriver) are now driven by backend/config/config.json and stored
as plain String(50) columns.
"""

import enum

from sqlalchemy import Enum as SAEnum


class ApprovalStatus(str, enum.Enum):
    """Workflow status for cost-item approval."""

    OPEN = "OPEN"
    REVIEWED = "REVIEWED"
    SUBMITTED_FOR_APPROVAL = "SUBMITTED_FOR_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ON_HOLD = "ON_HOLD"
    PENDING_SUPPLIER_NEGOTIATION = "PENDING_SUPPLIER_NEGOTIATION"
    PENDING_TECHNICAL_CLARIFICATION = "PENDING_TECHNICAL_CLARIFICATION"
    PURCHASE_ORDER_SENT = "PURCHASE_ORDER_SENT"
    PURCHASE_ORDER_CONFIRMED = "PURCHASE_ORDER_CONFIRMED"
    DELIVERED = "DELIVERED"
    OBSOLETE = "OBSOLETE"


class AdjustmentCategory(str, enum.Enum):
    """Category of a change cost (formerly Zielanpassung)."""

    PRODUCT_CHANGE = "PRODUCT_CHANGE"
    SUPPLIER_CHANGE = "SUPPLIER_CHANGE"
    SCOPE_CHANGE = "SCOPE_CHANGE"
    OPTIMIZATION = "OPTIMIZATION"
    OTHER = "OTHER"


# -- SQLAlchemy column types (reusable in models) --

ApprovalStatusType = SAEnum(
    ApprovalStatus,
    name="approval_status",
    create_constraint=True,
    native_enum=True,
)

AdjustmentCategoryType = SAEnum(
    AdjustmentCategory,
    name="adjustment_category",
    create_constraint=True,
    native_enum=True,
)
