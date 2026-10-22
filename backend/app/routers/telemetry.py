import asyncio
from typing import Annotated

from fastapi import APIRouter, Path, Request

import app.main as _main
from app.schemas.common import COMMON_RATE_LIMIT_RESPONSES
from app.schemas.lap_delta import LapDeltaRequest, LapDeltaResponse
from app.schemas.lap_delta_cross_year import (
    LapDeltaCrossYearRequest,
    LapDeltaCrossYearResponse,
)
from app.schemas.pit_exit import PitExitRequest, PitExitResponse
from app.schemas.schedule import LapListResponse, RosterResponse, ScheduleResponse
from app.schemas.telemetry import ApiError, TelemetryQueryRequest, TelemetryResponse, TelemetrySummary
from app.schemas.track_map import TrackMapRequest, TrackMapResponse
from app.schemas.tyre import TyreAnalyzeRequest, TyreAnalyzeResponse
from app.schemas.weather import WeatherSummaryRequest, WeatherSummaryResponse
from core.auth import OptionalUserId
from core.limiter import limiter
from tools.fastf1_helper import (
    get_event_drivers,
    get_session_lap_list,
    get_session_telemetry_summary,
    get_track_map_data,
    get_year_schedule,
)
from tools.lap_delta import compute_lap_delta
from tools.lap_delta_cross_year import compute_cross_year_lap_delta
from tools.tyre_helper import compute_tyre_decay
from tools.weather_helper import get_weather_summary

router = APIRouter(tags=["telemetry"], responses=COMMON_RATE_LIMIT_RESPONSES)


@router.get(
    "/events/{year}",
    response_model=ScheduleResponse,
    summary="Fetch race schedule for a specific year",
    description="Returns a list of all Grand Prix events for the requested year.",
)
@limiter.limit("30/10seconds")
async def get_schedule(
    request: Request,
    year: Annotated[int, Path(ge=1950, le=2100, description="Championship season year")],
):
    events = await asyncio.to_thread(_main.get_year_schedule, year)
    if not events:
        return ScheduleResponse(
            year=year,
            events=[],
            status="error",
            error=f"No schedule found for year {year}.",
        )
    return ScheduleResponse(year=year, events=events, status="success")


@router.get(
    "/events/{year}/{event}/drivers",
    response_model=RosterResponse,
    summary="Fetch the driver roster for an event",
    description=(
        "Returns 3-letter driver codes that participated in the requested event. "
        "Tries the Race session first, then Qualifying. Returns an empty list with a "
        "fallback reason if neither session yields data (e.g. event hasn't run yet)."
    ),
)
@limiter.limit("30/10seconds")
async def get_event_roster(
    request: Request,
    year: Annotated[int, Path(ge=1950, le=2100)],
    event: Annotated[str, Path(min_length=2, max_length=120)],
):
    roster = await asyncio.to_thread(_main.get_event_drivers, year=year, event=event)
    return RosterResponse(
        year=roster["year"],
        event=roster["event"],
        drivers=roster["drivers"],
        source_session=roster.get("source_session"),
        fallback=roster["fallback"],
        fallback_reason=roster.get("fallback_reason"),
        status="error" if roster["fallback"] else "success",
        error=roster.get("fallback_reason") if roster["fallback"] else None,
    )


@router.get(
    "/laps/{year}/{event}/{session_type}/{driver}",
    response_model=LapListResponse,
    summary="Fetch the lap list for a driver in a session",
    description=(
        "Returns lap-by-lap metadata (lap number, lap time, compound, pit flags) "
        "for the requested driver/session, used by the lap-selector UI."
    ),
)
@limiter.limit("30/10seconds")
async def get_session_laps(
    request: Request,
    year: Annotated[int, Path(ge=1950, le=2100)],
    event: Annotated[str, Path(min_length=2, max_length=120)],
    session_type: Annotated[str, Path()],
    driver: Annotated[str, Path(min_length=3, max_length=3)],
):
    data = await asyncio.to_thread(
        _main.get_session_lap_list,
        year=year,
        event=event,
        session_type=session_type,
        driver=driver,
    )
    return LapListResponse(
        year=data["year"],
        event=data["event"],
        session_type=data["session_type"],
        driver=data["driver"],
        laps=data["laps"],
        fastest_lap_number=data.get("fastest_lap_number"),
        fallback=data["fallback"],
        fallback_reason=data.get("fallback_reason"),
        status="error" if data["fallback"] else "success",
        error=data.get("fallback_reason") if data["fallback"] else None,
    )


