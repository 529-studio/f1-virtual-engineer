from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
import os
from typing import Any, Dict, List, Optional

import httpx

from app.schemas.live import (
    LiveDriverSnapshot,
    LiveRaceTick,
    LiveSafetyCarState,
    LiveSessionMeta,
    TyreCompoundLiteral,
    load_replay_fixture,
)

logger = logging.getLogger(__name__)

OPENF1_BASE_URL = os.getenv("OPENF1_BASE_URL", "https://api.openf1.org/v1")
USER_AGENT = "f1-virtual-engineer/1.0"
REQUEST_TIMEOUT_SECONDS = 5.0

VALID_COMPOUNDS: set[str] = {"SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"}


def get_live_data_source() -> str:
    """Return active data source mode: 'openf1', 'replay', or 'none'."""
    return os.getenv("LIVE_DATA_SOURCE", "replay").lower().strip()


def parse_iso_datetime(dt_val: str | datetime) -> datetime:
    """Safely parse ISO string or return timezone-aware UTC datetime."""
    if isinstance(dt_val, datetime):
        return dt_val if dt_val.tzinfo else dt_val.replace(tzinfo=timezone.utc)
    # Normalize Z to +00:00
    cleaned = dt_val.replace("Z", "+00:00")
    dt = datetime.fromisoformat(cleaned)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_session_window_active(
    date_start: str | datetime,
    date_end: str | datetime,
    now_utc: str | datetime | None = None,
) -> bool:
    """Return True if now_utc falls between (date_start - 30m) and (date_end + 30m)."""
    try:
        start_dt = parse_iso_datetime(date_start)
        end_dt = parse_iso_datetime(date_end)
        current = parse_iso_datetime(now_utc) if now_utc else datetime.now(timezone.utc)

        window_start = start_dt - timedelta(minutes=30)
        window_end = end_dt + timedelta(minutes=30)
        return window_start <= current <= window_end
    except Exception as exc:
        logger.warning("Error evaluating session window: %s", exc)
        return False


