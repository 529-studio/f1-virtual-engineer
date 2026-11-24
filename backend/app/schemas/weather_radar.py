from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class RadarCell(BaseModel):
    """Doppler radar precipitation cell polar/cartesian coordinate & reflectivity."""

    x: float = Field(..., description="E-W offset in km from circuit center (-20km to +20km)")
    y: float = Field(..., description="N-S offset in km from circuit center (-20km to +20km)")
    intensity_dbz: float = Field(..., ge=0.0, le=75.0, description="Radar reflectivity factor in dBZ")
    rain_rate_mmh: float = Field(..., ge=0.0, description="Estimated rain rate in mm/h")
    radius_km: float = Field(default=2.5, description="Cell radius in km")


class RadarSweepForecast(BaseModel):
    """Doppler radar forecast frame at a future time offset."""

    time_offset_min: int = Field(..., ge=0, le=60, description="Forecast offset in minutes (0, 5, 10, 15, 20)")
    cells: list[RadarCell] = Field(default_factory=list, description="List of precipitation cells in this frame")
    track_impact: bool = Field(default=False, description="Whether precipitation directly impacts circuit footprint")
    projected_grip_pct: float = Field(..., ge=0.0, le=100.0, description="Projected mean track grip coefficient percentage")


class WeatherTimelineSample(BaseModel):
    """Telemetry-synchronized weather snapshot."""

    minute: float = Field(..., description="Session elapsed time in minutes")
    lap_estimate: int | None = Field(default=None, description="Estimated current race lap")
    rainfall: bool = Field(default=False, description="Binary rain sensor flag")
    rainfall_intensity: float = Field(default=0.0, ge=0.0, le=1.0, description="Normalized precipitation intensity 0.0-1.0")
    air_temp_c: float = Field(default=20.0, description="Ambient air temperature in °C")
    track_temp_c: float = Field(default=28.0, description="Track surface temperature in °C")
    humidity_pct: float = Field(default=50.0, description="Relative humidity percentage")
    wind_speed_kmh: float = Field(default=10.0, description="Wind speed in km/h")
    wind_direction_deg: float = Field(default=0.0, description="Wind direction in degrees (0=N, 90=E, 180=S, 270=W)")
    track_grip_pct: float = Field(default=100.0, ge=0.0, le=100.0, description="Track grip level (100% dry, <88% inters, <65% wet)")
    recommended_compound: Literal["SLICK", "INTERMEDIATE", "WET"] = Field(
        default="SLICK", description="Physically optimal tyre compound for this condition"
    )


class CompoundCrossOverWindow(BaseModel):
    """Strategic compound transition call & crossover window."""

    current_compound: Literal["SLICK", "INTERMEDIATE", "WET"] = Field(default="SLICK")
    recommended_compound: Literal["SLICK", "INTERMEDIATE", "WET"] = Field(default="SLICK")
    crossover_status: Literal["OPTIMAL", "APPROACHING", "CRITICAL", "PAST_WINDOW"] = Field(
        default="OPTIMAL", description="Urgency of compound crossover"
    )
    crossover_lap: int | None = Field(default=None, description="Estimated race lap when crossover threshold is crossed")
    crossover_in_minutes: float | None = Field(default=None, description="Minutes until compound crossover window opens")
    grip_pct: float = Field(..., ge=0.0, le=100.0, description="Current track grip percentage")
    water_film_mm: float = Field(default=0.0, ge=0.0, description="Estimated track surface water depth in mm")
    pit_call: str = Field(..., description="Headline pit-wall strategy radio instruction")


class WeatherRadarResponse(BaseModel):
    """Envelope for Live Track Weather Radar & Compound Cross-Over Prediction."""

    status: Literal["success", "error"] = Field(default="success")
    year: int
    event: str
    session_type: str
    current_metrics: WeatherTimelineSample
    crossover: CompoundCrossOverWindow
    radar_frames: list[RadarSweepForecast] = Field(default_factory=list)
    timeline: list[WeatherTimelineSample] = Field(default_factory=list)
    wind_vector: dict[str, float] = Field(default_factory=dict)
    fallback: bool = Field(default=False)
    fallback_reason: str | None = Field(default=None)
