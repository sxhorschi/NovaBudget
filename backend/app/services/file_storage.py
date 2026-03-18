"""File storage service — handles saving / retrieving / deleting uploaded files."""

from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
_UPLOADS_ROOT = UPLOADS_DIR.resolve()

MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB

ALLOWED_CONTENT_TYPES: set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # xlsx
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # docx
    "image/png",
    "image/jpeg",
    "application/zip",
}

ALLOWED_EXTENSIONS: set[str] = {
    ".pdf",
    ".xlsx",
    ".docx",
    ".png",
    ".jpg",
    ".jpeg",
    ".zip",
}


class FileStorageError(Exception):
    """Raised when a file storage operation fails."""


def _ensure_upload_dir(sub: Path) -> None:
    sub.mkdir(parents=True, exist_ok=True)


def _is_within_upload_root(path: Path) -> bool:
    try:
        path.resolve().relative_to(_UPLOADS_ROOT)
        return True
    except ValueError:
        return False


def validate_file(filename: str, content_type: str, size: int) -> None:
    """Validate file before saving. Raises FileStorageError on violation."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise FileStorageError(
            f"File extension '{ext}' not allowed. "
            f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise FileStorageError(
            f"Content type '{content_type}' is not allowed. "
            f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        )
    if size > MAX_FILE_SIZE:
        raise FileStorageError(
            f"File size {size} bytes exceeds maximum of {MAX_FILE_SIZE} bytes (50 MB)."
        )


async def save_file(filename: str, data: bytes) -> tuple[str, str]:
    """Save file to disk and return (storage_path, stored_filename).

    Files are stored under uploads/{year}/{month}/{uuid}_{filename}.
    """
    now = datetime.utcnow()
    year = str(now.year)
    month = f"{now.month:02d}"
    unique_id = uuid.uuid4().hex[:12]
    safe_name = Path(filename).name  # strip any directory components
    stored_name = f"{unique_id}_{safe_name}"

    target_dir = UPLOADS_DIR / year / month
    _ensure_upload_dir(target_dir)

    target_path = (target_dir / stored_name).resolve()
    if not _is_within_upload_root(target_path):
        raise FileStorageError("Refusing to write file outside uploads directory")

    target_path.write_bytes(data)

    # Return relative path from uploads root for portability
    relative = f"{year}/{month}/{stored_name}"
    return relative, stored_name


def get_file_path(storage_path: str) -> Path:
    """Resolve a storage_path back to an absolute file path."""
    path = (UPLOADS_DIR / storage_path).resolve()
    if not _is_within_upload_root(path):
        raise FileStorageError("Invalid storage path outside uploads directory")
    return path


def delete_file(storage_path: str) -> None:
    """Delete a file from disk. Silently ignores missing files."""
    try:
        path = get_file_path(storage_path)
    except FileStorageError:
        return

    if path.exists():
        path.unlink()
