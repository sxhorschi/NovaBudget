"""Microsoft Entra ID (Azure AD) profile sync service.

Uses the Microsoft Graph API to fetch rich user profile data and update
the local User record.

TODO: Wire up actual HTTP calls once the app has Azure AD OAuth configured.
      For now, the structure is in place with placeholder logic.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"

# ---------------------------------------------------------------------------
# Role mapping from Entra groups
# ---------------------------------------------------------------------------

# TODO: Read from entra_group_mappings table instead of hardcoded values
ROLE_GROUP_MAP: dict[str, list[str]] = {
    "admin": ["CAPEX-Admins", "IT-Administrators"],
    "editor": ["CAPEX-Editors", "Project-Managers", "Engineering-Leads"],
}


async def map_entra_groups_to_role(groups: list[str]) -> str:
    """Map Entra ID group memberships to application roles.

    Priority: admin > editor > viewer (first match wins).
    """
    for role, group_names in ROLE_GROUP_MAP.items():
        if any(g in groups for g in group_names):
            return role
    return "viewer"


# ---------------------------------------------------------------------------
# Core sync function
# ---------------------------------------------------------------------------

async def sync_user_from_entra(
    session: AsyncSession,
    access_token: str | None,
    user_email: str,
) -> User:
    """Fetch user profile from Microsoft Graph API and update the local User record.

    When ``access_token`` is None (dev mode / not yet wired), only the
    ``last_synced_at`` timestamp is touched so the endpoint remains functional.

    The full implementation would:
    1. GET /me  (or GET /users/{email}) — displayName, jobTitle, department,
       officeLocation, mobilePhone, businessPhones, employeeId, companyName,
       accountEnabled
    2. GET /me/manager — manager displayName + mail
    3. GET /me/photo/$value — profile photo (binary -> base64 data-URL or blob store)
    4. GET /me/memberOf — group display names for RBAC mapping
    5. Upsert the local User record with all parsed fields
    6. Set last_synced_at = utcnow()
    """
    # Look up existing user
    stmt = select(User).where(User.email == user_email)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if db_user is None:
        # Create a minimal record — will be enriched on first real sync
        db_user = User(email=user_email, name=user_email.split("@")[0], role="viewer")
        session.add(db_user)

    if access_token is not None:
        # TODO: Replace with real httpx calls to Microsoft Graph
        # ---------------------------------------------------------------
        # Example (pseudo-code):
        #
        # async with httpx.AsyncClient() as client:
        #     headers = {"Authorization": f"Bearer {access_token}"}
        #
        #     # 1. User profile
        #     profile = (await client.get(f"{GRAPH_API_BASE}/me", headers=headers)).json()
        #     db_user.name = profile.get("displayName", db_user.name)
        #     db_user.job_title = profile.get("jobTitle")
        #     db_user.department = profile.get("department")
        #     db_user.office_location = profile.get("officeLocation")
        #     db_user.phone = profile.get("mobilePhone") or (profile.get("businessPhones") or [None])[0]
        #     db_user.employee_id = profile.get("employeeId")
        #     db_user.company_name = profile.get("companyName")
        #     db_user.entra_id = profile.get("id")
        #
        #     # 2. Manager
        #     mgr_resp = await client.get(f"{GRAPH_API_BASE}/me/manager", headers=headers)
        #     if mgr_resp.status_code == 200:
        #         mgr = mgr_resp.json()
        #         db_user.manager_name = mgr.get("displayName")
        #         db_user.manager_email = mgr.get("mail") or mgr.get("userPrincipalName")
        #
        #     # 3. Photo (store as data-URL for simplicity)
        #     photo_resp = await client.get(f"{GRAPH_API_BASE}/me/photo/$value", headers=headers)
        #     if photo_resp.status_code == 200:
        #         import base64
        #         b64 = base64.b64encode(photo_resp.content).decode()
        #         db_user.photo_url = f"data:image/jpeg;base64,{b64}"
        #
        #     # 4. Group memberships
        #     groups_resp = await client.get(f"{GRAPH_API_BASE}/me/memberOf", headers=headers)
        #     if groups_resp.status_code == 200:
        #         groups = [
        #             g["displayName"]
        #             for g in groups_resp.json().get("value", [])
        #             if g.get("@odata.type") == "#microsoft.graph.group"
        #         ]
        #         db_user.entra_groups = json.dumps(groups)
        #         db_user.role = await map_entra_groups_to_role(groups)
        # ---------------------------------------------------------------
        logger.info("Entra sync with access token for %s (not yet implemented)", user_email)

    db_user.last_synced_at = datetime.now(timezone.utc)

    await session.commit()
    await session.refresh(db_user)

    logger.info("Synced user profile: %s (last_synced_at=%s)", db_user.email, db_user.last_synced_at)
    return db_user
