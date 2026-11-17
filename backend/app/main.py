import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.routers import analysis, history, knowledge, live, system, telemetry
from core.limiter import (
    _rate_limit_handler,
    _real_client_ip,
    _retry_after_seconds,
    limiter,
    rate_limit_handler,
)
from core.timing import TimingMiddleware
from tools.fastf1_helper import load_prebaked_into_caches

_logger = logging.getLogger(__name__)


@asynccontextmanager
async def _lifespan(app: FastAPI):
    # Log explicit cache mode so deploys cannot silently regress (#42)
    try:
        from core import redis_cache

        if redis_cache.is_enabled():
            _logger.info("cache: L1+L2 (redis)")
        else:
            _logger.info("cache: L1 only")
    except Exception:  # noqa: BLE001
        _logger.info("cache: L1 only")

    # Warm the FastF1 helper caches from any pre-baked snapshots on disk
    # (slice C of #100). The load is best-effort: a missing/empty prebake
    # dir is fine, and a corrupt file is logged & skipped rather than
    # crashing startup.
    try:
        loaded = await asyncio.to_thread(load_prebaked_into_caches)
        if loaded:
            _logger.info("Loaded %d pre-baked FastF1 entries into cache", loaded)
    except Exception:  # noqa: BLE001
        _logger.warning("Prebake warmup failed", exc_info=True)

    # Start live poller if configured (#44)
    live_poller = None
    try:
        from core.live_poller import get_live_poller
        live_source = os.getenv("LIVE_DATA_SOURCE", "replay").lower().strip()
        if live_source != "none":
            live_poller = get_live_poller()
            await live_poller.start()
            _logger.info("Live poller initialized with source=%s", live_source)
    except Exception:  # noqa: BLE001
        _logger.warning("Live poller startup failed", exc_info=True)

    yield

    if live_poller:
        try:
            await live_poller.stop()
        except Exception:  # noqa: BLE001
            _logger.warning("Live poller shutdown failed", exc_info=True)


_is_production = os.getenv("ENVIRONMENT", "").lower() == "production"

app = FastAPI(
    lifespan=_lifespan,
    title="Apex-Intelligence: Virtual Race Engineer API",
    summary="Telemetry-backed F1 strategy assistant API for mission-control and demo workflows.",
    description=(
        "FastAPI service for telemetry lookups, baseline strategy recommendations, and explainable "
        "response envelopes used by the frontend mission-control experience."
    ),
    version="0.1.0",
    docs_url=None if _is_production else "/docs",
    openapi_url=None if _is_production else "/openapi.json",
    contact={"name": "Apex-Intelligence", "url": "https://github.com/thdat-vu/f1-virtual-engineer"},
    openapi_tags=[
        {"name": "system", "description": "Basic service discovery and health-style endpoints."},
        {"name": "analysis", "description": "Telemetry and strategy analysis workflows for the mission-control UI."},
        {"name": "telemetry", "description": "Strict telemetry contract endpoints backed by FastF1 summaries."},
        {"name": "knowledge", "description": "FIA regulation retrieval for citation-backed answers."},
        {"name": "live", "description": "OpenF1-backed live session metadata and streaming telemetry."},
    ],
)

# CORS configuration
allowed_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", "")
if allowed_origins_str:
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
    ]

_logger.info("CORS enabled for origins: %s", allowed_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Timing instrumentation must wrap *inside* CORS so the X-Process-Time header
# survives the CORS layer. Starlette executes middlewares in reverse order of
# registration, so registering TimingMiddleware *after* CORSMiddleware puts
# it closer to the route handler.
app.add_middleware(TimingMiddleware)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Register modular domain routers
app.include_router(system.router)
app.include_router(telemetry.router)
app.include_router(analysis.router)
app.include_router(history.router)
app.include_router(knowledge.router)
app.include_router(live.router)

# Re-exports for backwards compatibility and test mocking targets
from agents.race_engineer import analyze_query, set_emit_fn
from agents.radio_interpreter import interpret_radio
from tools.fastf1_helper import (
    get_event_drivers,
    get_session_lap_list,
    get_session_telemetry_summary,
    get_year_schedule,
    get_track_map_data,
)
from tools.tyre_helper import compute_tyre_decay
from tools.weather_helper import get_weather_summary
from tools.lap_delta import compute_lap_delta
from tools.lap_delta_cross_year import compute_cross_year_lap_delta
from tools.knowledge_retriever import (
    get_note as knowledge_get_note,
    lookup as knowledge_lookup,
)
from core.persistence import (
    delete_saved_query,
    insert_analyze_history,
    insert_radio_history,
    insert_saved_query,
    insert_telemetry_history,
    list_analyze_history,
    list_radio_history,
    list_saved_queries,
    list_telemetry_history,
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
