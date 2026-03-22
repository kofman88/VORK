import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, BigInteger, Boolean, Integer,
    Numeric, Text, ForeignKey, DateTime, Enum, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base


class UserLevel(str, enum.Enum):
    NEWBIE = "newbie"       # 0-5 orders
    EXPERIENCED = "experienced"  # 6-20, rating 4.0+
    PRO = "pro"             # 21-50, rating 4.5+
    TOP = "top"             # 51+, rating 4.8+


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(JSONB, default=list)
    is_freelancer = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    rating = Column(Numeric(3, 2), default=0.00)
    reviews_count = Column(Integer, default=0)
    completed_orders = Column(Integer, default=0)
    balance = Column(Numeric(12, 2), default=0.00)
    stars_balance = Column(Integer, default=0)
    referral_code = Column(String(20), unique=True, nullable=True)
    referred_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    language = Column(String(5), default="ru")
    level = Column(Enum(UserLevel), default=UserLevel.NEWBIE)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    gigs = relationship("Gig", back_populates="seller", foreign_keys="Gig.seller_id")
    buyer_orders = relationship("Order", back_populates="buyer", foreign_keys="Order.buyer_id")
    seller_orders = relationship("Order", back_populates="seller", foreign_keys="Order.seller_id")
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    received_messages = relationship("Message", back_populates="receiver", foreign_keys="Message.receiver_id")
    given_reviews = relationship("Review", back_populates="reviewer", foreign_keys="Review.reviewer_id")
    received_reviews = relationship("Review", back_populates="reviewee", foreign_keys="Review.reviewee_id")
    transactions = relationship("Transaction", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    referrals = relationship("User", foreign_keys=[referred_by])

    @property
    def is_online(self) -> bool:
        if not self.last_seen:
            return False
        from datetime import timezone, timedelta
        now = datetime.now(timezone.utc)
        delta = now - self.last_seen.replace(tzinfo=timezone.utc) if self.last_seen.tzinfo is None else now - self.last_seen
        return delta.total_seconds() < 300  # 5 minutes

    def compute_level(self) -> UserLevel:
        if self.completed_orders >= 51 and float(self.rating) >= 4.8:
            return UserLevel.TOP
        elif self.completed_orders >= 21 and float(self.rating) >= 4.5:
            return UserLevel.PRO
        elif self.completed_orders >= 6 and float(self.rating) >= 4.0:
            return UserLevel.EXPERIENCED
        return UserLevel.NEWBIE
