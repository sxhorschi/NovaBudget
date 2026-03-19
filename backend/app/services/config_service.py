"""Centralized configuration service.

Reads and writes the application config (products, phases, cost bases, cost drivers)
from CSV files in backend/data/ so they are consistent with the rest of the data store.
"""

from __future__ import annotations

from typing import Any

from app.services.data_store import read_csv, write_csv

# Module-level cache
_config_cache: dict[str, Any] | None = None

# Mapping from config key to CSV filename
_CONFIG_FILES: dict[str, str] = {
    "products": "products.csv",
    "phases": "phases.csv",
    "cost_bases": "cost_bases.csv",
    "cost_drivers": "cost_drivers.csv",
}

_CONFIG_FIELDS = ["id", "label"]


def load_config() -> dict[str, Any]:
    """Read all config CSV files and return a unified dict. Caches in a module-level variable."""
    global _config_cache
    if _config_cache is not None:
        return _config_cache

    config: dict[str, Any] = {}
    for key, filename in _CONFIG_FILES.items():
        rows = read_csv(filename)
        config[key] = [{"id": r["id"], "label": r["label"]} for r in rows]

    _config_cache = config
    return _config_cache


def save_config(data: dict[str, Any]) -> None:
    """Write config data to CSV files and clear the cache."""
    global _config_cache

    for key, filename in _CONFIG_FILES.items():
        if key in data:
            items = data[key]
            write_csv(filename, items, _CONFIG_FIELDS)

    _config_cache = None
