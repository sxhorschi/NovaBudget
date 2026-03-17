from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep
from app.db import get_session
from app.rate_limit import limiter
from app.services.excel_import import import_excel_file

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/excel")
@limiter.limit("5/minute")
async def import_excel(
    request: Request,
    file: UploadFile,
    facility_id: UUID,
    user: UserDep,
    dry_run: bool = Query(False, description="Validate only — do not commit changes to the database"),
    session: AsyncSession = Depends(get_session),
):
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx). Legacy .xls format is not supported.")

    contents = await file.read()
    result = await import_excel_file(contents, facility_id, session, dry_run=dry_run)
    return result
