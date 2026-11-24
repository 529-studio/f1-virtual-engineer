from typing import Literal
from pydantic import BaseModel, Field

IncidentCategory = Literal[
    "COLLISION",
    "TRACK_LIMITS",
    "SAFETY_CAR_INFECT",
    "IMPEDING",
    "YELLOW_FLAG",
    "UNSAFE_RELEASE",
    "TECHNICAL_FLAG",
]

IncidentStatus = Literal[
    "NOTED",
    "UNDER_INVESTIGATION",
    "DECISION_REACHED",
    "NO_FURTHER_ACTION",
]

PenaltyType = Literal[
    "NO_FURTHER_ACTION",
    "REPRIMAND",
    "TIME_PENALTY_5S",
    "TIME_PENALTY_10S",
    "DRIVE_THROUGH",
    "GRID_DROP",
]


class RaceControlMessageItem(BaseModel):
    id: str = Field(..., description="Unique incident identifier")
    lap: int = Field(..., description="Lap number incident occurred")
    timestamp_str: str = Field(..., description="Timestamp string HH:MM:SS")
    category: IncidentCategory = Field(..., description="Classification category")
    status: IncidentStatus = Field(..., description="Steward investigation status")
    drivers_involved: list[str] = Field(default_factory=list, description="Driver codes involved")
    flag: str | None = Field(default=None, description="Active track flag if any")
    message: str = Field(..., description="Raw official race control message")
    description: str = Field(..., description="Detailed engineering breakdown")


class RaceControlFeedResponse(BaseModel):
    status: Literal["success", "fallback", "error"]
    year: int
    event: str
    session: str
    total_incidents: int
    items: list[RaceControlMessageItem]


class StewardInvestigationRequest(BaseModel):
    incident_id: str = Field(..., description="ID of the incident to deliberate")
    year: int = Field(default=2023, ge=1950, le=2100)
    event: str = Field(default="Singapore Grand Prix", min_length=2, max_length=120)
    session: str = Field(default="Race", min_length=1, max_length=30)


class PenaltyProbability(BaseModel):
    penalty: PenaltyType
    probability_pct: int = Field(..., ge=0, le=100)
    description: str


class StewardInvestigationResponse(BaseModel):
    status: Literal["success", "fallback", "error"]
    incident_id: str
    category: IncidentCategory
    drivers_involved: list[str]
    regulation_article: str
    regulation_title: str
    regulation_snippet: str
    team_defense_argument: str
    steward_prosecution_argument: str
    predicted_verdict: PenaltyType
    confidence_pct: int = Field(..., ge=0, le=100)
    penalty_breakdown: list[PenaltyProbability]
