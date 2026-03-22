from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ReviewCreate(BaseModel):
    order_id: UUID
    rating: int = Field(..., ge=1, le=5)
    communication_rating: int = Field(..., ge=1, le=5)
    quality_rating: int = Field(..., ge=1, le=5)
    deadline_rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewReply(BaseModel):
    seller_reply: str


class ReviewerShort(BaseModel):
    id: UUID
    username: Optional[str] = None
    first_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewOut(BaseModel):
    id: UUID
    order_id: UUID
    reviewer_id: UUID
    reviewer: Optional[ReviewerShort] = None
    reviewee_id: UUID
    gig_id: UUID
    rating: int
    communication_rating: int
    quality_rating: int
    deadline_rating: int
    comment: Optional[str] = None
    seller_reply: Optional[str] = None
    is_buyer_review: bool
    created_at: datetime

    class Config:
        from_attributes = True
