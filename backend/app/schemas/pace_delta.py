"""Pace Delta Matrix Schemas

Pydantic DTO definitions for micro-sector pace splits, driver split deltas,
and multi-driver comparison matrices.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class SectorSplit(BaseModel):
    time_s: float = Field(..., description="Sector completion time in seconds")
    delta_s: float = Field(..., description="Delta in seconds relative to reference driver")
    status: str = Field(..., description="'session_fastest', 'personal_best', 'slower', or 'reference'")


class DriverPaceRow(BaseModel):
    driver_code: str = Field(..., description="Driver 3-letter code (e.g. LEC, VER, NOR)")
    driver_name: str = Field(..., description="Full driver name")
    team: str = Field(..., description="Team constructor name")
    team_color: str = Field(..., description="Team HEX color")
    position: int = Field(..., description="Current track / classification position")
    lap_number: int = Field(..., description="Lap number analyzed")
    compound: str = Field(..., description="Active tyre compound (SOFT, MEDIUM, HARD, INTERMEDIATE, WET)")
    tyre_age_laps: int = Field(..., description="Age of current tyre set in laps")
    s1: SectorSplit = Field(..., description="Sector 1 time and delta")
    s2: SectorSplit = Field(..., description="Sector 2 time and delta")
    s3: SectorSplit = Field(..., description="Sector 3 time and delta")
    lap_time_s: float = Field(..., description="Full lap time in seconds")
    lap_delta_s: float = Field(..., description="Full lap delta relative to reference driver")
    speed_trap_kmh: float = Field(..., description="Speed trap terminal velocity in km/h")


class PaceDeltaResponse(BaseModel):
    status: str = Field(default="success", description="Status envelope")
    year: int
    event: str
    session: str
    reference_driver: str = Field(..., description="Driver code used as zero baseline")
    lap_number: int
    drivers: List[DriverPaceRow]
    session_best_s1: float
    session_best_s2: float
    session_best_s3: float
    session_best_lap: float
    fallback: bool = Field(default=False, description="Whether fallback mock data is returned")
