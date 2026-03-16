"""Tests for FastAPI API endpoints — health, CRUD, filtering, export."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

import pytest
import pytest_asyncio
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio(loop_scope="function")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


async def test_health_check(client: AsyncClient):
    """GET /health should return 200 with status ok."""
    resp = await client.get("/health")

    assert resp.status_code == 200, (
        f"Health check should return 200, got {resp.status_code}"
    )
    body = resp.json()
    assert body["status"] == "ok", (
        f"Health check should return status 'ok', got {body}"
    )


# ---------------------------------------------------------------------------
# Facility CRUD
# ---------------------------------------------------------------------------


async def test_create_facility(client: AsyncClient):
    """POST /api/v1/facilities should create a new facility and return 201."""
    payload = {
        "name": "Test Plant",
        "location": "Berlin, DE",
        "description": "Integration test facility",
    }
    resp = await client.post("/api/v1/facilities/", json=payload)

    assert resp.status_code == 201, (
        f"Create facility should return 201, got {resp.status_code}: {resp.text}"
    )
    body = resp.json()
    assert body["name"] == "Test Plant", (
        f"Facility name should be 'Test Plant', got {body['name']}"
    )
    assert "id" in body, "Response should include the facility ID"
    # Verify UUID is valid
    UUID(body["id"])


async def test_list_facilities(client: AsyncClient):
    """GET /api/v1/facilities should return a list."""
    # Create one first
    await client.post("/api/v1/facilities/", json={"name": "Plant A"})

    resp = await client.get("/api/v1/facilities/")

    assert resp.status_code == 200, (
        f"List facilities should return 200, got {resp.status_code}"
    )
    body = resp.json()
    assert isinstance(body, list), "Response should be a list"
    assert len(body) >= 1, "Should have at least one facility"


async def test_get_facility_not_found(client: AsyncClient):
    """GET /api/v1/facilities/{id} with unknown ID should return 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"/api/v1/facilities/{fake_id}")

    assert resp.status_code == 404, (
        f"Non-existent facility should return 404, got {resp.status_code}"
    )


# ---------------------------------------------------------------------------
# Cost Item CRUD
# ---------------------------------------------------------------------------


async def _create_facility_and_work_area(client: AsyncClient) -> tuple[str, str]:
    """Helper: create a facility + department + work area, return (facility_id, work_area_id)."""
    # Create facility
    fac_resp = await client.post("/api/v1/facilities/", json={"name": "Test Facility"})
    fac_id = fac_resp.json()["id"]

    # Create department
    dept_resp = await client.post(
        "/api/v1/departments/",
        json={"facility_id": fac_id, "name": "Test Dept", "budget_total": "100000.00"},
    )
    dept_id = dept_resp.json()["id"]

    # Create work area
    wa_resp = await client.post(
        "/api/v1/work-areas/",
        json={"department_id": dept_id, "name": "Test WA"},
    )
    wa_id = wa_resp.json()["id"]

    return fac_id, wa_id


async def test_create_cost_item(client: AsyncClient):
    """POST /api/v1/cost-items should create a cost item and return 201."""
    _, wa_id = await _create_facility_and_work_area(client)

    payload = {
        "work_area_id": wa_id,
        "description": "Test equipment purchase",
        "original_amount": "50000.00",
        "current_amount": "50000.00",
        "cost_basis": "COST_ESTIMATION",
        "cost_driver": "INITIAL_SETUP",
        "approval_status": "OPEN",
        "project_phase": "PHASE_1",
        "product": "ATLAS",
    }
    resp = await client.post("/api/v1/cost-items/", json=payload)

    assert resp.status_code == 201, (
        f"Create cost item should return 201, got {resp.status_code}: {resp.text}"
    )
    body = resp.json()
    assert body["description"] == "Test equipment purchase"
    assert body["approval_status"] == "OPEN"
    assert Decimal(body["current_amount"]) == Decimal("50000.00")


