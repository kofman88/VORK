from typing import Optional
from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import Message, Update, BotCommand
from aiogram.filters import CommandStart, Command
from aiogram.enums import ParseMode

from config import settings
from bot.keyboards import main_keyboard, orders_keyboard

router = Router()
bot: Optional[Bot] = None
dp: Optional[Dispatcher] = None


def get_bot() -> Bot:
    global bot
    if bot is None:
        bot = Bot(token=settings.BOT_TOKEN, parse_mode=ParseMode.HTML)
    return bot


def get_dispatcher() -> Dispatcher:
    global dp
    if dp is None:
        dp = Dispatcher()
        dp.include_router(router)
    return dp


@router.message(CommandStart())
async def start_handler(message: Message):
    """Handle /start command."""
    args = message.text.split(maxsplit=1)
    ref_code = None
    if len(args) > 1 and args[1].startswith("ref_"):
        ref_code = args[1][4:]

    name = message.from_user.first_name if message.from_user else "пользователь"

    text = (
        f"👋 Привет, <b>{name}</b>!\n\n"
        f"🚀 <b>VORK</b> — фриланс-маркетплейс в Telegram\n\n"
        f"Здесь исполнители и заказчики находят друг друга без посредников.\n\n"
        f"💼 Размещай услуги\n"
        f"🎯 Находи исполнителей\n"
        f"💬 Общайся прямо в Telegram\n"
        f"⭐ Оплачивай Telegram Stars\n\n"
        f"Нажми кнопку ниже, чтобы начать:"
    )

    await message.answer(text, reply_markup=main_keyboard())


@router.message(Command("app"))
async def app_handler(message: Message):
    await message.answer(
        "Открой VORK прямо сейчас:",
        reply_markup=main_keyboard()
    )


@router.message(Command("orders"))
async def orders_handler(message: Message):
    await message.answer(
        "📦 Твои активные заказы:",
        reply_markup=orders_keyboard()
    )


@router.message(Command("balance"))
async def balance_handler(message: Message):
    # Here we could query DB for user balance
    await message.answer(
        "💰 Для просмотра баланса откройте приложение VORK:",
        reply_markup=main_keyboard()
    )


@router.message(Command("help"))
async def help_handler(message: Message):
    text = (
        "📚 <b>Помощь по VORK</b>\n\n"
        "/start — Открыть приложение\n"
        "/app — Открыть VORK\n"
        "/orders — Мои заказы\n"
        "/balance — Мой баланс\n"
        "/help — Справка\n\n"
        "❓ Если возникли вопросы — напишите нам!"
    )
    await message.answer(text)


async def setup_bot_commands():
    """Set bot commands list."""
    bot_instance = get_bot()
    commands = [
        BotCommand(command="start", description="Открыть VORK"),
        BotCommand(command="app", description="Открыть приложение"),
        BotCommand(command="orders", description="Мои заказы"),
        BotCommand(command="balance", description="Мой баланс"),
        BotCommand(command="help", description="Справка"),
    ]
    await bot_instance.set_my_commands(commands)


async def process_update(data: dict):
    """Process incoming Telegram update."""
    bot_instance = get_bot()
    dispatcher = get_dispatcher()
    update = Update(**data)
    await dispatcher.feed_update(bot_instance, update)
