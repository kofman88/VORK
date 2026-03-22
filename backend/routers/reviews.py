from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database import get_db
from models.review import Review
from models.order import Order, OrderStatus
from models.user import User
from models.gig import Gig
from schemas.review import ReviewOut, ReviewCreate, ReviewReply
from routers.deps import get_current_user
from services.notification_service import notify_new_review, create_notification
from models.notification import NotificationType

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut)
async def create_review(
    data: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.seller), selectinload(Order.buyer))
        .where(Order.id == data.order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(400, "Order must be completed to leave review")
    if order.buyer_id != user.id and order.seller_id != user.id:
        raise HTTPException(403, "Not your order")

    is_buyer_review = order.buyer_id == user.id
    if is_buyer_review and order.is_rated_by_buyer:
        raise HTTPException(400, "Already reviewed")
    if not is_buyer_review and order.is_rated_by_seller:
        raise HTTPException(400, "Already reviewed")

    # Check no duplicate review
    existing = await db.execute(
        select(Review).where(
            Review.order_id == data.order_id,
            Review.reviewer_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Already reviewed this order")

    reviewee_id = order.seller_id if is_buyer_review else order.buyer_id
    review = Review(
        order_id=data.order_id,
        reviewer_id=user.id,
        reviewee_id=reviewee_id,
        gig_id=order.gig_id,
        rating=data.rating,
        communication_rating=data.communication_rating,
        quality_rating=data.quality_rating,
        deadline_rating=data.deadline_rating,
        comment=data.comment,
        is_buyer_review=is_buyer_review,
    )
    db.add(review)

    if is_buyer_review:
        order.is_rated_by_buyer = True
    else:
        order.is_rated_by_seller = True

    # Update seller/gig rating
    if is_buyer_review:
        await _update_ratings(db, order.seller_id, order.gig_id)

    await db.commit()
    await db.refresh(review)

    # Notify reviewee
    try:
        reviewee_result = await db.execute(select(User).where(User.id == reviewee_id))
        reviewee = reviewee_result.scalar_one_or_none()
        gig_result = await db.execute(select(Gig).where(Gig.id == order.gig_id))
        gig = gig_result.scalar_one_or_none()
        if reviewee and gig:
            await notify_new_review(reviewee.telegram_id, gig.title, data.rating)
            await create_notification(db, reviewee_id, NotificationType.NEW_REVIEW,
                                       "Новый отзыв!", f"Оценка: {data.rating}/5",
                                       {"gig_id": str(order.gig_id)})
    except Exception:
        pass

    result = await db.execute(
        select(Review).options(selectinload(Review.reviewer)).where(Review.id == review.id)
    )
    return result.scalar_one()


async def _update_ratings(db: AsyncSession, seller_id: UUID, gig_id: UUID):
    """Recalculate seller and gig ratings after new review."""
    # Gig rating
    gig_rating_result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.gig_id == gig_id, Review.is_buyer_review == True)
    )
    gig_avg, gig_count = gig_rating_result.one()

    gig_result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = gig_result.scalar_one_or_none()
    if gig:
        gig.rating = round(float(gig_avg or 0), 2)
        gig.reviews_count = gig_count or 0

    # Seller rating
    seller_rating_result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.reviewee_id == seller_id, Review.is_buyer_review == True)
    )
    seller_avg, seller_count = seller_rating_result.one()

    seller_result = await db.execute(select(User).where(User.id == seller_id))
    seller = seller_result.scalar_one_or_none()
    if seller:
        seller.rating = round(float(seller_avg or 0), 2)
        seller.reviews_count = seller_count or 0
        seller.level = seller.compute_level()


@router.get("/gig/{gig_id}", response_model=List[ReviewOut])
async def get_gig_reviews(
    gig_id: UUID,
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Review)
        .options(selectinload(Review.reviewer))
        .where(Review.gig_id == gig_id, Review.is_buyer_review == True)
        .order_by(Review.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{review_id}/reply")
async def reply_to_review(
    review_id: UUID,
    data: ReviewReply,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(404, "Review not found")
    if review.reviewee_id != user.id:
        raise HTTPException(403, "Can only reply to reviews about you")
    if review.seller_reply:
        raise HTTPException(400, "Already replied")

    review.seller_reply = data.seller_reply
    await db.commit()
    return {"status": "ok"}
