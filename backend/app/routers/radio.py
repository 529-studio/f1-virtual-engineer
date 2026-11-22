import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Query, Request

import app.main as _main
from agents.radio_interpreter import interpret_radio
from app.schemas.common import COMMON_RATE_LIMIT_RESPONSES
from app.schemas.radio import (
    RadioFeedResponse,
    RadioRequest,
    RadioResponse,
)
from core.auth import OptionalUserId
from core.limiter import limiter
from core.persistence import insert_radio_history
from tools.radio_helper import get_team_radio_feed

_logger = logging.getLogger(__name__)

router = APIRouter(tags=["radio"], responses=COMMON_RATE_LIMIT_RESPONSES)


@router.get(
    "/api/radio/feed",
    response_model=RadioFeedResponse,
    summary="Fetch normalized team radio recordings feed",
    description="Returns authentic team radio messages, audio URLs, transcripts and tactical classifications.",
)
@router.get(
    "/radio/feed",
    response_model=RadioFeedResponse,
    include_in_schema=False,
)
@limiter.limit("10/minute")
async def get_radio_feed(
    request: Request,
    session_key: int = Query(default=9165, description="OpenF1 session key (default: 9165 for Singapore 2023 Race)"),
    driver_number: int | None = Query(default=None, description="Optional driver racing number filter"),
):
    result = await asyncio.to_thread(
        get_team_radio_feed,
        session_key=session_key,
        driver_number=driver_number,
    )
    return result


@router.post(
    "/api/radio/analyze",
    response_model=RadioResponse,
    summary="Classify a team-radio transcript with urgency and speaker identification",
)
@router.post(
    "/radio/analyze",
    response_model=RadioResponse,
    include_in_schema=False,
)
@limiter.limit("5/10seconds")
async def analyze_team_radio(
    request: Request,
    body: RadioRequest,
    user_id: OptionalUserId = None,
):
    result = await asyncio.to_thread(
        interpret_radio,
        transcript=body.transcript,
        driver=body.driver,
    )
    if user_id and not result.get("fallback"):
        asyncio.create_task(
            insert_radio_history(
                user_id=user_id,
                driver=body.driver,
                transcript=body.transcript,
                classification=result["classification"],
                severity=result["severity"],
                trigger_phrase=result["trigger_phrase"],
            )
        )
    return {
        "status": "success",
        "classification": result["classification"],
        "severity": result["severity"],
        "trigger_phrase": result["trigger_phrase"],
        "urgency": result.get("urgency", 2),
        "speaker": result.get("speaker", "driver"),
        "fallback": result.get("fallback", False),
        "fallback_reason": result.get("fallback_reason"),
    }
