"""Tests for app.services.excel_import — enum parsing, row detection, legacy mapping."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.models.enums import ApprovalStatus, CostBasis, CostDriver, Product, ProjectPhase
from app.services.excel_import import (
    COL_AMOUNT,
    COL_DESCRIPTION,
    COL_PHASE,
    COL_WORK_AREA,
    _is_data_row,
    _is_subtotal_row,
    _parse_date,
    _parse_enum,
    _safe_decimal,
    _safe_str,
)


# ---------------------------------------------------------------------------
# _parse_enum tests
# ---------------------------------------------------------------------------


def test_parse_enum_maps_exact_value():
    """Exact enum value string should map correctly."""
    result = _parse_enum(ApprovalStatus, "APPROVED")
    assert result == ApprovalStatus.APPROVED, (
        f"Expected APPROVED, got {result}"
    )


def test_parse_enum_case_insensitive():
    """Enum parsing should be case-insensitive."""
    result = _parse_enum(ApprovalStatus, "approved")
    assert result == ApprovalStatus.APPROVED, (
        f"'approved' (lowercase) should map to APPROVED, got {result}"
    )


def test_parse_enum_with_spaces():
    """Spaces in enum values should be replaced with underscores."""
    result = _parse_enum(ApprovalStatus, "Submitted For Approval")
    assert result == ApprovalStatus.SUBMITTED_FOR_APPROVAL, (
        f"'Submitted For Approval' should map to SUBMITTED_FOR_APPROVAL, got {result}"
    )


def test_parse_enum_returns_default_for_unknown():
    """Unknown value should return the provided default."""
    result = _parse_enum(ApprovalStatus, "NONEXISTENT", default=ApprovalStatus.OPEN)
    assert result == ApprovalStatus.OPEN, (
        f"Unknown value should return default OPEN, got {result}"
    )


def test_parse_enum_returns_default_for_none():
    """None value should return the provided default."""
    result = _parse_enum(CostBasis, None, default=CostBasis.COST_ESTIMATION)
    assert result == CostBasis.COST_ESTIMATION, (
        f"None should return default, got {result}"
    )


# ---------------------------------------------------------------------------
# Legacy product mapping
# ---------------------------------------------------------------------------


def test_legacy_product_bryan_maps_to_atlas():
    """Legacy product name 'Bryan' should map to ATLAS."""
    result = _parse_enum(Product, "Bryan")
    assert result == Product.ATLAS, (
        f"Legacy name 'Bryan' should map to ATLAS, got {result}"
    )


def test_legacy_product_guenther_maps_to_orion():
    """Legacy product name 'Guenther' should map to ORION."""
    result = _parse_enum(Product, "Guenther")
    assert result == Product.ORION, (
        f"Legacy name 'Guenther' should map to ORION, got {result}"
    )


def test_legacy_product_gin_tonic_maps_to_vega():
    """Legacy product name 'Gin-Tonic' should map to VEGA."""
    result = _parse_enum(Product, "Gin-Tonic")
    assert result == Product.VEGA, (
        f"Legacy name 'Gin-Tonic' should map to VEGA, got {result}"
    )


def test_legacy_product_gin_tonic_underscore_maps_to_vega():
    """Legacy product name 'Gin_Tonic' (underscore variant) should map to VEGA."""
    result = _parse_enum(Product, "Gin_Tonic")
    assert result == Product.VEGA, (
        f"Legacy name 'Gin_Tonic' should map to VEGA, got {result}"
    )


def test_current_product_names_still_work():
    """Current product names (ATLAS, ORION, VEGA) should still parse correctly."""
    assert _parse_enum(Product, "ATLAS") == Product.ATLAS
    assert _parse_enum(Product, "ORION") == Product.ORION
    assert _parse_enum(Product, "VEGA") == Product.VEGA
    assert _parse_enum(Product, "OVERALL") == Product.OVERALL


# ---------------------------------------------------------------------------
# Row detection helpers
# ---------------------------------------------------------------------------


def _mock_worksheet(cell_values: dict[tuple[int, int], object]) -> MagicMock:
    """Create a mock worksheet where cell(row, column).value returns the mapped values."""
    ws = MagicMock()

    def _cell(row, column):
        mock_cell = MagicMock()
        mock_cell.value = cell_values.get((row, column))
        return mock_cell

    ws.cell = _cell
    return ws


def test_subtotal_row_detection():
    """A subtotal row has col B (work area) and col F (amount) filled, but not description or phase."""
    ws = _mock_worksheet({
        (6, COL_WORK_AREA): "Welding Station",
        (6, COL_AMOUNT): 150000,
        (6, COL_DESCRIPTION): None,
        (6, COL_PHASE): None,
    })

    assert _is_subtotal_row(ws, 6) is True, (
        "Row with only work_area + amount should be detected as subtotal"
    )


def test_subtotal_row_rejected_when_description_present():
    """A row with description filled is NOT a subtotal row."""
    ws = _mock_worksheet({
        (6, COL_WORK_AREA): "Welding Station",
        (6, COL_AMOUNT): 150000,
        (6, COL_DESCRIPTION): "Some description",
        (6, COL_PHASE): None,
    })

    assert _is_subtotal_row(ws, 6) is False, (
        "Row with description should not be a subtotal row"
    )


def test_data_row_detection():
    """A data row has both description and amount filled."""
    ws = _mock_worksheet({
        (7, COL_DESCRIPTION): "Laser Cutter XYZ",
        (7, COL_AMOUNT): 75000,
    })

    assert _is_data_row(ws, 7) is True, (
        "Row with description + amount should be detected as data row"
    )


def test_data_row_rejected_when_no_amount():
    """A row without amount is NOT a data row."""
    ws = _mock_worksheet({
        (7, COL_DESCRIPTION): "Laser Cutter XYZ",
        (7, COL_AMOUNT): None,
    })

    assert _is_data_row(ws, 7) is False, (
        "Row without amount should not be a data row"
    )


def test_data_row_rejected_when_no_description():
    """A row without description is NOT a data row."""
    ws = _mock_worksheet({
        (7, COL_DESCRIPTION): None,
        (7, COL_AMOUNT): 75000,
    })

    assert _is_data_row(ws, 7) is False, (
        "Row without description should not be a data row"
    )


# ---------------------------------------------------------------------------
# _safe_decimal tests
# ---------------------------------------------------------------------------


def test_safe_decimal_valid_number():
    """Valid numeric strings should parse to Decimal."""
    assert _safe_decimal("12345.67") == Decimal("12345.67")


def test_safe_decimal_none_returns_zero():
    """None should return Decimal(0)."""
    assert _safe_decimal(None) == Decimal(0)


def test_safe_decimal_invalid_returns_zero():
    """Non-numeric strings should return Decimal(0)."""
    assert _safe_decimal("not-a-number") == Decimal(0)


def test_safe_decimal_integer():
    """Integer values should parse correctly."""
    assert _safe_decimal(50000) == Decimal("50000")


# ---------------------------------------------------------------------------
# _safe_str tests
# ---------------------------------------------------------------------------


def test_safe_str_strips_whitespace():
    """Strings with whitespace should be stripped."""
    assert _safe_str("  hello  ") == "hello"


def test_safe_str_none_returns_none():
    """None should return None."""
    assert _safe_str(None) is None


def test_safe_str_empty_returns_none():
    """Empty or whitespace-only strings should return None."""
    assert _safe_str("   ") is None


# ---------------------------------------------------------------------------
# _parse_date tests
# ---------------------------------------------------------------------------


def test_parse_date_from_datetime():
    """datetime objects should be converted to date."""
    dt = datetime(2026, 6, 15, 10, 30)
    assert _parse_date(dt) == date(2026, 6, 15)


def test_parse_date_from_date():
    """date objects should pass through."""
    d = date(2026, 6, 15)
    assert _parse_date(d) == d


def test_parse_date_from_string():
    """ISO date strings (YYYY-MM-DD) should parse correctly."""
    assert _parse_date("2026-06-15") == date(2026, 6, 15)


def test_parse_date_none_returns_none():
    """None should return None."""
    assert _parse_date(None) is None


def test_parse_date_invalid_returns_none():
    """Invalid date strings should return None."""
    assert _parse_date("not-a-date") is None
