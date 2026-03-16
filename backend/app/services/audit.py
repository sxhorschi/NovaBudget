"""Audit logging service — fire-and-forget change tracking."""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db import async_session_factory
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


async def _write_audit_entries(entries: list[AuditLog]) -> None:
    """Write audit entries in a separate session (fire-and-forget)."""
    try:
        async with async_session_factory() as session:
            session.add_all(entries)
            await session.commit()
    except Exception:
        logger.exception("Failed to write audit log entries")


async def log_change(
    session: AsyncSession | None,
    entity_type: str,
    entity_id: UUID,
    action: str,
    changes: dict | None = None,
    user_id: str | None = None,
) -> None:
    """Log a change to an entity.

    For 'created' and 'deleted' actions, *changes* can be None — a single
    audit row with no field detail is written.

    For 'updated' actions, *changes* should be a dict like::

        {
            "amount": {"old": "50000", "new": "55000"},
            "status": {"old": "OPEN", "new": "APPROVED"},
        }

    Each changed field produces its own audit row so the history is
    granular and easy to query.

    The writes happen in a **separate session** via asyncio.create_task
    so the caller is not blocked (fire-and-forget).
    """
    entries: list[AuditLog] = []

    if changes:
        for field_name, vals in changes.items():
            entries.append(
                AuditLog(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    action=action,
                    field_name=field_name,
                    old_value=str(vals.get("old")) if vals.get("old") is not None else None,
                    new_value=str(vals.get("new")) if vals.get("new") is not None else None,
                    user_id=user_id,
                )
            )
    else:
        entries.append(
            AuditLog(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                user_id=user_id,
            )
        )

    # Fire-and-forget: write in background task with its own session
    asyncio.create_task(_write_audit_entries(entries))


def build_changes(old_values: dict, new_values: dict) -> dict:
    """Compare old and new value dicts; return only the fields that changed.

    Both *old_values* and *new_values* should map field names to their
    (possibly stringified) values.  Returns a dict suitable for passing
    to :func:`log_change` as *changes*.
    """
    result: dict = {}
    for key, new_val in new_values.items():
        old_val = old_values.get(key)
        if str(old_val) != str(new_val):
            result[key] = {"old": old_val, "new": new_val}
    return result
