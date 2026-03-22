from typing import Optional, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.orm import selectinload

from models.gig import Gig, Category, Subcategory
from models.user import User


async def search_gigs(
    db: AsyncSession,
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    subcategory_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    delivery_days: Optional[int] = None,
    min_rating: Optional[float] = None,
    has_reviews: Optional[bool] = None,
    is_online: Optional[bool] = None,
    sort: str = "popular",
    page: int = 1,
    size: int = 20,
    current_user_id: Optional[UUID] = None,
) -> tuple[List[Gig], int]:
    query = (
        select(Gig)
        .options(selectinload(Gig.seller))
        .where(Gig.is_active == True)
    )

    if q:
        search_term = q.strip()
        query = query.where(
            or_(
                Gig.title.ilike(f"%{search_term}%"),
                Gig.description.ilike(f"%{search_term}%"),
                Gig.tags.astext.ilike(f"%{search_term}%"),
            )
        )

    if category_id:
        query = query.where(Gig.category_id == category_id)

    if subcategory_id:
        query = query.where(Gig.subcategory_id == subcategory_id)

    if min_price is not None:
        # Filter by minimum package price
        query = query.where(
            func.cast(
                func.jsonb_path_query_first(
                    Gig.packages,
                    text("'$[*].price ? (@ >= $min)'"),
                ),
                func.Float,
            ) >= min_price
        )

    if min_rating is not None:
        query = query.where(Gig.rating >= min_rating)

    if has_reviews:
        query = query.where(Gig.reviews_count > 0)

    if delivery_days:
        # Filter by min delivery days in packages
        query = query.where(
            func.cast(
                func.jsonb_path_query_first(
                    Gig.packages,
                    text("'$[*].delivery_days'"),
                ),
                func.Integer,
            ) <= delivery_days
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sort
    if sort == "rating":
        query = query.order_by(Gig.rating.desc(), Gig.reviews_count.desc())
    elif sort == "price_asc":
        query = query.order_by(Gig.orders_count.asc())
    elif sort == "price_desc":
        query = query.order_by(Gig.orders_count.desc())
    elif sort == "newest":
        query = query.order_by(Gig.created_at.desc())
    else:  # popular
        query = query.order_by(Gig.is_featured.desc(), Gig.orders_count.desc(), Gig.rating.desc())

    # Paginate
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    result = await db.execute(query)
    gigs = result.scalars().all()

    return list(gigs), total
