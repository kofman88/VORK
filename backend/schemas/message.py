from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from models.message import MessageType


class MessageCreate(BaseModel):
    receiver_id: UUID
    order_id: Optional[UUID] = None
    content: Optional[str] = None
    message_type: MessageType = MessageType.TEXT


class UserShort(BaseModel):
    id: UUID
    username: Optional[str] = None
    first_name: str
    avatar_url: Optional[str] = None
    is_online: bool = False

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: UUID
    order_id: Optional[UUID] = None
    sender_id: UUID
    sender: Optional[UserShort] = None
    receiver_id: UUID
    content: Optional[str] = None
    attachments: List[dict] = []
    message_type: MessageType
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    user: UserShort
    last_message: Optional[MessageOut] = None
    unread_count: int = 0
    order_id: Optional[UUID] = None
