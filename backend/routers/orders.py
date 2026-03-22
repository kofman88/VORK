import math
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from database import get_db
from models.gig import Gig
from models.order import Order, OrderStatus, PaymentMethod
from models.user import User
from models.transaction import Currency
from schemas.order import OrderOut, OrderCreate, DeliverOrder, RevisionRequest, DisputeRequest
from routers.deps import get_current_user
from services.payment_service import calculate_platform_fee, process_order_payment, release_payment_to_seller
from services.notification_service import (
    notify_new_order, notify_order_completed, notify_revision_request, create_notification
)
from models.notification import NotificationType

router = APIRouter(prefix="/api/orders", tags=["orders"])


def generate_order_number() -> str:
    num = random.randint(10000, 99999)
    return f"VK-{datetime.now().year}-{num}"


@router.post("", response_model=OrderOut)
async def create_order(
    data: OrderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get gig
    result = await db.execute(
        select(Gig).options(selectinload(Gig.seller)).where(Gig.id == data.gig_id, Gig.is_active == True)
    )
    gig = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(404, "Gig not found")
    if gig.seller_id == user.id:
        raise HTTPException(400, "Cannot order your own gig")

    # Find package
    package = next((p for p in gig.packages if p["name"] == data.package_name), None)
    if not package:
        raise HTTPException(400, f"Package '{data.package_name}' not found")

    price = Decimal(str(package["price"]))
    fee = calculate_platform_fee(price, gig.seller.level.value)
    delivery_days = package.get("delivery_days", 3)

    # Check buyer balance
    if data.payment_method == PaymentMethod.STARS:
        stars_price = max(1, int(price / 5))  # 1 star ≈ 5 rub
        if user.stars_balance < stars_price:
            raise HTTPException(400, "Insufficient Stars balance")
    else:
        if user.balance < float(price):
            raise HTTPException(400, "Insufficient balance")

    # Create order
    order = Order(
        order_number=generate_order_number(),
        gig_id=gig.id,
        buyer_id=user.id,
        seller_id=gig.seller_id,
        package_name=data.package_name,
        package_snapshot=package,
        requirements_text=data.requirements_text,
        status=OrderStatus.PENDING,
        price=price,
        stars_price=int(price / 5) if data.payment_method == PaymentMethod.STARS else None,
        platform_fee=fee,
        delivery_deadline=datetime.now(timezone.utc) + timedelta(days=delivery_days),
        payment_method=data.payment_method,
    )
    db.add(order)
    await db.flush()

    # Process payment
    currency = Currency.STARS if data.payment_method == PaymentMethod.STARS else Currency.RUB
    await process_order_payment(db, user, gig.seller, order.id, price, currency,
                                 stars_amount=order.stars_price)

    # Update gig orders count
    gig.orders_count += 1
    order.status = OrderStatus.IN_PROGRESS

    await db.commit()
    await db.refresh(order)

    # Notify seller
    try:
        await notify_new_order(gig.seller.telegram_id, order.order_number, gig.title)
        await create_notification(db, gig.seller_id, NotificationType.NEW_ORDER,
                                   "Новый заказ!", f"Заказ {order.order_number} на услугу «{gig.title}»",
                                   {"order_id": str(order.id)})
    except Exception:
        pass

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.gig), selectinload(Order.buyer), selectinload(Order.seller))
        .where(Order.id == order.id)
    )
    return result.scalar_one()


@router.get("", response_model=List[OrderOut])
async def get_orders(
    role: str = Query("all", enum=["buyer", "seller", "all"]),
    status: Optional[OrderStatus] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Order)
        .options(selectinload(Order.gig), selectinload(Order.buyer), selectinload(Order.seller))
    )

    if role == "buyer":
        query = query.where(Order.buyer_id == user.id)
    elif role == "seller":
        query = query.where(Order.seller_id == user.id)
    else:
        query = query.where(or_(Order.buyer_id == user.id, Order.seller_id == user.id))

    if status:
        query = query.where(Order.status == status)

    query = query.order_by(Order.created_at.desc())
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.gig), selectinload(Order.buyer), selectinload(Order.seller))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.buyer_id != user.id and order.seller_id != user.id:
        raise HTTPException(403, "Access denied")
    return order


@router.post("/{order_id}/deliver", response_model=OrderOut)
async def deliver_order(
    order_id: UUID,
    data: DeliverOrder,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.seller))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.seller_id != user.id:
        raise HTTPException(403, "Only seller can deliver")
    if order.status not in [OrderStatus.IN_PROGRESS, OrderStatus.REVISION]:
        raise HTTPException(400, f"Cannot deliver order in status '{order.status}'")

    order.status = OrderStatus.DELIVERED
    order.delivery_files = data.delivery_files
    order.delivery_note = data.delivery_note
    order.revision_deadline = datetime.now(timezone.utc) + timedelta(days=3)

    await db.commit()
    await db.refresh(order)
    return order


@router.post("/{order_id}/revision", response_model=OrderOut)
async def request_revision(
    order_id: UUID,
    data: RevisionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.seller))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.buyer_id != user.id:
        raise HTTPException(403, "Only buyer can request revision")
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(400, "Order must be delivered to request revision")

    max_revisions = order.package_snapshot.get("revisions", 1)
    if order.revisions_used >= max_revisions:
        raise HTTPException(400, f"Maximum {max_revisions} revisions allowed")

    order.status = OrderStatus.REVISION
    order.revisions_used += 1

    await db.commit()

    # Notify seller
    try:
        await notify_revision_request(order.seller.telegram_id, order.order_number)
    except Exception:
        pass

    await db.refresh(order)
    return order


@router.post("/{order_id}/complete", response_model=OrderOut)
async def complete_order(
    order_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.seller), selectinload(Order.buyer))
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.buyer_id != user.id:
        raise HTTPException(403, "Only buyer can complete order")
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(400, "Order must be delivered to complete")

    order.status = OrderStatus.COMPLETED
    order.completed_at = datetime.now(timezone.utc)

    # Release payment to seller
    currency = Currency.STARS if order.payment_method == PaymentMethod.STARS else Currency.RUB
    await release_payment_to_seller(
        db, order.seller, order.id,
        order.price, order.platform_fee, currency
    )

    # Update seller stats
    order.seller.completed_orders += 1
    order.seller.level = order.seller.compute_level()

    await db.commit()

    # Notify seller
    try:
        await notify_order_completed(
            order.seller.telegram_id, order.order_number, float(order.price - order.platform_fee)
        )
    except Exception:
        pass

    await db.refresh(order)
    return order


@router.post("/{order_id}/dispute", response_model=OrderOut)
async def open_dispute(
    order_id: UUID,
    data: DisputeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.buyer_id != user.id and order.seller_id != user.id:
        raise HTTPException(403, "Access denied")
    if order.status not in [OrderStatus.IN_PROGRESS, OrderStatus.DELIVERED, OrderStatus.REVISION]:
        raise HTTPException(400, "Cannot open dispute for this order status")

    order.status = OrderStatus.DISPUTED
    order.dispute_reason = data.reason

    await db.commit()
    await db.refresh(order)
    return order
