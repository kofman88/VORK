import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from config import settings
from database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Setup bot commands
    try:
        from bot.handlers import setup_bot_commands
        await setup_bot_commands()
    except Exception as e:
        print(f"Bot setup warning: {e}")

    # Ensure uploads dir exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="VORK API",
    description="Telegram Freelance Marketplace API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
from routers import auth, users, gigs, orders, messages, reviews, wallet, search, notifications, categories, referral, webhooks

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(gigs.router)
app.include_router(orders.router)
app.include_router(messages.router)
app.include_router(reviews.router)
app.include_router(wallet.router)
app.include_router(search.router)
app.include_router(notifications.router)
app.include_router(referral.router)
app.include_router(webhooks.router)

# WebSocket route (from messages router)
from routers.messages import router as ws_router
app.include_router(ws_router, prefix="")


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "VORK API"}


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse({"detail": "Not found"}, status_code=404)


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    return JSONResponse({"detail": "Internal server error"}, status_code=500)
