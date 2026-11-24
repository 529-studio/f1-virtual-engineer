"""Pirelli Tyre Degradation Schemas

Defines Pydantic models for polynomial degradation trajectories,
tyre cliff boundaries, and pit window recommendations.
"""

from typing import List
from pydantic import BaseModel, Field


class DegradationPoint(BaseModel):
    lap: int = Field(..., description="Stint lap number")
    time_loss_s: float = Field(..., description="Projected pace loss in seconds compared to new tyre")
    grip_percent: float = Field(..., description="Estimated tyre surface grip percentage (100% to 20%)")


class TyreDegradationResponse(BaseModel):
    status: str = Field(default="success", description="Status envelope")
    year: int
    event: str
    driver: str
    compound: str
    current_stint_laps: int
    current_time_loss_s: float
    projected_cliff_lap: int
    laps_until_cliff: int
    pit_window_start_lap: int
    pit_window_end_lap: int
    undercut_gain_estimate_s: float
    overcut_viable: bool
    trajectory: List[DegradationPoint]
    fallback: bool = Field(default=False, description="Whether fallback model was used")
