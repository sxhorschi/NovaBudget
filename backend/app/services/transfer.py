"""Transfer service — copy/move entities between facilities."""

from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cost_item import CostItem
from app.models.functional_area import FunctionalArea
from app.models.functional_area_budget import FunctionalAreaBudget
from app.models.enums import ApprovalStatus
from app.models.facility import Facility
from app.models.transfer_log import TransferLog
from app.models.work_area import WorkArea


def _log_entry(
    entity_type: str,
    source_entity_id: uuid.UUID,
    target_entity_id: uuid.UUID,
    source_facility_id: uuid.UUID,
    target_facility_id: uuid.UUID,
    mode: str,
    user: str | None,
    notes: str | None = None,
) -> TransferLog:
    return TransferLog(
        entity_type=entity_type,
        source_entity_id=source_entity_id,
        target_entity_id=target_entity_id,
        source_facility_id=source_facility_id,
        target_facility_id=target_facility_id,
        transfer_mode=mode,
        created_by=user,
        notes=notes,
    )


def _clone_cost_item(
    item: CostItem,
    target_work_area_id: uuid.UUID,
    reset_status: bool,
    reset_amounts: bool,
) -> CostItem:
    """Create a deep copy of a cost item with a new UUID."""
    unit_price = Decimal("0") if reset_amounts else item.unit_price
    quantity = Decimal("1") if reset_amounts else item.quantity
    total_amount = Decimal("0") if reset_amounts else item.total_amount

    approval_status = ApprovalStatus.OPEN if reset_status else item.approval_status
    approval_date = None if reset_status else item.approval_date

    return CostItem(
        id=uuid.uuid4(),
        work_area_id=target_work_area_id,
        description=item.description,
        unit_price=unit_price,
        quantity=quantity,
        total_amount=total_amount,
        expected_cash_out=None,
        cost_basis=item.cost_basis,
        cost_driver=item.cost_driver,
        basis_description=item.basis_description,
        assumptions=item.assumptions,
        approval_status=approval_status,
        approval_date=approval_date,
        project_phase=item.project_phase,
        product=item.product,
        requester=item.requester,
    )


async def transfer_cost_items(
    session: AsyncSession,
    source_facility_id: uuid.UUID,
    target_facility_id: uuid.UUID,
    cost_item_ids: list[uuid.UUID],
    target_work_area_id: uuid.UUID,
    mode: str,
    reset_status: bool = True,
    reset_amounts: bool = False,
    user: str | None = None,
) -> list[CostItem]:
    """Transfer cost items between facilities via copy or move.

    Parameters
    ----------
    mode : str
        "copy" — duplicate items with new UUIDs into target work area.
        "move" — re-parent items to target work area (update FK).

    Returns
    -------
    list[CostItem]
        The transferred (new or moved) cost items.
    """
    if mode not in ("copy", "move"):
        raise ValueError(f"Invalid transfer mode: {mode!r}. Must be 'copy' or 'move'.")

    # Validate target work area exists
    target_wa = await session.get(WorkArea, target_work_area_id)
    if not target_wa:
        raise ValueError(f"Target work area {target_work_area_id} not found")

    # Load source items
    stmt = select(CostItem).where(CostItem.id.in_(cost_item_ids))
    result = await session.execute(stmt)
    source_items = result.scalars().all()

    if len(source_items) != len(cost_item_ids):
        found_ids = {item.id for item in source_items}
        missing = set(cost_item_ids) - found_ids
        raise ValueError(f"Cost items not found: {missing}")

    transferred: list[CostItem] = []
    logs: list[TransferLog] = []

    for item in source_items:
        if mode == "copy":
            new_item = _clone_cost_item(item, target_work_area_id, reset_status, reset_amounts)
            session.add(new_item)
            await session.flush()
            transferred.append(new_item)
            logs.append(_log_entry(
                "cost_item", item.id, new_item.id,
                source_facility_id, target_facility_id, "copy", user,
            ))
        else:  # move
            old_id = item.id
            item.work_area_id = target_work_area_id
            if reset_status:
                item.approval_status = ApprovalStatus.OPEN
                item.approval_date = None
            if reset_amounts:
                item.unit_price = Decimal("0")
                item.quantity = Decimal("1")
                item.total_amount = Decimal("0")
            item.expected_cash_out = None
            transferred.append(item)
            logs.append(_log_entry(
                "cost_item", old_id, old_id,
                source_facility_id, target_facility_id, "move", user,
            ))

    session.add_all(logs)
    await session.flush()
    return transferred


