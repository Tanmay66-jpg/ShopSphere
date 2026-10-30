"""SQLAlchemy models for ShopSphere product catalogue."""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict
from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, Index, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy entities."""
    pass


class Product(Base):
    """Product model for persistent SQLite storage.

    Money Representation:
        Prices are strictly persisted in integer `price_paise` (1 INR = 100 paise)
        to prevent floating-point rounding errors in transactions.
        Example: ₹14,999 is stored as 1499900 paise.
    """

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(2000), default="", nullable=False)
    price_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_url: Mapped[str] = mapped_column(String(1000), default="", nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=4.8, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("price_paise > 0", name="check_positive_price"),
        CheckConstraint("stock_quantity >= 0", name="check_non_negative_stock"),
        Index("idx_product_category_stock", "category", "is_available"),
    )

    @property
    def price_rupees(self) -> float:
        """Return price in rupees for display formatting."""
        return self.price_paise / 100.0

    @classmethod
    def normalize_name(cls, name: str) -> str:
        """Return consistent normalized string using whitespace trimming and case-folding."""
        return " ".join(name.strip().casefold().split())

    def to_dict(self) -> Dict[str, Any]:
        """Serialize model into dictionary matching frontend types."""
        return {
            "id": self.id,
            "sku": self.sku,
            "name": self.name,
            "normalized_name": self.normalized_name,
            "category": self.category,
            "description": self.description,
            "price": self.price_rupees,
            "price_paise": self.price_paise,
            "stock_quantity": self.stock_quantity,
            "is_available": self.is_available,
            "image_url": self.image_url,
            "rating": round(self.rating, 1),
            "rating_count": self.rating_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<Product(id={self.id}, sku={self.sku!r}, name={self.name!r}, "
            f"price_paise={self.price_paise}, stock={self.stock_quantity})>"
        )
