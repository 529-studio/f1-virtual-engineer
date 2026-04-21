import os
from typing import Any

import fastf1
import pandas as pd

# Setup caching for FastF1
# Ensure the backend/data directory exists
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

fastf1.Cache.enable_cache(CACHE_DIR)


def _stats(series: pd.Series, unit: str) -> dict[str, float | str]:
    values = series.dropna()
    return {
        "min": float(values.min()),
        "max": float(values.max()),
        "avg": float(values.mean()),
        "unit": unit,
    }


def _normalize_telemetry(
    telemetry: pd.DataFrame,
    *,
    year: int,
    event: str,
    session_type: str,
    driver: str,
) -> dict[str, Any]:
    required_columns = {"Speed": "km/h", "nGear": "gear", "RPM": "rpm"}
    missing = [col for col in required_columns if col not in telemetry.columns]
    if missing:
        raise ValueError(f"Missing required telemetry channels: {', '.join(missing)}")

    return {
        "driver": driver,
        "year": year,
        "event": event,
        "session_type": session_type,
        "sample_points": int(len(telemetry.index)),
        "speed": _stats(telemetry["Speed"], "km/h"),
        "gear": _stats(telemetry["nGear"], "gear"),
        "rpm": _stats(telemetry["RPM"], "rpm"),
        "source": "fastf1",
        "fallback": False,
        "fallback_reason": None,
    }


def get_session_telemetry_summary(
    year: int,
    event: str,
    session_type: str,
    driver: str,
) -> dict[str, Any]:
    """
    Fetch telemetry summary (speed, gear, rpm) for a specific driver/session.
    Returns a normalized dictionary that matches API schema.
    """
    driver = driver.upper()

    try:
        session = fastf1.get_session(year, event, session_type)
        session.load()
        laps = session.laps.pick_driver(driver)
        if laps.empty:
            return {
                "driver": driver,
                "year": year,
                "event": event,
                "session_type": session_type,
                "sample_points": 0,
                "speed": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "km/h"},
                "gear": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "gear"},
                "rpm": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "rpm"},
                "source": "fastf1",
                "fallback": True,
                "fallback_reason": "No laps found for requested driver/session.",
            }

        fastest_lap = laps.pick_fastest()
        telemetry = fastest_lap.get_telemetry()
        return _normalize_telemetry(
            telemetry,
            year=year,
            event=event,
            session_type=session_type,
            driver=driver,
        )
    except Exception as exc:
        return {
            "driver": driver,
            "year": year,
            "event": event,
            "session_type": session_type,
            "sample_points": 0,
            "speed": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "km/h"},
            "gear": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "gear"},
            "rpm": {"min": 0.0, "max": 0.0, "avg": 0.0, "unit": "rpm"},
            "source": "fastf1",
            "fallback": True,
            "fallback_reason": str(exc),
        }

if __name__ == "__main__":
    # Test script: Fetch Hamilton's telemetry from 2023 Japan GP
    print("Fetching Lewis Hamilton's telemetry from 2023 Japanese GP...")
    summary = get_session_telemetry_summary(2023, "Japanese Grand Prix", "R", "HAM")
    print(summary)
