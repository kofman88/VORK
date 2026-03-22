from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models.user import User
from models.transaction import Transaction, TransactionType
from routers.deps import get_current_user
from config import settings

router = APIRouter(prefix="/api/referral", tags=["referral"])


@router.get("/link")
async def get_referral_link(user: User = Depends(get_current_user)):
    bot_username = "VorkBot"  # Replace with actual bot username
    return {
        "link": f"https://t.me/{bot_username}?start=ref_{user.referral_code}",
        "code": user.referral_code,
    }


@router.get("/stats")
async def get_referral_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Count referrals
    result = await db.execute(
        select(func.count(User.id)).where(User.referred_by == user.id)
    )
    total_referrals = result.scalar() or 0

    # Total earned from referrals
    bonus_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.REFERRAL_BONUS,
        )
    )
    total_bonus = float(bonus_result.scalar() or 0)

    return {
        "referral_code": user.referral_code,
        "total_referrals": total_referrals,
        "total_bonus_earned": total_bonus,
        "bonus_percent": 5,
    }
