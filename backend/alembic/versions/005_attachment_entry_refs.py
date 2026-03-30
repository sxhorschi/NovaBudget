"""Add price_history_id and change_cost_id to attachments.

Revision ID: dd3c04db69ef
Revises: 004_remove_budget_total
Create Date: 2026-03-27 13:48:19.702257
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "dd3c04db69ef"
down_revision: Union[str, None] = "004_remove_budget_total"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("attachments", sa.Column("price_history_id", sa.UUID(), nullable=True))
    op.add_column("attachments", sa.Column("change_cost_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_attachment_price_history",
        "attachments",
        "price_history",
        ["price_history_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_attachment_change_cost",
        "attachments",
        "change_costs",
        ["change_cost_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_attachment_change_cost", "attachments", type_="foreignkey")
    op.drop_constraint("fk_attachment_price_history", "attachments", type_="foreignkey")
    op.drop_column("attachments", "change_cost_id")
    op.drop_column("attachments", "price_history_id")
