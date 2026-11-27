"""Driver Telemetry Performance Radar Router."""

from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Query, Request

import app.main as _main
from app.schemas.common import COMMON_RATE_LIMIT_RESPONSES
from app.schemas.driver_performance import DriverPerformanceResponse, NormalizationMode
from app.schemas.drs_optimizer import DrsEfficiencyResponse, WingTrim
from core.limiter import limiter

router = APIRouter(tags=["telemetry"], responses=COMMON_RATE_LIMIT_RESPONSES)


@router.get(
    "/telemetry/driver-performance",
    response_model=DriverPerformanceResponse,
    summary="Driver Telemetry 6-Axis Performance Radar",
    description=(
        "Computes 6-axis telemetry performance radar scores (Braking, Cornering, "
        "Throttle Pick-Up, Tyre Management, Top Speed, Consistency) for primary and "
        "optional compare driver with session-relative or historic-benchmark normalization."
    ),
)
@router.get(
    "/api/telemetry/driver-performance",
    response_model=DriverPerformanceResponse,
    summary="Driver Telemetry 6-Axis Performance Radar (api alias)",
)
@limiter.limit("30/10seconds")
async def get_driver_performance(
    request: Request,
    year: Annotated[int, Query(ge=1950, le=2100)] = 2024,
    event: Annotated[str, Query(min_length=2, max_length=120)] = "Italian Grand Prix",
    session: Annotated[str, Query(min_length=1, max_length=30)] = "R",
    driver: Annotated[str, Query(min_length=2, max_length=4)] = "LEC",
    compare_driver: Annotated[str | None, Query(max_length=4)] = None,
    mode: NormalizationMode = "session_relative",
) -> DriverPerformanceResponse:
    """Retrieve 6-axis performance radar scores for primary and optional comparison driver."""
    payload = await asyncio.to_thread(
        _main.compute_driver_performance,
        year=year,
        event=event,
        session_type=session,
        driver=driver,
        compare_driver=compare_driver,
        mode=mode,
    )
    return DriverPerformanceResponse(**payload)


@router.get(
    "/telemetry/drs-efficiency",
    response_model=DrsEfficiencyResponse,
    summary="DRS Zone Efficiency & Top Speed Trap Optimizer",
    description=(
        "Computes straight-line DRS activation gain, speed-trap delta, and "
        "calibrated aerodynamic wing-trim recommendations."
    ),
)
@router.get(
    "/api/telemetry/drs-efficiency",
    response_model=DrsEfficiencyResponse,
    summary="DRS Zone Efficiency & Top Speed Trap Optimizer (api alias)",
)
@limiter.limit("30/10seconds")
async def get_drs_efficiency(
    request: Request,
    year: Annotated[int, Query(ge=1950, le=2100)] = 2024,
    event: Annotated[str, Query(min_length=2, max_length=120)] = "Italian Grand Prix",
    session: Annotated[str, Query(min_length=1, max_length=30)] = "R",
    driver: Annotated[str, Query(min_length=2, max_length=4)] = "LEC",
    compare_driver: Annotated[str | None, Query(max_length=4)] = None,
    wing_trim: WingTrim = "BALANCED",
    drag_level: Annotated[int | None, Query(ge=0, le=100)] = None,
) -> DrsEfficiencyResponse:
    """Retrieve DRS efficiency metrics and wing trim simulation."""
    payload = await asyncio.to_thread(
        _main.compute_drs_efficiency,
        year=year,
        event=event,
        session_type=session,
        driver=driver,
        compare_driver=compare_driver,
        wing_trim=wing_trim,
        drag_level=drag_level,
    )
    return DrsEfficiencyResponse(**payload)
