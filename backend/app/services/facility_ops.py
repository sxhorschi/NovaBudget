"""Facility operations — clone / template services."""

from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cost_item import CostItem
from app.models.functional_area import FunctionalArea
from app.models.enums import ApprovalStatus
from app.models.facility import Facility
from app.models.work_area import WorkArea


async def clone_facility(
    session: AsyncSession,
    source_id: uuid.UUID,
    name: str,
    include_amounts: bool = True,
    reset_statuses: bool = True,
    user_id: str | None = None,
) -> Facility:
    """Deep-clone a facility with all functional areas, work areas, and cost items.

    Parameters
    ----------
    session:
        Active async database session. Caller is responsible for commit.
    source_id:
        UUID of the facility to clone.
    name:
        Name for the new facility.
    include_amounts:
        If False, set unit_price, quantity, and total_amount to 0/1/0 on cloned items.
    reset_statuses:
        If True, set all cloned cost item approval_status to OPEN.
    user_id:
        Optional identifier of the user performing the clone.

    Returns
    -------
    Facility
        The newly created facility (flushed, not yet committed).
    """
    # Load source with full hierarchy
    stmt = (
        select(Facility)
        .where(Facility.id == source_id)
        .options(
            selectinload(Facility.functional_areas)
            .selectinload(FunctionalArea.work_areas)
            .selectinload(WorkArea.cost_items)
        )
    )
    result = await session.execute(stmt)
    source = result.scalar_one_or_none()

    if source is None:
        raise ValueError(f"Source facility {source_id} not found")

    # Create new facility
    new_facility = Facility(
        name=name,
        location=source.location,
        description=source.description,
    )
    session.add(new_facility)
    await session.flush()  # get new_facility.id

    # Deep-copy hierarchy
    for fa in source.functional_areas:
        new_fa = FunctionalArea(
            id=uuid.uuid4(),
            facility_id=new_facility.id,
            name=fa.name,
            budget_total=fa.budget_total,
        )
        session.add(new_fa)
        await session.flush()

        for wa in fa.work_areas:
            new_wa = WorkArea(
                id=uuid.uuid4(),
                functional_area_id=new_fa.id,
                name=wa.name,
            )
            session.add(new_wa)
            await session.flush()

            for item in wa.cost_items:
                unit_price = item.unit_price if include_amounts else Decimal("0")
                quantity = item.quantity if include_amounts else Decimal("1")
                total_amount = item.total_amount if include_amounts else Decimal("0")
                approval_status = ApprovalStatus.OPEN if reset_statuses else item.approval_status
                approval_date = None if reset_statuses else item.approval_date

                new_item = CostItem(
                    id=uuid.uuid4(),
                    work_area_id=new_wa.id,
                    description=item.description,
                    unit_price=unit_price,
                    quantity=quantity,
                    total_amount=total_amount,
                    expected_cash_out=None,  # always reset
                    cost_basis=item.cost_basis,
                    cost_driver=item.cost_driver,
                    basis_description=item.basis_description,
                    assumptions=item.assumptions,
                    approval_status=approval_status,
                    approval_date=approval_date,
                    project_phase=item.project_phase,
                    product=item.product,
                    requester=item.requester,
                    comments=item.comments,
                )
                session.add(new_item)

    await session.flush()
    await session.refresh(new_facility)
    return new_facility
