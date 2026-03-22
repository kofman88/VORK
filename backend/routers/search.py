from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User
from schemas.gig import GigListOut
from routers.deps import get_current_user
from routers.gigs import gig_to_out
from services.search_service import search_gigs
import math

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=GigListOut)
async def search(
    q: Optional[str] = Query(None),
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    delivery: Optional[int] = None,
    rating: Optional[float] = None,
    has_reviews: Optional[bool] = None,
    is_online: Optional[bool] = None,
    sort: str = Query("popular", enum=["popular", "rating", "price_asc", "price_desc", "newest"]),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    gigs, total = await search_gigs(
        db=db,
        q=q,
        category_id=category_id,
        subcategory_id=subcategory_id,
        min_price=min_price,
        max_price=max_price,
        delivery_days=delivery,
        min_rating=rating,
        has_reviews=has_reviews,
        is_online=is_online,
        sort=sort,
        page=page,
        size=size,
    )

    return GigListOut(
        items=[gig_to_out(g, current_user) for g in gigs],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )
