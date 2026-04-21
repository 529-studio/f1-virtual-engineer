import re
from collections import deque
from time import monotonic, sleep
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from tools.fastf1_helper import get_session_telemetry_summary

DEFAULT_EVENT = "Japanese Grand Prix"
DEFAULT_SESSION_TYPE = "R"
DEFAULT_YEAR = 2023
DRIVER_PATTERN = re.compile(r"\b(HAM|VER|NOR|LEC|SAI|RUS|PER|ALO|PIA|OCO|GAS|TSU|ALB|STR)\b", re.IGNORECASE)
YEAR_PATTERN = re.compile(r"\b(20\d{2})\b")
SESSION_PATTERN = re.compile(r"\b(FP1|FP2|FP3|Q|R|S|SQ|race|qualifying)\b", re.IGNORECASE)
COMPARE_PATTERN = re.compile(r"\b(compare|versus|vs|so voi|against)\b", re.IGNORECASE)
MEMORY_RETENTION_CAP = 10
MEMORY_STORE: deque[dict[str, Any]] = deque(maxlen=MEMORY_RETENTION_CAP)
MAX_GRAPH_STEPS = 6
MAX_GRAPH_DURATION_SECONDS = 5.0
MAX_TOOL_RETRIES = 2
RETRY_BACKOFF_SECONDS = 0.1
RETRYABLE_ERROR_HINTS = ("timeout", "timed out", "temporarily unavailable", "connection", "rate limit")


class AgentState(TypedDict):
    query: str
    intent: dict[str, Any]
    telemetry_data: dict[str, Any]
    response_text: str
    error: str | None
    memory: dict[str, Any]
    retry_count: int
    retry_metadata: dict[str, Any]


def parse_telemetry_intent(query: str) -> dict[str, Any]:
    normalized = query.upper()
    driver_matches = [match.upper() for match in DRIVER_PATTERN.findall(normalized)]
    unique_drivers: list[str] = []
    for code in driver_matches:
        if code not in unique_drivers:
            unique_drivers.append(code)

    driver_match = unique_drivers[0] if unique_drivers else None
    year_match = YEAR_PATTERN.search(normalized)
    session_match = SESSION_PATTERN.search(query)

    intent = {
        "intent": "telemetry_lookup",
        "driver": driver_match,
        "driver_candidates": unique_drivers,
        "year": int(year_match.group(1)) if year_match else DEFAULT_YEAR,
        "event": DEFAULT_EVENT,
        "session_type": DEFAULT_SESSION_TYPE,
        "needs_clarification": False,
        "clarification_message": None,
    }

    if session_match:
        session_token = session_match.group(1).upper()
        intent["session_type"] = "Q" if session_token == "QUALIFYING" else ("R" if session_token == "RACE" else session_token)

    if "JAPAN" in normalized or "NHAT" in normalized:
        intent["event"] = "Japanese Grand Prix"

    if len(unique_drivers) > 1:
        intent["needs_clarification"] = True
        intent["clarification_message"] = (
            "Multiple driver codes detected. Please specify exactly one driver for this query."
        )
    elif not intent["driver"]:
        intent["needs_clarification"] = True
        intent["clarification_message"] = "Please provide a 3-letter driver code (for example: HAM, VER, NOR)."

    return intent


def parse_intent_node(state: AgentState) -> AgentState:
    intent = parse_telemetry_intent(state["query"])
    return {**state, "intent": intent}


