"""add user invitation fields

Revision ID: a1b2c3d4e5f6
Revises: bc74ec0ff6c4
Create Date: 2026-03-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'bc74ec0ff6c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('invited_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
    op.add_column('users', sa.Column('invited_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'invited_at')
    op.drop_column('users', 'invited_by')
