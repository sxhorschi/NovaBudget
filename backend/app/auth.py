"""Authentication and authorization module.

Provides:
- CurrentUser Pydantic model (enriched with Entra ID profile fields)
- get_current_user dependency (dev bypass or token validation + DB lookup)
- UserDep type alias for route signatures
- require_role() dependency factory for RBAC

Token scheme (current):
    Bearer token = base64-encoded JSON {"email": "...", "name": "...", "role": "..."}

TODO: Replace with JWT validation from Microsoft Entra ID (Azure AD) in production.
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic model for the authenticated user
# ---------------------------------------------------------------------------

class CurrentUser(BaseModel):
    id: str | None = None
    email: str
    name: str
    role: str  # "admin", "editor", "viewer"
    job_title: str | None = None
    department: str | None = None
    office_location: str | None = None
    photo_url: str | None = None


# ---------------------------------------------------------------------------
# Default dev user (used when AUTH_DISABLED=true)
# Development mode — returns a default admin user.
# In production, this code path is never reached (AUTH_DISABLED=false).
# ---------------------------------------------------------------------------

_DEV_USER = CurrentUser(
    id="dev-admin",
    email=settings.ADMIN_EMAIL,
    name=settings.ADMIN_NAME,
    role="admin",
)


# ---------------------------------------------------------------------------
# Helper: enrich CurrentUser from database record
# ---------------------------------------------------------------------------

async def _enrich_from_db(
    session: AsyncSession, email: str, fallback: CurrentUser, *, auto_create: bool = False,
) -> CurrentUser:
    """Look up the full User record and return a CurrentUser with all profile fields."""
    from app.models.user import User  # local import to avoid circular dependency

    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if db_user is None:
        if auto_create:
            db_user = User(email=email, name=fallback.name, role=fallback.role)
            session.add(db_user)
            await session.commit()
            await session.refresh(db_user)
        else:
            return fallback

    return CurrentUser(
        id=str(db_user.id),
        email=db_user.email,
        name=db_user.name,
        role=db_user.role,
        job_title=db_user.job_title,
        department=db_user.department,
        office_location=db_user.office_location,
        photo_url=db_user.photo_url,
    )


# ---------------------------------------------------------------------------
# Core dependency: get_current_user
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> CurrentUser:
    """Extract and validate the current user from the request.

    When ``AUTH_DISABLED=true`` (dev mode), returns a default admin user
    without requiring any token.

    When auth is enabled, expects a Bearer token in the Authorization header.
    The token is a base64-encoded JSON payload:
        {"email": "...", "name": "...", "role": "..."}

    In both cases, the full user profile is loaded from the database if a
    matching record exists (enriching with Entra ID fields).
    """
    # Dev mode bypass
    if settings.AUTH_DISABLED:
        return await _enrich_from_db(session, _DEV_USER.email, _DEV_USER, auto_create=True)

    # Extract Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Expect "Bearer <token>"
    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    # Decode base64 token
    try:
        decoded = base64.b64decode(token)
        payload = json.loads(decoded)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: unable to decode",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate required fields
    email = payload.get("email")
    name = payload.get("name")
    role = payload.get("role")

    if not email or not name or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing required fields (email, name, role)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if role not in ("admin", "editor", "viewer"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid role in token: {role}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_user = CurrentUser(
        email=email,
        name=name,
        role=role,
        department=payload.get("department"),
    )

    # Enrich from DB to pick up Entra ID fields
    return await _enrich_from_db(session, email, token_user)


# ---------------------------------------------------------------------------
# Convenience type alias (like SessionDep)
# ---------------------------------------------------------------------------

UserDep = Annotated[CurrentUser, Depends(get_current_user)]


# ---------------------------------------------------------------------------
# RBAC dependency factory
# ---------------------------------------------------------------------------

def require_role(*roles: str):
    """Return a dependency that checks the current user has one of the given roles.

    Usage::

        @router.post("/", dependencies=[Depends(require_role("admin", "editor"))])
        async def create_item(...):
            ...
    """
    async def _check_role(user: UserDep) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {' or '.join(roles)}",
            )
        return user

    return _check_role
