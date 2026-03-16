"""API router for audit log queries."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogRead

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


@router.get("/", response_model=list[AuditLogRead])
async def list_audit_logs(
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """Query audit logs with optional filters.

    - ``entity_type`` + ``entity_id`` — full history for one entity
    - ``entity_type`` only — last N changes across all entities of that type
    - no filters — last N changes across everything
    """
    stmt = select(AuditLog)

    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()
