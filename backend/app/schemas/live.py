from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

LiveSafetyCarState = Literal["NONE", "VSC", "SC", "RED_FLAG"]
TyreCompoundLiteral = Literal["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET", "UNKNOWN"]
LiveSourceLiteral = Literal["openf1", "replay"]


class LiveSessionMeta(BaseModel):
    session_key: int
    meeting_key: int
    circuit_key: int
    circuit_short_name: str
    country_name: str
    session_name: str
    session_type: str
    date_start: str
    date_end: str
    is_live: bool = True
    source: LiveSourceLiteral = "openf1"


class LiveDriverSnapshot(BaseModel):
    position: int = Field(ge=1, le=30)
    driver_number: int = Field(ge=1, le=99)
    driver_code: str = Field(min_length=2, max_length=4)
    team_name: str
    interval_to_ahead: float | None = None
    gap_to_leader: float | None = None
    last_lap_time: float | None = None
    current_stint: int = Field(default=1, ge=1)
    tyre_compound: TyreCompoundLiteral = "UNKNOWN"
    tyre_age: int = Field(default=0, ge=0)
    pit_stops: int = Field(default=0, ge=0)
    in_pit: bool = False
    coordinates: tuple[float, float] | None = None


class LiveRaceTick(BaseModel):
    session_key: int
    polled_at: str
    delay_seconds: float = Field(default=3.0, ge=0.0)
    stale: bool = False
    source: LiveSourceLiteral = "openf1"
    safety_car_status: LiveSafetyCarState = "NONE"
    leader_lap: int = Field(default=1, ge=0)
    drivers: list[LiveDriverSnapshot] = Field(default_factory=list)


def get_default_fixture_path() -> Path:
    """Return explicit path to the default recorded replay fixture."""
    return (
        Path(__file__).resolve().parent.parent.parent
        / "data"
        / "fixtures"
        / "openf1_brazil_2026_11412.json"
    )


def load_replay_fixture(fixture_path: Path | str | None = None) -> dict:
    """Load pre-recorded replay fixture safely."""
    path = Path(fixture_path) if fixture_path else get_default_fixture_path()
    if not path.is_file():
        raise FileNotFoundError(f"Replay fixture not found at {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
