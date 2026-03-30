"""Config API — serves centralized configuration (products, phases, etc.)."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from uuid import UUID as PyUUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep, require_role
from app.db import get_session
from app.schemas.config import ConfigUpdate
from app.services.audit import log_change
from app.services.config_service import load_config, save_config

CONFIG_SENTINEL_ID = PyUUID("00000000-0000-0000-0000-000000000000")

router = APIRouter(prefix="/api/v1/config", tags=["config"])

# Logo storage — saved alongside other data files in backend/data/
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_ALLOWED_LOGO_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg"}
_LOGO_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
}


def _find_logo() -> Path | None:
    """Return the first logo file found in the data directory, or None."""
    for ext in _ALLOWED_LOGO_EXTENSIONS:
        candidate = _DATA_DIR / f"logo{ext}"
        if candidate.exists():
            return candidate
    return None


@router.get("/")
async def get_config(session: AsyncSession = Depends(get_session)):
    """Return the full application config. No auth required — everyone needs it."""
    return await load_config(session)


@router.put("/", dependencies=[Depends(require_role("admin"))])
async def update_config(data: ConfigUpdate, user: UserDep, session: AsyncSession = Depends(get_session)):
    """Update the application config. Admin only."""
    # Load old config before saving so we can compute a diff for the audit log
    old_config = await load_config(session)

    try:
        await save_config(session, data.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    new_config = await load_config(session)

    # Compute which categories changed and log the diff
    changes: dict[str, dict[str, str]] = {}
    for key in ("products", "phases", "cost_bases", "cost_drivers"):
        old_ids = {item["id"] for item in old_config.get(key, [])}
        new_ids = {item["id"] for item in new_config.get(key, [])}
        old_labels = sorted(item["label"] for item in old_config.get(key, []))
        new_labels = sorted(item["label"] for item in new_config.get(key, []))
        if old_ids != new_ids or old_labels != new_labels:
            changes[key] = {
                "old": json.dumps(old_labels),
                "new": json.dumps(new_labels),
            }

    if changes:
        await log_change(
            session, "config", CONFIG_SENTINEL_ID, "updated",
            changes=changes, user_id=user.email,
        )
        await session.commit()

    return new_config


@router.get("/logo")
async def get_logo():
    """Serve the uploaded logo file. Returns 404 if no logo has been uploaded."""
    logo_path = _find_logo()
    if logo_path is None:
        raise HTTPException(status_code=404, detail="No logo uploaded")
    ext = logo_path.suffix.lower()
    media_type = _LOGO_MEDIA_TYPES.get(ext, "application/octet-stream")
    return FileResponse(logo_path, media_type=media_type)


@router.post("/logo", dependencies=[Depends(require_role("admin"))])
async def upload_logo(user: UserDep, file: UploadFile = File(...)):
    """Upload a new logo image. Overwrites any existing logo. Admin only."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in _ALLOWED_LOGO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Allowed: {', '.join(sorted(_ALLOWED_LOGO_EXTENSIONS))}",
        )

    # Validate content type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Remove any existing logo files
    for old_ext in _ALLOWED_LOGO_EXTENSIONS:
        old_file = _DATA_DIR / f"logo{old_ext}"
        if old_file.exists():
            old_file.unlink()

    # Save the new logo
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = _DATA_DIR / f"logo{ext}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"status": "ok", "filename": f"logo{ext}"}
