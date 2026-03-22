from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models.user import User
from models.transaction import Transaction, TransactionType, TransactionStatus, Currency
from schemas.transaction import WalletOut, TransactionOut, WithdrawRequest, DepositRequest
from routers.deps import get_current_user
from config import settings

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("", response_model=WalletOut)
async def get_wallet(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total earned
    earned_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.ORDER_EARNING,
            Transaction.status == TransactionStatus.COMPLETED,
        )
    )
    total_earned = float(earned_result.scalar() or 0)

    # Total withdrawn
    withdrawn_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.WITHDRAWAL,
            Transaction.status == TransactionStatus.COMPLETED,
        )
    )
    total_withdrawn = float(withdrawn_result.scalar() or 0)

    return WalletOut(
        balance=float(user.balance),
        stars_balance=user.stars_balance,
        ton_balance=0.0,
        total_earned=total_earned,
        total_withdrawn=total_withdrawn,
        pending_clearance=0.0,
    )


@router.get("/transactions", response_model=List[TransactionOut])
async def get_transactions(
    page: int = 1,
    size: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    return result.scalars().all()


@router.post("/withdraw")
async def request_withdrawal(
    data: WithdrawRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.amount < settings.MIN_WITHDRAWAL:
        raise HTTPException(400, f"Minimum withdrawal: {settings.MIN_WITHDRAWAL} ₽")
    if data.amount > float(user.balance):
        raise HTTPException(400, "Insufficient balance")

    # Create pending withdrawal
    tx = Transaction(
        user_id=user.id,
        type=TransactionType.WITHDRAWAL,
        amount=data.amount,
        currency=Currency.RUB,
        status=TransactionStatus.PENDING,
        description=f"Withdrawal to {data.method}: {data.details[:20]}...",
    )
    db.add(tx)
    user.balance -= data.amount
    await db.commit()
    return {"status": "pending", "message": "Withdrawal request submitted. Processing in 3-5 business days."}


@router.post("/deposit")
async def request_deposit(
    data: DepositRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # For Stars deposit, handled via Telegram invoice
    # For other methods, create pending transaction
    tx = Transaction(
        user_id=user.id,
        type=TransactionType.DEPOSIT,
        amount=data.amount,
        currency=Currency.RUB,
        status=TransactionStatus.PENDING,
        description=f"Deposit via {data.method}",
    )
    db.add(tx)
    await db.commit()
    return {"status": "pending", "tx_id": str(tx.id)}
