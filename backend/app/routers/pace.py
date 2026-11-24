"""Pace Delta Telemetry Router

Exposes REST endpoint for multi-driver sector pace comparison and split deltas.
"""

from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.pace_delta import PaceDeltaResponse
from tools.pace_delta import compute_pace_delta_matrix

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.get("/pace-delta", response_model=PaceDeltaResponse)
def get_pace_delta(
    year: int = Query(default=2024, ge=1950, le=2026, description="Championship year"),
    event: str = Query(default="Italian Grand Prix", description="Event name or Grand Prix"),
    session_type: str = Query(default="Race", description="Session type: Practice 1/2/3, Qualifying, Sprint, Race"),
    reference_driver: str = Query(default="LEC", min_length=2, max_length=4, description="Reference driver 3-letter code"),
    lap_number: Optional[int] = Query(default=None, ge=1, le=100, description="Optional target lap number"),
) -> PaceDeltaResponse:
    """Retrieve sector-by-sector pace deltas comparing active drivers against a benchmark driver."""
    return compute_pace_delta_matrix(
        year=year,
        event=event,
        session_type=session_type,
        reference_driver=reference_driver,
        lap_number=lap_number,
    )
