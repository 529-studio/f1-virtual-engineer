from __future__ import annotations

import io
import logging
from typing import Any, Literal

import numpy as np
import pandas as pd

from tools.fastf1_helper import (
    _get_loaded_telemetry_session,
    _pick_driver_laps,
    _sanitize_fallback_reason,
)

logger = logging.getLogger(__name__)


def build_lap_telemetry_dataframe(
    year: int,
    event: str,
    session_type: str,
    driver: str,
    lap_number: int | None = None,
) -> tuple[pd.DataFrame, int]:
    """
    Extract and structure a clean, engineering-grade pandas DataFrame of lap telemetry.

    Returns:
        tuple[pd.DataFrame, int]: (telemetry_dataframe, resolved_lap_number)
    Raises:
        ValueError: If driver or lap is not found in session data.
    """
    driver = driver.upper().strip()
    session = _get_loaded_telemetry_session(year, event, session_type)
    driver_laps = _pick_driver_laps(session.laps, driver)

    if driver_laps.empty:
        raise ValueError(f"No laps found for driver {driver} in {year} {event} [{session_type}].")

    if lap_number is not None:
        matched = driver_laps[driver_laps["LapNumber"] == lap_number]
        if matched.empty:
            raise ValueError(f"Lap {lap_number} not found for driver {driver}.")
        chosen_lap = matched.iloc[0]
        resolved_lap = int(lap_number)
    else:
        chosen_lap = driver_laps.pick_fastest()
        if chosen_lap is None:
            raise ValueError(f"No valid timed lap found for driver {driver}.")
        resolved_lap = int(chosen_lap["LapNumber"])

    if hasattr(chosen_lap, "get_telemetry") and callable(chosen_lap.get_telemetry):
        telem = chosen_lap.get_telemetry()
    elif isinstance(chosen_lap, pd.Series) and "_telemetry" in chosen_lap:
        telem = chosen_lap["_telemetry"]
    elif hasattr(chosen_lap, "get") and chosen_lap.get("_telemetry") is not None:
        telem = chosen_lap.get("_telemetry")
    else:
        telem = pd.DataFrame()

    if telem is None or telem.empty:
        raise ValueError(f"Empty telemetry stream for driver {driver} lap {resolved_lap}.")

    # Build clean dataframe
    data: dict[str, Any] = {
        "driver": driver,
        "lap_number": resolved_lap,
    }

    if "Distance" in telem.columns:
        data["distance_m"] = telem["Distance"].round(2)
    elif "DistanceToDriverAhead" in telem.columns:
        data["distance_m"] = np.arange(len(telem), dtype=float)

    if "Time" in telem.columns:
        data["time_s"] = telem["Time"].dt.total_seconds().round(3)

    if "Speed" in telem.columns:
        data["speed_kmh"] = telem["Speed"].round(1)

    if "nGear" in telem.columns:
        data["gear"] = telem["nGear"].fillna(0).astype(int)

    if "RPM" in telem.columns:
        data["rpm"] = telem["RPM"].fillna(0).astype(int)

    if "Throttle" in telem.columns:
        data["throttle_pct"] = telem["Throttle"].round(1)

    if "Brake" in telem.columns:
        data["brake_pct"] = (telem["Brake"].astype(float) * 100).round(1)

    if "DRS" in telem.columns:
        data["drs"] = telem["DRS"].fillna(0).astype(int)

    if "Steering" in telem.columns:
        data["steering_deg"] = telem["Steering"].round(1)

    # Derived longitudinal acceleration g_long
    if "Speed" in telem.columns and "Time" in telem.columns and len(telem) > 2:
        try:
            t_sec = telem["Time"].dt.total_seconds().to_numpy(dtype=float)
            v_ms = telem["Speed"].to_numpy(dtype=float) / 3.6
            dt = np.gradient(t_sec)
            dt = np.where(dt > 0.001, dt, 0.08)
            dv = np.gradient(v_ms)
            g_long = np.clip((dv / dt) / 9.81, -6.0, 3.5)
            data["g_long"] = np.round(g_long, 3)
        except Exception:
            pass

    # Derived lateral acceleration g_lat
    if "X" in telem.columns and "Y" in telem.columns and "Speed" in telem.columns and len(telem) > 3:
        try:
            x = telem["X"].to_numpy(dtype=float)
            y = telem["Y"].to_numpy(dtype=float)
            v_ms = telem["Speed"].to_numpy(dtype=float) / 3.6
            dx = np.gradient(x)
            dy = np.gradient(y)
            ds = np.sqrt(dx**2 + dy**2)
            headings = np.unwrap(np.arctan2(dy, dx))
            dtheta = np.gradient(headings)
            curvature = np.where(ds > 0.1, dtheta / ds, 0.0)
            g_lat = np.clip((v_ms**2 * curvature) / 9.81, -5.5, 5.5)
            data["g_lat"] = np.round(g_lat, 3)
            data["x_m"] = np.round(x, 2)
            data["y_m"] = np.round(y, 2)
        except Exception:
            pass

    df = pd.DataFrame(data)
    return df, resolved_lap


def export_telemetry_bytes(
    year: int,
    event: str,
    session_type: str,
    driver: str,
    lap_number: int | None = None,
    export_format: Literal["csv", "parquet"] = "csv",
) -> tuple[bytes, str, str]:
    """
    Export telemetry dataframe into CSV or Apache Parquet bytes.

    Returns:
        tuple[bytes, str, str]: (content_bytes, media_type, suggested_filename)
    """
    df, resolved_lap = build_lap_telemetry_dataframe(
        year=year,
        event=event,
        session_type=session_type,
        driver=driver,
        lap_number=lap_number,
    )

    clean_event = event.replace(" ", "_").replace("-", "_")
    filename = f"{driver.upper()}_{clean_event}_{year}_lap{resolved_lap}.{export_format}"

    if export_format == "parquet":
        buffer = io.BytesIO()
        df.to_parquet(buffer, index=False, engine="pyarrow")
        return buffer.getvalue(), "application/vnd.apache.parquet", filename

    # Default CSV export
    csv_str = df.to_csv(index=False)
    return csv_str.encode("utf-8"), "text/csv; charset=utf-8", filename


