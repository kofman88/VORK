from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from models.order import OrderStatus, PaymentMethod


class OrderCreate(BaseModel):
    gig_id: UUID
    package_name: str  # basic | standard | premium
    requirements_text: Optional[str] = None
    payment_method: PaymentMethod = PaymentMethod.STARS


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    reason: Optional[str] = None


class DeliverOrder(BaseModel):
    delivery_note: Optional[str] = None
    delivery_files: List[dict] = []


class RevisionRequest(BaseModel):
    reason: str


class DisputeRequest(BaseModel):
    reason: str


class GigShort(BaseModel):
    id: UUID
    title: str
    gallery: List[dict] = []

    class Config:
        from_attributes = True


class UserShort(BaseModel):
    id: UUID
    username: Optional[str] = None
    first_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: UUID
    order_number: str
    gig_id: UUID
    gig: Optional[GigShort] = None
    buyer_id: UUID
    buyer: Optional[UserShort] = None
    seller_id: UUID
    seller: Optional[UserShort] = None
    package_name: str
    package_snapshot: dict
    requirements_text: Optional[str] = None
    status: OrderStatus
    price: float
    stars_price: Optional[int] = None
    platform_fee: float
    delivery_deadline: Optional[datetime] = None
    revision_deadline: Optional[datetime] = None
    revisions_used: int
    delivery_files: List[dict] = []
    delivery_note: Optional[str] = None
    cancel_reason: Optional[str] = None
    dispute_reason: Optional[str] = None
    is_rated_by_buyer: bool
    is_rated_by_seller: bool
    payment_method: Optional[PaymentMethod] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
