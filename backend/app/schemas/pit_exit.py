"""Schemas for the /strategy/pit-exit endpoint.

Defines the request and response models for deterministic pit-exit projection.
"""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class PitExitRequest(BaseModel):
    year: int = Field(..., ge=2018, le=2100)
    event: str = Field(..., min_length=2, max_length=120)
    session: Literal["R", "S"] = Field(
        ...,
        description="Session type: 'R' (Race) or 'S' (Sprint). Reject 'Q'/'FP*' with a 422.",
    )
    driver: str = Field(..., min_length=3, max_length=3)
    lap: int = Field(..., ge=1)
    include_rivals: int = Field(default=5, ge=1, le=10)


class RivalSlot(BaseModel):
    driver_code: str
    gap_s: float  # signed: negative = behind
    is_lapped: bool
    has_pitted: bool
    pace_confidence: Literal["high", "low"]


class PitExitResponse(BaseModel):
    as_of_lap: int
    total_laps: int
    current_position: int
    projected_position: int
    position_delta: int
    position_is_contested: bool
    car_ahead: RivalSlot | None = None
    car_behind: RivalSlot | None = None
    traffic_state: Literal["CLEAR_AIR", "DRS_RANGE", "TRAFFIC"]
    pit_loss_s: float
    pit_loss_source: str  # e.g. "per-track table: Monza"
    confidence: Literal["HIGH", "MEDIUM", "LOW"]
    confidence_reasons: list[str]
    assumptions: list[str]  # rendered verbatim in the UI footnote
    field: list[RivalSlot]  # projected order around the driver
    notes: list[str]  # excluded rivals, SC active, etc.
    fallback: bool = False
    fallback_reason: str | None = None
