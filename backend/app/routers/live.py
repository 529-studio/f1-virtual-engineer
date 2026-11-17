from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse

from core.live_poller import get_live_poller
from tools import openf1_helper

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["live"])


@router.get("/session", summary="Get active live session metadata")
async def get_live_session() -> Response:
    """Return active session metadata if active, or 204 No Content outside session window."""
    res = openf1_helper.get_active_session_meta()
    if res.get("fallback") or not res.get("data"):
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return JSONResponse(content=res["data"], status_code=status.HTTP_200_OK)


@router.get("/stream", summary="Stream live telemetry ticks via Server-Sent Events (SSE)")
async def stream_live_telemetry(request: Request) -> StreamingResponse:
    """Stream live telemetry ticks to connected clients without multiplying upstream queries."""
    poller = get_live_poller()
    if not poller.is_running:
        await poller.start()

    q = poller.subscribe()

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Yield initial snapshot immediately if available
            snapshot = await poller.get_latest_snapshot()
            if snapshot:
                yield f"event: tick\ndata: {json.dumps(snapshot)}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    tick = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"event: tick\ndata: {json.dumps(tick)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            poller.unsubscribe(q)

    headers = {
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers=headers,
    )
