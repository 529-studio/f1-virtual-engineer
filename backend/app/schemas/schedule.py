from typing import List, Optional
from pydantic import BaseModel

class EventInfo(BaseModel):
    name: str
    location: str
    round: int
    official_name: str

class ScheduleResponse(BaseModel):
    year: int
    events: List[EventInfo]
    status: str
    error: Optional[str] = None
