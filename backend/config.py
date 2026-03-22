from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Bot
    BOT_TOKEN: str = "test_token"
    WEBAPP_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://vork:vorkpassword@localhost:5432/vork_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Payments
    TON_WALLET: Optional[str] = None
    PAYMENT_PROVIDER_TOKEN: Optional[str] = None

    # Storage
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB

    # Platform
    PLATFORM_FEE_PERCENT: int = 10
    MIN_WITHDRAWAL: int = 1000

    # Environment
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "http://localhost:5173,https://web.telegram.org"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
