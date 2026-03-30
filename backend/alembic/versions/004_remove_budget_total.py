"""Remove budget_total from functional_areas

Revision ID: 004_remove_budget_total
Revises: 003_config_to_db
Create Date: 2026-03-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_remove_budget_total"
down_revision: Union[str, None] = "003_config_to_db"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Drop budget_total column from functional_areas
    # First check if it exists to make this idempotent
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'functional_areas'
                AND column_name = 'budget_total'
            ) THEN
                ALTER TABLE functional_areas DROP COLUMN budget_total;
            END IF;
        END $$;
    """)


def downgrade():
    # Re-add the column (data will be lost)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'functional_areas'
                AND column_name = 'budget_total'
            ) THEN
                ALTER TABLE functional_areas ADD COLUMN budget_total NUMERIC(15, 2) NOT NULL DEFAULT 0;
            END IF;
        END $$;
    """)
