from typing import List, Optional
from pydantic import BaseModel

class EventInfo(BaseModel):
    name: str
    location: str
    round: int
    official_name: str
    # ISO 8601 date (YYYY-MM-DD) of the race weekend's main event.
    # Optional because FastF1's schedule may omit it for some
    # historical/edge rows; the FE treats missing as "show it".
    event_date: Optional[str] = None

class ScheduleResponse(BaseModel):
    year: int
    events: List[EventInfo]
    status: str
    error: Optional[str] = None


class RosterResponse(BaseModel):
    year: int
    event: str
    drivers: List[str]
    source_session: Optional[str] = None
    status: str
    fallback: bool = False
    fallback_reason: Optional[str] = None
    error: Optional[str] = None


class LapInfo(BaseModel):
    lap_number: int
    lap_time_seconds: Optional[float] = None
    compound: Optional[str] = None
    is_pit_in: bool = False
    is_pit_out: bool = False


class LapListResponse(BaseModel):
    year: int
    event: str
    session_type: str
    driver: str
    laps: List[LapInfo]
    fastest_lap_number: Optional[int] = None
    status: str
    fallback: bool = False
    fallback_reason: Optional[str] = None
    error: Optional[str] = None
