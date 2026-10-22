import asyncio
import json as _json
import logging
import os
from typing import Annotated

from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse, StreamingResponse

import app.main as _main
from agents.race_engineer import analyze_query, set_emit_fn
from agents.radio_interpreter import interpret_radio
from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.schemas.pit_exit import PitExitRequest, PitExitResponse
from app.schemas.radio import RadioRequest, RadioResponse
from app.schemas.strategy_compare import StrategyCompareRequest, StrategyCompareResponse
from core import idempotency
from core.auth import OptionalUserId
from core.limiter import limiter
from core.persistence import insert_analyze_history, insert_radio_history
from tools.pit_exit_helper import get_pit_exit_projection
from tools.strategy_compare import compare_scenarios as compare_strategy_scenarios

_logger = logging.getLogger(__name__)

router = APIRouter(tags=["analysis"])


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze a telemetry or strategy question",
    description=(
        "Accepts a natural-language query plus optional explicit session context and returns either a telemetry summary "
        "or a baseline strategy recommendation with confidence, assumptions, and rationale.\n\n"
        "Pass an optional `Idempotency-Key` header (UUID recommended) to dedupe retries. The server caches the response "
        "for 60s under that key — duplicate POSTs within the window return the cached payload without re-running the agent "
        "or writing a second history row. Concurrent requests with the same key get HTTP 409 with a `Retry-After: 2` hint."
    ),
)
@limiter.limit("3/10seconds")
async def analyze_race_data(
    request: Request,
    body: AnalyzeRequest,
    user_id: OptionalUserId = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    if idempotency_key:
        cached = idempotency.lookup(idempotency_key)
        if cached is not None:
            status, payload = cached
            if status == idempotency.STATUS_DONE and payload is not None:
                return payload
            if status == idempotency.STATUS_PENDING:
                return JSONResponse(
                    status_code=409,
                    headers={"Retry-After": "2"},
                    content={"error": "Duplicate request in flight; retry shortly."},
                )
        if not idempotency.reserve(idempotency_key):
            return JSONResponse(
                status_code=409,
                headers={"Retry-After": "2"},
                content={"error": "Duplicate request in flight; retry shortly."},
            )

    try:
        rationale_async = (
            os.environ.get("RATIONALE_ASYNC", "").strip().lower() in {"1", "true", "yes", "on"}
            and user_id is not None
        )

        session_override = body.session_info.model_dump() if body.session_info else None
        result = await asyncio.to_thread(
            _main.analyze_query,
            body.query,
            session_override=session_override,
            driver_override=body.driver,
            target_driver=body.target_driver,
            force_template=rationale_async,
        )

        rationale_job_id: str | None = None
        analyze_history_id: str | None = None
        if user_id and not result.get("error"):
            intent = result.get("intent") or {}
            if rationale_async:
                row_id = await _main.insert_analyze_history(
                    user_id=user_id,
                    query=body.query,
                    driver=intent.get("driver") or body.driver,
                    event=intent.get("event") or (body.session_info.event if body.session_info else None),
                    year=intent.get("year") or (body.session_info.year if body.session_info else None),
                    session_type=intent.get("session_type")
                    or (body.session_info.session_type if body.session_info else None),
                    agent_response=result["response_text"],
                    rationale_source="template",
                    intent_type=intent.get("intent_type"),
                )
                analyze_history_id = row_id
                if row_id:
                    try:
                        from tasks.rationale import backfill_rationale

                        llm_context = {
                            "intent": intent,
                            "telemetry_data": result.get("telemetry_data") or {},
                            "strategy_data": result.get("strategy_data") or {},
                            "citations": [
                                {k: v for k, v in c.items() if k != "score"}
                                for c in (result.get("citations") or [])
                            ],
                        }
                        async_result = backfill_rationale.delay(
                            row_id=row_id,
                            user_id=user_id,
                            llm_context=llm_context,
                        )
                        rationale_job_id = async_result.id
                    except Exception:  # noqa: BLE001
                        _logger.warning("Failed to enqueue rationale backfill", exc_info=True)
            else:
                asyncio.create_task(
                    _main.insert_analyze_history(
                        user_id=user_id,
                        query=body.query,
                        driver=intent.get("driver") or body.driver,
                        event=intent.get("event") or (body.session_info.event if body.session_info else None),
                        year=intent.get("year") or (body.session_info.year if body.session_info else None),
                        session_type=intent.get("session_type")
                        or (body.session_info.session_type if body.session_info else None),
                        agent_response=result["response_text"],
                        rationale_source=result.get("rationale_source", "template"),
                        intent_type=intent.get("intent_type"),
                    )
                )

        response_payload = {
            "status": "error" if result.get("error") else "success",
            "agent_response": result["response_text"],
            "query": body.query,
            "intent": result["intent"],
            "telemetry_data": result["telemetry_data"],
            "strategy_data": result.get("strategy_data"),
            "rationale_source": result.get("rationale_source", "template"),
            "rationale_job_id": rationale_job_id,
            "analyze_history_id": analyze_history_id,
            "error": result["error"],
            "memory": result.get("memory"),
            "execution": result.get("execution"),
            "retry": result.get("retry"),
            "citations": result.get("citations", []),
            "controversy_analysis": result.get("controversy_analysis", []),
        }
    except Exception:
        if idempotency_key:
            idempotency.release(idempotency_key)
        raise

    if idempotency_key:
        idempotency.commit(idempotency_key, response_payload)
    return response_payload


@router.post(
    "/analyze/stream",
    summary="Stream analyze events via Server-Sent Events",
    description=(
        "Same semantics as POST /analyze but returns a `text/event-stream` response. "
        "Events are emitted as they complete:\n"
        "- `status` — stage progress (telemetry, strategy, rationale)\n"
        "- `telemetry` / `strategy` — partial data payloads\n"
        "- `token` — individual LLM text chunks\n"
        "- `done` — final AnalyzeResponse payload; connection closes\n"
        "- `error` — unrecoverable failure\n\n"
        "No idempotency support on the streaming endpoint. Rate limit: 3/10s."
    ),
)
@limiter.limit("3/10seconds")
async def analyze_race_data_stream(
    request: Request,
    body: AnalyzeRequest,
    user_id: OptionalUserId = None,
):
    queue: asyncio.Queue[dict | None] = asyncio.Queue()

    def emit_fn(msg: dict) -> None:
        queue.put_nowait(msg)

    def _run_agent() -> dict:
        _main.set_emit_fn(emit_fn)
        try:
            session_override = body.session_info.model_dump() if body.session_info else None
            return _main.analyze_query(
                body.query,
                session_override=session_override,
                driver_override=body.driver,
                target_driver=body.target_driver,
                force_template=False,
            )
        finally:
            _main.set_emit_fn(None)

    async def event_generator():
        agent_task = asyncio.create_task(asyncio.to_thread(_run_agent))

        try:
            while True:
                try:
                    msg = queue.get_nowait()
                except asyncio.QueueEmpty:
                    if agent_task.done():
                        while not queue.empty():
                            msg = queue.get_nowait()
                            yield f"event: {msg['event']}\ndata: {_json.dumps(msg['data'])}\n\n"
                        break
                    yield ": keepalive\n\n"
                    await asyncio.sleep(0.05)
                    continue

                yield f"event: {msg['event']}\ndata: {_json.dumps(msg['data'])}\n\n"

            try:
                result = agent_task.result()
            except Exception:
                _logger.warning("Agent task raised an exception in SSE stream", exc_info=True)
                yield f"event: error\ndata: {_json.dumps({'message': 'Analysis encountered an internal error. Please try again.'})}\n\n"
                return

            intent = result.get("intent") or {}
            response_payload = {
                "status": "error" if result.get("error") else "success",
                "agent_response": result["response_text"],
                "query": body.query,
                "intent": intent,
                "telemetry_data": result.get("telemetry_data") or {},
                "strategy_data": result.get("strategy_data"),
                "rationale_source": result.get("rationale_source", "template"),
                "rationale_job_id": None,
                "analyze_history_id": None,
                "error": result.get("error"),
                "memory": result.get("memory"),
                "execution": result.get("execution"),
                "retry": result.get("retry"),
                "citations": result.get("citations", []),
                "controversy_analysis": result.get("controversy_analysis", []),
            }

            if user_id and not result.get("error"):
                asyncio.create_task(
                    _main.insert_analyze_history(
                        user_id=user_id,
                        query=body.query,
                        driver=intent.get("driver") or body.driver,
                        event=intent.get("event") or (body.session_info.event if body.session_info else None),
                        year=intent.get("year") or (body.session_info.year if body.session_info else None),
                        session_type=intent.get("session_type")
                        or (body.session_info.session_type if body.session_info else None),
                        agent_response=result["response_text"],
                        rationale_source=result.get("rationale_source", "template"),
                        intent_type=intent.get("intent_type"),
                    )
                )

            yield f"event: done\ndata: {_json.dumps(response_payload, default=str)}\n\n"

        except asyncio.CancelledError:
            agent_task.cancel()
            raise

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/radio/analyze",
    response_model=RadioResponse,
    summary="Classify a team-radio transcript",
    description=(
        "Tags an F1 team-radio transcript with a single issue category, severity band, "
        "and the verbatim trigger phrase. Falls back to a 'none' classification with "
        "fallback metadata when the LLM is unavailable or returns malformed output."
    ),
)
@limiter.limit("3/10seconds")
async def analyze_radio(
    request: Request,
    body: RadioRequest,
    user_id: OptionalUserId = None,
):
    result = _main.interpret_radio(transcript=body.transcript, driver=body.driver)
    if user_id:
        asyncio.create_task(
            _main.insert_radio_history(
                user_id=user_id,
                transcript=body.transcript,
                driver=body.driver,
                classification=result["classification"],
                severity=result["severity"],
                trigger_phrase=result.get("trigger_phrase"),
                fallback=result["fallback"],
            )
        )
    return RadioResponse(
        status="error" if result["fallback"] else "success",
        classification=result["classification"],
        severity=result["severity"],
        trigger_phrase=result["trigger_phrase"],
        fallback=result["fallback"],
        fallback_reason=result.get("fallback_reason"),
    )


