"""Pydantic schemas for DRS Zone Efficiency & Top Speed Trap Optimizer."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field

WingTrim = Literal["LOW_DRAG", "BALANCED", "HIGH_DOWNFORCE"]


class DrsZoneMetric(BaseModel):
    """Per-straight DRS activation & speed gain telemetry."""

    zone_id: str
    zone_name: str
    distance_range_m: str
    drs_closed_speed_kmh: float
    drs_open_speed_kmh: float
    speed_delta_kmh: float
    time_gain_s: float
    activation_rate_pct: float = Field(ge=0.0, le=100.0)


class DrsEfficiencyResponse(BaseModel):
    """Fail-closed response envelope for GET /telemetry/drs-efficiency."""

    status: Literal["success", "error"]
    year: int
    event: str
    session: str
    driver: str
    compare_driver: str | None = None
    wing_trim: WingTrim
    drag_level: int = Field(ge=0, le=100)
    aero_efficiency_index: float = Field(ge=0.0, le=100.0)
    avg_drs_gain_kmh: float
    total_lap_gain_s: float
    speed_trap_primary_kmh: float
    speed_trap_compare_kmh: float | None = None
    recommended_trim: WingTrim
    recommendation_reason: str
    zones: list[DrsZoneMetric]
    fallback: bool = False
    fallback_reason: str | None = None
    source: str = "fastf1"
