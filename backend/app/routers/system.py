import logging
from typing import Annotated
from fastapi import APIRouter, Depends, Request

from core import redis_cache
from core.auth import RequiredUserId, get_required_user_id
from core.limiter import limiter
from core.rabbitmq_metrics import snapshot_worker_metrics
from core.timing import snapshot_metrics

_logger = logging.getLogger(__name__)

router = APIRouter(tags=["system"])


@router.get(
    "/",
    summary="Service welcome endpoint",
    description="Simple discovery endpoint confirming the backend API is running.",
)
async def root():
    return {"message": "Welcome to Apex-Intelligence Virtual Race Engineer API"}


async def snapshot_workers() -> dict[str, int | bool]:
    """Combine 24h Celery counters with live broker queue stats (#139).

    Two sources of truth, fail-closed at each layer:
    1. Redis counters (workers:completed_24h / workers:failed_24h)
    2. RabbitMQ Management API (live queue depth, in-flight, DLQ size)
    """
    snapshot: dict[str, int | bool] = {
        "completed_24h": 0,
        "failed_24h": 0,
        "redis_enabled": redis_cache.is_enabled(),
        "queue_depth": 0,
        "in_flight": 0,
        "dlq_size": 0,
        "broker_reachable": False,
    }
    if snapshot["redis_enabled"]:
        try:
            client = redis_cache._get_client()
            if client is not None:
                for key, label in (
                    ("workers:completed_24h", "completed_24h"),
                    ("workers:failed_24h", "failed_24h"),
                ):
                    raw = client.get(key)
                    if raw is None:
                        continue
                    try:
                        snapshot[label] = int(raw)
                    except (TypeError, ValueError):
                        continue
        except Exception:  # noqa: BLE001 — fail-closed
            _logger.warning("Failed to read worker counters from Redis", exc_info=True)

    try:
        broker_stats = await snapshot_worker_metrics()
    except Exception:  # noqa: BLE001 — fail-closed
        _logger.warning("Failed to read worker queue stats from RabbitMQ", exc_info=True)
    else:
        snapshot.update(broker_stats)

    return snapshot


_snapshot_workers = snapshot_workers


@router.get(
    "/metrics",
    summary="Per-route timing snapshot",
    description=(
        "Returns rolling-window timing stats (last 50 samples per route) collected by "
        "`TimingMiddleware`. Counts, p50/p95/max in milliseconds, plus the most recent "
        "sample. Single-process, in-memory only — fine for the MVP, not for production "
        "scale. Set `METRICS_ENABLED=false` to disable both header and collection."
    ),
)
@limiter.limit("10/10seconds")
async def get_metrics(
    request: Request,
    user_id: RequiredUserId,
):
    return {
        "routes": snapshot_metrics(),
        "cache": {"redis_enabled": redis_cache.is_enabled()},
        "workers": await snapshot_workers(),
    }
