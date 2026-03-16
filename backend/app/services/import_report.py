"""Structured import report for Excel imports — detailed per-department stats, warnings, errors."""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class DepartmentReport:
    """Import stats for a single department."""

    name: str
    items_imported: int = 0
    items_updated: int = 0
    items_skipped: int = 0
    work_areas_created: int = 0
    work_areas_found: int = 0
    total_amount: Decimal = Decimal(0)
    budget_total: Decimal | None = None
    budget_delta: Decimal | None = None

    def to_dict(self) -> dict:
        result = {
            "name": self.name,
            "items_imported": self.items_imported,
            "items_updated": self.items_updated,
            "items_skipped": self.items_skipped,
            "work_areas_created": self.work_areas_created,
            "work_areas_found": self.work_areas_found,
            "total_amount": float(self.total_amount),
        }
        if self.budget_total is not None:
            result["budget_total"] = float(self.budget_total)
        if self.budget_delta is not None:
            result["budget_delta"] = float(self.budget_delta)
        return result


@dataclass
class ImportReport:
    """Complete import report with per-department breakdowns, warnings, and errors."""

    departments_created: int = 0
    departments_updated: int = 0
    total_work_areas: int = 0
    total_items_imported: int = 0
    total_items_updated: int = 0
    total_items_skipped: int = 0
    total_amount: Decimal = Decimal(0)

    department_reports: list[DepartmentReport] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    info: list[str] = field(default_factory=list)

    # Sheets detected & processed
    sheets_detected: list[str] = field(default_factory=list)
    sheets_skipped: list[str] = field(default_factory=list)
    budget_template_sheet: str | None = None

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)

    def add_info(self, msg: str) -> None:
        self.info.append(msg)

    def finalize(self) -> None:
        """Aggregate department-level stats into report totals."""
        self.total_items_imported = sum(d.items_imported for d in self.department_reports)
        self.total_items_updated = sum(d.items_updated for d in self.department_reports)
        self.total_items_skipped = sum(d.items_skipped for d in self.department_reports)
        self.total_work_areas = sum(
            d.work_areas_created + d.work_areas_found for d in self.department_reports
        )
        self.total_amount = sum(
            (d.total_amount for d in self.department_reports), Decimal(0)
        )

        # Generate budget comparison info lines
        for dr in self.department_reports:
            if dr.budget_total is not None and dr.budget_total > 0:
                delta = dr.budget_total - dr.total_amount
                dr.budget_delta = delta
                sign = "+" if delta >= 0 else ""
                self.add_info(
                    f"{dr.name}: Budget EUR {dr.budget_total:,.2f}, "
                    f"Items EUR {dr.total_amount:,.2f}, "
                    f"Delta {sign}{delta:,.2f}"
                )

    def to_dict(self) -> dict:
        """Serialize to JSON-ready dict for API response."""
        status = "success"
        if self.errors:
            status = "partial_success" if self.total_items_imported > 0 else "error"

        return {
            "status": status,
            "summary": {
                "departments_created": self.departments_created,
                "departments_updated": self.departments_updated,
                "total_work_areas": self.total_work_areas,
                "total_items_imported": self.total_items_imported,
                "total_items_updated": self.total_items_updated,
                "total_items_skipped": self.total_items_skipped,
                "total_amount": float(self.total_amount),
            },
            "departments": [d.to_dict() for d in self.department_reports],
            "budget_template_sheet": self.budget_template_sheet,
            "sheets_detected": self.sheets_detected,
            "sheets_skipped": self.sheets_skipped,
            "info": self.info,
            "warnings": self.warnings,
            "errors": self.errors,
        }
