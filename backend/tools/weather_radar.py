"""Live Track Weather Radar & Compound Cross-Over Predictor (Issue #76).

Physics-based Doppler radar modeling, surface water film accumulation,
and tyre compound cross-over threshold prediction (Slick -> Inters -> Wet).
"""

from __future__ import annotations

import logging
import math
from typing import Any, Literal
import fastf1
import pandas as pd

_logger = logging.getLogger(__name__)

# Grip thresholds for Formula 1 tyres
SLICK_GRIP_THRESHOLD = 88.0  # Above 88% grip: Slick tyres optimal
INTER_GRIP_THRESHOLD = 65.0  # 65% to 88%: Intermediate tyres optimal, below 65%: Full Wet


def _empty_fallback_response(
    year: int, event: str, session_type: str, reason: str
) -> dict[str, Any]:
    """Fail-closed fallback envelope conforming to WeatherRadarResponse."""
    current_metrics = {
        "minute": 0.0,
        "lap_estimate": 1,
        "rainfall": False,
        "rainfall_intensity": 0.0,
        "air_temp_c": 22.0,
        "track_temp_c": 30.0,
        "humidity_pct": 50.0,
        "wind_speed_kmh": 12.0,
        "wind_direction_deg": 180.0,
        "track_grip_pct": 100.0,
        "recommended_compound": "SLICK",
    }
    crossover = {
        "current_compound": "SLICK",
        "recommended_compound": "SLICK",
        "crossover_status": "OPTIMAL",
        "crossover_lap": None,
        "crossover_in_minutes": None,
        "grip_pct": 100.0,
        "water_film_mm": 0.0,
        "pit_call": "TRACK DRY — MAINTAIN SLICK RUNNING",
    }
    # Deterministic default radar frames
    radar_frames = _generate_radar_frames(
        has_rain=False,
        wind_speed_kmh=12.0,
        wind_dir_deg=180.0,
        base_grip=100.0,
    )
    return {
        "status": "success",
        "year": year,
        "event": event,
        "session_type": session_type,
        "current_metrics": current_metrics,
        "crossover": crossover,
        "radar_frames": radar_frames,
        "timeline": [current_metrics],
        "wind_vector": {"speed_kmh": 12.0, "direction_deg": 180.0, "dx": 0.0, "dy": -12.0},
        "fallback": True,
        "fallback_reason": reason,
    }


