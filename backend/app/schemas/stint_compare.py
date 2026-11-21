from typing import Literal
from pydantic import BaseModel, Field


class StintCompareRequest(BaseModel):
    year: int = Field(..., ge=2018, le=2100)
    event: str = Field(..., min_length=2, max_length=120)
    session_type: Literal["FP1", "FP2", "FP3", "Q", "R", "S", "SQ"]
    driver: str = Field(..., min_length=3, max_length=3)
    lap1: int = Field(..., ge=1, le=120)
    lap2: int = Field(..., ge=1, le=120)


class StintCompareResponse(BaseModel):
    driver: str
    year: int
    event: str
    session_type: str
    lap1: int
    lap2: int
    lap1_time_s: float | None = None
    lap2_time_s: float | None = None
    net_time_delta_s: float | None = None
    sample_points: int = 0
    distance: list[float] = Field(default_factory=list)
    lap1_speed: list[float] = Field(default_factory=list)
    lap2_speed: list[float] = Field(default_factory=list)
    delta_speed: list[float] = Field(default_factory=list)
    lap1_throttle: list[float] = Field(default_factory=list)
    lap2_throttle: list[float] = Field(default_factory=list)
    lap1_brake: list[float] = Field(default_factory=list)
    lap2_brake: list[float] = Field(default_factory=list)
    cumulative_time_delta_s: list[float] = Field(default_factory=list)
    fallback: bool = False
    fallback_reason: str | None = None
