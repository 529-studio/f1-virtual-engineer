import re
from collections import deque
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from tools.fastf1_helper import get_session_telemetry_summary

DEFAULT_EVENT = "Japanese Grand Prix"
DEFAULT_SESSION_TYPE = "R"
DEFAULT_YEAR = 2023
DRIVER_PATTERN = re.compile(r"\b(HAM|VER|NOR|LEC|SAI|RUS|PER|ALO|PIA|OCO|GAS|TSU|ALB|STR)\b", re.IGNORECASE)
YEAR_PATTERN = re.compile(r"\b(20\d{2})\b")
SESSION_PATTERN = re.compile(r"\b(FP1|FP2|FP3|Q|R|S|SQ|race|qualifying)\b", re.IGNORECASE)
MEMORY_RETENTION_CAP = 10
MEMORY_STORE: deque[dict[str, Any]] = deque(maxlen=MEMORY_RETENTION_CAP)


class AgentState(TypedDict):
    query: str
    intent: dict[str, Any]
    telemetry_data: dict[str, Any]
    response_text: str
    error: str | None
    memory: dict[str, Any]


def parse_telemetry_intent(query: str) -> dict[str, Any]:
    normalized = query.upper()
    driver_match = DRIVER_PATTERN.search(normalized)
    year_match = YEAR_PATTERN.search(normalized)
    session_match = SESSION_PATTERN.search(query)

    intent = {
        "intent": "telemetry_lookup",
        "driver": driver_match.group(1).upper() if driver_match else None,
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

    if not intent["driver"]:
        intent["needs_clarification"] = True
        intent["clarification_message"] = "Please provide a 3-letter driver code (for example: HAM, VER, NOR)."

    return intent


def parse_intent_node(state: AgentState) -> AgentState:
    intent = parse_telemetry_intent(state["query"])
    memory = state.get("memory") or {}
    # If user omits driver in follow-up question, try last known context.
    if intent["needs_clarification"] and memory.get("last_driver"):
        intent["driver"] = memory["last_driver"]
        intent["needs_clarification"] = False
        intent["clarification_message"] = None
        if not YEAR_PATTERN.search(state["query"]) and memory.get("last_year"):
            intent["year"] = memory["last_year"]
        if not SESSION_PATTERN.search(state["query"]) and memory.get("last_session_type"):
            intent["session_type"] = memory["last_session_type"]
        if "JAPAN" not in state["query"].upper() and memory.get("last_event"):
            intent["event"] = memory["last_event"]
    return {**state, "intent": intent}


def run_telemetry_node(state: AgentState) -> AgentState:
    intent = state["intent"]
    if intent["needs_clarification"]:
        return {**state, "error": intent["clarification_message"]}

    telemetry = get_session_telemetry_summary(
        year=intent["year"],
        event=intent["event"],
        session_type=intent["session_type"],
        driver=intent["driver"],
    )
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
    return {**state, "telemetry_data": telemetry, "memory": memory}


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
workflow.add_node("run_telemetry", run_telemetry_node)
workflow.add_node("format_response", format_response_node)
workflow.set_entry_point("parse_intent")
workflow.add_edge("parse_intent", "run_telemetry")
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


def analyze_query(query: str) -> dict[str, Any]:
    memory_snapshot = _build_memory_snapshot()
    result = app_graph.invoke(
        {
            "query": query,
            "intent": {},
            "telemetry_data": {},
            "response_text": "",
            "error": None,
            "memory": memory_snapshot,
        }
    )
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
    }