def _calculate_water_film_and_grip(
    df: pd.DataFrame,
) -> list[dict[str, Any]]:
    """Calculates physical water film thickness and track grip coefficient over time."""
    timeline: list[dict[str, Any]] = []
    water_film_mm = 0.0

    for i in range(len(df)):
        row = df.iloc[i]
        elapsed_min = float(row["Time"].total_seconds() / 60.0) if hasattr(row["Time"], "total_seconds") else float(i)
        prev_elapsed = df.iloc[i - 1]["Time"].total_seconds() / 60.0 if i > 0 and hasattr(df.iloc[i - 1]["Time"], "total_seconds") else max(0.0, elapsed_min - 1.0)
        dt_min = max(0.1, min(5.0, elapsed_min - prev_elapsed))

        is_rain = bool(row.get("Rainfall", False))
        air_temp = float(row.get("AirTemp", 20.0)) if pd.notna(row.get("AirTemp")) else 20.0
        track_temp = float(row.get("TrackTemp", 28.0)) if pd.notna(row.get("TrackTemp")) else 28.0
        humidity = float(row.get("Humidity", 50.0)) if pd.notna(row.get("Humidity")) else 50.0
        wind_speed = float(row.get("WindSpeed", 10.0)) if pd.notna(row.get("WindSpeed")) else 10.0
        wind_dir = float(row.get("WindDirection", 0.0)) if pd.notna(row.get("WindDirection")) else 0.0

        if is_rain:
            # Estimate precipitation intensity from humidity and temperature depression
            rain_rate_mmh = max(2.5, min(14.0, (humidity / 100.0) * 8.0 + 2.5))
            rain_intensity = min(1.0, rain_rate_mmh / 10.0)
            added_water = (rain_rate_mmh / 60.0) * dt_min
        else:
            rain_rate_mmh = 0.0
            rain_intensity = 0.0
            added_water = 0.0

        # Drainage (track grading / tarmac drainage grooves)
        drainage_mm = 0.015 * dt_min
        # Evaporation driven by track temperature and surface airflow
        evaporation_mm = max(0.0, (track_temp - 15.0) * 0.001 * (1.0 + wind_speed / 50.0)) * dt_min

        water_film_mm = max(0.0, water_film_mm + added_water - drainage_mm - evaporation_mm)

        # Track Grip Exponential Decay
        # Grip = 100% dry; drops toward ~48% in standing water
        grip_factor = math.exp(-1.35 * water_film_mm)
        grip_pct = round(max(45.0, min(100.0, 48.0 + 52.0 * grip_factor)), 1)

        if grip_pct >= SLICK_GRIP_THRESHOLD:
            rec_compound: Literal["SLICK", "INTERMEDIATE", "WET"] = "SLICK"
        elif grip_pct >= INTER_GRIP_THRESHOLD:
            rec_compound = "INTERMEDIATE"
        else:
            rec_compound = "WET"

        timeline.append({
            "minute": round(elapsed_min, 1),
            "lap_estimate": None,  # Will be mapped with session laps
            "rainfall": is_rain,
            "rainfall_intensity": round(rain_intensity, 2),
            "air_temp_c": round(air_temp, 1),
            "track_temp_c": round(track_temp, 1),
            "humidity_pct": round(humidity, 1),
            "wind_speed_kmh": round(wind_speed * 3.6 if wind_speed < 15.0 else wind_speed, 1),  # convert m/s if needed
            "wind_direction_deg": round(wind_dir, 1),
            "track_grip_pct": grip_pct,
            "recommended_compound": rec_compound,
            "water_film_mm": round(water_film_mm, 2),
        })

    return timeline


def _generate_radar_frames(
    has_rain: bool,
    wind_speed_kmh: float,
    wind_dir_deg: float,
    base_grip: float,
) -> list[dict[str, Any]]:
    """Generates 5 Doppler radar sweep forecast frames (0, 5, 10, 15, 20 mins)."""
    frames: list[dict[str, Any]] = []

    # Wind direction: angle from which wind blows. Rain clouds travel along wind direction.
    rad = math.radians(wind_dir_deg)
    # Unit direction vector of cloud drift
    drift_dx = math.sin(rad)
    drift_dy = -math.cos(rad)

    # Base cloud cells relative to circuit (0,0)
    if has_rain:
        base_cells = [
            {"x": -3.5, "y": 2.8, "intensity_dbz": 44.0, "rain_rate_mmh": 6.5, "radius_km": 3.8},
            {"x": 1.2, "y": -1.5, "intensity_dbz": 38.0, "rain_rate_mmh": 4.2, "radius_km": 3.2},
            {"x": -7.0, "y": -5.2, "intensity_dbz": 52.0, "rain_rate_mmh": 9.8, "radius_km": 4.5},
            {"x": 6.5, "y": 4.0, "intensity_dbz": 28.0, "rain_rate_mmh": 2.1, "radius_km": 2.8},
        ]
    else:
        # Dry / light moisture cells away from the circuit
        base_cells = [
            {"x": -14.0, "y": 12.0, "intensity_dbz": 18.0, "rain_rate_mmh": 0.5, "radius_km": 3.0},
            {"x": 16.0, "y": -11.0, "intensity_dbz": 22.0, "rain_rate_mmh": 0.8, "radius_km": 3.5},
        ]

    for offset_min in [0, 5, 10, 15, 20]:
        # Drift distance in km
        drift_dist = (wind_speed_kmh / 60.0) * offset_min
        current_cells = []
        track_impact = False

        for cell in base_cells:
            cx = round(cell["x"] + drift_dx * drift_dist, 2)
            cy = round(cell["y"] + drift_dy * drift_dist, 2)
            # Distance from circuit center
            dist_to_center = math.sqrt(cx * cx + cy * cy)
            if dist_to_center <= (cell["radius_km"] + 1.2) and cell["intensity_dbz"] >= 30.0:
                track_impact = True

            # Keep cells within visible 24km radar dome
            if dist_to_center <= 25.0:
                current_cells.append({
                    "x": cx,
                    "y": cy,
                    "intensity_dbz": cell["intensity_dbz"],
                    "rain_rate_mmh": cell["rain_rate_mmh"],
                    "radius_km": cell["radius_km"],
                })

        projected_grip = base_grip
        if track_impact:
            projected_grip = max(55.0, round(base_grip - (offset_min * 1.8), 1))

        frames.append({
            "time_offset_min": offset_min,
            "cells": current_cells,
            "track_impact": track_impact,
            "projected_grip_pct": projected_grip,
        })

    return frames


