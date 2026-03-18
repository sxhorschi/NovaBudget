"""Re-export all models so that ``from app.models import *`` works."""

from app.models.attachment import Attachment, AttachmentType
from app.models.audit_log import AuditLog
from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.budget_adjustment import BudgetAdjustment
from app.models.cost_item import CostItem
from app.models.department import Department
from app.models.enums import (
    AdjustmentCategory,
    ApprovalStatus,
)
from app.models.facility import Facility
from app.models.group_mapping import EntraGroupMapping
from app.models.permission import FacilityPermission
from app.models.transfer_log import TransferLog
from app.models.user import User
from app.models.work_area import WorkArea

__all__ = [
    "AdjustmentCategory",
    "Attachment",
    "AttachmentType",
    "AuditLog",
    "Base",
    "BudgetAdjustment",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "ApprovalStatus",
    "EntraGroupMapping",
    "FacilityPermission",
    "Facility",
    "Department",
    "TransferLog",
    "User",
    "WorkArea",
    "CostItem",
]
