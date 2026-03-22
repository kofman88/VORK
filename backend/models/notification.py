import uuid
import enum
from sqlalchemy import (
    Column, String, Boolean, Text, ForeignKey, DateTime, Enum, func, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class NotificationType(str, enum.Enum):
    NEW_ORDER = "new_order"
    NEW_MESSAGE = "new_message"
    ORDER_STATUS = "order_status"
    DEADLINE_REMINDER = "deadline_reminder"
    NEW_REVIEW = "new_review"
    REVISION_REQUEST = "revision_request"
    ORDER_COMPLETED = "order_completed"
    REFERRAL_BONUS = "referral_bonus"
    PAYMENT_RECEIVED = "payment_received"
    SYSTEM = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    data = Column(JSON, default=dict)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
