from typing import Any

from tools.fastf1_helper import extract_tyre_wear_features


def predict_tyre_wear(
    year: int,
    event: str,
    session_type: str,
    driver: str,
) -> dict[str, Any]:
    """
    Baseline heuristic tyre wear predictor using extracted telemetry features.
    """
    extracted = extract_tyre_wear_features(year, event, session_type, driver)
    features = extracted["features"]

    if extracted["fallback"]:
        return {
            "driver": driver.upper(),
            "year": year,
            "event": event,
            "session_type": session_type,
            "fallback": True,
            "fallback_reason": extracted["fallback_reason"],
            "prediction": {
                "degradation_rate_seconds_per_lap": 0.0,
                "confidence_band": "low",
                "expected_performance_drop_window_laps": [0, 0],
                "reasons": ["No tyre-wear features available."],
            },
        }

    lap_decay = float(features["lap_time_decay_seconds_per_lap"])
    stint_progress = float(features["stint_progress_ratio"])
    temp_trend = features["track_temp_trend_c_per_lap"]
    temp_trend_value = float(temp_trend) if temp_trend is not None else 0.0

    degradation_rate = lap_decay + (0.05 * stint_progress) + (0.02 * temp_trend_value)
    degradation_rate = max(degradation_rate, 0.0)

    if features["temperature_missing"]:
        confidence = "medium" if degradation_rate < 0.25 else "low"
        reasons = [
            "Track temperature data is missing; model confidence reduced.",
            "Prediction uses lap-time decay and stint progression only.",
        ]
    else:
        confidence = "high" if degradation_rate < 0.25 else ("medium" if degradation_rate < 0.45 else "low")
        reasons = [
            "Prediction combines lap-time decay, stint progression, and track temperature trend.",
        ]

    if degradation_rate < 0.2:
        drop_window = [12, 18]
    elif degradation_rate < 0.4:
        drop_window = [8, 14]
    else:
        drop_window = [4, 10]

    return {
        "driver": driver.upper(),
        "year": year,
        "event": event,
        "session_type": session_type,
        "fallback": False,
        "fallback_reason": None,
        "prediction": {
            "degradation_rate_seconds_per_lap": round(degradation_rate, 4),
            "confidence_band": confidence,
            "expected_performance_drop_window_laps": drop_window,
            "reasons": reasons,
        },
        "features_used": features,
    }