def get_weather_radar_data(
    year: int,
    event: str,
    session_type: str,
    selected_lap: int | None = None,
) -> dict[str, Any]:
    """Fetches weather data, models track grip dynamics, and generates Doppler radar forecast."""
    try:
        session = fastf1.get_session(year, event, session_type)
        session.load(laps=True, telemetry=False, weather=True, messages=False)
    except Exception as exc:  # noqa: BLE001
        _logger.warning("Weather radar: fastf1 session load failed for %s %s: %s", year, event, exc)
        return _empty_fallback_response(year, event, session_type, f"FastF1 load failed: {exc}")

    try:
        weather_df = getattr(session, "weather_data", None)
    except Exception as exc:  # noqa: BLE001
        _logger.warning("Weather radar: accessing weather_data failed: %s", exc)
        return _empty_fallback_response(year, event, session_type, f"Weather data not loaded: {exc}")

    if weather_df is None or len(weather_df) == 0:
        return _empty_fallback_response(year, event, session_type, "No weather samples recorded in session.")

    try:
        timeline = _calculate_water_film_and_grip(weather_df)
    except Exception as exc:  # noqa: BLE001
        _logger.error("Weather radar: water film calculation error: %s", exc)
        return _empty_fallback_response(year, event, session_type, f"Calculation error: {exc}")

    # Map session laps to timeline samples
    try:
        laps = getattr(session, "laps", None)
    except Exception:
        laps = None
    total_laps = int(laps["LapNumber"].max()) if laps is not None and not laps.empty else 55

    if laps is not None and not laps.empty and "LapStartTime" in laps.columns:
        valid_laps = laps.dropna(subset=["LapStartTime"]).sort_values("LapStartTime")
        for sample in timeline:
            sample_time_sec = sample["minute"] * 60.0
            # Find lap corresponding to this time
            matching = valid_laps[valid_laps["LapStartTime"].dt.total_seconds() <= sample_time_sec]
            if not matching.empty:
                sample["lap_estimate"] = int(matching.iloc[-1]["LapNumber"])
            else:
                sample["lap_estimate"] = 1
    else:
        # Linear approximation if LapStartTime not available
        max_min = timeline[-1]["minute"] if timeline else 90.0
        for sample in timeline:
            sample["lap_estimate"] = max(1, min(total_laps, int((sample["minute"] / max(1.0, max_min)) * total_laps)))

    # Select current focus sample based on selected_lap
    if selected_lap is not None:
        matching_samples = [s for s in timeline if s["lap_estimate"] == selected_lap]
        current_sample = matching_samples[-1] if matching_samples else timeline[min(len(timeline) - 1, int(len(timeline) * (selected_lap / max(1, total_laps))))]
    else:
        # Default to latest or peak rain sample
        rain_samples = [s for s in timeline if s["rainfall"]]
        current_sample = rain_samples[0] if rain_samples else timeline[len(timeline) // 2 if len(timeline) > 1 else 0]

    current_idx = timeline.index(current_sample) if current_sample in timeline else 0

    # Cross-over prediction & lookahead
    current_grip = current_sample["track_grip_pct"]
    current_rec = current_sample["recommended_compound"]

    crossover_status: Literal["OPTIMAL", "APPROACHING", "CRITICAL", "PAST_WINDOW"] = "OPTIMAL"
    crossover_lap: int | None = None
    crossover_in_min: float | None = None
    pit_call = "CONDITIONS STABLE — MAINTAIN COMPOUND STRATEGY"

    # Search forward in timeline for compound transition
    future_samples = timeline[current_idx + 1 :]
    for f_sample in future_samples:
        if f_sample["recommended_compound"] != current_rec:
            crossover_lap = f_sample["lap_estimate"]
            crossover_in_min = max(0.5, round(f_sample["minute"] - current_sample["minute"], 1))
            if crossover_in_min <= 4.0:
                crossover_status = "CRITICAL"
            elif crossover_in_min <= 12.0:
                crossover_status = "APPROACHING"
            else:
                crossover_status = "OPTIMAL"

            target = f_sample["recommended_compound"]
            if target == "INTERMEDIATE":
                pit_call = f"BOX IN {max(1, int(crossover_in_min / 1.6))} LAPS FOR INTERS — TRACK GRIP DECAYING TO {f_sample['track_grip_pct']}%"
            elif target == "WET":
                pit_call = "EXTREME RAINFALL AHEAD — STANDBY FOR FULL WET SWITCH"
            else:
                pit_call = f"DRYING LINE CONFIRMED — CROSSOVER TO SLICKS IN {max(1, int(crossover_in_min / 1.6))} LAPS"
            break

    if crossover_lap is None:
        if current_rec == "SLICK":
            pit_call = f"TRACK DRY & GRIP OPTIMAL ({current_grip}%) — REMAIN ON SLICKS"
        elif current_rec == "INTERMEDIATE":
            pit_call = f"INTERMEDIATE CONDITIONS STEADY ({current_grip}% GRIP) — MANAGE SURFACE WEAR"
        else:
            pit_call = f"FULL WET REQUIRED ({current_grip}% GRIP) — HIGH AQUAPLANING RISK"

    crossover = {
        "current_compound": current_rec,
        "recommended_compound": current_rec,
        "crossover_status": crossover_status,
        "crossover_lap": crossover_lap,
        "crossover_in_minutes": crossover_in_min,
        "grip_pct": current_grip,
        "water_film_mm": current_sample.get("water_film_mm", 0.0),
        "pit_call": pit_call,
    }

    # Generate Doppler radar forecast frames based on current sample wind and rain
    radar_frames = _generate_radar_frames(
        has_rain=current_sample["rainfall"] or current_sample["water_film_mm"] > 0.2,
        wind_speed_kmh=current_sample["wind_speed_kmh"],
        wind_dir_deg=current_sample["wind_direction_deg"],
        base_grip=current_grip,
    )

    wind_rad = math.radians(current_sample["wind_direction_deg"])
    wind_vector = {
        "speed_kmh": current_sample["wind_speed_kmh"],
        "direction_deg": current_sample["wind_direction_deg"],
        "dx": round(current_sample["wind_speed_kmh"] * math.sin(wind_rad), 1),
        "dy": round(-current_sample["wind_speed_kmh"] * math.cos(wind_rad), 1),
    }

    return {
        "status": "success",
        "year": year,
        "event": event,
        "session_type": session_type,
        "current_metrics": current_sample,
        "crossover": crossover,
        "radar_frames": radar_frames,
        "timeline": timeline,
        "wind_vector": wind_vector,
        "fallback": False,
        "fallback_reason": None,
    }
