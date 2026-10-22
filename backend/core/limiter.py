import os
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


def real_client_ip(request: Request) -> str:
    """Extract the real client IP behind a reverse proxy.

    Trusts the first entry in X-Forwarded-For (set by the outermost proxy
    closest to the client). Falls back to ``request.client.host`` for
    direct connections (local dev).
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


_real_client_ip = real_client_ip

limiter = Limiter(
    key_func=real_client_ip,
    # Share counters across all workers / containers via Redis. Falls back
    # to in-memory (per-worker) if REDIS_URL is unset (e.g. local dev).
    storage_uri=os.environ.get("REDIS_URL") or "memory://",
    headers_enabled=False,
)


def retry_after_seconds(exc: RateLimitExceeded) -> int:
    item = getattr(getattr(exc, "limit", None), "limit", None)
    if item is None:
        return 10
    return int(item.GRANULARITY.seconds * item.multiples)


_retry_after_seconds = retry_after_seconds


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = retry_after_seconds(exc)
    body = {
        "status": "error",
        "error": {
            "code": "rate_limited",
            "message": f"Rate limit exceeded: {exc.detail}. Retry in {retry_after}s.",
            "retry_after_seconds": retry_after,
        },
    }
    response = JSONResponse(status_code=429, content=body)
    response.headers["Retry-After"] = str(retry_after)
    return response


_rate_limit_handler = rate_limit_handler
