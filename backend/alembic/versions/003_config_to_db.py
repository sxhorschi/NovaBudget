"""config_to_db: migrate products, phases, cost_bases, cost_drivers from CSV into config_items table.

Revision ID: 003_config_to_db
Revises: 002_major_restructure
Create Date: 2026-03-27 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "003_config_to_db"
down_revision: Union[str, None] = "002_major_restructure"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------------------------------------------------------------------------
# Seed data — copied from CSV files
# Each tuple: (id, label, sort_order)
# ---------------------------------------------------------------------------

PRODUCTS = [
    ("bryan", "Bryan", 0),
    ("gnther", "Günther", 1),
    ("gintonic", "Gin-Tonic", 2),
    ("overall_product_independent", "overall - product independent", 3),
]

PHASES = [
    ("phase_1_initial_production_start_bryan", "Phase 1: Initial Production Start - Bryan", 0),
    ("phase_2_rampup_eg_conveyor_bryan", "Phase 2: Ramp-Up (e.g. Conveyor) - Bryan", 1),
    ("phase_3_new_product_integration_gnther_gintonic", "Phase 3: New Product Integration - Günther / Gin-Tonic", 2),
    ("phase_4_output_increase_optimization", "Phase 4: Output increase / Optimization", 3),
    ("phase_5_automation_max_capa", "Phase 5: Automation / max. Capa", 4),
]

COST_BASES = [
    ("cost_estimation", "Cost Estimation", 0),
    ("initial_supplier_offer", "Initial Supplier Offer", 1),
    ("revised_supplier_offer", "Revised Supplier Offer", 2),
    ("change_cost", "Change Cost", 3),
]

COST_DRIVERS = [
    ("product", "Product", 0),
    ("process", "Process", 1),
    ("assembly_new_requirements", "Assembly - new requirements", 2),
    ("testing_new_requirements", "Testing - new requirements", 3),
    ("initial_setup", "Initial Setup", 4),
]


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS config_items (
            id VARCHAR(100) PRIMARY KEY,
            category VARCHAR(50) NOT NULL,
            label VARCHAR(255) NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_config_items_category ON config_items (category)")

    _insert_items("product", PRODUCTS)
    _insert_items("phase", PHASES)
    _insert_items("cost_basis", COST_BASES)
    _insert_items("cost_driver", COST_DRIVERS)


def _insert_items(category: str, items: list[tuple[str, str, int]]) -> None:
    stmt = text(
        "INSERT INTO config_items (id, category, label, sort_order) "
        "VALUES (:id, :category, :label, :sort_order) "
        "ON CONFLICT DO NOTHING"
    )
    for item_id, label, sort_order in items:
        op.execute(stmt.bindparams(id=item_id, category=category, label=label, sort_order=sort_order))


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS config_items")
