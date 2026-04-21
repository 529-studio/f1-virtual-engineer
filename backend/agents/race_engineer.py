import re
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from tools.fastf1_helper import get_session_telemetry_summary

DEFAULT_EVENT = "Japanese Grand Prix"
DEFAULT_SESSION_TYPE = "R"
DEFAULT_YEAR = 2023
DRIVER_PATTERN = re.compile(r"\b(HAM|VER|NOR|LEC|SAI|RUS|PER|ALO|PIA|OCO|GAS|TSU|ALB|STR)\b", re.IGNORECASE)
YEAR_PATTERN = re.compile(r"\b(20\d{2})\b")
SESSION_PATTERN = re.compile(r"\b(FP1|FP2|FP3|Q|R|S|SQ|race|qualifying)\b", re.IGNORECASE)


class AgentState(TypedDict):
    query: str
    intent: dict[str, Any]
    telemetry_data: dict[str, Any]
    response_text: str
    error: str | None


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
    return {**state, "telemetry_data": telemetry}


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


def analyze_query(query: str) -> dict[str, Any]:
    result = app_graph.invoke(
        {
            "query": query,
            "intent": {},
            "telemetry_data": {},
            "response_text": "",
            "error": None,
        }
    )
    return {
        "intent": result["intent"],
        "telemetry_data": result.get("telemetry_data", {}),
        "response_text": result["response_text"],
        "error": result.get("error"),
    }
