from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import get_session
from app.models import CostItem, WorkArea
from app.models.enums import ApprovalStatus, Product, ProjectPhase
from app.schemas.cost_item import CostItemCreate, CostItemRead, CostItemUpdate

router = APIRouter(prefix="/api/v1/cost-items", tags=["cost-items"])


@router.get("/", response_model=list[CostItemRead])
async def list_cost_items(
    work_area_id: UUID | None = None,
    department_id: UUID | None = None,
    approval_status: ApprovalStatus | None = None,
    project_phase: ProjectPhase | None = None,
    product: Product | None = None,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(CostItem)

    if work_area_id:
        stmt = stmt.where(CostItem.work_area_id == work_area_id)

    if department_id:
        stmt = stmt.join(WorkArea).where(WorkArea.department_id == department_id)

    if approval_status:
        stmt = stmt.where(CostItem.approval_status == approval_status)

    if project_phase:
        stmt = stmt.where(CostItem.project_phase == project_phase)

    if product:
        stmt = stmt.where(CostItem.product == product)

    stmt = stmt.order_by(CostItem.created_at)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{item_id}", response_model=CostItemRead)
async def get_cost_item(item_id: UUID, session: AsyncSession = Depends(get_session)):
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")
    return item


@router.post("/", response_model=CostItemRead, status_code=201)
async def create_cost_item(data: CostItemCreate, session: AsyncSession = Depends(get_session)):
    item = CostItem(**data.model_dump())
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.put("/{item_id}", response_model=CostItemRead)
async def update_cost_item(
    item_id: UUID, data: CostItemUpdate, session: AsyncSession = Depends(get_session)
):
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    await session.commit()
    await session.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_cost_item(item_id: UUID, session: AsyncSession = Depends(get_session)):
    item = await session.get(CostItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Cost item not found")
    await session.delete(item)
    await session.commit()
