import uuid
import enum
from sqlalchemy import (
    Column, String, Boolean, Text, ForeignKey, DateTime, Enum, func, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class MessageType(str, enum.Enum):
    TEXT = "text"
    FILE = "file"
    IMAGE = "image"
    ORDER_UPDATE = "order_update"
    SYSTEM = "system"


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=True, index=True)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    attachments = Column(JSON, default=list)
    message_type = Column(Enum(MessageType), default=MessageType.TEXT)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    receiver = relationship("User", back_populates="received_messages", foreign_keys=[receiver_id])
