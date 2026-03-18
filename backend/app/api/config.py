"""Config API — serves centralized configuration (products, phases, etc.)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth import UserDep, require_role
from app.services.config_service import load_config, save_config

router = APIRouter(prefix="/api/v1/config", tags=["config"])


@router.get("/")
async def get_config():
    """Return the full application config. No auth required — everyone needs it."""
    return load_config()


@router.put("/", dependencies=[Depends(require_role("admin"))])
async def update_config(data: dict, user: UserDep):
    """Update the application config. Admin only."""
    save_config(data)
    return load_config()
