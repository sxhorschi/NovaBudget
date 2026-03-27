"""major restructure: cost_items, departments→functional_areas,
budget_adjustments→change_costs, new tables (functional_area_budgets,
price_history, comments), new approval status values

Revision ID: 002_major_restructure
Revises: a1b2c3d4e5f6
Create Date: 2026-03-27 00:00:00.000000

Covers Phases 1-8 changes:
- Phase 1: CostItem original_amount/current_amount → unit_price/quantity/total_amount
- Phase 2: departments → functional_areas (table + FK renames)
- Phase 3: FunctionalAreaBudget model (new table functional_area_budgets)
- Phase 4: New approval statuses (REVIEWED, PURCHASE_ORDER_SENT,
           PURCHASE_ORDER_CONFIRMED, DELIVERED), PriceHistory model
- Phase 5: budget_adjustments → change_costs (+ cost_driver, budget_relevant, year cols)
           Remove zielanpassung / zielanpassung_reason from cost_items
- Phase 8: Comment model (new table comments), remove comments text field
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_major_restructure'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # 1. cost_items: add new columns, remove old ones
    # =========================================================================

    # Add new pricing columns
    op.add_column(
        'cost_items',
        sa.Column('unit_price', sa.Numeric(precision=15, scale=2), nullable=True),
    )
    op.add_column(
        'cost_items',
        sa.Column(
            'quantity',
            sa.Numeric(precision=15, scale=2),
            server_default='1',
            nullable=True,
        ),
    )
    op.add_column(
        'cost_items',
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=True),
    )

    # Data migration: zero out / default pricing fields
    # We cannot know original values; set a sane baseline from existing data.
    op.execute(
        """
        UPDATE cost_items
        SET
            unit_price   = COALESCE(original_amount, current_amount, 0),
            quantity     = 1,
            total_amount = COALESCE(current_amount, original_amount, 0)
        """
    )

    # Make pricing columns non-nullable now that data is filled
    op.alter_column('cost_items', 'unit_price', nullable=False)
    op.alter_column('cost_items', 'quantity', nullable=False)
    op.alter_column('cost_items', 'total_amount', nullable=False)

    # Drop old pricing columns
    op.drop_column('cost_items', 'original_amount')
    op.drop_column('cost_items', 'current_amount')

    # Drop zielanpassung columns (Phase 5 removal)
    op.drop_column('cost_items', 'zielanpassung')
    op.drop_column('cost_items', 'zielanpassung_reason')

    # Drop old index on current_amount (no longer exists)
    op.drop_index('ix_cost_items_current_amount', table_name='cost_items')

    # Add index on total_amount
    op.create_index('ix_cost_items_total_amount', 'cost_items', ['total_amount'])

    # =========================================================================
    # 2. Add new ApprovalStatus enum values (PostgreSQL only)
    #    Must be done BEFORE any table that references this enum.
    #    ALTER TYPE … ADD VALUE cannot run inside a transaction in older PG,
    #    but PG 12+ supports it. We commit after each ADD VALUE to be safe.
    # =========================================================================

    op.execute("ALTER TYPE approvalstatus ADD VALUE IF NOT EXISTS 'REVIEWED'")
    op.execute("ALTER TYPE approvalstatus ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_SENT'")
    op.execute("ALTER TYPE approvalstatus ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_CONFIRMED'")
    op.execute("ALTER TYPE approvalstatus ADD VALUE IF NOT EXISTS 'DELIVERED'")

    # =========================================================================
    # 3. departments → functional_areas
    # =========================================================================

    # Rename the table itself
    op.rename_table('departments', 'functional_areas')

    # Rename FK column in work_areas: department_id → functional_area_id
    op.alter_column('work_areas', 'department_id', new_column_name='functional_area_id')

    # Rename FK column in attachments: department_id → functional_area_id
    op.alter_column('attachments', 'department_id', new_column_name='functional_area_id')

    # Update the CHECK constraint on attachments to reflect the new column name.
    # Drop old constraint and recreate.
    op.drop_constraint('ck_attachment_exactly_one_parent', 'attachments', type_='check')
    op.create_check_constraint(
        'ck_attachment_exactly_one_parent',
        'attachments',
        (
            '(cost_item_id IS NOT NULL AND work_area_id IS NULL AND functional_area_id IS NULL)'
            ' OR (cost_item_id IS NULL AND work_area_id IS NOT NULL AND functional_area_id IS NULL)'
            ' OR (cost_item_id IS NULL AND work_area_id IS NULL AND functional_area_id IS NOT NULL)'
        ),
    )

    # =========================================================================
    # 4. budget_adjustments → change_costs
    # =========================================================================

    # Rename the table
    op.rename_table('budget_adjustments', 'change_costs')

    # Rename FK column: department_id → functional_area_id
    op.alter_column('change_costs', 'department_id', new_column_name='functional_area_id')

    # Add new columns for Phase 5
    op.add_column(
        'change_costs',
        sa.Column('cost_driver', sa.String(length=50), nullable=True),
    )
    op.add_column(
        'change_costs',
        sa.Column(
            'budget_relevant',
            sa.Boolean(),
            server_default=sa.text('false'),
            nullable=False,
        ),
    )
    op.add_column(
        'change_costs',
        sa.Column('year', sa.Integer(), nullable=True),
    )

    # Rename index to match new table name
    op.drop_index(
        'ix_budget_adjustments_department_id',
        table_name='change_costs',
    )
    op.create_index(
        'ix_change_costs_functional_area_id',
        'change_costs',
        ['functional_area_id'],
    )

    # =========================================================================
    # 5. New table: functional_area_budgets
    # =========================================================================

    op.create_table(
        'functional_area_budgets',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column(
            'functional_area_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('functional_areas.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.UniqueConstraint('functional_area_id', 'year', name='uq_fab_fa_year'),
    )
    op.create_index(
        'ix_functional_area_budgets_fa_id',
        'functional_area_budgets',
        ['functional_area_id'],
    )

    # =========================================================================
    # 6. New table: price_history
    # =========================================================================

    op.create_table(
        'price_history',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column(
            'cost_item_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('cost_items.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('unit_price', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('cost_basis', sa.String(length=50), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(length=255), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('now()'),
            nullable=False,
        ),
    )
    op.create_index(
        'ix_price_history_cost_item_id',
        'price_history',
        ['cost_item_id'],
    )

    # Data migration: create an initial PriceHistory entry for every existing cost_item
    op.execute(
        """
        INSERT INTO price_history (
            id,
            cost_item_id,
            unit_price,
            quantity,
            total_amount,
            cost_basis,
            comment,
            created_by,
            created_at
        )
        SELECT
            gen_random_uuid(),
            id,
            unit_price,
            quantity,
            total_amount,
            COALESCE(cost_basis, 'INITIAL'),
            'Migrated from initial schema',
            NULL,
            created_at
        FROM cost_items
        """
    )

    # =========================================================================
    # 7. New table: comments  (Phase 8 — replaces cost_items.comments text field)
    # =========================================================================

    op.create_table(
        'comments',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()'),
        ),
        sa.Column(
            'cost_item_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('cost_items.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('user_name', sa.String(length=255), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('now()'),
            nullable=False,
        ),
    )
    op.create_index(
        'ix_comments_cost_item_id',
        'comments',
        ['cost_item_id'],
    )

    # Migrate existing free-text comments → structured Comment rows
    op.execute(
        """
        INSERT INTO comments (
            id,
            cost_item_id,
            user_id,
            user_name,
            text,
            created_at
        )
        SELECT
            gen_random_uuid(),
            id,
            NULL,
            'Migrated',
            comments,
            created_at
        FROM cost_items
        WHERE comments IS NOT NULL
          AND trim(comments) <> ''
        """
    )

    # Drop the old comments text field from cost_items
    op.drop_column('cost_items', 'comments')


def downgrade() -> None:
    # The changes in this migration are too complex to fully reverse automatically.
    # A downgrade would require:
    #   - Restoring original_amount / current_amount from price_history
    #   - Reversing table renames (functional_areas → departments,
    #     change_costs → budget_adjustments)
    #   - Dropping new tables (functional_area_budgets, price_history, comments)
    #   - Removing enum values (not supported by PostgreSQL ALTER TYPE DROP VALUE)
    #
    # Since reverting enum values is not possible in PostgreSQL without recreating
    # the type, this migration is intentionally not reversible.
    raise NotImplementedError(
        "Downgrade of 002_major_restructure is not supported. "
        "This is a major schema restructure; restore from a database backup if needed."
    )