async def test_filter_by_status(client: AsyncClient):
    """GET /api/v1/cost-items?approval_status=OPEN should only return OPEN items."""
    _, wa_id = await _create_facility_and_work_area(client)

    # Create OPEN item
    await client.post("/api/v1/cost-items/", json={
        "work_area_id": wa_id,
        "description": "Open item",
        "original_amount": "10000",
        "current_amount": "10000",
        "cost_basis": "COST_ESTIMATION",
        "cost_driver": "INITIAL_SETUP",
        "approval_status": "OPEN",
        "project_phase": "PHASE_1",
        "product": "ATLAS",
    })

    # Create APPROVED item
    await client.post("/api/v1/cost-items/", json={
        "work_area_id": wa_id,
        "description": "Approved item",
        "original_amount": "20000",
        "current_amount": "20000",
        "cost_basis": "INITIAL_SUPPLIER_OFFER",
        "cost_driver": "PRODUCT",
        "approval_status": "APPROVED",
        "project_phase": "PHASE_1",
        "product": "ORION",
    })

    # Filter by OPEN
    resp = await client.get("/api/v1/cost-items/", params={"approval_status": "OPEN"})

    assert resp.status_code == 200
    items = resp.json()
    assert all(i["approval_status"] == "OPEN" for i in items), (
        f"All items should be OPEN, got statuses: {[i['approval_status'] for i in items]}"
    )
    assert any(i["description"] == "Open item" for i in items), (
        "The OPEN item should be in the filtered results"
    )


async def test_update_cost_item(client: AsyncClient):
    """PUT /api/v1/cost-items/{id} should update fields."""
    _, wa_id = await _create_facility_and_work_area(client)

    create_resp = await client.post("/api/v1/cost-items/", json={
        "work_area_id": wa_id,
        "description": "Original description",
        "original_amount": "10000",
        "current_amount": "10000",
        "cost_basis": "COST_ESTIMATION",
        "cost_driver": "INITIAL_SETUP",
        "approval_status": "OPEN",
        "project_phase": "PHASE_1",
        "product": "ATLAS",
    })
    item_id = create_resp.json()["id"]

    update_resp = await client.put(
        f"/api/v1/cost-items/{item_id}",
        json={"description": "Updated description", "current_amount": "15000"},
    )

    assert update_resp.status_code == 200, (
        f"Update should return 200, got {update_resp.status_code}: {update_resp.text}"
    )
    body = update_resp.json()
    assert body["description"] == "Updated description"
    assert Decimal(body["current_amount"]) == Decimal("15000")


# ---------------------------------------------------------------------------
# Export endpoint
# ---------------------------------------------------------------------------


async def test_export_standard_returns_xlsx(client: AsyncClient):
    """GET /api/v1/export/standard should return an .xlsx file."""
    fac_id, wa_id = await _create_facility_and_work_area(client)

    # Create at least one item so export has data
    await client.post("/api/v1/cost-items/", json={
        "work_area_id": wa_id,
        "description": "Export test item",
        "original_amount": "25000",
        "current_amount": "25000",
        "cost_basis": "COST_ESTIMATION",
        "cost_driver": "INITIAL_SETUP",
        "approval_status": "OPEN",
        "project_phase": "PHASE_1",
        "product": "ATLAS",
    })

    resp = await client.get("/api/v1/export/standard", params={"facility_id": fac_id})

    assert resp.status_code == 200, (
        f"Standard export should return 200, got {resp.status_code}: {resp.text}"
    )

    content_type = resp.headers.get("content-type", "")
    assert "spreadsheetml" in content_type or "octet-stream" in content_type, (
        f"Content-Type should indicate xlsx, got '{content_type}'"
    )

    # XLSX files start with the PK zip signature (bytes 50 4B)
    assert resp.content[:2] == b"PK", (
        "Response body should be a valid ZIP/XLSX file (PK signature)"
    )


async def test_export_standard_invalid_facility_returns_empty_workbook(client: AsyncClient):
    """Export with a non-existent facility ID should still return a valid (empty) xlsx."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get("/api/v1/export/standard", params={"facility_id": fake_id})

    # The endpoint doesn't 404 for unknown facilities — it returns an empty workbook
    assert resp.status_code == 200, (
        f"Export with unknown facility should return 200 (empty workbook), got {resp.status_code}"
    )