@router.post(
    "/telemetry",
    response_model=TelemetryResponse,
    summary="Fetch normalized telemetry summary",
    description=(
        "Returns speed, gear, RPM, and fallback metadata for a concrete driver/session query using the strict telemetry contract. "
        "When `lap_number` is omitted the fastest lap is used."
    ),
)
@limiter.limit("30/10seconds")
async def get_telemetry(
    request: Request,
    body: TelemetryQueryRequest,
    user_id: OptionalUserId = None,
):
    try:
        telemetry = await asyncio.wait_for(
            asyncio.to_thread(
                _main.get_session_telemetry_summary,
                year=body.year,
                event=body.event,
                session_type=body.session_type,
                driver=body.driver,
                lap_number=body.lap_number,
            ),
            timeout=45,
        )
    except TimeoutError:
        telemetry = {
            "driver": body.driver.upper(),
            "year": body.year,
            "event": body.event,
            "session_type": body.session_type,
            "sample_points": 0,
            "speed": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "km/h", "series": []},
            "gear": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "gear", "series": []},
            "rpm": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "rpm", "series": []},
            "source": "fastf1",
            "fallback": True,
            "fallback_reason": "Telemetry request timed out; please try again shortly.",
            "lap_number": body.lap_number,
            "lap_duration_s": None,
            "sector_boundaries_s": [],
        }
    summary = TelemetrySummary(**telemetry)
    if summary.fallback:
        return TelemetryResponse(
            status="error",
            data=summary,
            error=ApiError(code="TELEMETRY_UNAVAILABLE", message=summary.fallback_reason or "Telemetry unavailable."),
        )

    if user_id:
        asyncio.create_task(
            _main.insert_telemetry_history(
                user_id=user_id,
                year=body.year,
                event=body.event,
                session_type=body.session_type,
                driver=body.driver,
                lap_number=body.lap_number,
            )
        )

    return TelemetryResponse(status="success", data=summary, error=None)


@router.post(
    "/tyre/analyze",
    response_model=TyreAnalyzeResponse,
    summary="Tyre intelligence snapshot for a driver/session",
    description=(
        "Returns the current stint compound, observed lap-time decay, and a projected "
        "cliff-lap estimate. Composes the cached lap roster with the predict_tyre_wear "
        "heuristic — fail-closed: any FastF1 hiccup degrades to a populated envelope "
        "with `fallback: true` rather than 5xx."
    ),
)
@limiter.limit("30/10seconds")
async def analyze_tyre(
    request: Request,
    body: TyreAnalyzeRequest,
):
    snapshot = await asyncio.to_thread(
        _main.compute_tyre_decay,
        year=body.year,
        event=body.event,
        session_type=body.session_type,
        driver=body.driver,
    )
    return TyreAnalyzeResponse(
        status="error" if snapshot.get("fallback") else "success",
        **snapshot,
    )


@router.post(
    "/weather",
    response_model=WeatherSummaryResponse,
    summary="Per-session weather summary (#235)",
    description=(
        "Aggregates FastF1 `session.weather_data` into a compact envelope: "
        "condition (DRY/MIXED/WET derived from rainfall fraction), mean air + "
        "track temp, humidity, wind. Frontend uses this to render a header "
        "weather pill and to flag mismatched conditions in cross-year "
        "comparisons. Fail-closed — any FastF1 hiccup degrades to a populated "
        "envelope with `fallback: true` rather than 5xx."
    ),
)
@limiter.limit("30/10seconds")
async def weather_summary(
    request: Request,
    body: WeatherSummaryRequest,
):
    payload = await asyncio.to_thread(
        _main.get_weather_summary,
        year=body.year,
        event=body.event,
        session_type=body.session_type,
    )
    return WeatherSummaryResponse(
        status="error" if payload.get("fallback") else "success",
        **payload,
    )


