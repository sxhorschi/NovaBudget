"""
Data API — CSV-backed persistent data store.

GET  /api/v1/data          — returns ALL data as JSON
PUT  /api/v1/data          — accepts full dataset, writes to CSVs
GET  /api/v1/data/export   — download all CSVs as a ZIP
POST /api/v1/data/import   — upload ZIP of CSVs to replace data
"""

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import Response

from app.services.data_store import (
    load_all_data,
    save_all_data,
    export_zip,
    import_zip,
)

router = APIRouter(prefix="/api/v1/data", tags=["data"])


@router.get("")
async def get_all_data():
    """Return all business data from the CSV store."""
    return load_all_data()


@router.put("")
async def put_all_data(payload: dict):
    """Overwrite all CSV files with the provided data."""
    save_all_data(payload)
    return {"status": "ok", "message": "All data saved to CSV files."}


@router.get("/export")
async def export_data():
    """Download all CSV data as a ZIP archive."""
    zip_bytes = export_zip()
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=budget-data-export.zip"
        },
    )


@router.post("/import")
async def import_data(file: UploadFile = File(...)):
    """Upload a ZIP archive of CSV files to replace all data."""
    contents = await file.read()
    counts = import_zip(contents)
    return {
        "status": "ok",
        "message": "Data imported from ZIP.",
        "imported": counts,
    }
