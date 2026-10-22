import logging
from typing import Annotated

from fastapi import APIRouter, Path, Query, Request
from fastapi.responses import JSONResponse

import app.main as _main
from app.schemas.history import (
    AnalyzeHistoryResponse,
    RadioHistoryResponse,
    TelemetryHistoryResponse,
)
from app.schemas.saved_queries import (
    SavedQueryCreateRequest,
    SavedQueryItem,
    SavedQueryListResponse,
)
from core.auth import RequiredUserId
from core.limiter import limiter
from core.persistence import (
    delete_saved_query,
    insert_saved_query,
    list_analyze_history,
    list_radio_history,
    list_saved_queries,
    list_telemetry_history,
)

_logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/analyze/history",
    response_model=AnalyzeHistoryResponse,
    tags=["analysis"],
    summary="List the signed-in user's recent /analyze queries",
    description=(
        "Returns the most recent analyze queries for the authenticated user, ordered "
        "newest-first. Requires a valid Supabase JWT — anonymous callers receive 401."
    ),
)
@limiter.limit("30/10seconds")
async def get_analyze_history(
    request: Request,
    user_id: RequiredUserId,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    try:
        items = await _main.list_analyze_history(user_id=user_id, limit=limit)
    except Exception:  # noqa: BLE001
        _logger.warning("Failed to load analyze history", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "error": {
                    "code": "history_unavailable",
                    "message": "History service is temporarily unavailable.",
                },
            },
        )
    return {"items": items}


@router.get(
    "/radio/history",
    response_model=RadioHistoryResponse,
    tags=["analysis"],
    summary="List the signed-in user's recent radio classifications",
    description=(
        "Returns the most recent radio classifications for the authenticated user, ordered "
        "newest-first. Optionally filtered by driver code. Requires a valid Supabase JWT."
    ),
)
@limiter.limit("30/10seconds")
async def get_radio_history(
    request: Request,
    user_id: RequiredUserId,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    driver: Annotated[str | None, Query(description="Filter by 3-letter driver code, e.g. VER")] = None,
):
    try:
        items = await _main.list_radio_history(user_id=user_id, limit=limit, driver=driver)
    except Exception:  # noqa: BLE001
        _logger.warning("Failed to load radio history", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "error": {
                    "code": "history_unavailable",
                    "message": "History service is temporarily unavailable.",
                },
            },
        )
    return {"items": items}


@router.get(
    "/telemetry/history",
    response_model=TelemetryHistoryResponse,
    tags=["telemetry"],
    summary="List the signed-in user's recent /telemetry lookups",
    description=(
        "Returns the most recent telemetry lookups for the authenticated user, ordered "
        "newest-first. Requires a valid Supabase JWT — anonymous callers receive 401."
    ),
)
@limiter.limit("30/10seconds")
async def get_telemetry_history(
    request: Request,
    user_id: RequiredUserId,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
):
    try:
        items = await _main.list_telemetry_history(user_id=user_id, limit=limit)
    except Exception:  # noqa: BLE001
        _logger.warning("Failed to load telemetry history", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "error": {
                    "code": "history_unavailable",
                    "message": "History service is temporarily unavailable.",
                },
            },
        )
    return {"items": items}


@router.post(
    "/saved-queries",
    response_model=SavedQueryItem,
    status_code=201,
    tags=["analysis"],
    summary="Star a query so it survives past the rolling history window",
    description=(
        "Persists an analyze or telemetry request body under the signed-in user. "
        "Returns the created row so the frontend can render the star as 'already saved'."
    ),
)
@limiter.limit("10/10seconds")
async def create_saved_query(
    request: Request,
    body: SavedQueryCreateRequest,
    user_id: RequiredUserId,
):
    try:
        row = await _main.insert_saved_query(
            user_id=user_id,
            kind=body.kind,
            payload=body.payload,
            label=body.label,
        )
    except Exception:  # noqa: BLE001
        _logger.warning("Failed to insert saved query", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "error": {
                    "code": "saved_queries_unavailable",
                    "message": "Saved queries service is temporarily unavailable.",
                },
            },
        )
    if row is None:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "error": {
                    "code": "saved_queries_unavailable",
                    "message": "Saved queries service is not configured.",
                },
            },
        )
    return row


@router.get(
    "/saved-queries",
    response_model=SavedQueryListResponse,
    tags=["analysis"],
    summary="List the signed-in user's saved queries",
)
@limiter.limit("30/10seconds")
async def get_saved_queries(
    request: Request,
    user_id: RequiredUserId,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    try:
        items = await _main.list_saved_queries(user_id=user_id, limit=limit)
    except Exception:  # noqa: BLE001
        _logger.warning("Failed to load saved queries", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "error": {
                    "code": "saved_queries_unavailable",
                    "message": "Saved queries service is temporarily unavailable.",
                },
            },
        )
    return {"items": items}


@router.delete(
    "/saved-queries/{query_id}",
    status_code=204,
    tags=["analysis"],
    summary="Delete a saved query owned by the signed-in user",
    description=(
        "Returns 204 on success. Returns 404 when the row does not exist or "
        "belongs to a different user — the latter mapped to 404 to avoid "
        "leaking id existence to non-owners."
    ),
)
@limiter.limit("10/10seconds")
async def remove_saved_query(
    request: Request,
    query_id: Annotated[str, Path()],
    user_id: RequiredUserId,
):
    try:
        deleted = await _main.delete_saved_query(user_id=user_id, query_id=query_id)
    except Exception:  # noqa: BLE001
        _logger.warning("Failed to delete saved query", exc_info=True)
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "error": {
                    "code": "saved_queries_unavailable",
                    "message": "Saved queries service is temporarily unavailable.",
                },
            },
        )
    if not deleted:
        return JSONResponse(
            status_code=404,
            content={
                "status": "error",
                "error": {
                    "code": "not_found",
                    "message": "Saved query not found.",
                },
            },
        )
    return JSONResponse(status_code=204, content=None)
