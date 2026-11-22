"""F1 Team Radio Helper & Ingestion Engine.

Fetches real team radio recordings from OpenF1 REST API with Redis L2 caching
and robust fallback to curated local fixtures for zero-network environments.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from core import redis_cache

_logger = logging.getLogger(__name__)

# Official 2023 F1 Grid Mapping
DRIVER_NUMBER_MAP: dict[int, dict[str, str]] = {
    1: {"code": "VER", "name": "Max Verstappen", "team": "Red Bull Racing", "color": "#3671C6"},
    11: {"code": "PER", "name": "Sergio Perez", "team": "Red Bull Racing", "color": "#3671C6"},
    16: {"code": "LEC", "name": "Charles Leclerc", "team": "Ferrari", "color": "#EF1A2D"},
    55: {"code": "SAI", "name": "Carlos Sainz", "team": "Ferrari", "color": "#EF1A2D"},
    44: {"code": "HAM", "name": "Lewis Hamilton", "team": "Mercedes", "color": "#00D2BE"},
    63: {"code": "RUS", "name": "George Russell", "team": "Mercedes", "color": "#00D2BE"},
    4: {"code": "NOR", "name": "Lando Norris", "team": "McLaren", "color": "#FF8000"},
    81: {"code": "PIA", "name": "Oscar Piastri", "team": "McLaren", "color": "#FF8000"},
    14: {"code": "ALO", "name": "Fernando Alonso", "team": "Aston Martin", "color": "#358C75"},
    18: {"code": "STR", "name": "Lance Stroll", "team": "Aston Martin", "color": "#358C75"},
    31: {"code": "OCO", "name": "Esteban Ocon", "team": "Alpine", "color": "#0093CC"},
    10: {"code": "GAS", "name": "Pierre Gasly", "team": "Alpine", "color": "#0093CC"},
    22: {"code": "TSU", "name": "Yuki Tsunoda", "team": "AlphaTauri", "color": "#5E8FAA"},
    40: {"code": "LAW", "name": "Liam Lawson", "team": "AlphaTauri", "color": "#5E8FAA"},
    23: {"code": "ALB", "name": "Alexander Albon", "team": "Williams", "color": "#37BEDD"},
    2: {"code": "SAR", "name": "Logan Sargeant", "team": "Williams", "color": "#37BEDD"},
    77: {"code": "BOT", "name": "Valtteri Bottas", "team": "Alfa Romeo", "color": "#C92D4B"},
    24: {"code": "ZHO", "name": "Zhou Guanyu", "team": "Alfa Romeo", "color": "#C92D4B"},
    20: {"code": "MAG", "name": "Kevin Magnussen", "team": "Haas F1 Team", "color": "#B6BABD"},
    27: {"code": "HUL", "name": "Nico Hulkenberg", "team": "Haas F1 Team", "color": "#B6BABD"},
}

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "fixtures"
    / "team_radio_singapore_2023.json"
)

CACHE_TTL_SECONDS = 3600


def _load_fixture(driver_number: int | None = None) -> dict[str, Any]:
    """Load curated local fixture with optional driver number filtering."""
    try:
        with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if driver_number is not None:
            filtered_items = [
                item for item in data.get("items", [])
                if item.get("driver_number") == driver_number
            ]
            return {
                "status": "fixture_fallback",
                "total_messages": len(filtered_items),
                "session_name": data.get("session_name", "Singapore Grand Prix 2023 - Race"),
                "circuit_name": data.get("circuit_name", "Marina Bay Street Circuit"),
                "items": filtered_items,
            }
        return data
    except Exception as exc:
        _logger.warning("Failed to read team radio fixture: %s", exc)
        return {
            "status": "error",
            "total_messages": 0,
            "session_name": "Unknown",
            "circuit_name": "Unknown",
            "items": [],
        }


def _fetch_from_openf1(
    session_key: int, driver_number: int | None = None
) -> list[dict[str, Any]] | None:
    """Fetch raw radio recordings from OpenF1."""
    query = f"session_key={session_key}"
    if driver_number is not None:
        query += f"&driver_number={driver_number}"
    url = f"https://api.openf1.org/v1/team_radio?{query}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "F1VirtualEngineer/2.1 (https://github.com/529-studio/f1-virtual-engineer)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                body = response.read().decode("utf-8")
                return json.loads(body)
    except Exception as exc:
        _logger.info("OpenF1 team_radio fetch bypassed or failed: %s", exc)
        return None
    return None


def get_team_radio_feed(
    session_key: int = 9165, driver_number: int | None = None
) -> dict[str, Any]:
    """Return normalized team radio feed with Redis L2 caching and fixture fallback."""
    cache_key = f"{session_key}:{driver_number or 'all'}"
    cached = redis_cache.get("radio_feed", cache_key)
    if cached is not None:
        return cached

    # Attempt upstream fetch
    upstream = _fetch_from_openf1(session_key=session_key, driver_number=driver_number)
    if upstream is None or not isinstance(upstream, list) or len(upstream) == 0:
        # Fallback to local curated fixture
        return _load_fixture(driver_number=driver_number)

    # If upstream succeeded, merge with fixture transcripts and metadata
    fixture_data = _load_fixture(driver_number=driver_number)
    fixture_items_by_url = {
        item.get("recording_url"): item for item in fixture_data.get("items", [])
    }

    normalized_items: list[dict[str, Any]] = []
    for raw in upstream:
        rec_url = raw.get("recording_url", "")
        driver_num = raw.get("driver_number", 0)
        driver_info = DRIVER_NUMBER_MAP.get(
            driver_num,
            {"code": f"D{driver_num}", "name": f"Driver {driver_num}", "team": "Independent", "color": "#FFFFFF"},
        )

        matched_fixture = fixture_items_by_url.get(rec_url)
        if matched_fixture:
            normalized_items.append(matched_fixture)
        else:
            uid = f"{session_key}_{driver_num}_{raw.get('date', '')}"
            normalized_items.append({
                "id": uid,
                "meeting_key": raw.get("meeting_key", 1219),
                "session_key": session_key,
                "driver_number": driver_num,
                "driver_code": driver_info["code"],
                "team_name": driver_info["team"],
                "timestamp_utc": raw.get("date", ""),
                "lap_number": None,
                "recording_url": rec_url,
                "duration_seconds": 3.5,
                "transcript": "Radio communication broadcast.",
                "classification": "strategy_request",
                "urgency": 2,
                "speaker": "driver",
                "trigger_phrase": "Radio communication",
            })

    result = {
        "status": "success",
        "total_messages": len(normalized_items),
        "session_name": "Singapore Grand Prix 2023 - Race",
        "circuit_name": "Marina Bay Street Circuit",
        "items": normalized_items,
    }

    redis_cache.set("radio_feed", cache_key, result, ttl_seconds=CACHE_TTL_SECONDS)

    return result