def fetch_openf1_endpoint(endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Fetch OpenF1 REST endpoint wrapped in fail-closed envelope."""
    url = f"{OPENF1_BASE_URL.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    try:
        response = httpx.get(url, params=params, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
        return {
            "fallback": False,
            "fallback_reason": None,
            "data": data if isinstance(data, list) else [data],
        }
    except Exception as exc:
        logger.warning("OpenF1 endpoint request failed for %s: %s", endpoint, exc)
        return {
            "fallback": True,
            "fallback_reason": str(exc),
            "data": [],
        }


def get_active_session_meta() -> Dict[str, Any]:
    """Return active session metadata if within window, or None."""
    source = get_live_data_source()
    if source == "none":
        return {"fallback": False, "fallback_reason": None, "data": None}

    if source == "replay":
        try:
            fixture = load_replay_fixture()
            meta_dict = fixture.get("session_meta")
            meta = LiveSessionMeta.model_validate(meta_dict).model_dump()
            return {"fallback": False, "fallback_reason": None, "data": meta}
        except Exception as exc:
            return {"fallback": True, "fallback_reason": str(exc), "data": None}

    # source == "openf1"
    res = fetch_openf1_endpoint("sessions", params={"session_key": "latest"})
    if res["fallback"] or not res["data"]:
        return {
            "fallback": res["fallback"],
            "fallback_reason": res.get("fallback_reason") or "No active sessions found",
            "data": None,
        }

    latest_session = res["data"][0]
    date_start = latest_session.get("date_start")
    date_end = latest_session.get("date_end")
    if not (date_start and date_end and is_session_window_active(date_start, date_end)):
        return {"fallback": False, "fallback_reason": None, "data": None}

    try:
        session_meta = LiveSessionMeta(
            session_key=int(latest_session["session_key"]),
            meeting_key=int(latest_session.get("meeting_key", 0)),
            circuit_key=int(latest_session.get("circuit_key", 0)),
            circuit_short_name=str(latest_session.get("circuit_short_name", "Unknown")),
            country_name=str(latest_session.get("country_name", "Unknown")),
            session_name=str(latest_session.get("session_name", "Live Session")),
            session_type=str(latest_session.get("session_type", "Race")),
            date_start=str(date_start),
            date_end=str(date_end),
            is_live=True,
            source="openf1",
        )
        return {"fallback": False, "fallback_reason": None, "data": session_meta.model_dump()}
    except Exception as exc:
        return {"fallback": True, "fallback_reason": str(exc), "data": None}


def normalize_openf1_components(
    session_key: int,
    positions: List[Dict[str, Any]],
    intervals: List[Dict[str, Any]],
    drivers_meta: List[Dict[str, Any]],
    stints: List[Dict[str, Any]],
    laps: List[Dict[str, Any]],
    locations: List[Dict[str, Any]],
    race_control: List[Dict[str, Any]],
    polled_at: Optional[str] = None,
    source: str = "openf1",
) -> Dict[str, Any]:
    """Normalize raw OpenF1 data array components into unified LiveRaceTick dictionary."""
    polled_iso = polled_at or datetime.now(timezone.utc).isoformat()

    # Determine safety car status
    safety_car_status: LiveSafetyCarState = "NONE"
    for event in reversed(race_control or []):
        cat = str(event.get("category", "")).upper()
        flag = str(event.get("flag", "")).upper()
        msg = str(event.get("message", "")).upper()

        if "RED" in flag or "RED FLAG" in msg:
            safety_car_status = "RED_FLAG"
            break
        if "VIRTUAL" in msg or flag == "VSC":
            if "ENDING" not in msg and "CLEAR" not in msg and flag != "CLEAR":
                safety_car_status = "VSC"
                break
        if "SAFETY CAR" in msg or flag == "SC":
            if "CLEAR" not in msg and "ENDING" not in msg and "IN THIS LAP" not in msg and flag != "CLEAR":
                safety_car_status = "SC"
                break

    # Index auxiliary data by driver_number
    driver_info_map = {int(d["driver_number"]): d for d in drivers_meta if "driver_number" in d}
    intervals_map = {int(i["driver_number"]): i for i in intervals if "driver_number" in i}

    # Latest stint per driver
    stints_map: Dict[int, Dict[str, Any]] = {}
    for st in sorted(stints or [], key=lambda s: int(s.get("stint_number", 0))):
        if "driver_number" in st:
            stints_map[int(st["driver_number"])] = st

    # Latest lap per driver
    laps_map: Dict[int, Dict[str, Any]] = {}
    for lp in sorted(laps or [], key=lambda l: int(l.get("lap_number", 0))):
        if "driver_number" in lp:
            laps_map[int(lp["driver_number"])] = lp

    # Latest coordinates per driver
    locations_map: Dict[int, tuple[float, float]] = {}
    for loc in locations or []:
        if "driver_number" in loc and "x" in loc and "y" in loc:
            locations_map[int(loc["driver_number"])] = (float(loc["x"]), float(loc["y"]))

    # Sort positions by date to keep only latest per driver
    latest_positions: Dict[int, Dict[str, Any]] = {}
    for pos in positions or []:
        if "driver_number" in pos:
            d_num = int(pos["driver_number"])
            latest_positions[d_num] = pos

    driver_snapshots: List[LiveDriverSnapshot] = []
    leader_lap = 1

    sorted_positions = sorted(
        latest_positions.values(), key=lambda p: int(p.get("position", 99))
    )

    for pos in sorted_positions:
        d_num = int(pos["driver_number"])
        p_val = int(pos.get("position", 99))
        driver_meta = driver_info_map.get(d_num, {})
        interval_data = intervals_map.get(d_num, {})
        stint_data = stints_map.get(d_num, {})
        lap_data = laps_map.get(d_num, {})

        driver_code = str(driver_meta.get("name_acronym") or f"D{d_num}")[:4]
        team_name = str(driver_meta.get("team_name") or "Unknown")

        # Intervals
        interval_val = interval_data.get("interval")
        gap_val = interval_data.get("gap_to_leader")
        interval_float = float(interval_val) if interval_val is not None else None
        gap_float = float(gap_val) if gap_val is not None else None

        # Last lap
        last_lap_sec = (
            float(lap_data["lap_duration"])
            if lap_data and lap_data.get("lap_duration")
            else None
        )
        current_lap_num = int(lap_data.get("lap_number", 1)) if lap_data else 1
        if p_val == 1 and current_lap_num > leader_lap:
            leader_lap = current_lap_num

        # Tyre & stints
        raw_compound = str(stint_data.get("compound", "UNKNOWN")).upper()
        compound: TyreCompoundLiteral = (
            raw_compound if raw_compound in VALID_COMPOUNDS else "UNKNOWN"  # type: ignore
        )
        stint_num = max(1, int(stint_data.get("stint_number", 1)))
        tyre_age = max(0, int(stint_data.get("laps_in_stint", 0)))
        pit_stops = max(0, stint_num - 1)
        in_pit = bool(lap_data.get("is_pit_out_lap", False))

        coords = locations_map.get(d_num)

        snapshot = LiveDriverSnapshot(
            position=p_val,
            driver_number=d_num,
            driver_code=driver_code,
            team_name=team_name,
            interval_to_ahead=interval_float,
            gap_to_leader=gap_float,
            last_lap_time=last_lap_sec,
            current_stint=stint_num,
            tyre_compound=compound,
            tyre_age=tyre_age,
            pit_stops=pit_stops,
            in_pit=in_pit,
            coordinates=coords,
        )
        driver_snapshots.append(snapshot)

    tick = LiveRaceTick(
        session_key=session_key,
        polled_at=polled_iso,
        delay_seconds=3.0,
        stale=False,
        source="replay" if source == "replay" else "openf1",
        safety_car_status=safety_car_status,
        leader_lap=leader_lap,
        drivers=driver_snapshots,
    )
    return tick.model_dump()


def normalize_live_snapshot(session_key: Optional[int] = None) -> Dict[str, Any]:
    """Fetch live telemetry and normalize into LiveRaceTick dict envelope."""
    source = get_live_data_source()
    if source == "none":
        return {
            "fallback": False,
            "fallback_reason": None,
            "data": None,
        }

    if source == "replay":
        try:
            fixture = load_replay_fixture()
            tick_dict = dict(fixture.get("sample_tick", {}))
            tick_dict["polled_at"] = datetime.now(timezone.utc).isoformat()
            validated = LiveRaceTick.model_validate(tick_dict)
            return {
                "fallback": False,
                "fallback_reason": None,
                "data": validated.model_dump(),
            }
        except Exception as exc:
            return {"fallback": True, "fallback_reason": str(exc), "data": None}

    # source == "openf1"
    if not session_key:
        active_meta = get_active_session_meta()
        if not active_meta.get("data"):
            return {
                "fallback": active_meta.get("fallback", False),
                "fallback_reason": active_meta.get("fallback_reason") or "No active session",
                "data": None,
            }
        session_key = active_meta["data"]["session_key"]

    try:
        # Fetch endpoints in sequence within rate budget
        positions_res = fetch_openf1_endpoint("position", {"session_key": session_key})
        intervals_res = fetch_openf1_endpoint("intervals", {"session_key": session_key})
        drivers_res = fetch_openf1_endpoint("drivers", {"session_key": session_key})
        stints_res = fetch_openf1_endpoint("stints", {"session_key": session_key})
        laps_res = fetch_openf1_endpoint("laps", {"session_key": session_key})
        locations_res = fetch_openf1_endpoint("location", {"session_key": session_key})
        race_control_res = fetch_openf1_endpoint("race_control", {"session_key": session_key})

        tick = normalize_openf1_components(
            session_key=session_key,
            positions=positions_res.get("data", []),
            intervals=intervals_res.get("data", []),
            drivers_meta=drivers_res.get("data", []),
            stints=stints_res.get("data", []),
            laps=laps_res.get("data", []),
            locations=locations_res.get("data", []),
            race_control=race_control_res.get("data", []),
            polled_at=datetime.now(timezone.utc).isoformat(),
            source="openf1",
        )
        return {"fallback": False, "fallback_reason": None, "data": tick}
    except Exception as exc:
        logger.warning("Error normalizing live snapshot: %s", exc)
        return {"fallback": True, "fallback_reason": str(exc), "data": None}
