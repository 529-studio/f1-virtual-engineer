"""Pit Exit Predictor pure helper functions.

# Resolution of §3.2 (pit_loss ambiguity):
# In backend/tools/pit_loss.py, lookup_pit_loss_seconds() returns the total time
# lost versus staying out: sum of (slow zone in entry) + (stationary time) +
# (slow zone in exit), measured against the lap time of a car staying out.
# This corresponds to semantic (a). Therefore, NO extra out-lap penalty term
# is added, as doing so would double-count the pit loss.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import numpy as np
import pandas as pd


# Constants (§3.4 & §3.5)
CLEAR_AIR_S = 2.5       # Gap to car ahead > 2.5s is clear air (TUNE)
DRS_RANGE_S = 1.0       # Gap to car ahead <= 1.0s is DRS range
CONTESTED_S = 0.8       # Exit within 0.8s of a rival is a contested position boundary (TUNE)
DEFAULT_PACE_WINDOW = 3 # 3-lap green-flag reference pace window (TUNE)


def _to_seconds(val: Any) -> float | None:
    """Safely convert a pandas Timedelta, float, or int to seconds."""
    if val is None or pd.isna(val):
        return None
    if hasattr(val, "total_seconds"):
        try:
            return float(val.total_seconds())
        except (ValueError, TypeError, AttributeError):
            pass
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _is_non_green_lap(lap_row: pd.Series | dict[str, Any]) -> bool:
    """Check if lap was under SC, VSC, or Red Flag."""
    track_status = lap_row.get("TrackStatus") if hasattr(lap_row, "get") else None
    if track_status is None or pd.isna(track_status):
        return False
    ts_str = str(track_status)
    # FastF1 track status: '4' = SC, '5' = Red, '6' = VSC deployed, '7' = VSC ending
    return any(code in ts_str for code in ("4", "5", "6", "7"))


def _is_in_out_lap(lap_row: pd.Series | dict[str, Any]) -> bool:
    """Check if lap is an in-lap or out-lap."""
    get_val = lap_row.get if hasattr(lap_row, "get") else getattr(lap_row, "__getitem__", lambda _: None)
    pit_in = get_val("PitInTime")
    pit_out = get_val("PitOutTime")
    is_pit_in = get_val("is_pit_in")
    is_pit_out = get_val("is_pit_out")
    if pit_in is not None and not pd.isna(pit_in):
        return True
    if pit_out is not None and not pd.isna(pit_out):
        return True
    if is_pit_in is True or is_pit_out is True:
        return True
    return False


@dataclass
class DriverAtLap:
    driver_code: str
    position: int
    time_s: float | None
    is_lapped: bool
    has_pitted: bool
    laps_completed: int


@dataclass
class PaceEstimate:
    pace_s: float | None
    confidence: str  # "high" | "low"
    usable_laps: int
    note: str | None = None


def build_classification_at_lap(laps: pd.DataFrame, lap: int) -> list[DriverAtLap]:
    """Ordered field at the end of `lap`, with lapped/pitted flags."""
    if laps is None or laps.empty or "Driver" not in laps.columns:
        return []

    results: list[DriverAtLap] = []
    drivers = laps["Driver"].dropna().unique()

    for d in drivers:
        d_code = str(d).upper()
        d_laps = laps[laps["Driver"].astype(str).str.upper() == d_code]
        if d_laps.empty:
            continue

        # Completed laps up to lap
        completed_up_to_lap = d_laps[d_laps["LapNumber"] <= lap]
        laps_completed = len(completed_up_to_lap)
        if laps_completed == 0:
            continue

        # Check if driver pitted on or before `lap`
        has_pitted = False
        for _, row in completed_up_to_lap.iterrows():
            if _is_in_out_lap(row):
                has_pitted = True
                break

        exact_lap_row = d_laps[d_laps["LapNumber"] == lap]
        if not exact_lap_row.empty:
            row = exact_lap_row.iloc[0]
            time_s = _to_seconds(row.get("Time"))
            pos = int(row["Position"]) if "Position" in row and pd.notna(row["Position"]) else 99
            is_lapped = False
        else:
            # Driver completed fewer laps than `lap`
            last_row = completed_up_to_lap.iloc[-1]
            time_s = _to_seconds(last_row.get("Time"))
            pos = int(last_row["Position"]) if "Position" in last_row and pd.notna(last_row["Position"]) else 99
            is_lapped = True

        results.append(
            DriverAtLap(
                driver_code=d_code,
                position=pos,
                time_s=time_s,
                is_lapped=is_lapped,
                has_pitted=has_pitted,
                laps_completed=laps_completed,
            )
        )

    # Sort primarily by whether lead lap, then by time_s (or position)
    def _sort_key(item: DriverAtLap):
        t = item.time_s if item.time_s is not None else 999999.0
        return (1 if item.is_lapped else 0, item.position if item.position < 99 else t)

    results.sort(key=_sort_key)
    # Re-index positions 1..N based on sorted order if positions were missing or synthetic
    for idx, item in enumerate(results, start=1):
        if item.position == 99:
            item.position = idx

    return results


def reference_pace(
    laps: pd.DataFrame,
    driver: str,
    lap: int,
    window: int = DEFAULT_PACE_WINDOW,
) -> PaceEstimate:
    """Median green-flag pace + confidence flag. Excludes in/out/SC laps.

    Rules (§3.3):
    - K = window (default 3).
    - Excludes in-laps, out-laps, and laps where SC/VSC was deployed.
    - If >= 2 usable green laps: confidence="high", median pace.
    - If < 2 usable green laps: fallback to stint median, confidence="low".
    - If stint median also unavailable: pace_s=None, confidence="low".
    """
    if laps is None or laps.empty or "Driver" not in laps.columns:
        return PaceEstimate(pace_s=None, confidence="low", usable_laps=0, note="No lap data")

    d_code = str(driver).upper()
    d_laps = laps[
        (laps["Driver"].astype(str).str.upper() == d_code)
        & (laps["LapNumber"] <= lap)
    ].sort_values("LapNumber")

    if d_laps.empty:
        return PaceEstimate(pace_s=None, confidence="low", usable_laps=0, note=f"No laps for {d_code}")

    # Extract eligible green-flag laps
    green_durations: list[float] = []
    for _, row in d_laps.iterrows():
        if _is_in_out_lap(row) or _is_non_green_lap(row):
            continue
        duration = _to_seconds(row.get("LapTime"))
        if duration is not None and duration > 0:
            green_durations.append(duration)

    if len(green_durations) >= 2:
        recent_window = green_durations[-window:]
        pace = float(np.median(recent_window))
        return PaceEstimate(
            pace_s=round(pace, 3),
            confidence="high" if len(recent_window) >= 2 else "low",
            usable_laps=len(recent_window),
        )

    # Fallback to stint median
    stint_durations: list[float] = []
    # Identify stint: if "Stint" column exists, use current stint
    current_stint = d_laps.iloc[-1].get("Stint") if "Stint" in d_laps.columns else None
    if current_stint is not None and pd.notna(current_stint):
        stint_laps = d_laps[d_laps["Stint"] == current_stint]
    else:
        # Backward from current lap to last pit stop
        stint_rows = []
        for _, row in reversed(list(d_laps.iterrows())):
            stint_rows.append(row)
            if _is_in_out_lap(row):
                break
        stint_laps = pd.DataFrame(stint_rows)

    for _, row in stint_laps.iterrows():
        if _is_in_out_lap(row) or _is_non_green_lap(row):
            continue
        duration = _to_seconds(row.get("LapTime"))
        if duration is not None and duration > 0:
            stint_durations.append(duration)

    if stint_durations:
        pace = float(np.median(stint_durations))
        return PaceEstimate(
            pace_s=round(pace, 3),
            confidence="low",
            usable_laps=len(stint_durations),
            note=f"Pace for {d_code} fell back to stint median due to sparse green laps in window.",
        )

    return PaceEstimate(
        pace_s=None,
        confidence="low",
        usable_laps=0,
        note=f"Insufficient green-flag pace data for {d_code}.",
    )


def project_pit_exit(
    laps: pd.DataFrame,
    driver: str,
    lap: int,
    pit_loss_s: float,
    include_rivals: int = 5,
    pit_loss_source: str = "per-track table",
) -> dict[str, Any]:
    """Pure, deterministic pit-exit projection.

    Returns dict matching PitExitResponse. Never raises on data anomalies.
    """
    driver_upper = str(driver).upper()

    # Fail-closed default envelope
    default_envelope: dict[str, Any] = {
        "as_of_lap": lap,
        "total_laps": 0,
        "current_position": 0,
        "projected_position": 0,
        "position_delta": 0,
        "position_is_contested": False,
        "car_ahead": None,
        "car_behind": None,
        "traffic_state": "TRAFFIC",
        "pit_loss_s": round(pit_loss_s, 2),
        "pit_loss_source": pit_loss_source,
        "confidence": "LOW",
        "confidence_reasons": [],
        "assumptions": ["rivals hold current pace", "no safety car during the stop"],
        "field": [],
        "notes": [],
        "fallback": False,
        "fallback_reason": None,
    }

    if laps is None or laps.empty or "Driver" not in laps.columns:
        return {
            **default_envelope,
            "fallback": True,
            "fallback_reason": f"Lap {lap} not present in session lap data",
        }

    total_laps = int(laps["LapNumber"].max()) if "LapNumber" in laps.columns and not laps.empty else 0
    default_envelope["total_laps"] = total_laps

    d_laps = laps[laps["Driver"].astype(str).str.upper() == driver_upper]
    if d_laps.empty:
        return {
            **default_envelope,
            "fallback": True,
            "fallback_reason": f"Driver {driver_upper} not found in session lap data.",
        }

    if lap > total_laps:
        return {
            **default_envelope,
            "fallback": True,
            "fallback_reason": f"lap {lap} not present in session lap data (total laps: {total_laps})",
        }

    d_at_lap = d_laps[d_laps["LapNumber"] == lap]
    if d_at_lap.empty:
        last_d_lap = int(d_laps["LapNumber"].max()) if not d_laps.empty else 0
        return {
            **default_envelope,
            "fallback": True,
            "fallback_reason": f"Driver {driver_upper} retired before lap {lap} (last completed lap: {last_d_lap})",
        }

    d_row = d_at_lap.iloc[0]
    t_driver_lap = _to_seconds(d_row.get("Time"))
    if t_driver_lap is None:
        return {
            **default_envelope,
            "fallback": True,
            "fallback_reason": f"Missing cumulative session time for {driver_upper} at lap {lap}.",
        }

    # Classification at end of lap
    classification = build_classification_at_lap(laps, lap)
    current_pos = next((c.position for c in classification if c.driver_code == driver_upper), 0)
    if current_pos == 0 and "Position" in d_row and pd.notna(d_row["Position"]):
        current_pos = int(d_row["Position"])

    # Step 3: Projected pit exit time
    t_exit = t_driver_lap + pit_loss_s

    # Check for SC/VSC active at lap
    sc_active_at_lap = False
    laps_at_n = laps[laps["LapNumber"] == lap]
    for _, r in laps_at_n.iterrows():
        if _is_non_green_lap(r):
            sc_active_at_lap = True
            break

    # Driver's own reference pace
    driver_pace = reference_pace(laps, driver_upper, lap)

    notes: list[str] = []
    confidence_reasons: list[str] = []

    if sc_active_at_lap:
        notes.append(f"Safety Car or VSC active at lap {lap}.")
        confidence_reasons.append(f"Safety Car/VSC active at lap {lap}.")

    # Evaluate each rival
    rival_slots: list[dict[str, Any]] = []
    unique_drivers = [str(d).upper() for d in laps["Driver"].dropna().unique() if str(d).upper() != driver_upper]

    for r_code in unique_drivers:
        r_laps = laps[laps["Driver"].astype(str).str.upper() == r_code]
        r_at_lap = r_laps[r_laps["LapNumber"] == lap]

        if not r_at_lap.empty:
            r_row = r_at_lap.iloc[0]
            t_r = _to_seconds(r_row.get("Time"))
            if t_r is None:
                continue
            is_lapped = False
            # Check if rival pitted on or before lap
            has_pitted = False
            for _, rl in r_laps[r_laps["LapNumber"] <= lap].iterrows():
                if _is_in_out_lap(rl):
                    has_pitted = True
                    break
            # If rival entered pits on lap N, they also incur pit loss
            if _is_in_out_lap(r_row):
                t_r_projected = t_r + pit_loss_s
            else:
                t_r_projected = t_r
        else:
            # Completed fewer laps than lap (lapped or retired)
            completed = r_laps[r_laps["LapNumber"] < lap]
            if completed.empty:
                notes.append(f"Rival {r_code} excluded: no laps completed before lap {lap}.")
                continue
            last_r_row = completed.iloc[-1]
            last_lap_num = int(last_r_row["LapNumber"])
            r_pace = reference_pace(laps, r_code, last_lap_num)
            if r_pace.pace_s is None:
                notes.append(f"Rival {r_code} excluded: insufficient pace data.")
                continue
            t_r_last = _to_seconds(last_r_row.get("Time"))
            if t_r_last is None:
                continue
            t_r_projected = t_r_last + (lap - last_lap_num) * r_pace.pace_s
            is_lapped = True
            has_pitted = any(_is_in_out_lap(rl) for _, rl in completed.iterrows())

        r_pace_est = reference_pace(laps, r_code, lap)
        if r_pace_est.confidence == "low" and r_pace_est.note and r_pace_est.note not in notes:
            notes.append(r_pace_est.note)

        # Gap relative to driver: signed (negative = behind)
        # If t_r_projected < t_exit -> rival crosses before driver emerges -> rival ahead (gap > 0)
        # If t_r_projected > t_exit -> rival crosses after driver emerges -> rival behind (gap < 0)
        gap_s = round(t_exit - t_r_projected, 2)

        rival_slots.append({
            "driver_code": r_code,
            "gap_s": gap_s,
            "is_lapped": is_lapped,
            "has_pitted": has_pitted,
            "pace_confidence": r_pace_est.confidence,
        })

    # Step 5: Projected position = 1 + count(rivals projected ahead)
    rivals_ahead = [r for r in rival_slots if r["gap_s"] > 0]
    projected_pos = 1 + len(rivals_ahead)

    # Step 6: Identify car_ahead and car_behind
    # Lapped cars occupy grid positions but are NOT valid ahead/behind references for strategy
    valid_ahead = [r for r in rival_slots if r["gap_s"] > 0 and not r["is_lapped"]]
    valid_behind = [r for r in rival_slots if r["gap_s"] < 0 and not r["is_lapped"]]

    car_ahead = min(valid_ahead, key=lambda r: r["gap_s"]) if valid_ahead else None
    car_behind = max(valid_behind, key=lambda r: r["gap_s"]) if valid_behind else None

    # Step 7: Traffic state
    if car_ahead is None or car_ahead["gap_s"] > CLEAR_AIR_S:
        traffic_state = "CLEAR_AIR"
    elif car_ahead["gap_s"] <= DRS_RANGE_S:
        traffic_state = "DRS_RANGE"
    else:
        traffic_state = "TRAFFIC"

    # Step 8: Position delta (positive = gains)
    position_delta = current_pos - projected_pos

    # Step 9: Contested boundary & Confidence (§3.5)
    ahead_gap = car_ahead["gap_s"] if car_ahead else None
    behind_gap = abs(car_behind["gap_s"]) if car_behind else None

    position_is_contested = bool(
        (ahead_gap is not None and ahead_gap <= CONTESTED_S)
        or (behind_gap is not None and behind_gap <= CONTESTED_S)
    )

    neighbour_low_confidence = (
        (car_ahead is not None and car_ahead["pace_confidence"] == "low")
        or (car_behind is not None and car_behind["pace_confidence"] == "low")
    )

    if sc_active_at_lap or driver_pace.usable_laps < 2 or position_is_contested:
        confidence = "LOW"
        if position_is_contested:
            confidence_reasons.append(
                f"Projected exit is within {CONTESTED_S}s of a position boundary."
            )
        if driver_pace.usable_laps < 2:
            confidence_reasons.append(
                f"Fewer than 2 usable green-flag laps for {driver_upper} in pace window."
            )
    elif neighbour_low_confidence or driver_pace.usable_laps == 2:
        confidence = "MEDIUM"
        if neighbour_low_confidence:
            confidence_reasons.append("One or more immediate neighbours has low pace confidence.")
        if driver_pace.usable_laps == 2:
            confidence_reasons.append(f"Driver {driver_upper} has only 2 green-flag laps in pace window.")
    else:
        confidence = "HIGH"
        confidence_reasons.append(">= 3 green laps of pace data for driver and neighbours, no SC/VSC in window.")

    # Sort field around driver: ahead cars (closest first) and behind cars (closest first)
    sorted_field = sorted(rival_slots, key=lambda r: (0 if r["gap_s"] > 0 else 1, abs(r["gap_s"])))[: include_rivals * 2]

    return {
        "as_of_lap": lap,
        "total_laps": total_laps,
        "current_position": current_pos,
        "projected_position": projected_pos,
        "position_delta": position_delta,
        "position_is_contested": position_is_contested,
        "car_ahead": car_ahead,
        "car_behind": car_behind,
        "traffic_state": traffic_state,
        "pit_loss_s": round(pit_loss_s, 2),
        "pit_loss_source": pit_loss_source,
        "confidence": confidence,
        "confidence_reasons": confidence_reasons,
        "assumptions": ["rivals hold current pace", "no safety car during the stop"],
        "field": sorted_field[:include_rivals],
        "notes": notes,
        "fallback": False,
        "fallback_reason": None,
    }


import threading
from cachetools import TTLCache
from core import redis_cache
from tools.pit_loss import lookup_pit_loss_seconds

_pit_exit_l1_cache: TTLCache = TTLCache(maxsize=256, ttl=3600)
_pit_exit_cache_lock = threading.Lock()


def _clear_cache_for_tests() -> None:
    with _pit_exit_cache_lock:
        _pit_exit_l1_cache.clear()
    try:
        client = redis_cache._get_client()
        if client is not None:
            for k in client.scan_iter("f1:cache:pit_exit:*"):
                client.delete(k)
    except Exception:
        pass


def compute_pit_exit(
    year: int,
    event: str,
    session: str,
    driver: str,
    lap: int,
    include_rivals: int = 5,
) -> dict[str, Any]:
    """Load session laps via FastF1 and run deterministic pit exit projection."""
    import fastf1

    driver_upper = driver.upper()
    pit_loss_s = lookup_pit_loss_seconds(event)
    pit_loss_source = f"per-track table: {event}"

    try:
        f1_session = fastf1.get_session(year, event, session)
        f1_session.load(laps=True, telemetry=False, weather=False, messages=False)
        laps = f1_session.laps
        if laps is None or laps.empty:
            return {
                "as_of_lap": lap,
                "total_laps": 0,
                "current_position": 0,
                "projected_position": 0,
                "position_delta": 0,
                "position_is_contested": False,
                "car_ahead": None,
                "car_behind": None,
                "traffic_state": "TRAFFIC",
                "pit_loss_s": round(pit_loss_s, 2),
                "pit_loss_source": pit_loss_source,
                "confidence": "LOW",
                "confidence_reasons": [],
                "assumptions": ["rivals hold current pace", "no safety car during the stop"],
                "field": [],
                "notes": [],
                "fallback": True,
                "fallback_reason": f"No lap data available for {event} {year} {session}.",
            }
        return project_pit_exit(
            laps=laps,
            driver=driver_upper,
            lap=lap,
            pit_loss_s=pit_loss_s,
            include_rivals=include_rivals,
            pit_loss_source=pit_loss_source,
        )
    except Exception as exc:
        return {
            "as_of_lap": lap,
            "total_laps": 0,
            "current_position": 0,
            "projected_position": 0,
            "position_delta": 0,
            "position_is_contested": False,
            "car_ahead": None,
            "car_behind": None,
            "traffic_state": "TRAFFIC",
            "pit_loss_s": round(pit_loss_s, 2),
            "pit_loss_source": pit_loss_source,
            "confidence": "LOW",
            "confidence_reasons": [],
            "assumptions": ["rivals hold current pace", "no safety car during the stop"],
            "field": [],
            "notes": [],
            "fallback": True,
            "fallback_reason": f"FastF1 error loading session: {exc}",
        }


def get_pit_exit_projection(
    year: int,
    event: str,
    session: str,
    driver: str,
    lap: int,
    include_rivals: int = 5,
) -> dict[str, Any]:
    """Cached lookup (L1 TTLCache -> L2 Redis -> FastF1 compute).

    Key shape: pit_exit:{year}:{event}:{session}:{driver}:{lap}:{include_rivals}
    TTL: 1h. Never caches fallback results.
    """
    key_tuple = (year, event.upper(), session.upper(), driver.upper(), lap, include_rivals)

    # 1. L1 cache
    with _pit_exit_cache_lock:
        if key_tuple in _pit_exit_l1_cache:
            return _pit_exit_l1_cache[key_tuple]

    # 2. L2 Redis cache
    redis_key = f"{year}:{event.upper()}:{session.upper()}:{driver.upper()}:{lap}:{include_rivals}"
    cached = redis_cache.get("pit_exit", redis_key)
    if cached is not None and isinstance(cached, dict) and not cached.get("fallback"):
        with _pit_exit_cache_lock:
            _pit_exit_l1_cache[key_tuple] = cached
        return cached

    # 3. Compute
    result = compute_pit_exit(
        year=year,
        event=event,
        session=session,
        driver=driver,
        lap=lap,
        include_rivals=include_rivals,
    )

    # 4. Cache if not fallback
    if not result.get("fallback"):
        with _pit_exit_cache_lock:
            _pit_exit_l1_cache[key_tuple] = result
        redis_cache.set("pit_exit", redis_key, result, ttl_seconds=3600)

    return result

