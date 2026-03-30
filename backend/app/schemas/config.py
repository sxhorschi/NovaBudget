"""Pydantic schemas for application configuration."""

from typing import Any

from pydantic import BaseModel


class ConfigUpdate(BaseModel):
    """Schema for updating application configuration.

    Keys are category names (products, phases, cost_bases, cost_drivers).
    Values are lists of config items with 'slug' and 'label' fields.
    """

    products: list[dict[str, Any]] | None = None
    phases: list[dict[str, Any]] | None = None
    cost_bases: list[dict[str, Any]] | None = None
    cost_drivers: list[dict[str, Any]] | None = None
