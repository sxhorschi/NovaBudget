from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.services.excel_import import import_excel_file

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/excel")
async def import_excel(
    file: UploadFile,
    facility_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx). Legacy .xls format is not supported.")

    contents = await file.read()
    result = await import_excel_file(contents, facility_id, session)
    return result
