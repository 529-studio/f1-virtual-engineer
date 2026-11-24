"""Tyre Degradation Telemetry Router

Exposes REST endpoint for polynomial tyre degradation curves and pit window advisory.
"""

from fastapi import APIRouter, Query
from app.schemas.tyre_degradation import TyreDegradationResponse
from tools.tyre_degradation_model import compute_tyre_degradation_profile

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.get("/tyre-degradation", response_model=TyreDegradationResponse)
def get_tyre_degradation(
    year: int = Query(default=2024, ge=1950, le=2026, description="Championship season year"),
    event: str = Query(default="Italian Grand Prix", description="Grand Prix event name"),
    driver: str = Query(default="LEC", min_length=2, max_length=4, description="Driver 3-letter code"),
    compound: str = Query(default="HARD", description="Tyre compound: SOFT, MEDIUM, HARD, INTERMEDIATE, WET"),
    current_stint_laps: int = Query(default=18, ge=0, le=100, description="Laps run on current tyre set"),
) -> TyreDegradationResponse:
    """Retrieve polynomial tyre degradation trajectory, tyre cliff lap, and pit window."""
    return compute_tyre_degradation_profile(
        year=year,
        event=event,
        driver=driver,
        compound=compound,
        current_stint_laps=current_stint_laps,
    )