def resolve_followup_node(state: AgentState) -> AgentState:
    intent = {**state["intent"]}
    memory = state.get("memory") or {}
    query = state["query"]

    if len(intent.get("driver_candidates", [])) > 1:
        intent["needs_clarification"] = True
        intent["clarification_message"] = (
            "Multiple driver codes detected. Please specify exactly one driver for this query."
        )
        return {**state, "intent": intent}

    if not intent.get("driver") and COMPARE_PATTERN.search(query):
        intent["needs_clarification"] = True
        intent["clarification_message"] = (
            "Comparison query detected but target driver is missing. Please provide one driver code."
        )
        return {**state, "intent": intent}

    if not intent.get("driver") and memory.get("last_driver"):
        intent["driver"] = memory["last_driver"]
        intent["needs_clarification"] = False
        intent["clarification_message"] = None

    if not YEAR_PATTERN.search(query) and memory.get("last_year"):
        intent["year"] = memory["last_year"]
    if not SESSION_PATTERN.search(query) and memory.get("last_session_type"):
        intent["session_type"] = memory["last_session_type"]
    if "JAPAN" not in query.upper() and memory.get("last_event"):
        intent["event"] = memory["last_event"]

    if not intent.get("driver"):
        intent["needs_clarification"] = True
        intent["clarification_message"] = "Please provide a 3-letter driver code (for example: HAM, VER, NOR)."

    return {**state, "intent": intent}


def run_telemetry_node(state: AgentState) -> AgentState:
    intent = state["intent"]
    if intent["needs_clarification"]:
        return {**state, "error": intent["clarification_message"]}

    telemetry, retry_count, retryable_exhausted = _call_with_retry(
        year=intent["year"],
        event=intent["event"],
        session_type=intent["session_type"],
        driver=intent["driver"],
    )
    if retryable_exhausted:
        return {
            **state,
            "telemetry_data": telemetry,
            "retry_count": retry_count,
            "retry_metadata": {
                "max_retries": MAX_TOOL_RETRIES,
                "retry_backoff_seconds": RETRY_BACKOFF_SECONDS,
                "retryable_exhausted": True,
            },
        }
    memory = state.get("memory") or {}
    memory.update(
        {
            "last_query": state["query"],
            "last_driver": intent["driver"],
            "last_event": intent["event"],
            "last_year": intent["year"],
            "last_session_type": intent["session_type"],
            "last_telemetry_data": telemetry,
        }
    )
    return {
        **state,
        "telemetry_data": telemetry,
        "memory": memory,
        "retry_count": retry_count,
        "retry_metadata": {
            "max_retries": MAX_TOOL_RETRIES,
            "retry_backoff_seconds": RETRY_BACKOFF_SECONDS,
            "retryable_exhausted": False,
        },
    }


def format_response_node(state: AgentState) -> AgentState:
    if state.get("error"):
        return {**state, "response_text": state["error"]}

    telemetry = state.get("telemetry_data") or {}
    if telemetry.get("fallback"):
        message = telemetry.get("fallback_reason") or "Telemetry data is unavailable for the current query."
        return {**state, "response_text": f"Telemetry unavailable: {message}"}

    speed = telemetry["speed"]
    gear = telemetry["gear"]
    rpm = telemetry["rpm"]
    response_text = (
        f"{telemetry['driver']} telemetry ({telemetry['event']} {telemetry['year']} {telemetry['session_type']}): "
        f"speed avg {speed['avg']:.1f} {speed['unit']} (min {speed['min']:.1f}, max {speed['max']:.1f}); "
        f"gear avg {gear['avg']:.1f}; rpm avg {rpm['avg']:.0f}."
    )
    return {**state, "response_text": response_text}


workflow = StateGraph(AgentState)
workflow.add_node("parse_intent", parse_intent_node)
workflow.add_node("resolve_followup", resolve_followup_node)
workflow.add_node("run_telemetry", run_telemetry_node)
workflow.add_node("format_response", format_response_node)
workflow.set_entry_point("parse_intent")
workflow.add_edge("parse_intent", "resolve_followup")
workflow.add_edge("resolve_followup", "run_telemetry")
workflow.add_edge("run_telemetry", "format_response")
workflow.add_edge("format_response", END)
app_graph = workflow.compile()


def _build_memory_snapshot() -> dict[str, Any]:
    if not MEMORY_STORE:
        return {"history": []}
    history = list(MEMORY_STORE)
    latest = history[-1]
    return {
        "history": history,
        "last_query": latest.get("last_query"),
        "last_driver": latest.get("last_driver"),
        "last_event": latest.get("last_event"),
        "last_year": latest.get("last_year"),
        "last_session_type": latest.get("last_session_type"),
        "last_telemetry_data": latest.get("last_telemetry_data"),
    }


