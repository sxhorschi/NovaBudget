"""User management API — profile, listing, admin CRUD, Entra sync."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.models.user import User
from app.schemas.user import UserBrief, UserCreate, UserRead, UserUpdate
from app.services.entra_sync import sync_user_from_entra

router = APIRouter(prefix="/api/v1/users", tags=["users"])


# ── GET /me — current user's full profile ─────────────────────────────

@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Return the full profile of the currently authenticated user."""
    stmt = select(User).where(User.email == user.email)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User record not found")
    return db_user


# ── GET / — list all users (admin only) ───────────────────────────────

@router.get(
    "/",
    response_model=list[UserRead],
    dependencies=[Depends(require_role("admin"))],
)
async def list_users(
    session: AsyncSession = Depends(get_session),
):
    """Return all users. Restricted to admins."""
    stmt = select(User).order_by(User.name)
    result = await session.execute(stmt)
    return result.scalars().all()


# ── GET /brief — lightweight list for dropdowns (any authenticated user)

@router.get("/brief", response_model=list[UserBrief])
async def list_users_brief(
    _user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Return a lightweight list of active users (for requester pickers, etc.)."""
    stmt = select(User).where(User.is_active.is_(True)).order_by(User.name)
    result = await session.execute(stmt)
    return result.scalars().all()


# ── GET /{id} — single user by ID ────────────────────────────────────

@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: UUID,
    _user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Return a single user by ID."""
    db_user = await session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# ── PUT /{id} — admin update role/department/active ───────────────────

@router.put(
    "/{user_id}",
    response_model=UserRead,
    dependencies=[Depends(require_role("admin"))],
)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update a user's role, department, or active status. Admin only."""
    db_user = await session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return db_user

    if "role" in update_data and update_data["role"] not in ("admin", "editor", "viewer"):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role: {update_data['role']}. Must be admin, editor, or viewer.",
        )

    for key, value in update_data.items():
        setattr(db_user, key, value)

    await session.commit()
    await session.refresh(db_user)
    return db_user


# ── POST / — create a new user (admin only) ─────────────────────────

@router.post(
    "/",
    response_model=UserRead,
    status_code=201,
    dependencies=[Depends(require_role("admin"))],
)
async def create_user(
    data: UserCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new user. Admin only.

    If a user with the given email already exists (even if deactivated),
    returns 409 Conflict.
    """
    if data.role not in ("admin", "editor", "viewer"):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid role: {data.role}. Must be admin, editor, or viewer.",
        )

    # Check for existing user with same email
    stmt = select(User).where(User.email == data.email)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A user with email {data.email} already exists.",
        )

    user = User(
        email=data.email,
        name=data.name,
        role=data.role,
        department=data.department,
        job_title=data.job_title,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


# ── DELETE /{id} — deactivate a user (admin only, soft delete) ───────

@router.delete(
    "/{user_id}",
    response_model=UserRead,
    dependencies=[Depends(require_role("admin"))],
)
async def deactivate_user(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Soft-delete a user by setting is_active=false. Admin only."""
    db_user = await session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.is_active = False
    await session.commit()
    await session.refresh(db_user)
    return db_user


# ── POST /sync-from-entra — sync current user's profile from Graph API

@router.post("/sync-from-entra", response_model=UserRead)
async def sync_from_entra(
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Fetch the current user's profile from Microsoft Entra ID (Graph API)
    and update the local record.

    Requires a valid access token that has Graph API scopes.
    """
    db_user = await sync_user_from_entra(session, access_token=None, user_email=user.email)
    return db_user
