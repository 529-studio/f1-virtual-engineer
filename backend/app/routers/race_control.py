import asyncio
from typing import Annotated

from fastapi import APIRouter, Query, Request

import app.main as _main
from app.schemas.common import COMMON_RATE_LIMIT_RESPONSES
from app.schemas.race_control import (
    RaceControlFeedResponse,
    StewardInvestigationRequest,
    StewardInvestigationResponse,
)
from core.limiter import limiter

router = APIRouter(tags=["race-control"], responses=COMMON_RATE_LIMIT_RESPONSES)


@router.get(
    "/feed",
    response_model=RaceControlFeedResponse,
    summary="Get official FastF1 race control messages & on-track incident timeline",
    description="Returns chronological race control feed with flag status, drivers involved, and incident category.",
)
@router.get(
    "/race-control/feed",
    response_model=RaceControlFeedResponse,
    summary="Get race control feed (race-control alias)",
)
@router.get(
    "/api/race-control/feed",
    response_model=RaceControlFeedResponse,
    summary="Get race control feed (api alias)",
)
@limiter.limit("30/10seconds")
async def get_race_control_feed(
    request: Request,
    year: Annotated[int, Query(ge=1950, le=2100)] = 2023,
    event: Annotated[str, Query(min_length=2, max_length=120)] = "Singapore Grand Prix",
    session: Annotated[str, Query(min_length=1, max_length=30)] = "Race",
):
    feed = await asyncio.to_thread(
        _main.get_race_control_feed,
        year=year,
        event=event,
        session=session,
    )
    return RaceControlFeedResponse(**feed)


@router.post(
    "/investigate",
    response_model=StewardInvestigationResponse,
    summary="Run AI Steward deliberation on a specific incident using FIA Sporting Regs RAG",
    description="Cross-examines telemetry anomaly against vectorized FIA Sporting Regulations to generate defense, prosecution, and penalty probability distribution.",
)
@router.post(
    "/race-control/investigate",
    response_model=StewardInvestigationResponse,
    summary="Run AI Steward deliberation (race-control alias)",
)
@router.post(
    "/api/race-control/investigate",
    response_model=StewardInvestigationResponse,
    summary="Run AI Steward deliberation (api alias)",
)
@limiter.limit("20/10seconds")
async def investigate_incident(
    request: Request,
    body: StewardInvestigationRequest,
):
    investigation = await asyncio.to_thread(
        _main.deliberate_steward_investigation,
        incident_id=body.incident_id,
        year=body.year,
        event=body.event,
        session=body.session,
    )
    return StewardInvestigationResponse(**investigation)
