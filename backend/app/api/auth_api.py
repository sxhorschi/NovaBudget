"""Auth endpoint — returns the current user's profile with real role from DB."""

from fastapi import APIRouter

from app.auth import UserDep

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/me")
async def get_me(user: UserDep):
    """Return the authenticated user's profile including their DB role."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "job_title": user.job_title,
        "department": user.department,
        "office_location": user.office_location,
        "photo_url": user.photo_url,
    }
