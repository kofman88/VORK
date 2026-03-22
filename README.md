# VORK — Telegram Freelance Marketplace

> Аналог Kwork.ru как Telegram Mini App с оплатой через Stars и TON

## Стек технологий

**Frontend:** React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + React Query + Zustand
**Backend:** Python 3.11 + FastAPI + SQLAlchemy 2.0 + PostgreSQL 15 + Redis + Celery
**Bot:** aiogram 3.x
**Deploy:** Docker + docker-compose + Nginx

## Быстрый старт

### 1. Настройка переменных окружения

```bash
cp .env.example .env
```

Заполните обязательные значения:
- `BOT_TOKEN` — токен от @BotFather
- `WEBAPP_URL` — URL вашего домена (https://yourdomain.com)
- `JWT_SECRET` — случайная строка (минимум 32 символа)

### 2. Запуск в Docker

```bash
docker-compose up -d --build
```

### 3. Применить миграции и seed данные

```bash
docker-compose exec backend alembic upgrade head
docker-compose exec backend python seed.py
```

### 4. Настройить вебхук бота

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/api/webhooks/telegram"}'
```

### 5. Настроить Mini App в BotFather

```
/newapp -> выберите бота -> укажите URL: https://yourdomain.com
```

## Разработка

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Celery worker
cd backend
celery -A tasks.celery_app worker --loglevel=info

# Celery beat (scheduled tasks)
celery -A tasks.celery_app beat --loglevel=info
```

## Структура проекта

```
VORK/
├── docker-compose.yml
├── .env.example
├── frontend/           # React Mini App
│   ├── src/
│   │   ├── pages/      # Страницы приложения
│   │   ├── components/ # UI компоненты
│   │   ├── api/        # API клиент + React Query хуки
│   │   ├── store/      # Zustand хранилища
│   │   ├── hooks/      # Кастомные хуки (useTelegram)
│   │   └── types/      # TypeScript типы
├── backend/            # FastAPI сервер
│   ├── models/         # SQLAlchemy модели
│   ├── routers/        # API маршруты
│   ├── schemas/        # Pydantic схемы
│   ├── services/       # Бизнес-логика
│   ├── bot/            # Telegram Bot handlers
│   └── tasks/          # Celery задачи
├── nginx/              # Nginx конфигурация
└── migrations/         # Alembic миграции
```

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/telegram | Авторизация через initData |
| POST | /api/auth/refresh | Обновить токен |
| GET | /api/users/me | Мой профиль |
| GET | /api/categories | Все категории |
| GET | /api/gigs | Список услуг |
| POST | /api/gigs | Создать услугу |
| GET | /api/gigs/{id} | Детали услуги |
| POST | /api/orders | Создать заказ |
| GET | /api/orders | Мои заказы |
| POST | /api/orders/{id}/deliver | Сдать работу |
| POST | /api/orders/{id}/complete | Принять работу |
| GET | /api/messages/conversations | Диалоги |
| WS | /ws/chat/{token} | Real-time чат |
| POST | /api/reviews | Оставить отзыв |
| GET | /api/wallet | Баланс кошелька |
| GET | /api/search | Поиск услуг |

## Уровни исполнителя

| Уровень | Требования | Комиссия |
|---------|-----------|---------|
| 🌱 Новичок | 0-5 заказов | 10% |
| ⭐ Опытный | 6-20, рейтинг 4.0+ | 7% |
| 🔥 Профи | 21-50, рейтинг 4.5+ | 5% |
| 👑 Топ | 51+, рейтинг 4.8+ | 5% |

## Функции

- ✅ Telegram WebApp Auth (HMAC верификация)
- ✅ Каталог услуг с фильтрами и бесконечным скроллом
- ✅ Система заказов (эскроу, статусы, таймеры)
- ✅ Real-time чат через WebSocket
- ✅ Система отзывов с рейтингами
- ✅ Кошелёк (Stars + RUB)
- ✅ Уведомления через Telegram Bot
- ✅ Реферальная программа
- ✅ Dark mode из Telegram
- ✅ Haptic feedback
- ✅ Framer Motion анимации
- ✅ Skeleton loaders

## Деплой

Требования для деплоя:
- VPS/сервер с Docker
- Домен с SSL (Let's Encrypt)
- Telegram Bot Token

Для production рекомендуется:
- Настроить SSL через Certbot
- Установить надёжный `JWT_SECRET`
- Настроить бэкапы PostgreSQL
- Мониторинг через Sentry
