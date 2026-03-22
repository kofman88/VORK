from pydantic import BaseModel, Field
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from models.user import UserLevel


class UserOut(BaseModel):
    id: UUID
    telegram_id: int
    username: Optional[str] = None
    first_name: str
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    skills: List[str] = []
    is_freelancer: bool
    is_verified: bool
    rating: float
    reviews_count: int
    completed_orders: int
    level: UserLevel
    is_online: bool = False
    referral_code: Optional[str] = None
    language: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    is_freelancer: Optional[bool] = None
    language: Optional[str] = None


class UserStats(BaseModel):
    total_earned: float
    total_spent: float
    active_orders: int
    completed_orders: int
    pending_orders: int
    avg_rating: float
    views_this_month: int
    earnings_chart: List[dict] = []
