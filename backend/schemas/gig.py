from pydantic import BaseModel, Field
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


class PackageSchema(BaseModel):
    name: str  # basic | standard | premium
    description: str
    price: float
    delivery_days: int
    revisions: int
    features: List[str] = []


class FAQItem(BaseModel):
    question: str
    answer: str


class GalleryItem(BaseModel):
    url: str
    type: str  # image | video
    thumbnail: Optional[str] = None


class SubcategoryOut(BaseModel):
    id: int
    name: str
    name_en: Optional[str] = None
    slug: str

    class Config:
        from_attributes = True


class CategoryOut(BaseModel):
    id: int
    name: str
    name_en: Optional[str] = None
    slug: str
    emoji: Optional[str] = None
    icon: Optional[str] = None
    subcategories: List[SubcategoryOut] = []

    class Config:
        from_attributes = True


class SellerShort(BaseModel):
    id: UUID
    username: Optional[str] = None
    first_name: str
    avatar_url: Optional[str] = None
    rating: float
    reviews_count: int
    completed_orders: int
    is_verified: bool
    is_online: bool = False
    level: str

    class Config:
        from_attributes = True


class GigCreate(BaseModel):
    title: str = Field(..., min_length=10, max_length=100)
    description: str = Field(..., min_length=50)
    category_id: int
    subcategory_id: Optional[int] = None
    tags: List[str] = []
    packages: List[PackageSchema] = Field(..., min_length=1, max_length=3)
    requirements: Optional[str] = None
    faq: List[FAQItem] = []


class GigUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=10, max_length=100)
    description: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    tags: Optional[List[str]] = None
    packages: Optional[List[PackageSchema]] = None
    requirements: Optional[str] = None
    faq: Optional[List[FAQItem]] = None
    is_active: Optional[bool] = None


class GigOut(BaseModel):
    id: UUID
    seller_id: UUID
    seller: Optional[SellerShort] = None
    title: str
    description: str
    category_id: int
    subcategory_id: Optional[int] = None
    tags: List[str] = []
    packages: List[dict] = []
    gallery: List[dict] = []
    requirements: Optional[str] = None
    faq: List[dict] = []
    is_active: bool
    is_featured: bool
    views_count: int
    orders_count: int
    rating: float
    reviews_count: int
    avg_response_time: Optional[int] = None
    min_price: float = 0
    min_delivery_days: int = 1
    is_favorited: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GigListOut(BaseModel):
    items: List[GigOut]
    total: int
    page: int
    size: int
    pages: int