@router.post(
    "/strategy/compare",
    response_model=StrategyCompareResponse,
    summary="Side-by-side what-if for 1-3 strategy scenarios",
    description=(
        "Runs `strategy_analyzer` once per scenario spec and returns one outcome "
        "per slot — recommended pit window, confidence, expected gain, plus a "
        "BM25 citation lookup using the scenario label as the query. Per-scenario "
        "fail-closed: if one slot's helper raises, the others still return and "
        "only that slot carries `fallback: true` with a reason."
    ),
)
@limiter.limit("5/10seconds")
async def compare_strategies(
    request: Request,
    body: StrategyCompareRequest,
):
    outcomes = await asyncio.to_thread(
        compare_strategy_scenarios,
        year=body.year,
        event=body.event,
        session_type=body.session_type,
        driver=body.driver,
        target_driver=body.target_driver,
        scenarios=[s.model_dump() for s in body.scenarios],
    )
    return {
        "status": "success",
        "scenarios": outcomes,
    }


@router.post(
    "/strategy/pit-exit",
    response_model=PitExitResponse,
    summary="Predict pit exit position and immediate rivals on track",
    description=(
        "Projects where a driver rejoins if pitting at the end of lap N: "
        "rejoin position, position delta, nearest rivals ahead and behind with gaps, "
        "and traffic/contested status. Deterministic, L1+L2 cached, fail-closed."
    ),
)
@limiter.limit("5/10seconds")
async def project_pit_exit_route(
    request: Request,
    body: PitExitRequest,
):
    result = await asyncio.to_thread(
        get_pit_exit_projection,
        year=body.year,
        event=body.event,
        session=body.session,
        driver=body.driver,
        lap=body.lap,
        include_rivals=body.include_rivals,
    )
    return result
