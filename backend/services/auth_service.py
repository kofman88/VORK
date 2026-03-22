import hashlib
import hmac
import json
import random
import string
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl, unquote
from typing import Optional

from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from models.user import User
from database import AsyncSessionLocal


def verify_telegram_webapp_data(init_data: str) -> dict:
    """Verify Telegram WebApp initData HMAC signature."""
    parsed = dict(parse_qsl(unquote(init_data), keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing hash in init_data")

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )
    secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if computed_hash != received_hash:
        raise ValueError("Invalid initData signature")

    return parsed


def parse_user_from_initdata(parsed: dict) -> dict:
    user_data = parsed.get("user", "{}")
    if isinstance(user_data, str):
        return json.loads(user_data)
    return user_data


def generate_referral_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=8))


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    data = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    data = {"sub": user_id, "exp": expire, "type": "refresh"}
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")


async def get_or_create_user(db: AsyncSession, telegram_user: dict, ref_code: Optional[str] = None) -> User:
    telegram_id = int(telegram_user["id"])
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()

    if not user:
        referrer = None
        if ref_code:
            ref_result = await db.execute(select(User).where(User.referral_code == ref_code))
            referrer = ref_result.scalar_one_or_none()

        user = User(
            telegram_id=telegram_id,
            username=telegram_user.get("username"),
            first_name=telegram_user.get("first_name", "User"),
            last_name=telegram_user.get("last_name"),
            language=telegram_user.get("language_code", "ru")[:2] if telegram_user.get("language_code") else "ru",
            referral_code=generate_referral_code(),
            referred_by=referrer.id if referrer else None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update last seen and username
        user.last_seen = datetime.now(timezone.utc)
        if telegram_user.get("username"):
            user.username = telegram_user.get("username")
        await db.commit()

    return user
