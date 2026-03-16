"""Approval-Workflow Service — Regeln für Status-Übergänge bei Cost Items.

Stellt sicher, dass nur erlaubte Übergänge stattfinden, schreibt AuditLog-Einträge
und bestimmt anhand des Betrags die erforderliche Freigabestufe.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.cost_item import CostItem
from app.models.enums import ApprovalStatus


# ── Erlaubte Status-Übergänge ───────────────────────────────────────────

ALLOWED_TRANSITIONS: dict[ApprovalStatus, set[ApprovalStatus]] = {
    ApprovalStatus.OPEN: {
        ApprovalStatus.SUBMITTED_FOR_APPROVAL,
    },
    ApprovalStatus.SUBMITTED_FOR_APPROVAL: {
        ApprovalStatus.APPROVED,
        ApprovalStatus.REJECTED,
        ApprovalStatus.ON_HOLD,
        ApprovalStatus.PENDING_SUPPLIER_NEGOTIATION,
        ApprovalStatus.PENDING_TECHNICAL_CLARIFICATION,
    },
    ApprovalStatus.APPROVED: set(),  # Endstatus im MVP
    ApprovalStatus.REJECTED: {
        ApprovalStatus.OPEN,  # Kann nochmal eingereicht werden
    },
    ApprovalStatus.ON_HOLD: {
        ApprovalStatus.SUBMITTED_FOR_APPROVAL,
        ApprovalStatus.OPEN,
    },
    ApprovalStatus.PENDING_SUPPLIER_NEGOTIATION: {
        ApprovalStatus.SUBMITTED_FOR_APPROVAL,
        ApprovalStatus.OPEN,
    },
    ApprovalStatus.PENDING_TECHNICAL_CLARIFICATION: {
        ApprovalStatus.SUBMITTED_FOR_APPROVAL,
        ApprovalStatus.OPEN,
    },
    ApprovalStatus.OBSOLETE: set(),  # Endstatus, kein Rückweg
}

# Jeder Status kann jederzeit auf OBSOLETE gesetzt werden (außer OBSOLETE selbst)
for _status in ApprovalStatus:
    if _status != ApprovalStatus.OBSOLETE:
        ALLOWED_TRANSITIONS.setdefault(_status, set()).add(ApprovalStatus.OBSOLETE)


# ── Status-Labels auf Deutsch (für Fehlermeldungen) ─────────────────────

_STATUS_LABELS: dict[ApprovalStatus, str] = {
    ApprovalStatus.OPEN: "Offen",
    ApprovalStatus.SUBMITTED_FOR_APPROVAL: "Zur Freigabe eingereicht",
    ApprovalStatus.APPROVED: "Freigegeben",
    ApprovalStatus.REJECTED: "Abgelehnt",
    ApprovalStatus.ON_HOLD: "Zurückgestellt",
    ApprovalStatus.PENDING_SUPPLIER_NEGOTIATION: "Lieferantenverhandlung ausstehend",
    ApprovalStatus.PENDING_TECHNICAL_CLARIFICATION: "Technische Klärung ausstehend",
    ApprovalStatus.OBSOLETE: "Obsolet",
}


# ── Schwellenwert-Logik ─────────────────────────────────────────────────

APPROVAL_THRESHOLDS: list[tuple[Decimal, str]] = [
    (Decimal("50000"), "department_lead"),       # bis 50k: Abteilungsleiter
    (Decimal("250000"), "cfo"),                  # 50k–250k: CFO
    (Decimal("Infinity"), "steering_committee"), # über 250k: Steering Committee
]


def get_required_approver(amount: Decimal) -> str:
    """Gibt die erforderliche Freigabestufe basierend auf dem Betrag zurück.

    Returns:
        "department_lead" | "cfo" | "steering_committee"
    """
    for threshold, approver in APPROVAL_THRESHOLDS:
        if amount <= threshold:
            return approver
    return "steering_committee"


def _label(status: ApprovalStatus) -> str:
    """Gibt das deutsche Label für einen Status zurück."""
    return _STATUS_LABELS.get(status, status.value)


def _allowed_targets_label(status: ApprovalStatus) -> str:
    """Gibt eine komma-separierte Liste der erlaubten Zielstatus zurück."""
    targets = ALLOWED_TRANSITIONS.get(status, set())
    if not targets:
        return "keine (Endstatus)"
    return ", ".join(sorted(_label(t) for t in targets))


# ── Kernfunktion: Status ändern ─────────────────────────────────────────

async def change_status(
    session: AsyncSession,
    cost_item_id: UUID,
    new_status: ApprovalStatus,
    *,
    user_id: str | None = None,
    comment: str | None = None,
) -> CostItem:
    """Ändert den Approval-Status eines Cost Items mit Regelprüfung.

    1. Item laden
    2. Prüfen ob Übergang erlaubt
    3. Wenn APPROVED: approval_date setzen
    4. Status ändern
    5. AuditLog schreiben

    Raises:
        HTTPException 404: Cost Item nicht gefunden
        HTTPException 409: Statusübergang nicht erlaubt
    """
    # 1. Item laden
    item = await session.get(CostItem, cost_item_id)
    if item is None:
        raise HTTPException(
            status_code=404,
            detail=f"Cost Item mit ID {cost_item_id} nicht gefunden.",
        )

    current_status = item.approval_status

    # Gleicher Status → kein Übergang nötig
    if current_status == new_status:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cost Item hat bereits den Status „{_label(current_status)}". "
                f"Kein Übergang notwendig."
            ),
        )

    # 2. Prüfen ob Übergang erlaubt
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Statusübergang von „{_label(current_status)}" nach "
                f"„{_label(new_status)}" ist nicht erlaubt. "
                f"Erlaubte Zielstatus: {_allowed_targets_label(current_status)}."
            ),
        )

    # Erforderliche Freigabestufe bestimmen
    required_approver = get_required_approver(item.current_amount)

    # 3. Wenn APPROVED: approval_date setzen
    if new_status == ApprovalStatus.APPROVED:
        item.approval_date = date.today()

    # 4. Status ändern
    previous_status = current_status
    item.approval_status = new_status

    # 5. AuditLog schreiben
    audit_entry = AuditLog(
        entity_type="cost_item",
        entity_id=cost_item_id,
        action="status_change",
        field_name="approval_status",
        old_value=previous_status.value,
        new_value=new_status.value,
        user_id=user_id,
        comment=comment,
        required_approver=required_approver,
    )
    session.add(audit_entry)

    await session.commit()
    await session.refresh(item)

    return item
