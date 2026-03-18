"""Permissions API — facility-level RBAC and Entra group mappings."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.db import get_session
from app.models.group_mapping import EntraGroupMapping
from app.models.permission import FacilityPermission
from app.schemas.permission import (
    GroupMappingCreate,
    GroupMappingRead,
    PermissionCreate,
    PermissionRead,
)

router = APIRouter(prefix="/api/v1/permissions", tags=["permissions"])

VALID_ROLES = ("admin", "editor", "viewer")


# ── GET / — list all permissions (admin only) ────────────────────────────

@router.get(
    "/",
    response_model=list[PermissionRead],
    dependencies=[Depends(require_role("admin"))],
)
async def list_permissions(
    session: AsyncSession = Depends(get_session),
):
    """Return all facility permissions. Restricted to admins."""
    stmt = select(FacilityPermission).order_by(FacilityPermission.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


# ── GET /user/{user_id} — permissions for a specific user ────────────────

@router.get(
    "/user/{user_id}",
    response_model=list[PermissionRead],
    dependencies=[Depends(require_role("admin"))],
)
async def get_user_permissions(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Return all facility permissions for a specific user."""
    stmt = (
        select(FacilityPermission)
        .where(FacilityPermission.user_id == user_id)
        .order_by(FacilityPermission.created_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


# ── POST / — assign a permission (admin only) ────────────────────────────

@router.post(
    "/",
    response_model=PermissionRead,
    status_code=201,
    dependencies=[Depends(require_role("admin"))],
)
async def create_permission(
    data: PermissionCreate,
    session: AsyncSession = Depends(get_session),
):
    """Assign a facility permission to a user. Admin only.

    If a permission for the same user+facility already exists, returns 409 Conflict.
    """
    if data.role not in VALID_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role: {data.role}. Must be one of: {', '.join(VALID_ROLES)}.",
        )

    # Check for existing permission
    stmt = select(FacilityPermission).where(
        FacilityPermission.user_id == data.user_id,
        FacilityPermission.facility_id == data.facility_id
        if data.facility_id is not None
        else FacilityPermission.facility_id.is_(None),
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A permission for this user and facility already exists.",
        )

    perm = FacilityPermission(
        user_id=data.user_id,
        facility_id=data.facility_id,
        role=data.role,
    )
    session.add(perm)
    await session.commit()
    await session.refresh(perm)
    return perm


# ── DELETE /{id} — revoke a permission (admin only) ──────────────────────

@router.delete(
    "/{permission_id}",
    status_code=204,
    dependencies=[Depends(require_role("admin"))],
)
async def delete_permission(
    permission_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Revoke a facility permission. Admin only."""
    perm = await session.get(FacilityPermission, permission_id)
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    await session.delete(perm)
    await session.commit()


# ═══════════════════════════════════════════════════════════════════════════
# Entra Group Mappings
# ═══════════════════════════════════════════════════════════════════════════


# ── GET /group-mappings — list all mappings ──────────────────────────────

@router.get(
    "/group-mappings",
    response_model=list[GroupMappingRead],
    dependencies=[Depends(require_role("admin"))],
)
async def list_group_mappings(
    session: AsyncSession = Depends(get_session),
):
    """Return all Entra group-to-role mappings. Admin only."""
    stmt = select(EntraGroupMapping).order_by(EntraGroupMapping.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()


# ── POST /group-mappings — create a mapping ──────────────────────────────

@router.post(
    "/group-mappings",
    response_model=GroupMappingRead,
    status_code=201,
    dependencies=[Depends(require_role("admin"))],
)
async def create_group_mapping(
    data: GroupMappingCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create an Entra group-to-role mapping. Admin only."""
    if data.app_role not in VALID_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role: {data.app_role}. Must be one of: {', '.join(VALID_ROLES)}.",
        )

    # Check for duplicate group name
    stmt = select(EntraGroupMapping).where(
        EntraGroupMapping.entra_group_name == data.entra_group_name,
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A mapping for Entra group '{data.entra_group_name}' already exists.",
        )

    mapping = EntraGroupMapping(
        entra_group_name=data.entra_group_name,
        app_role=data.app_role,
        facility_id=data.facility_id,
    )
    session.add(mapping)
    await session.commit()
    await session.refresh(mapping)
    return mapping


# ── DELETE /group-mappings/{id} — delete a mapping ───────────────────────

@router.delete(
    "/group-mappings/{mapping_id}",
    status_code=204,
    dependencies=[Depends(require_role("admin"))],
)
async def delete_group_mapping(
    mapping_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Delete an Entra group-to-role mapping. Admin only."""
    mapping = await session.get(EntraGroupMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Group mapping not found")
    await session.delete(mapping)
    await session.commit()
