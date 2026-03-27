"""
CSV-based persistent data store.

All business data (facilities, functional_areas, work areas, cost items, change
costs) lives in CSV files under ``backend/data/``.  This module provides
typed loaders and savers so the rest of the app never touches raw CSV I/O.
"""

import csv
import io
import zipfile
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

# ---------------------------------------------------------------------------
# Generic CSV helpers
# ---------------------------------------------------------------------------

def read_csv(filename: str) -> list[dict[str, str]]:
    """Read a CSV file from DATA_DIR and return a list of dicts."""
    path = DATA_DIR / filename
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv(filename: str, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    """Write rows to a CSV file in DATA_DIR (overwrites)."""
    path = DATA_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# Field definitions (column order for each entity)
# ---------------------------------------------------------------------------

FACILITY_FIELDS = ["id", "name", "location", "description"]

FUNCTIONAL_AREA_FIELDS = ["id", "facility_id", "name", "budget_total"]

WORK_AREA_FIELDS = ["id", "functional_area_id", "name"]

COST_ITEM_FIELDS = [
    "id", "work_area_id", "description", "unit_price", "quantity", "total_amount",
    "approval_status", "approval_date", "project_phase", "product",
    "cost_basis", "cost_driver", "expected_cash_out", "requester",
    "basis_description", "assumptions", "created_at", "updated_at",
]

CHANGE_COST_FIELDS = [
    "id", "functional_area_id", "amount", "reason", "category",
    "cost_driver", "budget_relevant", "year",
    "created_at", "created_by",
]

# ---------------------------------------------------------------------------
# Typed loaders — each converts CSV string values to proper Python types
# ---------------------------------------------------------------------------

def _parse_number(value: str, default: float = 0) -> float:
    """Safely parse a numeric string."""
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def _parse_bool(value: str) -> bool:
    """Parse a boolean from CSV (true/false/1/0)."""
    return value.strip().lower() in ("true", "1", "yes")


def load_facilities() -> list[dict[str, Any]]:
    rows = read_csv("facilities.csv")
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "location": r.get("location", ""),
            "description": r.get("description", ""),
        }
        for r in rows
    ]


def load_functional_areas() -> list[dict[str, Any]]:
    rows = read_csv("functional_areas.csv")
    return [
        {
            "id": r["id"],
            "facility_id": r["facility_id"],
            "name": r["name"],
            "budget_total": _parse_number(r.get("budget_total", "0")),
        }
        for r in rows
    ]


def load_work_areas() -> list[dict[str, Any]]:
    rows = read_csv("work_areas.csv")
    return [
        {
            "id": r["id"],
            "functional_area_id": r["functional_area_id"],
            "name": r["name"],
        }
        for r in rows
    ]


def load_cost_items() -> list[dict[str, Any]]:
    rows = read_csv("cost_items.csv")
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "work_area_id": r["work_area_id"],
            "description": r.get("description", ""),
            "unit_price": _parse_number(r.get("unit_price", "0")),
            "quantity": _parse_number(r.get("quantity", "1")),
            "total_amount": _parse_number(r.get("total_amount", "0")),
            "approval_status": r.get("approval_status", "open"),
            "approval_date": r.get("approval_date") or None,
            "project_phase": r.get("project_phase", "phase_1"),
            "product": r.get("product", "overall"),
            "cost_basis": r.get("cost_basis", "cost_estimation"),
            "cost_driver": r.get("cost_driver", "product"),
            "expected_cash_out": r.get("expected_cash_out", ""),
            "requester": r.get("requester") or None,
            "basis_description": r.get("basis_description", ""),
            "assumptions": r.get("assumptions", ""),
            "created_at": r.get("created_at", ""),
            "updated_at": r.get("updated_at", ""),
        })
    return result


def load_change_costs() -> list[dict[str, Any]]:
    rows = read_csv("change_costs.csv")
    return [
        {
            "id": r["id"],
            "functional_area_id": r["functional_area_id"],
            "amount": _parse_number(r.get("amount", "0")),
            "reason": r.get("reason", ""),
            "category": r.get("category", "other"),
            "cost_driver": r.get("cost_driver", ""),
            "budget_relevant": _parse_bool(r.get("budget_relevant", "false")),
            "year": int(r.get("year", "0")),
            "created_at": r.get("created_at", ""),
            "created_by": r.get("created_by") or None,
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# Convenience: load everything at once
# ---------------------------------------------------------------------------

def load_all_data() -> dict[str, Any]:
    """Load all CSV files and return a single dict suitable for JSON response."""
    return {
        "facilities": load_facilities(),
        "functional_areas": load_functional_areas(),
        "workAreas": load_work_areas(),
        "costItems": load_cost_items(),
        "changeCosts": load_change_costs(),
    }


# ---------------------------------------------------------------------------
# Typed savers
# ---------------------------------------------------------------------------

def save_facilities(rows: list[dict[str, Any]]) -> None:
    write_csv("facilities.csv", rows, FACILITY_FIELDS)


def save_functional_areas(rows: list[dict[str, Any]]) -> None:
    write_csv("functional_areas.csv", rows, FUNCTIONAL_AREA_FIELDS)


def save_work_areas(rows: list[dict[str, Any]]) -> None:
    write_csv("work_areas.csv", rows, WORK_AREA_FIELDS)


def save_cost_items(rows: list[dict[str, Any]]) -> None:
    write_csv("cost_items.csv", rows, COST_ITEM_FIELDS)


def save_change_costs(rows: list[dict[str, Any]]) -> None:
    write_csv("change_costs.csv", rows, CHANGE_COST_FIELDS)


def save_all_data(data: dict[str, Any]) -> None:
    """Accept the same shape as load_all_data() and write all CSVs."""
    if "facilities" in data:
        save_facilities(data["facilities"])
    if "functional_areas" in data:
        save_functional_areas(data["functional_areas"])
    if "workAreas" in data:
        save_work_areas(data["workAreas"])
    if "costItems" in data:
        save_cost_items(data["costItems"])
    if "changeCosts" in data:
        save_change_costs(data["changeCosts"])


# ---------------------------------------------------------------------------
# Export / Import as ZIP
# ---------------------------------------------------------------------------

CSV_FILES = [
    "facilities.csv",
    "functional_areas.csv",
    "work_areas.csv",
    "cost_items.csv",
    "change_costs.csv",
    "products.csv",
    "phases.csv",
    "cost_bases.csv",
    "cost_drivers.csv",
]


def export_zip() -> bytes:
    """Create an in-memory ZIP containing all CSV files."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in CSV_FILES:
            path = DATA_DIR / name
            if path.exists():
                zf.write(path, arcname=name)
    buf.seek(0)
    return buf.read()


def import_zip(zip_bytes: bytes) -> dict[str, int]:
    """
    Replace data directory contents from a ZIP upload.

    Returns a dict mapping filename -> row count imported.
    """
    counts: dict[str, int] = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        for name in CSV_FILES:
            if name in zf.namelist():
                content = zf.read(name).decode("utf-8")
                # Parse to validate, then write
                reader = csv.DictReader(io.StringIO(content))
                rows = list(reader)
                counts[name] = len(rows)
                # Write to disk
                path = DATA_DIR / name
                path.parent.mkdir(parents=True, exist_ok=True)
                with open(path, "w", newline="", encoding="utf-8") as f:
                    f.write(content)
    return counts
