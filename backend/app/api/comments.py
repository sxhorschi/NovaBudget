"""Comments API — chat-like comment threads for CostItems."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import UserDep
from app.db import get_session
from app.models.comment import Comment
from app.models.cost_item import CostItem
from app.schemas.comment import CommentCreate, CommentRead

router = APIRouter(prefix="/api/v1/cost-items", tags=["comments"])


@router.get("/{item_id}/comments", response_model=list[CommentRead])
async def list_comments(
    item_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> list[Comment]:
    """Return all comments for a cost item ordered by creation time."""
    cost_item = await session.get(CostItem, item_id)
    if not cost_item:
        raise HTTPException(status_code=404, detail="Cost item not found")

    stmt = (
        select(Comment)
        .where(Comment.cost_item_id == item_id)
        .order_by(Comment.created_at)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.post("/{item_id}/comments", response_model=CommentRead, status_code=201)
async def create_comment(
    item_id: UUID,
    body: CommentCreate,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
) -> Comment:
    """Add a new comment to a cost item."""
    cost_item = await session.get(CostItem, item_id)
    if not cost_item:
        raise HTTPException(status_code=404, detail="Cost item not found")

    user_name = user.name if user.name else "Anonymous"
    user_id: UUID | None = None
    if user.id and user.id != "dev-admin":
        try:
            user_id = UUID(user.id)
        except (ValueError, AttributeError):
            user_id = None

    comment = Comment(
        cost_item_id=item_id,
        user_id=user_id,
        user_name=user_name,
        text=body.text,
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return comment


@router.delete("/{item_id}/comments/{comment_id}", status_code=204)
async def delete_comment(
    item_id: UUID,
    comment_id: UUID,
    user: UserDep,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a comment from a cost item."""
    comment = await session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.cost_item_id != item_id:
        raise HTTPException(status_code=404, detail="Comment not found")

    await session.delete(comment)
    await session.commit()
