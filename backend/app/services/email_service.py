"""Email service using Microsoft Graph API with application permissions.

Sends emails via the Mail.Send permission on the Azure app registration.
Authenticates using OAuth2 client credentials flow (no user interaction).
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Token cache (app-only tokens are valid for ~1 hour)
_token_cache: dict = {"access_token": None, "expires_at": 0}


async def _get_graph_token() -> str:
    """Get an app-only access token for Microsoft Graph via client credentials."""
    import time

    if _token_cache["access_token"] and _token_cache["expires_at"] > time.time() + 60:
        return _token_cache["access_token"]

    url = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/oauth2/v2.0/token"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data={
            "client_id": settings.AZURE_CLIENT_ID,
            "client_secret": settings.AZURE_CLIENT_SECRET,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        })
        resp.raise_for_status()
        data = resp.json()

    _token_cache["access_token"] = data["access_token"]
    _token_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
    return data["access_token"]


def _is_configured() -> bool:
    """Check if all required settings are present for email sending."""
    return bool(
        settings.AZURE_CLIENT_ID
        and settings.AZURE_TENANT_ID
        and settings.AZURE_CLIENT_SECRET
        and settings.MAIL_SENDER_EMAIL
    )


async def send_invite_email(
    to_email: str,
    to_name: str,
    role: str,
    invited_by_name: str,
    app_url: str,
) -> bool:
    """Send an invitation email via Microsoft Graph.

    Returns True if sent successfully, False otherwise.
    Failures are logged but never raised — email is best-effort.
    """
    if not _is_configured():
        logger.warning("Email not configured — skipping invite email to %s", to_email)
        return False

    subject = "You've been invited to NovaBudget"
    body = f"""<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; line-height: 1.6;">
<div style="max-width: 520px; margin: 0 auto; padding: 32px 0;">
  <h2 style="margin-bottom: 8px;">Welcome to NovaBudget</h2>
  <p><strong>{invited_by_name}</strong> has invited you as <strong>{role}</strong>.</p>
  <p>Sign in with your Microsoft account to get started:</p>
  <p style="margin: 24px 0;">
    <a href="{app_url}" style="background: #0078d4; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Open NovaBudget</a>
  </p>
  <p style="font-size: 13px; color: #666;">You'll be signed in automatically with your organization credentials. No password needed.</p>
</div>
</body></html>"""

    try:
        token = await _get_graph_token()
        sender = settings.MAIL_SENDER_EMAIL

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://graph.microsoft.com/v1.0/users/{sender}/sendMail",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={
                    "message": {
                        "subject": subject,
                        "body": {"contentType": "HTML", "content": body},
                        "toRecipients": [
                            {"emailAddress": {"address": to_email, "name": to_name}}
                        ],
                    }
                },
            )
            if resp.status_code >= 400:
                logger.error(
                    "Graph sendMail failed (%d): %s", resp.status_code, resp.text
                )
                return False

        logger.info("Invite email sent to %s", to_email)
        return True

    except Exception as e:
        logger.error("Failed to send invite email to %s: %s", to_email, e)
        return False
