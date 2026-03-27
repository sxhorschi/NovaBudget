"""ConfigItem model — stores app-level configuration (products, phases, cost bases, cost drivers)."""
from __future__ import annotations

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ConfigItem(Base):
    __tablename__ = "config_items"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)  # slug, e.g. "bryan"
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # "product" | "phase" | "cost_basis" | "cost_driver"
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return f"<ConfigItem {self.category}/{self.id!r} label={self.label!r}>"
