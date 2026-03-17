from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import UserDep
from app.db import get_session
from app.models import Department, WorkArea
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentWithWorkAreas
from app.services.audit import build_changes, log_change

router = APIRouter(prefix="/api/v1/departments", tags=["departments"])


@router.get("/", response_model=list[DepartmentRead])
async def list_departments(
    facility_id: UUID | None = None, session: AsyncSession = Depends(get_session)
):
    stmt = select(Department).order_by(Department.name)
    if facility_id:
        stmt = stmt.where(Department.facility_id == facility_id)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{department_id}", response_model=DepartmentWithWorkAreas)
async def get_department(department_id: UUID, session: AsyncSession = Depends(get_session)):
    stmt = (
        select(Department)
        .where(Department.id == department_id)
        .options(selectinload(Department.work_areas))
    )
    result = await session.execute(stmt)
    department = result.scalar_one_or_none()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.post("/", response_model=DepartmentRead, status_code=201)
async def create_department(
    data: DepartmentCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    department = Department(**data.model_dump())
    session.add(department)
    await session.flush()
    await log_change(session, "department", department.id, "created", user_id=user.email)
    await session.commit()
    await session.refresh(department)
    return department


@router.put("/{department_id}", response_model=DepartmentRead)
async def update_department(
    department_id: UUID,
    data: DepartmentCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    department = await session.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    update_data = data.model_dump()
    old_values = {k: getattr(department, k) for k in update_data}
    for key, value in update_data.items():
        setattr(department, key, value)
    changes = build_changes(old_values, update_data)
    if changes:
        await log_change(session, "department", department.id, "updated", changes=changes, user_id=user.email)
    await session.commit()
    await session.refresh(department)
    return department


@router.delete("/{department_id}", status_code=204)
async def delete_department(
    department_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
):
    department = await session.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    department_id_copy = department.id
    await session.delete(department)
    await log_change(session, "department", department_id_copy, "deleted", user_id=user.email)
    await session.commit()
