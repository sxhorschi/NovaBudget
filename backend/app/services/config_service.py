"""Centralized configuration service.

Reads and writes the application config (products, phases, cost bases, cost drivers)
from the config_items table in PostgreSQL.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.config_item import ConfigItem

# Mapping from DB category value → config dict key
_CATEGORY_TO_KEY: dict[str, str] = {
    "product": "products",
    "phase": "phases",
    "cost_basis": "cost_bases",
    "cost_driver": "cost_drivers",
}

# Mapping from config dict key → DB category value
_KEY_TO_CATEGORY: dict[str, str] = {v: k for k, v in _CATEGORY_TO_KEY.items()}


async def load_config(session: AsyncSession) -> dict[str, Any]:
    """Read all config items from the DB and return a unified dict."""
    result = await session.execute(
        select(ConfigItem).order_by(ConfigItem.category, ConfigItem.sort_order)
    )
    items = result.scalars().all()

    config: dict[str, Any] = {"products": [], "phases": [], "cost_bases": [], "cost_drivers": []}
    for item in items:
        key = _CATEGORY_TO_KEY.get(item.category)
        if key:
            config[key].append({"id": item.id, "label": item.label})
    return config


async def save_config(session: AsyncSession, data: dict[str, Any]) -> None:
    """Write config data to the DB (delete-then-reinsert per category).

    Raises ``ValueError`` if a removed config item is still referenced by
    one or more CostItem records.
    """
    from app.models.cost_item import CostItem

    for key, category in _KEY_TO_CATEGORY.items():
        if key not in data:
            continue

        # Check for removed items that are still referenced
        current_result = await session.execute(
            select(ConfigItem).where(ConfigItem.category == category)
        )
        current_items = current_result.scalars().all()
        current_ids = {item.id for item in current_items}
        new_ids = {item["id"] for item in data[key]}
        removed_ids = current_ids - new_ids

        if removed_ids:
            for rid in removed_ids:
                ref_stmt = None
                if category == "product":
                    ref_stmt = select(CostItem.id).where(CostItem.product == rid).limit(1)
                elif category == "phase":
                    ref_stmt = select(CostItem.id).where(CostItem.project_phase == rid).limit(1)
                elif category == "cost_basis":
                    ref_stmt = select(CostItem.id).where(CostItem.cost_basis == rid).limit(1)
                elif category == "cost_driver":
                    ref_stmt = select(CostItem.id).where(CostItem.cost_driver == rid).limit(1)
                if ref_stmt is not None:
                    ref_result = await session.execute(ref_stmt)
                    if ref_result.scalar_one_or_none():
                        # Find the label for a better error message
                        label = rid
                        for ci in current_items:
                            if ci.id == rid:
                                label = ci.label
                                break
                        raise ValueError(
                            f"Cannot remove '{label}' ({category}) — still referenced by cost items"
                        )

        # Delete existing rows for this category, then re-insert in given order
        await session.execute(delete(ConfigItem).where(ConfigItem.category == category))
        for sort_order, item in enumerate(data[key]):
            session.add(
                ConfigItem(
                    id=item["id"],
                    category=category,
                    label=item["label"],
                    sort_order=sort_order,
                )
            )
    await session.commit()
