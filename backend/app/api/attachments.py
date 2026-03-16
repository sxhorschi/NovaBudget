"""Attachment API routes — upload, list, download, delete."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.attachment import Attachment, AttachmentType
from app.schemas.attachment import AttachmentList, AttachmentRead
from app.services.file_storage import (
    FileStorageError,
    delete_file,
    get_file_path,
    save_file,
    validate_file,
)

router = APIRouter(prefix="/api/v1/attachments", tags=["attachments"])


@router.post("/upload", response_model=AttachmentRead, status_code=201)
async def upload_attachment(
    file: UploadFile = File(...),
    cost_item_id: UUID | None = Form(None),
    work_area_id: UUID | None = Form(None),
    department_id: UUID | None = Form(None),
    description: str | None = Form(None),
    attachment_type: AttachmentType = Form(AttachmentType.OTHER),
    session: AsyncSession = Depends(get_session),
) -> Attachment:
    """Upload a file and create an attachment record."""
    # Validate that exactly one parent is set
    parents = [cost_item_id, work_area_id, department_id]
    set_parents = [p for p in parents if p is not None]
    if len(set_parents) != 1:
        raise HTTPException(
            status_code=400,
            detail="Exactly one of cost_item_id, work_area_id, or department_id must be provided.",
        )

    # Read file content
    content = await file.read()
    filename = file.filename or "unnamed"
    content_type = file.content_type or "application/octet-stream"
    file_size = len(content)

    # Validate
    try:
        validate_file(filename, content_type, file_size)
    except FileStorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Save to disk
    storage_path, stored_name = await save_file(filename, content)

    # Create DB record
    attachment = Attachment(
        cost_item_id=cost_item_id,
        work_area_id=work_area_id,
        department_id=department_id,
        filename=stored_name,
        original_filename=filename,
        content_type=content_type,
        file_size=file_size,
        storage_path=storage_path,
        description=description,
        attachment_type=attachment_type,
    )
    session.add(attachment)
    await session.commit()
    await session.refresh(attachment)
    return attachment


@router.get("/", response_model=AttachmentList)
async def list_attachments(
    cost_item_id: UUID | None = None,
    work_area_id: UUID | None = None,
    department_id: UUID | None = None,
    session: AsyncSession = Depends(get_session),
) -> AttachmentList:
    """List attachments filtered by parent entity."""
    stmt = select(Attachment)

    if cost_item_id is not None:
        stmt = stmt.where(Attachment.cost_item_id == cost_item_id)
    if work_area_id is not None:
        stmt = stmt.where(Attachment.work_area_id == work_area_id)
    if department_id is not None:
        stmt = stmt.where(Attachment.department_id == department_id)

    stmt = stmt.order_by(Attachment.created_at.desc())

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar_one()

    result = await session.execute(stmt)
    items = list(result.scalars().all())

    return AttachmentList(items=items, total=total)


@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Download an attachment file."""
    attachment = await session.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = get_file_path(attachment.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(file_path),
        filename=attachment.original_filename,
        media_type=attachment.content_type,
    )


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    attachment_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete an attachment and its file from disk."""
    attachment = await session.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Delete file from disk
    delete_file(attachment.storage_path)

    # Delete DB record
    await session.delete(attachment)
    await session.commit()
