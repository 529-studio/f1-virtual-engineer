"""Rule-based F1 controversy detector.

Analyses a FastF1 session to identify incidents that could raise
regulatory questions. Returns structured DetectedEvent objects that
the controversy analyser can pass to the LLM + vector store.

Designed to be fast and deterministic — no LLM calls here.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

_logger = logging.getLogger(__name__)

# FastF1 track status codes
_SC_ACTIVE = {"4"}          # Safety car
_VSC_ACTIVE = {"6", "7"}    # VSC deployed / ending
_ALL_CLEAR = {"1"}


@dataclass
class DetectedEvent:
    type: str                   # safety_car_restart | track_limits | vsc_strategy | collision
    lap: int
    drivers: list[str]
    description: str
    regulation_hint: str        # keywords to feed into vector search


def _safe_track_status(session: Any) -> pd.DataFrame | None:
    """Return track_status DataFrame or None if unavailable."""
    try:
        ts = session.track_status
        if ts is None or ts.empty:
            return None
        return ts
    except Exception:
        return None


def _position_changes(laps: pd.DataFrame, from_lap: int, to_lap: int) -> list[dict[str, Any]]:
    """Return drivers whose position improved between two lap ranges."""
    window = laps[(laps["LapNumber"] >= from_lap) & (laps["LapNumber"] <= to_lap)]
    if window.empty or "Position" not in window.columns:
        return []
    changes = []
    for driver, grp in window.groupby("Driver"):
        grp = grp.sort_values("LapNumber")
        if len(grp) < 2:
            continue
        first_pos = grp.iloc[0]["Position"]
        last_pos = grp.iloc[-1]["Position"]
        if pd.notna(first_pos) and pd.notna(last_pos):
            delta = int(first_pos) - int(last_pos)  # positive = gained positions
            if delta > 0:
                changes.append({"driver": str(driver), "gained": delta})
    return sorted(changes, key=lambda x: x["gained"], reverse=True)


def _detect_safety_car_restart(
    laps: pd.DataFrame,
    track_status: pd.DataFrame,
    total_laps: int,
) -> list[DetectedEvent]:
    """Detect safety car restarts and position swaps on the restart lap."""
    events: list[DetectedEvent] = []
    if track_status is None or track_status.empty:
        return events

    # Identify SC periods: contiguous rows where Status is in _SC_ACTIVE
    in_sc = False
    sc_start_lap: int | None = None

    # Map track status timestamps to lap numbers via laps["Time"]
    lap_times = laps.drop_duplicates("LapNumber").set_index("LapNumber")["Time"] if "Time" in laps.columns else None

    def _ts_to_lap(ts: Any) -> int:
        if lap_times is None:
            return 0
        diffs = (lap_times - ts).abs()
        if diffs.empty:
            return 0
        return int(diffs.idxmin())

    for _, row in track_status.sort_values("Time").iterrows():
        status = str(row.get("Status", ""))
        ts = row.get("Time")
        lap_approx = _ts_to_lap(ts) if ts is not None else 0

        if status in _SC_ACTIVE and not in_sc:
            in_sc = True
            sc_start_lap = lap_approx
        elif status in _ALL_CLEAR and in_sc:
            in_sc = False
            restart_lap = lap_approx
            if sc_start_lap is not None and restart_lap > 0:
                # Check for position changes in the 2 laps after restart
                changers = _position_changes(laps, restart_lap, restart_lap + 2)
                if changers:
                    drivers = [c["driver"] for c in changers[:3]]
                    events.append(DetectedEvent(
                        type="safety_car_restart",
                        lap=restart_lap,
                        drivers=drivers,
                        description=(
                            f"Safety car deployed lap ~{sc_start_lap}, "
                            f"cleared lap ~{restart_lap}. "
                            f"Position changes on restart: "
                            + ", ".join(f"{c['driver']} +{c['gained']}" for c in changers[:3])
                        ),
                        regulation_hint="safety car restart procedure lapped cars unlapping Article 48",
                    ))

    return events


def _detect_vsc_strategy(
    laps: pd.DataFrame,
    track_status: pd.DataFrame,
) -> list[DetectedEvent]:
    """Detect VSC deployments where a pit stop occurred (strategic window)."""
    events: list[DetectedEvent] = []
    if track_status is None or "PitInTime" not in laps.columns:
        return events

    vsc_laps: list[int] = []
    for _, row in track_status.sort_values("Time").iterrows():
        if str(row.get("Status", "")) in _VSC_ACTIVE:
            # Approximate lap
            ts = row.get("Time")
            if ts is not None and "Time" in laps.columns:
                diffs = (laps.drop_duplicates("LapNumber").set_index("LapNumber")["Time"] - ts).abs()
                if not diffs.empty:
                    vsc_laps.append(int(diffs.idxmin()))

    if not vsc_laps:
        return events

    # Find drivers who pitted during VSC laps
    pit_laps = laps[laps["PitInTime"].notna()]
    for lap_num in set(vsc_laps):
        pit_on_vsc = pit_laps[pit_laps["LapNumber"] == lap_num]
        if not pit_on_vsc.empty:
            drivers = pit_on_vsc["Driver"].tolist()[:3]
            events.append(DetectedEvent(
                type="vsc_strategy",
                lap=lap_num,
                drivers=drivers,
                description=(
                    f"VSC deployed lap ~{lap_num}. "
                    f"Drivers who pitted: {', '.join(drivers)}. "
                    "Strategic VSC pit stop opportunity."
                ),
                regulation_hint="virtual safety car VSC delta time pit stop strategy Article 48",
            ))

    return events


def _detect_track_limits(laps: pd.DataFrame) -> list[DetectedEvent]:
    """Detect laps where track-limits deletions may have occurred.

    FastF1 marks deleted laps with IsAccurate=False in some sessions.
    We flag drivers with multiple such laps.
    """
    events: list[DetectedEvent] = []
    if "IsAccurate" not in laps.columns:
        return events

    inaccurate = laps[laps["IsAccurate"] == False]  # noqa: E712
    if inaccurate.empty:
        return events

    by_driver = inaccurate.groupby("Driver").size()
    flagged = by_driver[by_driver >= 2]
    if flagged.empty:
        return events

    drivers = flagged.index.tolist()[:4]
    lap_examples = (
        inaccurate[inaccurate["Driver"].isin(drivers)]
        .groupby("Driver")["LapNumber"]
        .first()
        .to_dict()
    )
    events.append(DetectedEvent(
        type="track_limits",
        lap=int(min(lap_examples.values())) if lap_examples else 0,
        drivers=drivers,
        description=(
            f"Multiple laps flagged inaccurate (possible track-limits deletions): "
            + ", ".join(f"{d} (×{flagged[d]})" for d in drivers)
        ),
        regulation_hint="track limits white line lap time deletion Article 33 penalty",
    ))
    return events


# ── Public API ─────────────────────────────────────────────────────────────────

def detect_controversies(session: Any) -> list[DetectedEvent]:
    """Run all detectors on a loaded FastF1 session.

    Returns a (possibly empty) list of DetectedEvent. Each event carries
    a ``regulation_hint`` string suitable for vector store semantic search.

    Fail-safe: any individual detector failure is logged and skipped.
    """
    events: list[DetectedEvent] = []

    try:
        laps: pd.DataFrame = session.laps
    except Exception:
        _logger.warning("controversy_detector: could not load laps", exc_info=True)
        return events

    if laps is None or laps.empty:
        return events

    track_status = _safe_track_status(session)
    total_laps = int(laps["LapNumber"].max()) if "LapNumber" in laps.columns else 0

    for detector_fn, args in [
        (_detect_safety_car_restart, (laps, track_status, total_laps)),
        (_detect_vsc_strategy, (laps, track_status)),
        (_detect_track_limits, (laps,)),
    ]:
        try:
            events.extend(detector_fn(*args))
        except Exception:
            _logger.warning("detector %s failed", detector_fn.__name__, exc_info=True)

    return events