def reset_memory_store() -> None:
    MEMORY_STORE.clear()


def _is_retryable_fallback_reason(reason: str | None) -> bool:
    if not reason:
        return False
    normalized = reason.lower()
    return any(hint in normalized for hint in RETRYABLE_ERROR_HINTS)


def _call_with_retry(
    *,
    year: int,
    event: str,
    session_type: str,
    driver: str,
) -> tuple[dict[str, Any], int, bool]:
    retry_count = 0
    while True:
        telemetry = get_session_telemetry_summary(
            year=year,
            event=event,
            session_type=session_type,
            driver=driver,
        )
        fallback_reason = telemetry.get("fallback_reason")
        is_retryable = telemetry.get("fallback") and _is_retryable_fallback_reason(fallback_reason)
        if not is_retryable:
            return telemetry, retry_count, False
        if retry_count >= MAX_TOOL_RETRIES:
            return telemetry, retry_count, True
        retry_count += 1
        sleep(RETRY_BACKOFF_SECONDS)


def analyze_query(query: str) -> dict[str, Any]:
    memory_snapshot = _build_memory_snapshot()
    termination_reason = "completed"
    start_time = monotonic()
    try:
        result = app_graph.invoke(
            {
                "query": query,
                "intent": {},
                "telemetry_data": {},
                "response_text": "",
                "error": None,
                "memory": memory_snapshot,
                "retry_count": 0,
                "retry_metadata": {},
            },
            config={"recursion_limit": MAX_GRAPH_STEPS},
        )
    except Exception as exc:
        termination_reason = "graph_error"
        elapsed_ms = (monotonic() - start_time) * 1000
        return {
            "intent": {},
            "telemetry_data": {},
            "response_text": "Could not process query due to graph execution error.",
            "error": str(exc),
            "memory": {
                "history_size": len(MEMORY_STORE),
                "retention_cap": MEMORY_RETENTION_CAP,
                "last_driver": memory_snapshot.get("last_driver"),
            },
            "execution": {
                "step_limit": MAX_GRAPH_STEPS,
                "duration_limit_seconds": MAX_GRAPH_DURATION_SECONDS,
                "duration_ms": elapsed_ms,
                "termination_reason": termination_reason,
            },
            "retry": {
                "count": 0,
                "max_retries": MAX_TOOL_RETRIES,
                "retryable_exhausted": False,
            },
        }

    elapsed_ms = (monotonic() - start_time) * 1000
    if elapsed_ms > MAX_GRAPH_DURATION_SECONDS * 1000:
        termination_reason = "duration_limit_exceeded"

    if result.get("memory"):
        memory_entry = {
            "last_query": result["memory"].get("last_query"),
            "last_driver": result["memory"].get("last_driver"),
            "last_event": result["memory"].get("last_event"),
            "last_year": result["memory"].get("last_year"),
            "last_session_type": result["memory"].get("last_session_type"),
            "last_telemetry_data": result["memory"].get("last_telemetry_data"),
        }
        MEMORY_STORE.append(memory_entry)

    return {
        "intent": result["intent"],
        "telemetry_data": result.get("telemetry_data", {}),
        "response_text": result["response_text"],
        "error": result.get("error"),
        "memory": {
            "history_size": len(MEMORY_STORE),
            "retention_cap": MEMORY_RETENTION_CAP,
            "last_driver": result.get("memory", {}).get("last_driver"),
        },
        "execution": {
            "step_limit": MAX_GRAPH_STEPS,
            "duration_limit_seconds": MAX_GRAPH_DURATION_SECONDS,
            "duration_ms": elapsed_ms,
            "termination_reason": termination_reason,
        },
        "retry": {
            "count": result.get("retry_count", 0),
            "max_retries": result.get("retry_metadata", {}).get("max_retries", MAX_TOOL_RETRIES),
            "retry_backoff_seconds": result.get("retry_metadata", {}).get("retry_backoff_seconds", RETRY_BACKOFF_SECONDS),
            "retryable_exhausted": result.get("retry_metadata", {}).get("retryable_exhausted", False),
        },
    }
