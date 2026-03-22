import asyncio
from tasks.celery_app import celery_app
from services.notification_service import send_telegram_notification


@celery_app.task(name="tasks.notification_tasks.send_telegram_message", queue="notifications")
def send_telegram_message(telegram_id: int, text: str):
    """Send a Telegram message asynchronously."""
    asyncio.run(send_telegram_notification(telegram_id, text))


@celery_app.task(name="tasks.notification_tasks.send_bulk_notification", queue="notifications")
def send_bulk_notification(telegram_ids: list, text: str):
    """Send notification to multiple users."""
    for tid in telegram_ids:
        asyncio.run(send_telegram_notification(tid, text))
