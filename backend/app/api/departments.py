from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.models import Department, WorkArea
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentWithWorkAreas

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
async def create_department(data: DepartmentCreate, session: AsyncSession = Depends(get_session)):
    department = Department(**data.model_dump())
    session.add(department)
    await session.commit()
    await session.refresh(department)
    return department


@router.put("/{department_id}", response_model=DepartmentRead)
async def update_department(
    department_id: UUID, data: DepartmentCreate, session: AsyncSession = Depends(get_session)
):
    department = await session.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    for key, value in data.model_dump().items():
        setattr(department, key, value)
    await session.commit()
    await session.refresh(department)
    return department


@router.delete("/{department_id}", status_code=204)
async def delete_department(department_id: UUID, session: AsyncSession = Depends(get_session)):
    department = await session.get(Department, department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    await session.delete(department)
    await session.commit()
