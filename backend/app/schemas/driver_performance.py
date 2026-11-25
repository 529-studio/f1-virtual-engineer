"""Pydantic schemas for Driver Telemetry 6-Axis Performance Radar."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field

NormalizationMode = Literal["session_relative", "historic_benchmark"]

AxisKey = Literal[
    "braking",
    "cornering",
    "throttle_pickup",
    "tyre_management",
    "top_speed",
    "consistency",
]


class DriverRadarAxis(BaseModel):
    """Single radar vertex axis score and diagnostic metrics."""

    key: AxisKey
    label: str
    score: float = Field(ge=0.0, le=100.0)
    raw_value: str
    benchmark_value: str


class DriverRadarProfile(BaseModel):
    """Complete 6-axis telemetry performance profile for one driver."""

    driver_code: str
    team_name: str
    team_color: str
    overall_score: float = Field(ge=0.0, le=100.0)
    axes: list[DriverRadarAxis]


class DriverPerformanceResponse(BaseModel):
    """Fail-closed response envelope for GET /telemetry/driver-performance."""

    status: Literal["success", "error"]
    year: int
    event: str
    session: str
    mode: NormalizationMode
    primary: DriverRadarProfile
    compare: DriverRadarProfile | None = None
    fallback: bool = False
    fallback_reason: str | None = None
    source: str = "fastf1"
