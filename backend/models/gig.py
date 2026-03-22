import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Text,
    ForeignKey, DateTime, Numeric, func, Index, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    name_en = Column(String(100), nullable=True)
    slug = Column(String(100), nullable=False, unique=True)
    emoji = Column(String(10), nullable=True)
    icon = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    subcategories = relationship("Subcategory", back_populates="category")
    gigs = relationship("Gig", back_populates="category")


class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=True)
    slug = Column(String(100), nullable=False, unique=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    category = relationship("Category", back_populates="subcategories")
    gigs = relationship("Gig", back_populates="subcategory")


class Gig(Base):
    __tablename__ = "gigs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seller_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    tags = Column(JSON, default=list)
    packages = Column(JSON, nullable=False, default=list)
    # [{name, description, price, delivery_days, revisions, features: []}]
    gallery = Column(JSON, default=list)
    # [{url, type: image|video, thumbnail}]
    requirements = Column(Text, nullable=True)
    faq = Column(JSON, default=list)
    # [{question, answer}]
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    views_count = Column(Integer, default=0)
    orders_count = Column(Integer, default=0)
    rating = Column(Numeric(3, 2), default=0.00)
    reviews_count = Column(Integer, default=0)
    avg_response_time = Column(Integer, nullable=True)  # minutes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    seller = relationship("User", back_populates="gigs", foreign_keys=[seller_id])
    category = relationship("Category", back_populates="gigs")
    subcategory = relationship("Subcategory", back_populates="gigs")
    orders = relationship("Order", back_populates="gig")
    reviews = relationship("Review", back_populates="gig")
    favorites = relationship("Favorite", back_populates="gig")

    @property
    def min_price(self) -> float:
        if not self.packages:
            return 0
        return min(p.get("price", 0) for p in self.packages)

    @property
    def min_delivery_days(self) -> int:
        if not self.packages:
            return 1
        return min(p.get("delivery_days", 1) for p in self.packages)


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    gig_id = Column(String(36), ForeignKey("gigs.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="favorites")
    gig = relationship("Gig", back_populates="favorites")

    __table_args__ = (
        Index("ix_favorites_user_gig", "user_id", "gig_id", unique=True),
    )
