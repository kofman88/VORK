from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from database import get_db
from models.user import User
from models.order import Order, OrderStatus
from models.transaction import Transaction, TransactionType
from schemas.user import UserOut, UserUpdate, UserStats
from routers.deps import get_current_user
from services.file_service import save_avatar

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    if data.is_freelancer is not None and data.is_freelancer:
        user.is_freelancer = True

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    url = await save_avatar(file, str(user.id))
    user.avatar_url = url
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me/stats", response_model=UserStats)
async def get_my_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total earned
    earned_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.user_id == user.id)
        .where(Transaction.type == TransactionType.ORDER_EARNING)
    )
    total_earned = float(earned_result.scalar() or 0)

    # Total spent
    spent_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.user_id == user.id)
        .where(Transaction.type == TransactionType.ORDER_PAYMENT)
    )
    total_spent = float(spent_result.scalar() or 0)

    # Active orders
    active_result = await db.execute(
        select(func.count(Order.id))
        .where(
            (Order.buyer_id == user.id) | (Order.seller_id == user.id)
        )
        .where(Order.status.in_([OrderStatus.PENDING, OrderStatus.IN_PROGRESS, OrderStatus.REVISION, OrderStatus.DELIVERED]))
    )
    active_orders = active_result.scalar() or 0

    # Completed orders
    completed_result = await db.execute(
        select(func.count(Order.id))
        .where(
            (Order.buyer_id == user.id) | (Order.seller_id == user.id)
        )
        .where(Order.status == OrderStatus.COMPLETED)
    )
    completed_orders = completed_result.scalar() or 0

    return UserStats(
        total_earned=total_earned,
        total_spent=total_spent,
        active_orders=active_orders,
        completed_orders=completed_orders,
        pending_orders=0,
        avg_rating=float(user.rating),
        views_this_month=0,
        earnings_chart=[],
    )


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    return user