async def transfer_work_areas(
    session: AsyncSession,
    source_facility_id: uuid.UUID,
    target_facility_id: uuid.UUID,
    work_area_ids: list[uuid.UUID],
    target_functional_area_id: uuid.UUID,
    mode: str,
    reset_status: bool = True,
    reset_amounts: bool = False,
    user: str | None = None,
) -> list[WorkArea]:
    """Transfer work areas (with their cost items) between facilities.

    Copy mode: duplicate work areas and all child cost items with new UUIDs.
    Move mode: re-parent work areas to target functional area.
    """
    if mode not in ("copy", "move"):
        raise ValueError(f"Invalid transfer mode: {mode!r}. Must be 'copy' or 'move'.")

    # Validate target functional area exists
    target_fa = await session.get(FunctionalArea, target_functional_area_id)
    if not target_fa:
        raise ValueError(f"Target functional area {target_functional_area_id} not found")

    # Load source work areas with cost items
    stmt = (
        select(WorkArea)
        .where(WorkArea.id.in_(work_area_ids))
        .options(selectinload(WorkArea.cost_items))
    )
    result = await session.execute(stmt)
    source_was = result.scalars().all()

    if len(source_was) != len(work_area_ids):
        found_ids = {wa.id for wa in source_was}
        missing = set(work_area_ids) - found_ids
        raise ValueError(f"Work areas not found: {missing}")

    transferred: list[WorkArea] = []
    logs: list[TransferLog] = []

    for wa in source_was:
        if mode == "copy":
            new_wa = WorkArea(
                id=uuid.uuid4(),
                functional_area_id=target_functional_area_id,
                name=wa.name,
            )
            session.add(new_wa)
            await session.flush()

            logs.append(_log_entry(
                "work_area", wa.id, new_wa.id,
                source_facility_id, target_facility_id, "copy", user,
            ))

            # Copy child cost items
            for item in wa.cost_items:
                new_item = _clone_cost_item(item, new_wa.id, reset_status, reset_amounts)
                session.add(new_item)
                await session.flush()
                logs.append(_log_entry(
                    "cost_item", item.id, new_item.id,
                    source_facility_id, target_facility_id, "copy", user,
                ))

            transferred.append(new_wa)
        else:  # move
            old_id = wa.id
            wa.functional_area_id = target_functional_area_id
            if reset_status or reset_amounts:
                for item in wa.cost_items:
                    if reset_status:
                        item.approval_status = ApprovalStatus.OPEN
                        item.approval_date = None
                    if reset_amounts:
                        item.unit_price = Decimal("0")
                        item.quantity = Decimal("1")
                        item.total_amount = Decimal("0")
                    item.expected_cash_out = None
            transferred.append(wa)
            logs.append(_log_entry(
                "work_area", old_id, old_id,
                source_facility_id, target_facility_id, "move", user,
            ))

    session.add_all(logs)
    await session.flush()
    return transferred


async def transfer_functional_areas(
    session: AsyncSession,
    source_facility_id: uuid.UUID,
    target_facility_id: uuid.UUID,
    functional_area_ids: list[uuid.UUID],
    mode: str,
    reset_status: bool = True,
    reset_amounts: bool = False,
    user: str | None = None,
) -> list[FunctionalArea]:
    """Transfer functional areas (with work areas and cost items) between facilities.

    Copy mode: duplicate entire functional area hierarchy with new UUIDs.
    Move mode: re-parent functional areas to target facility.
    """
    if mode not in ("copy", "move"):
        raise ValueError(f"Invalid transfer mode: {mode!r}. Must be 'copy' or 'move'.")

    # Validate target facility exists
    target_facility = await session.get(Facility, target_facility_id)
    if not target_facility:
        raise ValueError(f"Target facility {target_facility_id} not found")

    # Load source functional areas with full hierarchy
    stmt = (
        select(FunctionalArea)
        .where(FunctionalArea.id.in_(functional_area_ids))
        .options(
            selectinload(FunctionalArea.work_areas)
            .selectinload(WorkArea.cost_items)
        )
    )
    result = await session.execute(stmt)
    source_fas = result.scalars().all()

    if len(source_fas) != len(functional_area_ids):
        found_ids = {d.id for d in source_fas}
        missing = set(functional_area_ids) - found_ids
        raise ValueError(f"Functional areas not found: {missing}")

    transferred: list[FunctionalArea] = []
    logs: list[TransferLog] = []

    for fa in source_fas:
        if mode == "copy":
            new_fa = FunctionalArea(
                id=uuid.uuid4(),
                facility_id=target_facility_id,
                name=fa.name,
            )
            session.add(new_fa)
            await session.flush()

            # Copy budget entries
            for budget in fa.budgets:
                new_budget = FunctionalAreaBudget(
                    functional_area_id=new_fa.id,
                    year=budget.year,
                    amount=budget.amount,
                    comment=budget.comment,
                )
                session.add(new_budget)

            logs.append(_log_entry(
                "functional_area", fa.id, new_fa.id,
                source_facility_id, target_facility_id, "copy", user,
            ))

            for wa in fa.work_areas:
                new_wa = WorkArea(
                    id=uuid.uuid4(),
                    functional_area_id=new_fa.id,
                    name=wa.name,
                )
                session.add(new_wa)
                await session.flush()

                logs.append(_log_entry(
                    "work_area", wa.id, new_wa.id,
                    source_facility_id, target_facility_id, "copy", user,
                ))

                for item in wa.cost_items:
                    new_item = _clone_cost_item(item, new_wa.id, reset_status, reset_amounts)
                    session.add(new_item)
                    await session.flush()
                    logs.append(_log_entry(
                        "cost_item", item.id, new_item.id,
                        source_facility_id, target_facility_id, "copy", user,
                    ))

            transferred.append(new_fa)
        else:  # move
            old_id = fa.id
            fa.facility_id = target_facility_id
            if reset_status or reset_amounts:
                for wa in fa.work_areas:
                    for item in wa.cost_items:
                        if reset_status:
                            item.approval_status = ApprovalStatus.OPEN
                            item.approval_date = None
                        if reset_amounts:
                            item.unit_price = Decimal("0")
                            item.quantity = Decimal("1")
                            item.total_amount = Decimal("0")
                        item.expected_cash_out = None
            transferred.append(fa)
            logs.append(_log_entry(
                "functional_area", old_id, old_id,
                source_facility_id, target_facility_id, "move", user,
            ))

    session.add_all(logs)
    await session.flush()
    return transferred
