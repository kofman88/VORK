from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from models.transaction import Transaction, TransactionType, TransactionStatus, Currency
from models.user import User
from config import settings


def calculate_platform_fee(price: Decimal, user_level: str) -> Decimal:
    """Calculate platform fee based on seller level."""
    fee_rates = {
        "newbie": Decimal("0.10"),
        "experienced": Decimal("0.07"),
        "pro": Decimal("0.05"),
        "top": Decimal("0.05"),
    }
    rate = fee_rates.get(user_level, Decimal("0.10"))
    return round(price * rate, 2)


async def process_order_payment(
    db: AsyncSession,
    buyer: User,
    seller: User,
    order_id: UUID,
    amount: Decimal,
    currency: Currency,
    stars_amount: Optional[int] = None,
) -> Transaction:
    """Create payment transaction - escrow hold."""
    # Deduct from buyer
    if currency == Currency.STARS:
        buyer.stars_balance -= stars_amount
    else:
        buyer.balance -= float(amount)

    # Create transaction record
    tx = Transaction(
        user_id=buyer.id,
        order_id=order_id,
        type=TransactionType.ORDER_PAYMENT,
        amount=amount,
        stars_amount=stars_amount,
        currency=currency,
        status=TransactionStatus.COMPLETED,
        description=f"Payment for order",
    )
    db.add(tx)
    await db.flush()
    return tx


async def release_payment_to_seller(
    db: AsyncSession,
    seller: User,
    order_id: UUID,
    amount: Decimal,
    fee: Decimal,
    currency: Currency,
) -> Transaction:
    """Release escrow payment to seller after order completion."""
    net_amount = amount - fee

    if currency == Currency.STARS:
        seller.stars_balance += int(net_amount)
    else:
        seller.balance += float(net_amount)

    tx = Transaction(
        user_id=seller.id,
        order_id=order_id,
        type=TransactionType.ORDER_EARNING,
        amount=net_amount,
        currency=currency,
        status=TransactionStatus.COMPLETED,
        description=f"Earning from order (fee: {fee})",
    )
    db.add(tx)

    # Platform fee record
    fee_tx = Transaction(
        user_id=seller.id,
        order_id=order_id,
        type=TransactionType.PLATFORM_FEE,
        amount=fee,
        currency=currency,
        status=TransactionStatus.COMPLETED,
        description=f"Platform commission",
    )
    db.add(fee_tx)
    await db.flush()
    return tx


async def process_referral_bonus(
    db: AsyncSession,
    referrer: User,
    order_amount: Decimal,
) -> Optional[Transaction]:
    """Give referral bonus (5% of first order)."""
    bonus = round(order_amount * Decimal("0.05"), 2)
    referrer.balance += float(bonus)

    tx = Transaction(
        user_id=referrer.id,
        type=TransactionType.REFERRAL_BONUS,
        amount=bonus,
        currency=Currency.RUB,
        status=TransactionStatus.COMPLETED,
        description="Referral bonus (5% from referred user's first order)",
    )
    db.add(tx)
    await db.flush()
    return tx
