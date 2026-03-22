from celery import Celery
from celery.schedules import crontab
from config import settings

celery_app = Celery(
    "vork",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["tasks.notification_tasks", "tasks.order_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
    task_routes={
        "tasks.notification_tasks.*": {"queue": "notifications"},
        "tasks.order_tasks.*": {"queue": "default"},
    },
    beat_schedule={
        "check-deadline-reminders": {
            "task": "tasks.order_tasks.check_deadline_reminders",
            "schedule": crontab(minute="0", hour="*/6"),
        },
        "auto-complete-orders": {
            "task": "tasks.order_tasks.auto_complete_orders",
            "schedule": crontab(minute="0", hour="*/4"),
        },
    },
)