@router.post(
    "/track-map",
    response_model=TrackMapResponse,
    summary="2D circuit track map with telemetry heatmap data",
    description=(
        "Returns a normalised 2D circuit trace (X/Y in 0–1000 SVG viewBox) derived from "
        "FastF1 position data for the requested driver/lap, along with per-point telemetry "
        "channels (speed, gear, brake, throttle, DRS) and corner annotations from "
        "circuit_info(). Supports an optional compare_driver overlay using the same "
        "coordinate system. Fail-closed: returns fallback=true with a human-readable "
        "reason if position data is unavailable for the session (pre-2018 seasons or "
        "sessions that have not yet run)."
    ),
)
@limiter.limit("20/10seconds")
async def track_map(
    request: Request,
    body: TrackMapRequest,
) -> TrackMapResponse:
    try:
        payload = await asyncio.wait_for(
            asyncio.to_thread(
                _main.get_track_map_data,
                year=body.year,
                event=body.event,
                session_type=body.session_type,
                driver=body.driver,
                lap_number=body.lap_number,
                compare_driver=body.compare_driver,
            ),
            timeout=45,
        )
    except TimeoutError:
        payload = {
            "year": body.year,
            "event": body.event,
            "session_type": body.session_type,
            "driver": body.driver.upper(),
            "lap_number": body.lap_number,
            "points": [],
            "compare_driver": body.compare_driver.upper() if body.compare_driver else None,
            "compare_points": [],
            "corners": [],
            "circuit_rotation": 0.0,
            "track_length_m": 0.0,
            "source": "fastf1",
            "fallback": True,
            "fallback_reason": "Track-map request timed out; please try again shortly.",
        }
    return TrackMapResponse(**payload)


@router.post(
    "/lap-delta",
    response_model=LapDeltaResponse,
    summary="Per-distance Δt between two drivers' fastest (or pinned) laps",
    description=(
        "Aligns each driver's lap telemetry on Distance and returns the "
        "compare driver's time delta to the reference driver, sampled at "
        "250 points along the lap. Positive values mean compare was behind. "
        "Fail-closed: any FastF1 hiccup degrades to a populated envelope "
        "with `fallback: true` instead of 5xx."
    ),
)
@limiter.limit("30/10seconds")
async def lap_delta(
    request: Request,
    body: LapDeltaRequest,
):
    payload = await asyncio.to_thread(
        _main.compute_lap_delta,
        year=body.year,
        event=body.event,
        session_type=body.session_type,
        reference_driver=body.reference_driver,
        compare_driver=body.compare_driver,
        reference_lap=body.reference_lap,
        compare_lap=body.compare_lap,
    )
    return LapDeltaResponse(
        status="error" if payload.get("fallback") else "success",
        **payload,
    )


@router.post(
    "/lap-delta-cross-year",
    response_model=LapDeltaCrossYearResponse,
    summary="Per-distance Δt of one driver's fastest laps across two seasons",
    description=(
        "Loads two sessions (same event, different years) and aligns the "
        "driver's fastest lap from each on Distance. Δt at each metre tells "
        "the story of what changed between car generations. Positive ⇒ "
        "year_b was slower there; older car was faster on that section. "
        "Same fail-closed envelope as /lap-delta. (#229)"
    ),
)
@limiter.limit("10/10seconds")
async def lap_delta_cross_year(
    request: Request,
    body: LapDeltaCrossYearRequest,
):
    payload = await asyncio.to_thread(
        _main.compute_cross_year_lap_delta,
        event=body.event,
        session_type=body.session_type,
        driver=body.driver,
        year_a=body.year_a,
        year_b=body.year_b,
    )
    return LapDeltaCrossYearResponse(
        status="error" if payload.get("fallback") else "success",
        **payload,
    )
