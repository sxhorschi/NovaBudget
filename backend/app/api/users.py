"""User management API — profile, listing, admin CRUD, Entra sync."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.config import settings
from app.db import get_session
from app.models.user import User
from app.schemas.user import UserBrief, UserCreate, UserRead, UserUpdate
from app.services.email_service import send_invite_email
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
)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    current_user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Update a user's role, department, or active status. Admin only.

    Admins cannot remove their own admin role or deactivate themselves
    to prevent accidental lockout.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

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

    # Prevent admins from locking themselves out
    is_self = str(db_user.id) == current_user.id or db_user.email == current_user.email
    if is_self:
        if "role" in update_data and update_data["role"] != "admin":
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own admin role. Ask another admin to do it.",
            )
        if "is_active" in update_data and not update_data["is_active"]:
            raise HTTPException(
                status_code=400,
                detail="You cannot deactivate your own account. Ask another admin to do it.",
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
)
async def create_user(
    data: UserCreate,
    current_user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Invite / create a new user. Admin only.

    If a user with the given email already exists (even if deactivated),
    returns 409 Conflict.  Records who invited the user and when.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

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
        name=data.name or data.email.split("@")[0],
        role=data.role,
        department=data.department,
        job_title=data.job_title,
        invited_by=UUID(current_user.id) if current_user.id else None,
        invited_at=datetime.utcnow(),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # Send invite email (best-effort, never blocks user creation)
    cors = settings.CORS_ORIGINS
    app_url = cors[-1] if cors else "https://localhost"
    if settings.URL_PREFIX:
        app_url = f"{app_url}{settings.URL_PREFIX}"
    await send_invite_email(
        to_email=data.email,
        to_name=user.name,
        role=data.role,
        invited_by_name=current_user.name or current_user.email,
        app_url=app_url,
    )

    return user


# ── DELETE /{id} — deactivate a user (admin only, soft delete) ───────

@router.delete(
    "/{user_id}",
    response_model=UserRead,
    dependencies=[Depends(require_role("admin"))],
)
async def deactivate_user(
    user_id: UUID,
    current_user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Soft-delete a user by setting is_active=false. Admin only."""
    db_user = await session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    is_self = str(db_user.id) == current_user.id or db_user.email == current_user.email
    if is_self:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account. Ask another admin to do it.",
        )

    db_user.is_active = False
    await session.commit()
    await session.refresh(db_user)
    return db_user


# ── DELETE /{id}/permanent — hard-delete a user (admin only) ─────────

@router.delete(
    "/{user_id}/permanent",
    status_code=204,
)
async def hard_delete_user(
    user_id: UUID,
    current_user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Permanently remove a user from the database. Admin only.

    Cannot delete yourself.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    db_user = await session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    is_self = str(db_user.id) == current_user.id or db_user.email == current_user.email
    if is_self:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account. Ask another admin to do it.",
        )

    await session.delete(db_user)
    await session.commit()
    return None


# ── POST /sync-from-entra — sync current user's profile from ID token claims

@router.post("/sync-from-entra", response_model=UserRead)
async def sync_from_entra(
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    """Sync the current user's profile from their ID token claims.

    This updates name, job_title, and department from the cached token data.
    Roles are NOT synced — they are managed manually in the app.
    """
    db_user = await sync_user_from_entra(session, id_token_claims=None, user_email=user.email)
    return db_user
