from pydantic import BaseModel
from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from models.notification import NotificationType


class NotificationOut(BaseModel):
    id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    body: str
    data: dict = {}
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
