import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Text,
    ForeignKey, DateTime, Numeric, Enum, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    REVISION = "revision"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class PaymentMethod(str, enum.Enum):
    STARS = "stars"
    TON = "ton"
    CARD = "card"


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(20), unique=True, nullable=False)
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id"), nullable=False, index=True)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    package_name = Column(String(50), nullable=False)
    package_snapshot = Column(JSONB, nullable=False)
    requirements_text = Column(Text, nullable=True)
    requirements_files = Column(JSONB, default=list)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    stars_price = Column(Integer, nullable=True)
    platform_fee = Column(Numeric(12, 2), nullable=False, default=0)
    delivery_deadline = Column(DateTime(timezone=True), nullable=True)
    revision_deadline = Column(DateTime(timezone=True), nullable=True)
    revisions_used = Column(Integer, default=0)
    delivery_files = Column(JSONB, default=list)
    delivery_note = Column(Text, nullable=True)
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    cancel_reason = Column(Text, nullable=True)
    dispute_reason = Column(Text, nullable=True)
    is_rated_by_buyer = Column(Boolean, default=False)
    is_rated_by_seller = Column(Boolean, default=False)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    payment_tx_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    gig = relationship("Gig", back_populates="orders")
    buyer = relationship("User", back_populates="buyer_orders", foreign_keys=[buyer_id])
    seller = relationship("User", back_populates="seller_orders", foreign_keys=[seller_id])
    messages = relationship("Message", back_populates="order")
    review = relationship("Review", back_populates="order", uselist=False)
    transactions = relationship("Transaction", back_populates="order")
