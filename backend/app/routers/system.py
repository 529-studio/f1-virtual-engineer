from fastapi import APIRouter, Request

from core import redis_cache
from core.auth import RequiredUserId
from core.limiter import limiter
from core.timing import snapshot_metrics

router = APIRouter(tags=["system"])


@router.get(
    "/",
    summary="Service welcome endpoint",
    description="Simple discovery endpoint confirming the backend API is running.",
)
async def root():
    return {"message": "Welcome to Apex-Intelligence Virtual Race Engineer API"}


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
    }
