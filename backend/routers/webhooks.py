from fastapi import APIRouter, Request, HTTPException
from config import settings

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/telegram")
async def telegram_webhook(request: Request):
    """Handle Telegram Bot webhook updates."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    # Process update asynchronously via bot
    from bot.handlers import process_update
    try:
        await process_update(data)
    except Exception as e:
        print(f"Webhook processing error: {e}")

    return {"ok": True}