def compare_stint_laps(
    year: int,
    event: str,
    session_type: str,
    driver: str,
    lap1: int,
    lap2: int,
    points: int = 200,
) -> dict[str, Any]:
    """
    Compare two arbitrary laps of the same driver along a common distance grid.
    Useful for seeing tyre degradation effects (e.g. Lap 10 vs Lap 45).
    """
    driver = driver.upper().strip()
    session = _get_loaded_telemetry_session(year, event, session_type)
    driver_laps = _pick_driver_laps(session.laps, driver)

    if driver_laps.empty:
        return {
            "driver": driver,
            "year": year,
            "event": event,
            "session_type": session_type,
            "lap1": lap1,
            "lap2": lap2,
            "fallback": True,
            "fallback_reason": f"No laps found for driver {driver}.",
        }

    l1_match = driver_laps[driver_laps["LapNumber"] == lap1]
    l2_match = driver_laps[driver_laps["LapNumber"] == lap2]

    if l1_match.empty or l2_match.empty:
        missing = []
        if l1_match.empty:
            missing.append(str(lap1))
        if l2_match.empty:
            missing.append(str(lap2))
        return {
            "driver": driver,
            "year": year,
            "event": event,
            "session_type": session_type,
            "lap1": lap1,
            "lap2": lap2,
            "fallback": True,
            "fallback_reason": f"Lap(s) {', '.join(missing)} not found for driver {driver}.",
        }

    lap1_row = l1_match.iloc[0]
    lap2_row = l2_match.iloc[0]

    def _get_telem(row: Any) -> pd.DataFrame:
        if hasattr(row, "get_telemetry") and callable(row.get_telemetry):
            return row.get_telemetry()
        if isinstance(row, pd.Series) and "_telemetry" in row:
            return row["_telemetry"]
        if hasattr(row, "get") and row.get("_telemetry") is not None:
            return row.get("_telemetry")
        return pd.DataFrame()

    t1 = _get_telem(lap1_row)
    t2 = _get_telem(lap2_row)

    if t1.empty or t2.empty or "Distance" not in t1.columns or "Distance" not in t2.columns:
        return {
            "driver": driver,
            "year": year,
            "event": event,
            "session_type": session_type,
            "lap1": lap1,
            "lap2": lap2,
            "fallback": True,
            "fallback_reason": "Telemetry distance data incomplete for comparison.",
        }

    max_dist = min(float(t1["Distance"].max()), float(t2["Distance"].max()))
    if max_dist <= 0:
        return {
            "driver": driver,
            "year": year,
            "event": event,
            "session_type": session_type,
            "lap1": lap1,
            "lap2": lap2,
            "fallback": True,
            "fallback_reason": "Track distance invalid for comparison.",
        }

    common_distance = np.linspace(0, max_dist, points)

    def _interp(df: pd.DataFrame, col: str) -> np.ndarray:
        if col not in df.columns:
            return np.zeros_like(common_distance)
        return np.interp(common_distance, df["Distance"].to_numpy(), df[col].to_numpy())

    s1_speed = _interp(t1, "Speed")
    s2_speed = _interp(t2, "Speed")
    delta_speed = s1_speed - s2_speed

    s1_throttle = _interp(t1, "Throttle")
    s2_throttle = _interp(t2, "Throttle")

    s1_brake = _interp(t1, "Brake") * 100
    s2_brake = _interp(t2, "Brake") * 100

    # Calculate cumulative time delta along distance:
    # dt = ds / v
    v1_ms = np.maximum(s1_speed / 3.6, 1.0)
    v2_ms = np.maximum(s2_speed / 3.6, 1.0)
    ds = np.gradient(common_distance)
    dt1 = ds / v1_ms
    dt2 = ds / v2_ms
    cum_time_delta = np.cumsum(dt1 - dt2)

    l1_time = float(lap1_row["LapTime"].total_seconds()) if pd.notna(lap1_row.get("LapTime")) else None
    l2_time = float(lap2_row["LapTime"].total_seconds()) if pd.notna(lap2_row.get("LapTime")) else None
    net_delta = round(l1_time - l2_time, 3) if l1_time and l2_time else round(float(cum_time_delta[-1]), 3)

    return {
        "driver": driver,
        "year": year,
        "event": event,
        "session_type": session_type,
        "lap1": lap1,
        "lap2": lap2,
        "lap1_time_s": l1_time,
        "lap2_time_s": l2_time,
        "net_time_delta_s": net_delta,
        "sample_points": points,
        "distance": [round(float(d), 1) for d in common_distance],
        "lap1_speed": [round(float(s), 1) for s in s1_speed],
        "lap2_speed": [round(float(s), 1) for s in s2_speed],
        "delta_speed": [round(float(ds), 1) for ds in delta_speed],
        "lap1_throttle": [round(float(t), 1) for t in s1_throttle],
        "lap2_throttle": [round(float(t), 1) for t in s2_throttle],
        "lap1_brake": [round(float(b), 1) for b in s1_brake],
        "lap2_brake": [round(float(b), 1) for b in s2_brake],
        "cumulative_time_delta_s": [round(float(cd), 3) for cd in cum_time_delta],
        "fallback": False,
        "fallback_reason": None,
    }
