from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_facility_access, require_role
from app.db import get_session
from app.rate_limit import limiter
from app.services.excel_import import import_excel_file

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/excel", dependencies=[Depends(require_role("admin", "editor"))])
@limiter.limit("5/minute")
async def import_excel(
    request: Request,
    file: UploadFile,
    facility_id: UUID,
    user: UserDep,
    dry_run: bool = Query(False, description="Validate only — do not commit changes to the database"),
    year: int | None = Query(None, ge=2000, le=2100, description="Budget year for import"),
    session: AsyncSession = Depends(get_session),
):
    await require_facility_access(facility_id, user, session)

    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="File must be an Excel file (.xlsx). Legacy .xls format is not supported.")

    MAX_IMPORT_SIZE = 10 * 1024 * 1024  # 10 MB
    contents = await file.read()
    if len(contents) > MAX_IMPORT_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(contents) / (1024 * 1024):.1f} MB). Maximum allowed is 10 MB.",
        )
    result = await import_excel_file(contents, facility_id, session, dry_run=dry_run, year=year)
    return result
