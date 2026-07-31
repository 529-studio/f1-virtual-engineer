"""Pydantic schemas for the track map endpoint.

The track map endpoint returns 2D circuit coordinates (X, Y) derived from
FastF1 position data, along with per-point telemetry channels (speed, gear,
brake, DRS) and corner annotations from ``session.get_circuit_info()``.

The frontend uses this data to render an interactive SVG/Canvas circuit
overlay with heatmap coloring and corner labels.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class TrackMapRequest(BaseModel):
    """Parameters for requesting track map data.

    Mirrors ``TelemetryQueryRequest`` shape for consistency.
    """

    year: int = Field(..., ge=2018, le=2100, description="Season year (telemetry only available from 2018+)")
    event: str = Field(..., description="Grand Prix name, e.g. 'Japanese Grand Prix'")
    session_type: str = Field(..., description="Session code: FP1, FP2, FP3, Q, R, S, SQ")
    driver: str = Field(..., min_length=2, max_length=4, description="3-letter driver code, e.g. 'VER'")
    lap_number: int | None = Field(None, description="Specific lap number, or None for fastest lap")
    compare_driver: str | None = Field(None, min_length=2, max_length=4, description="Optional rival driver code for overlay")


class TrackMapPoint(BaseModel):
    """A single point on the circuit trace."""

    x: float = Field(..., description="X coordinate (normalised to 0-1000 SVG viewBox)")
    y: float = Field(..., description="Y coordinate (normalised to 0-1000 SVG viewBox)")
    distance: float = Field(..., description="Track distance in meters from start/finish")
    speed: float = Field(..., description="Car speed in km/h at this point")
    gear: int = Field(..., description="Gear number (1-8, 0=N)")
    brake: bool = Field(..., description="Brake pedal active")
    throttle: float = Field(..., description="Throttle percentage (0-100)")
    drs: int = Field(0, description="DRS status code (0=off, 8=eligible, 10/12/14=active)")


class CornerInfo(BaseModel):
    """A corner annotation on the circuit."""

    number: int = Field(..., description="Corner number (1, 2, 3, ...)")
    letter: str = Field("", description="Corner letter suffix if any (e.g. 'a' for Turn 1a)")
    x: float = Field(..., description="X coordinate (normalised to 0-1000 SVG viewBox)")
    y: float = Field(..., description="Y coordinate (normalised to 0-1000 SVG viewBox)")
    angle: float = Field(0.0, description="Turn angle in degrees")
    distance: float = Field(0.0, description="Approximate distance along track in meters")


class TrackMapResponse(BaseModel):
    """Full response for the track map endpoint."""

    # Metadata
    year: int
    event: str
    session_type: str
    driver: str
    lap_number: int | None = None

    # Circuit trace — primary driver
    points: list[TrackMapPoint] = Field(default_factory=list, description="Circuit trace points (≤ 500)")

    # Compare driver overlay (optional)
    compare_driver: str | None = None
    compare_points: list[TrackMapPoint] = Field(default_factory=list, description="Rival driver trace")

    # Corner annotations
    corners: list[CornerInfo] = Field(default_factory=list, description="Corner markers from circuit_info")

    # Circuit metadata
    circuit_rotation: float = Field(0.0, description="Rotation angle in degrees to orient North upward")
    track_length_m: float = Field(0.0, description="Approximate circuit length in meters")

    # Fail-closed envelope (same pattern as all other endpoints)
    fallback: bool = False
    fallback_reason: str | None = None
    source: str = "fastf1"
