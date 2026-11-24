import asyncio
from typing import Annotated

from fastapi import APIRouter, Query, Request

import app.main as _main
from app.schemas.common import COMMON_RATE_LIMIT_RESPONSES
from app.schemas.weather_radar import WeatherRadarResponse
from core.limiter import limiter

router = APIRouter(tags=["weather"], responses=COMMON_RATE_LIMIT_RESPONSES)


@router.get(
    "/weather/radar",
    response_model=WeatherRadarResponse,
    summary="Live track weather radar, Doppler precipitation grid & compound crossover",
    description="Returns Doppler radar forecast frames, track surface water film accumulation, and compound cross-over thresholds.",
)
@router.get(
    "/api/weather/radar",
    response_model=WeatherRadarResponse,
    summary="Live track weather radar (api alias)",
)
@limiter.limit("30/10seconds")
async def get_weather_radar(
    request: Request,
    year: Annotated[int, Query(ge=1950, le=2100)] = 2024,
    event: Annotated[str, Query(min_length=2, max_length=120)] = "British Grand Prix",
    session: Annotated[str, Query(min_length=1, max_length=30)] = "Race",
    lap: Annotated[int | None, Query(ge=1, le=100)] = None,
):
    radar_data = await asyncio.to_thread(
        _main.get_weather_radar_data,
        year=year,
        event=event,
        session_type=session,
        selected_lap=lap,
    )
    return WeatherRadarResponse(**radar_data)
