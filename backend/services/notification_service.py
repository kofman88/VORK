import json
import asyncio
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.notification import Notification, NotificationType
from models.user import User
from database import AsyncSessionLocal


async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    type: NotificationType,
    title: str,
    body: str,
    data: dict = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        data=data or {},
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


async def send_telegram_notification(telegram_id: int, text: str, parse_mode: str = "HTML"):
    """Send notification via Telegram Bot."""
    from config import settings
    import httpx

    url = f"https://api.telegram.org/bot{settings.BOT_TOKEN}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(url, json={
                "chat_id": telegram_id,
                "text": text,
                "parse_mode": parse_mode,
            })
    except Exception as e:
        print(f"Failed to send Telegram notification: {e}")


async def notify_new_order(seller_telegram_id: int, order_number: str, gig_title: str):
    text = f"🎉 <b>Новый заказ!</b>\n\nЗаказ <code>{order_number}</code> на услугу «{gig_title}»\n\nОткройте приложение VORK для работы с заказом."
    await send_telegram_notification(seller_telegram_id, text)


async def notify_new_message(receiver_telegram_id: int, sender_name: str):
    text = f"💬 <b>Новое сообщение</b>\n\nОт: {sender_name}\n\nОткройте VORK для ответа."
    await send_telegram_notification(receiver_telegram_id, text)


async def notify_order_completed(seller_telegram_id: int, order_number: str, amount: float):
    text = f"✅ <b>Заказ выполнен!</b>\n\nЗаказ <code>{order_number}</code> принят заказчиком.\n💰 {amount:.2f} ₽ начислено на ваш баланс."
    await send_telegram_notification(seller_telegram_id, text)


async def notify_new_review(seller_telegram_id: int, gig_title: str, rating: int):
    stars = "⭐" * rating
    text = f"⭐ <b>Новый отзыв!</b>\n\nНа услугу «{gig_title}»\nОценка: {stars} ({rating}/5)"
    await send_telegram_notification(seller_telegram_id, text)


async def notify_revision_request(seller_telegram_id: int, order_number: str):
    text = f"🔄 <b>Запрос на доработку</b>\n\nЗаказчик запросил правки по заказу <code>{order_number}</code>.\n\nОткройте VORK для просмотра деталей."
    await send_telegram_notification(seller_telegram_id, text)


async def notify_deadline_reminder(seller_telegram_id: int, order_number: str, hours_left: int):
    text = f"⏰ <b>Напоминание о дедлайне</b>\n\nЗаказ <code>{order_number}</code> нужно сдать через {hours_left} ч."
    await send_telegram_notification(seller_telegram_id, text)
