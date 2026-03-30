"""Authentication and authorization module.

Token scheme:
    AUTH_DISABLED=true:  No token required, returns dev admin user.
    AUTH_DISABLED=false: Bearer token = Entra ID **ID token** (JWT validated
                        against Microsoft's public JWKS, audience = client_id).
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWKS cache with 24h TTL
# ---------------------------------------------------------------------------

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
_JWKS_TTL = 86400  # 24 hours


async def _get_jwks(*, force_refresh: bool = False) -> dict:
    global _jwks_cache, _jwks_cache_time
    if not force_refresh and _jwks_cache and (time.time() - _jwks_cache_time) < _JWKS_TTL:
        return _jwks_cache

    tenant = settings.AZURE_TENANT_ID or "common"
    url = f"https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys"
    async with httpx.AsyncClient() as c:
        resp = await c.get(url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_time = time.time()
        return _jwks_cache


def _find_key(jwks: dict, kid: str) -> dict | None:
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


# ---------------------------------------------------------------------------
# Pydantic model
# ---------------------------------------------------------------------------

class CurrentUser(BaseModel):
    id: str | None = None
    email: str
    name: str
    role: str
    job_title: str | None = None
    department: str | None = None
    office_location: str | None = None
    photo_url: str | None = None


_DEV_USER = CurrentUser(
    id="dev-admin",
    email=settings.ADMIN_EMAIL,
    name=settings.ADMIN_NAME,
    role="admin",
)


# ---------------------------------------------------------------------------
# DB enrichment
# ---------------------------------------------------------------------------

async def _enrich_from_db(
    session: AsyncSession,
    email: str,
    fallback: CurrentUser,
    *,
    auto_create: bool = False,
    token_claims: dict | None = None,
) -> CurrentUser:
    from app.models.user import User

    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if db_user is None:
        if auto_create:
            db_user = User(email=email, name=fallback.name, role=fallback.role)
            session.add(db_user)
            await session.flush()
        else:
            return fallback

    # Sync name from token claims if it changed
    if token_claims:
        token_name = token_claims.get("name")
        if token_name and token_name != db_user.name:
            db_user.name = token_name

    # Update last_login timestamp
    db_user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)

    await session.commit()
    await session.refresh(db_user)

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
# Core dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> CurrentUser:
    # Dev mode bypass
    if settings.AUTH_DISABLED:
        return await _enrich_from_db(session, _DEV_USER.email, _DEV_USER, auto_create=True)

    # Extract Bearer token
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    # Validate Entra ID ID token (JWT signed with RS256)
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise ValueError("No kid in token header")

        # Fetch JWKS, retry with forced refresh if key not found
        jwks = await _get_jwks()
        key_data = _find_key(jwks, kid)
        if not key_data:
            jwks = await _get_jwks(force_refresh=True)
            key_data = _find_key(jwks, kid)
            if not key_data:
                raise ValueError(f"Signing key {kid} not found in JWKS")

        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)

        client_id = settings.AZURE_CLIENT_ID
        tenant_id = settings.AZURE_TENANT_ID
        issuer = f"https://login.microsoftonline.com/{tenant_id}/v2.0"

        # ID tokens have audience = client_id
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=issuer,
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except httpx.HTTPError as e:
        logger.error("Failed to fetch JWKS: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to validate token (key service unavailable)",
        )
    except (jwt.InvalidTokenError, ValueError) as e:
        logger.warning("JWT validation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("preferred_username") or payload.get("email") or payload.get("upn", "")
    name = payload.get("name", email)

    # Admin email gets admin role, everyone else starts as pending
    is_admin = email.lower() == settings.ADMIN_EMAIL.lower()
    default_role = "admin" if is_admin else "pending"

    token_user = CurrentUser(email=email, name=name, role=default_role)
    return await _enrich_from_db(session, email, token_user, auto_create=True, token_claims=payload)


# ---------------------------------------------------------------------------
# Type alias & RBAC
# ---------------------------------------------------------------------------

UserDep = Annotated[CurrentUser, Depends(get_current_user)]


def require_role(*roles: str):
    async def _check_role(user: UserDep) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {' or '.join(roles)}",
            )
        return user
    return _check_role


async def require_facility_access(
    facility_id: UUID,
    user: CurrentUser,
    session: AsyncSession,
) -> CurrentUser:
    """Verify the user has access to the given facility via FacilityPermission."""
    if user.role == "admin":
        return user  # Global admins bypass facility-level checks
    from app.models.permission import FacilityPermission
    stmt = select(FacilityPermission).where(
        FacilityPermission.user_id == UUID(user.id),
        or_(
            FacilityPermission.facility_id == facility_id,
            FacilityPermission.facility_id.is_(None),
        ),
    )
    result = await session.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this facility",
        )
    return user
