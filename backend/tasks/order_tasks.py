import asyncio
from datetime import datetime, timezone, timedelta
from tasks.celery_app import celery_app


@celery_app.task(name="tasks.order_tasks.check_deadline_reminders", queue="default")
def check_deadline_reminders():
    """Check orders approaching deadline and send reminders."""
    asyncio.run(_check_deadline_reminders())


async def _check_deadline_reminders():
    from database import AsyncSessionLocal
    from models.order import Order, OrderStatus
    from models.user import User
    from sqlalchemy import select, and_
    from sqlalchemy.orm import selectinload
    from services.notification_service import notify_deadline_reminder

    now = datetime.now(timezone.utc)
    reminder_threshold = now + timedelta(hours=24)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.seller))
            .where(
                Order.status.in_([OrderStatus.IN_PROGRESS, OrderStatus.REVISION]),
                Order.delivery_deadline <= reminder_threshold,
                Order.delivery_deadline > now,
            )
        )
        orders = result.scalars().all()

        for order in orders:
            hours_left = int((order.delivery_deadline - now).total_seconds() / 3600)
            try:
                await notify_deadline_reminder(
                    order.seller.telegram_id,
                    order.order_number,
                    hours_left
                )
            except Exception as e:
                print(f"Failed to notify for order {order.id}: {e}")


@celery_app.task(name="tasks.order_tasks.auto_complete_orders", queue="default")
def auto_complete_orders():
    """Auto-complete orders where buyer hasn't responded in 3 days after delivery."""
    asyncio.run(_auto_complete_orders())


async def _auto_complete_orders():
    from database import AsyncSessionLocal
    from models.order import Order, OrderStatus, PaymentMethod
    from models.transaction import Currency
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from services.payment_service import release_payment_to_seller
    from services.notification_service import notify_order_completed

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.seller), selectinload(Order.buyer))
            .where(
                Order.status == OrderStatus.DELIVERED,
                Order.revision_deadline < now,
            )
        )
        orders = result.scalars().all()

        for order in orders:
            try:
                order.status = OrderStatus.COMPLETED
                order.completed_at = now

                currency = Currency.STARS if order.payment_method == PaymentMethod.STARS else Currency.RUB
                await release_payment_to_seller(
                    db, order.seller, order.id,
                    order.price, order.platform_fee, currency
                )

                order.seller.completed_orders += 1
                order.seller.level = order.seller.compute_level()

                await db.commit()

                await notify_order_completed(
                    order.seller.telegram_id,
                    order.order_number,
                    float(order.price - order.platform_fee)
                )
            except Exception as e:
                print(f"Auto-complete failed for order {order.id}: {e}")
                await db.rollback()
