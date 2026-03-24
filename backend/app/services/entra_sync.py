"""Microsoft Entra ID (Azure AD) profile sync service.

Extracts user profile data from the ID token claims and updates
the local User record. No Graph API calls are made — we only have
ID tokens from MSAL, not access tokens with Graph scopes.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)


async def sync_user_from_entra(
    session: AsyncSession,
    id_token_claims: dict | None,
    user_email: str,
) -> User:
    """Update the local User record with profile fields from ID token claims.

    ID token claims typically include:
    - ``name`` — display name
    - ``preferred_username`` — email / UPN
    - ``oid`` — Azure AD object ID
    - ``jobTitle`` — job title (if configured in token optional claims)
    - ``department`` — department (if configured in token optional claims)

    The user's role is NEVER overwritten — roles are managed manually in the app.
    """
    stmt = select(User).where(User.email == user_email)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if db_user is None:
        # Create a minimal record with pending role — will be enriched below
        db_user = User(email=user_email, name=user_email.split("@")[0], role="pending")
        session.add(db_user)

    if id_token_claims:
        # Extract profile fields from ID token claims
        token_name = id_token_claims.get("name")
        if token_name:
            db_user.name = token_name

        # jobTitle and department are available as optional claims
        # See: https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference
        job_title = id_token_claims.get("jobTitle")
        if job_title is not None:
            db_user.job_title = job_title

        department = id_token_claims.get("department")
        if department is not None:
            db_user.department = department

        # Store Azure AD object ID for future reference
        entra_oid = id_token_claims.get("oid")
        if entra_oid:
            db_user.entra_id = entra_oid

    db_user.last_synced_at = datetime.utcnow()

    await session.commit()
    await session.refresh(db_user)

    logger.info("Synced user profile from ID token: %s (last_synced_at=%s)", db_user.email, db_user.last_synced_at)
    return db_user
