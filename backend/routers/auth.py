from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.auth import TelegramAuthData, TokenOut, RefreshTokenIn
from services.auth_service import (
    verify_telegram_webapp_data,
    parse_user_from_initdata,
    get_or_create_user,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/telegram", response_model=TokenOut)
async def telegram_auth(data: TelegramAuthData, db: AsyncSession = Depends(get_db)):
    """Verify Telegram WebApp initData and return JWT tokens."""
    try:
        parsed = verify_telegram_webapp_data(data.init_data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    telegram_user = parse_user_from_initdata(parsed)
    if not telegram_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user data in initData")

    ref_code = parsed.get("start_param", "").replace("ref_", "") or None
    user = await get_or_create_user(db, telegram_user, ref_code)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenOut(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenOut)
async def refresh_token(data: RefreshTokenIn, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token."""
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token payload")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)

    return TokenOut(access_token=access_token, refresh_token=new_refresh_token)
