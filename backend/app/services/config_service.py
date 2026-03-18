"""Centralized configuration service.

Reads and writes the application config (products, phases, cost bases, cost drivers)
from a JSON file so that these values are no longer hardcoded as Python enums.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Module-level cache
_config_cache: dict[str, Any] | None = None


def get_config_path() -> Path:
    """Resolve the path to config.json (backend/config/config.json)."""
    return Path(__file__).resolve().parent.parent.parent / "config" / "config.json"


def load_config() -> dict[str, Any]:
    """Read config.json and return its contents. Caches in a module-level variable."""
    global _config_cache
    if _config_cache is not None:
        return _config_cache

    config_path = get_config_path()
    with open(config_path, "r", encoding="utf-8") as f:
        _config_cache = json.load(f)
    return _config_cache


def save_config(data: dict[str, Any]) -> None:
    """Write data to config.json and clear the cache."""
    global _config_cache
    config_path = get_config_path()
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    _config_cache = None
