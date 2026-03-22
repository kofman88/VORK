from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from config import settings


def main_keyboard(webapp_url: str = None) -> InlineKeyboardMarkup:
    url = webapp_url or settings.WEBAPP_URL
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🚀 Открыть VORK",
            web_app=WebAppInfo(url=url)
        )],
    ])


def orders_keyboard(webapp_url: str = None) -> InlineKeyboardMarkup:
    url = (webapp_url or settings.WEBAPP_URL) + "/orders"
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="📦 Мои заказы",
            web_app=WebAppInfo(url=url)
        )],
    ])
