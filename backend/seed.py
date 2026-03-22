"""Seed database with initial categories and subcategories."""
import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal, engine, Base
from models.gig import Category, Subcategory


CATEGORIES = [
    {
        "name": "Дизайн",
        "name_en": "Design",
        "slug": "design",
        "emoji": "🎨",
        "sort_order": 1,
        "subcategories": [
            {"name": "Логотипы и фирменный стиль", "name_en": "Logos & Brand Identity", "slug": "logos"},
            {"name": "Веб-дизайн", "name_en": "Web Design", "slug": "web-design"},
            {"name": "Графический дизайн", "name_en": "Graphic Design", "slug": "graphic-design"},
            {"name": "Иллюстрации", "name_en": "Illustrations", "slug": "illustrations"},
            {"name": "UI/UX дизайн", "name_en": "UI/UX Design", "slug": "ui-ux"},
            {"name": "Презентации", "name_en": "Presentations", "slug": "presentations"},
            {"name": "Баннеры и реклама", "name_en": "Banners & Ads", "slug": "banners"},
        ],
    },
    {
        "name": "Разработка и IT",
        "name_en": "Development & IT",
        "slug": "development",
        "emoji": "💻",
        "sort_order": 2,
        "subcategories": [
            {"name": "Веб-разработка", "name_en": "Web Development", "slug": "web-dev"},
            {"name": "Мобильные приложения", "name_en": "Mobile Apps", "slug": "mobile"},
            {"name": "Telegram боты", "name_en": "Telegram Bots", "slug": "telegram-bots"},
            {"name": "Интеграции и API", "name_en": "Integrations & API", "slug": "api"},
            {"name": "WordPress", "name_en": "WordPress", "slug": "wordpress"},
            {"name": "Парсинг данных", "name_en": "Data Parsing", "slug": "parsing"},
            {"name": "DevOps и серверы", "name_en": "DevOps & Servers", "slug": "devops"},
        ],
    },
    {
        "name": "Тексты и переводы",
        "name_en": "Texts & Translations",
        "slug": "writing",
        "emoji": "✍️",
        "sort_order": 3,
        "subcategories": [
            {"name": "Копирайтинг", "name_en": "Copywriting", "slug": "copywriting"},
            {"name": "Рерайтинг", "name_en": "Rewriting", "slug": "rewriting"},
            {"name": "Переводы", "name_en": "Translations", "slug": "translations"},
            {"name": "SEO-тексты", "name_en": "SEO Texts", "slug": "seo-texts"},
            {"name": "Сценарии", "name_en": "Scripts", "slug": "scripts"},
            {"name": "Корректура", "name_en": "Proofreading", "slug": "proofreading"},
        ],
    },
    {
        "name": "SEO и трафик",
        "name_en": "SEO & Traffic",
        "slug": "seo",
        "emoji": "📈",
        "sort_order": 4,
        "subcategories": [
            {"name": "SEO-оптимизация", "name_en": "SEO Optimization", "slug": "seo-optimization"},
            {"name": "Контекстная реклама", "name_en": "Contextual Ads", "slug": "ppc"},
            {"name": "Ссылочное продвижение", "name_en": "Link Building", "slug": "link-building"},
            {"name": "Аудит сайтов", "name_en": "Site Audit", "slug": "site-audit"},
        ],
    },
    {
        "name": "Соцсети и маркетинг",
        "name_en": "Social Media & Marketing",
        "slug": "marketing",
        "emoji": "📱",
        "sort_order": 5,
        "subcategories": [
            {"name": "Ведение соцсетей", "name_en": "Social Media Management", "slug": "smm"},
            {"name": "Таргетированная реклама", "name_en": "Targeted Ads", "slug": "targeted-ads"},
            {"name": "Telegram-маркетинг", "name_en": "Telegram Marketing", "slug": "telegram-marketing"},
            {"name": "Email-маркетинг", "name_en": "Email Marketing", "slug": "email-marketing"},
            {"name": "Influencer-маркетинг", "name_en": "Influencer Marketing", "slug": "influencer"},
        ],
    },
    {
        "name": "Аудио и видео",
        "name_en": "Audio & Video",
        "slug": "media",
        "emoji": "🎬",
        "sort_order": 6,
        "subcategories": [
            {"name": "Монтаж видео", "name_en": "Video Editing", "slug": "video-editing"},
            {"name": "Озвучка и аудио", "name_en": "Voiceover & Audio", "slug": "voiceover"},
            {"name": "Анимация", "name_en": "Animation", "slug": "animation"},
            {"name": "Рилсы и Shorts", "name_en": "Reels & Shorts", "slug": "reels"},
            {"name": "Подкасты", "name_en": "Podcasts", "slug": "podcasts"},
        ],
    },
    {
        "name": "Бизнес и жизнь",
        "name_en": "Business & Life",
        "slug": "business",
        "emoji": "💼",
        "sort_order": 7,
        "subcategories": [
            {"name": "Бизнес-план", "name_en": "Business Plan", "slug": "business-plan"},
            {"name": "Юридические услуги", "name_en": "Legal Services", "slug": "legal"},
            {"name": "Бухгалтерия", "name_en": "Accounting", "slug": "accounting"},
            {"name": "Обучение и репетиторство", "name_en": "Tutoring", "slug": "tutoring"},
            {"name": "Консультации", "name_en": "Consulting", "slug": "consulting"},
        ],
    },
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(Category).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded.")
            return

        print("Seeding categories...")
        for cat_data in CATEGORIES:
            subcats = cat_data.pop("subcategories", [])
            category = Category(**cat_data)
            db.add(category)
            await db.flush()

            for i, sub_data in enumerate(subcats):
                sub = Subcategory(
                    category_id=category.id,
                    sort_order=i,
                    **sub_data,
                )
                db.add(sub)

        await db.commit()
        print(f"Seeded {len(CATEGORIES)} categories.")


if __name__ == "__main__":
    asyncio.run(seed())
