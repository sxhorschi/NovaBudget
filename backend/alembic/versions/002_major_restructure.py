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
    # All DDL uses IF EXISTS / IF NOT EXISTS to be fully idempotent.
    # The autocommit_block for ALTER TYPE is placed LAST so it doesn't
    # partially commit mid-migration on failure.

    # =========================================================================
    # 1. cost_items: add new columns, remove old ones
    # =========================================================================

    op.execute("ALTER TABLE cost_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,2)")
    op.execute("ALTER TABLE cost_items ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,2) DEFAULT 1")
    op.execute("ALTER TABLE cost_items ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2)")

    # Data migration: derive new fields from existing columns where possible
    op.execute(
        """
        UPDATE cost_items
        SET
            unit_price   = COALESCE(
                               CASE WHEN column_exists THEN original_amount ELSE NULL END,
                               0
                           ),
            quantity     = 1,
            total_amount = COALESCE(
                               CASE WHEN column_exists THEN current_amount ELSE NULL END,
                               0
                           )
        FROM (SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name='cost_items' AND column_name='current_amount'
        ) AS column_exists) AS check_col
        WHERE unit_price IS NULL OR total_amount IS NULL
        """
    )

    # Simpler idempotent data migration using DO block
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='cost_items' AND column_name='original_amount'
            ) THEN
                UPDATE cost_items
                SET
                    unit_price   = COALESCE(original_amount, 0),
                    quantity     = 1,
                    total_amount = COALESCE(current_amount, original_amount, 0)
                WHERE unit_price IS NULL OR total_amount IS NULL;
            ELSE
                UPDATE cost_items
                SET unit_price = 0, quantity = 1, total_amount = 0
                WHERE unit_price IS NULL OR total_amount IS NULL;
            END IF;
        END
        $$
        """
    )

    # Drop old pricing columns if they still exist
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cost_items' AND column_name='original_amount') THEN
                ALTER TABLE cost_items DROP COLUMN original_amount;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cost_items' AND column_name='current_amount') THEN
                ALTER TABLE cost_items DROP COLUMN current_amount;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cost_items' AND column_name='zielanpassung') THEN
                ALTER TABLE cost_items DROP COLUMN zielanpassung;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cost_items' AND column_name='zielanpassung_reason') THEN
                ALTER TABLE cost_items DROP COLUMN zielanpassung_reason;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cost_items' AND column_name='comments') THEN
                ALTER TABLE cost_items DROP COLUMN comments;
            END IF;
        END
        $$
        """
    )

    op.execute("DROP INDEX IF EXISTS ix_cost_items_current_amount")
    op.execute("CREATE INDEX IF NOT EXISTS ix_cost_items_total_amount ON cost_items (total_amount)")

    # =========================================================================
    # 2. departments → functional_areas
    # =========================================================================

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='departments') THEN
                ALTER TABLE departments RENAME TO functional_areas;
            END IF;
        END
        $$
        """
    )

    # Rename FK columns (idempotent)
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='work_areas' AND column_name='department_id') THEN
                ALTER TABLE work_areas RENAME COLUMN department_id TO functional_area_id;
            END IF;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attachments' AND column_name='department_id') THEN
                ALTER TABLE attachments RENAME COLUMN department_id TO functional_area_id;
            END IF;
        END
        $$
        """
    )

    # Recreate check constraint with new column name
    op.execute("ALTER TABLE attachments DROP CONSTRAINT IF EXISTS ck_attachment_exactly_one_parent")
    op.execute(
        """
        ALTER TABLE attachments ADD CONSTRAINT ck_attachment_exactly_one_parent CHECK (
            (cost_item_id IS NOT NULL AND work_area_id IS NULL AND functional_area_id IS NULL)
            OR (cost_item_id IS NULL AND work_area_id IS NOT NULL AND functional_area_id IS NULL)
            OR (cost_item_id IS NULL AND work_area_id IS NULL AND functional_area_id IS NOT NULL)
        )
        """
    )

    # =========================================================================
    # 3. budget_adjustments → change_costs
    # =========================================================================

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='budget_adjustments') THEN
                ALTER TABLE budget_adjustments RENAME TO change_costs;
            END IF;
        END
        $$
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='change_costs' AND column_name='department_id') THEN
                ALTER TABLE change_costs RENAME COLUMN department_id TO functional_area_id;
            END IF;
        END
        $$
        """
    )

    op.execute("ALTER TABLE change_costs ADD COLUMN IF NOT EXISTS cost_driver VARCHAR(50)")
    op.execute("ALTER TABLE change_costs ADD COLUMN IF NOT EXISTS budget_relevant BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE change_costs ADD COLUMN IF NOT EXISTS year INTEGER")

    op.execute("DROP INDEX IF EXISTS ix_budget_adjustments_department_id")
    op.execute("CREATE INDEX IF NOT EXISTS ix_change_costs_functional_area_id ON change_costs (functional_area_id)")

    # =========================================================================
    # 4. New table: functional_area_budgets
    # =========================================================================

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS functional_area_budgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            functional_area_id UUID NOT NULL REFERENCES functional_areas(id) ON DELETE CASCADE,
            year INTEGER NOT NULL,
            amount NUMERIC(15,2) NOT NULL,
            comment TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            updated_at TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT uq_fab_fa_year UNIQUE (functional_area_id, year)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_functional_area_budgets_fa_id ON functional_area_budgets (functional_area_id)")

    # =========================================================================
    # 5. New table: price_history
    # =========================================================================

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS price_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cost_item_id UUID NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
            unit_price NUMERIC(15,2) NOT NULL,
            quantity NUMERIC(15,2) NOT NULL,
            total_amount NUMERIC(15,2) NOT NULL,
            cost_basis VARCHAR(50) NOT NULL,
            comment TEXT,
            created_by VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_price_history_cost_item_id ON price_history (cost_item_id)")

    # Seed initial price history for existing items (only if table was just created/empty)
    op.execute(
        """
        INSERT INTO price_history (cost_item_id, unit_price, quantity, total_amount, cost_basis, comment, created_at)
        SELECT id, COALESCE(unit_price,0), COALESCE(quantity,1), COALESCE(total_amount,0),
               COALESCE(cost_basis, 'cost_estimation'), 'Migrated from initial schema', created_at
        FROM cost_items ci
        WHERE NOT EXISTS (SELECT 1 FROM price_history ph WHERE ph.cost_item_id = ci.id)
        """
    )

    # =========================================================================
    # 6. New table: comments
    # =========================================================================

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cost_item_id UUID NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            user_name VARCHAR(255) NOT NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_comments_cost_item_id ON comments (cost_item_id)")

    # =========================================================================
    # 7. New enum values — MUST be last (autocommit_block commits everything above)
    # =========================================================================

    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'REVIEWED'")
        op.execute("ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_SENT'")
        op.execute("ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER_CONFIRMED'")
        op.execute("ALTER TYPE approval_status ADD VALUE IF NOT EXISTS 'DELIVERED'")


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
