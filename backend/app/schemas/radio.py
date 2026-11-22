from typing import Literal
from pydantic import BaseModel, Field


RadioClassification = Literal[
    "tyre_issue",
    "brake_issue",
    "engine_issue",
    "traffic",
    "weather",
    "strategy_request",
    "none",
]
RadioSeverity = Literal["low", "medium", "high"]
RadioUrgency = Literal[1, 2, 3, 4, 5]
RadioSpeaker = Literal["driver", "race_engineer", "unknown"]


class RadioRequest(BaseModel):
    transcript: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Team-radio transcript text to classify.",
    )
    driver: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
        description="Optional 3-letter driver code the transcript belongs to.",
    )


class RadioResponse(BaseModel):
    status: Literal["success", "error"]
    classification: RadioClassification
    severity: RadioSeverity
    trigger_phrase: str = Field(
        ...,
        description="Verbatim snippet from the transcript that triggered the classification. Empty when classification is 'none'.",
    )
    urgency: int = Field(
        default=2,
        ge=1,
        le=5,
        description="Tactical urgency score from 1 (routine) to 5 (critical/emergency).",
    )
    speaker: str = Field(
        default="driver",
        description="Detected speaker role: driver or race_engineer.",
    )
    fallback: bool = False
    fallback_reason: str | None = None


class RadioMessageItem(BaseModel):
    id: str = Field(..., description="Unique deterministic hash/id of the radio message.")
    meeting_key: int = Field(default=1219, description="Grand Prix meeting key.")
    session_key: int = Field(default=9165, description="Session key (e.g. 9165 for Singapore 2023 Race).")
    driver_number: int = Field(..., description="Driver racing number (e.g. 55, 4, 63, 44, 1).")
    driver_code: str = Field(..., description="3-letter driver acronym (SAI, NOR, RUS, HAM, VER).")
    team_name: str = Field(..., description="Constructor name for livery tinting.")
    timestamp_utc: str = Field(..., description="ISO 8601 UTC broadcast timestamp.")
    lap_number: int | None = Field(default=None, description="Race lap number at time of broadcast.")
    recording_url: str = Field(..., description="MP3 audio stream URL from livetiming.formula1.com.")
    duration_seconds: float = Field(default=3.5, description="Audio duration in seconds.")
    transcript: str = Field(..., description="Verbatim speech transcript.")
    classification: RadioClassification = Field(default="none")
    urgency: int = Field(default=2, ge=1, le=5)
    speaker: str = Field(default="driver")
    trigger_phrase: str = Field(default="", description="Key phrase supporting classification.")


class RadioFeedResponse(BaseModel):
    status: Literal["success", "fixture_fallback", "error"]
    total_messages: int
    session_name: str
    circuit_name: str
    items: list[RadioMessageItem]
