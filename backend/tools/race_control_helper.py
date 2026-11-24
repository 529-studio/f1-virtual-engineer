"""AI Race Control & Steward Investigation Helper (#73).

Ingests FastF1 race control messages and extracts incident events,
supported by a curated Singapore 2023 dataset and semantic lookup into
the FIA Sporting Regulations knowledge base.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from tools.knowledge_retriever import lookup as knowledge_lookup

_logger = logging.getLogger(__name__)

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "fixtures"
    / "race_control_singapore_2023.json"
)

# Standard penalty weightings by incident category
INCIDENT_RULES = {
    "COLLISION": {
        "article": "FIA Sporting Regulations — Article 33.4 & Appendix L Chapter IV",
        "title": "Rules of Driving Conduct & Causing a Collision",
        "snippet": (
            "At no time may a car be driven unnecessarily slowly, erratically or in a manner "
            "which could be deemed potentially dangerous to other drivers. Causing a collision, "
            "or forcing another car off the track, will be penalized by the Stewards."
        ),
        "team_defense": (
            "Telemetry demonstrates the attacking car established significant overlap prior to apex. "
            "The collision was a standard racing incident exacerbated by dirty air and narrow street circuit margins."
        ),
        "steward_prosecution": (
            "Telemetry traces indicate excessive entry speed with late braking lockup, depriving the outside car "
            "of required racing room and initiating avoidable contact."
        ),
        "predicted_verdict": "TIME_PENALTY_5S",
        "confidence_pct": 82,
        "penalty_breakdown": [
            {"penalty": "TIME_PENALTY_5S", "probability_pct": 60, "description": "Standard baseline penalty for avoidable collision"},
            {"penalty": "TIME_PENALTY_10S", "probability_pct": 20, "description": "Aggravated penalty if defending car is forced to retire"},
            {"penalty": "NO_FURTHER_ACTION", "probability_pct": 10, "description": "Mitigating first-lap or racing room ambiguity"},
            {"penalty": "REPRIMAND", "probability_pct": 10, "description": "Formal warning if telemetry shows evasive steering"},
            {"penalty": "DRIVE_THROUGH", "probability_pct": 0, "description": "Reserved for repeat egregious reckless conduct"},
            {"penalty": "GRID_DROP", "probability_pct": 0, "description": "Applicable if driver is unable to serve in-race"},
        ],
    },
    "TRACK_LIMITS": {
        "article": "FIA Sporting Regulations — Article 33.3",
        "title": "Track Limits & Leaving Track Surface",
        "snippet": (
            "Drivers must use the track at all times and may not leave the track without a justifiable reason. "
            "A driver will be judged to have left the track if no part of the car remains in contact with it. "
            "Lap times achieved by leaving the track will be deleted."
        ),
        "team_defense": (
            "The vehicle suffered a sudden aerodynamic snap over the kerb; the driver did not gain any time "
            "or speed advantage and rejoined safely without impeding competitors."
        ),
        "steward_prosecution": (
            "CCTV and telemetry confirms all four wheels completely crossed the white boundary line, "
            "constituting a clear track limits breach."
        ),
        "predicted_verdict": "NO_FURTHER_ACTION",
        "confidence_pct": 90,
        "penalty_breakdown": [
            {"penalty": "NO_FURTHER_ACTION", "probability_pct": 70, "description": "Lap time deleted with black/white warning flag"},
            {"penalty": "TIME_PENALTY_5S", "probability_pct": 20, "description": "Fourth cumulative track limits infringement"},
            {"penalty": "REPRIMAND", "probability_pct": 10, "description": "Failure to follow race director return instructions"},
            {"penalty": "TIME_PENALTY_10S", "probability_pct": 0, "description": "Subsequent fifth track limits penalty"},
            {"penalty": "DRIVE_THROUGH", "probability_pct": 0, "description": "Not applicable for minor track limits"},
            {"penalty": "GRID_DROP", "probability_pct": 0, "description": "Not applicable in-race"},
        ],
    },
    "SAFETY_CAR_INFECT": {
        "article": "FIA Sporting Regulations — Article 55.7 & Article 55.10",
        "title": "Safety Car Speed Deltas & Restart Line Etiquette",
        "snippet": (
            "All competing cars must reduce speed and form up in line behind the Safety Car. "
            "No car may be driven erratically or unnecessarily slowly, and no car may overtake "
            "another car until it has passed Line 1 after the Safety Car has returned to the pits."
        ),
        "team_defense": (
            "The driver immediately backed out of the throttle upon realizing the runoff excursion and "
            "voluntarily yielded track position back to adjacent cars before Sector 1 timing line."
        ),
        "steward_prosecution": (
            "Telemetry confirmed an initial speed advantage gained in the Turn 1 runoff, but concedes "
            "that position was surrendered prior to the safety car restart line."
        ),
        "predicted_verdict": "NO_FURTHER_ACTION",
        "confidence_pct": 88,
        "penalty_breakdown": [
            {"penalty": "NO_FURTHER_ACTION", "probability_pct": 75, "description": "Position ceded back satisfies mitigating directives"},
            {"penalty": "TIME_PENALTY_5S", "probability_pct": 15, "description": "Applied if sporting advantage was sustained"},
            {"penalty": "REPRIMAND", "probability_pct": 10, "description": "Procedural caution for erratic throttle application"},
            {"penalty": "TIME_PENALTY_10S", "probability_pct": 0, "description": "Reserved for dangerous overtaking under yellow/SC"},
            {"penalty": "DRIVE_THROUGH", "probability_pct": 0, "description": "Severe pit-lane speed violation"},
            {"penalty": "GRID_DROP", "probability_pct": 0, "description": "Post-race adjustment only"},
        ],
    },
}


def _load_singapore_2023_fixture() -> dict[str, Any] | None:
    """Load Singapore 2023 race control fixture."""
    if FIXTURE_PATH.is_file():
        try:
            with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:  # noqa: BLE001
            _logger.warning("Failed to load Singapore 2023 race control fixture: %s", exc)
    return None


def get_race_control_feed(year: int, event: str, session: str) -> dict[str, Any]:
    """Retrieve official or simulated race control messages feed."""
    norm_event = event.lower().strip()

    # Priority 1: Match Singapore 2023 showcase dataset
    if year == 2023 and "singapore" in norm_event:
        fixture = _load_singapore_2023_fixture()
        if fixture:
            return {
                "status": "success",
                "year": 2023,
                "event": "Singapore Grand Prix",
                "session": "Race",
                "total_incidents": len(fixture.get("items", [])),
                "items": fixture.get("items", []),
            }

    # Priority 2: Attempt live FastF1 extraction
    try:
        import fastf1 as ff1  # noqa: PLC0415
        s = ff1.get_session(year, event, session)
        s.load(laps=True, telemetry=False, weather=False, messages=True)
        if hasattr(s, "race_control_messages") and s.race_control_messages is not None and not s.race_control_messages.empty:
            df = s.race_control_messages
            items: list[dict[str, Any]] = []
            for idx, row in df.iterrows():
                msg_text = str(row.get("Message", ""))
                cat = "COLLISION" if "COLLISION" in msg_text or "CONTACT" in msg_text else "TRACK_LIMITS" if "TRACK LIMITS" in msg_text else "SAFETY_CAR_INFECT" if "SAFETY CAR" in msg_text else "TECHNICAL_FLAG"
                status = "DECISION_REACHED" if "PENALTY" in msg_text or "NO FURTHER" in msg_text else "UNDER_INVESTIGATION" if "INVESTIGAT" in msg_text else "NOTED"
                lap_val = int(row.get("Lap", 1)) if row.get("Lap") and str(row.get("Lap")).isdigit() else 1
                items.append({
                    "id": f"{year}_{idx}_RC",
                    "lap": lap_val,
                    "timestamp_str": str(row.get("Time", "00:00:00")),
                    "category": cat,
                    "status": status,
                    "drivers_involved": [str(row.get("RacingNumber", ""))] if row.get("RacingNumber") else [],
                    "flag": str(row.get("Flag", "GREEN")),
                    "message": msg_text,
                    "description": msg_text,
                })
            return {
                "status": "success",
                "year": year,
                "event": event,
                "session": session,
                "total_incidents": len(items),
                "items": items,
            }
    except Exception as exc:  # noqa: BLE001
        _logger.warning("FastF1 race control messages unavailable: %s", exc)

    # Priority 3: Fallback synthesized race control milestones
    fallback_items = [
        {
            "id": f"GEN_{year}_INC_01",
            "lap": 4,
            "timestamp_str": "14:08:12",
            "category": "TRACK_LIMITS",
            "status": "NOTED",
            "drivers_involved": ["LEC"],
            "flag": "GREEN",
            "message": "CAR 16 (LEC) LAP TIME DELETED - TRACK LIMITS TURN 4",
            "description": "Car 16 exceeded track limits at apex exit of Turn 4.",
        },
        {
            "id": f"GEN_{year}_INC_02",
            "lap": 18,
            "timestamp_str": "14:28:44",
            "category": "COLLISION",
            "status": "UNDER_INVESTIGATION",
            "drivers_involved": ["PIA", "SAI"],
            "flag": "YELLOW",
            "message": "INCIDENT AT TURN 1 INVOLVING CARS 81 AND 55 NOTED",
            "description": "Wheel contact observed into Turn 1 braking zone.",
        },
        {
            "id": f"GEN_{year}_INC_03",
            "lap": 32,
            "timestamp_str": "14:49:10",
            "category": "SAFETY_CAR_INFECT",
            "status": "NO_FURTHER_ACTION",
            "drivers_involved": ["VER"],
            "flag": "SAFETY_CAR",
            "message": "SAFETY CAR RESTART PROCEDURE REVIEWED - ALL CARS CLEAR",
            "description": "All telemetry deltas within permissible 10-car-length interval.",
        },
    ]
    return {
        "status": "fallback",
        "year": year,
        "event": event,
        "session": session,
        "total_incidents": len(fallback_items),
        "items": fallback_items,
    }


def deliberate_steward_investigation(
    incident_id: str,
    year: int = 2023,
    event: str = "Singapore Grand Prix",
    session: str = "Race",
) -> dict[str, Any]:
    """Run an AI Steward deliberation on a specific incident using FIA Sporting Regs RAG."""
    feed = get_race_control_feed(year, event, session)
    incident = next((item for item in feed["items"] if item["id"] == incident_id), None)

    category = incident.get("category", "COLLISION") if incident else "COLLISION"
    drivers = incident.get("drivers_involved", ["PER", "ALB"]) if incident else ["PER", "ALB"]

    # Rule profile baseline
    rule_profile = INCIDENT_RULES.get(category, INCIDENT_RULES["COLLISION"])

    # Augment with knowledge base lookup if available
    reg_title = rule_profile["title"]
    reg_article = rule_profile["article"]
    reg_snippet = rule_profile["snippet"]

    try:
        query_kw = f"FIA sporting regulations {category.lower()} penalty article"
        rag_hits = knowledge_lookup(query_kw, k=2)
        if rag_hits and len(rag_hits) > 0:
            top = rag_hits[0]
            if top.get("title") and top.get("snippet"):
                reg_title = top.get("title", reg_title)
                reg_snippet = top.get("snippet", reg_snippet)
                if top.get("section"):
                    reg_article = f"FIA Sporting Regulations — {top['section']}"
    except Exception as exc:  # noqa: BLE001
        _logger.warning("Knowledge lookup failed: %s", exc)

    return {
        "status": feed.get("status", "success"),
        "incident_id": incident_id,
        "category": category,
        "drivers_involved": drivers,
        "regulation_article": reg_article,
        "regulation_title": reg_title,
        "regulation_snippet": reg_snippet,
        "team_defense_argument": rule_profile["team_defense"],
        "steward_prosecution_argument": rule_profile["steward_prosecution"],
        "predicted_verdict": rule_profile["predicted_verdict"],
        "confidence_pct": rule_profile["confidence_pct"],
        "penalty_breakdown": rule_profile["penalty_breakdown"],
    }
