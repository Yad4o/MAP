"""
worker/celery_app.py
─────────────────────
Celery application factory and queue configuration.

Phase 0: Config defined, app created. No tasks yet.
Phase 3 (Member building queue): Tasks will be registered in tasks.py.
"""

import ssl
from celery import Celery
from app.config import settings

celery_app = Celery(
    "map",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    # Upstash Redis SSL configuration (guard CERT_NONE to development)
    broker_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE if settings.is_development else ssl.CERT_REQUIRED},
    redis_backend_use_ssl={"ssl_cert_reqs": ssl.CERT_NONE if settings.is_development else ssl.CERT_REQUIRED},

    # Development: Run tasks synchronously without a worker
    task_always_eager=settings.is_development,
    task_eager_propagates=True,  # Propagate exceptions in eager mode

    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Queue routing
    task_routes={
        "app.worker.tasks.process_task":          {"queue": "default"},
        "app.worker.tasks.process_priority_task": {"queue": "high_priority"},
        "app.worker.tasks.process_long_task":     {"queue": "long_running"},
    },

    # Retry and reliability
    task_acks_late=True,                    # late ack — task stays in queue until success
    task_reject_on_worker_lost=True,        # re-queue if worker dies mid-task
    task_soft_time_limit=3300,              # 55 minutes soft limit (sends exception)
    task_time_limit=3600,                   # 60 minutes hard limit (kills task)
    worker_prefetch_multiplier=1,           # one task per worker at a time (fair dispatch)

    # Result backend TTL
    result_expires=86400,                   # results expire after 24 hours
)
