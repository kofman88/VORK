from services.notification_service import send_telegram_notification


async def send_telegram_message(telegram_id: int, text: str):
    """Send a Telegram message."""
    await send_telegram_notification(telegram_id, text)


async def send_bulk_notification(telegram_ids: list, text: str):
    """Send notification to multiple users."""
    for tid in telegram_ids:
        await send_telegram_notification(tid, text)
