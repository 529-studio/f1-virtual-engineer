"""Pirelli Tyre Degradation Polynomial Model

Calculates polynomial degradation trajectories, detects the 'tyre cliff' where
wear becomes non-linear, and computes the optimal pit window.
"""

import logging
from typing import Optional, List
from app.schemas.tyre_degradation import TyreDegradationResponse, DegradationPoint

_logger = logging.getLogger(__name__)

# Calibrated polynomial wear rates: Delta_t(L) = a * L^2 + b * L + c
_COMPOUND_COEFFICIENTS = {
    "SOFT": {"a": 0.0055, "b": 0.045, "c": 0.0, "max_laps": 25},
    "MEDIUM": {"a": 0.0028, "b": 0.030, "c": 0.0, "max_laps": 35},
    "HARD": {"a": 0.0012, "b": 0.020, "c": 0.0, "max_laps": 48},
    "INTERMEDIATE": {"a": 0.0060, "b": 0.050, "c": 0.0, "max_laps": 30},
    "WET": {"a": 0.0040, "b": 0.035, "c": 0.0, "max_laps": 35},
}


def compute_tyre_degradation_profile(
    year: int = 2024,
    event: str = "Italian Grand Prix",
    driver: str = "LEC",
    compound: str = "HARD",
    current_stint_laps: int = 18,
) -> TyreDegradationResponse:
    """Compute polynomial degradation trajectory and cliff boundary."""
    comp_key = compound.upper() if compound else "HARD"
    params = _COMPOUND_COEFFICIENTS.get(comp_key, _COMPOUND_COEFFICIENTS["HARD"])

    a = params["a"]
    b = params["b"]
    c = params["c"]
    max_horizon = params["max_laps"]

    # Try accessing FastF1 session defensively to calibrate tyre life if available
    stint_laps = current_stint_laps
    fallback = False
    try:
        from tools.fastf1_helper import get_session
        session = get_session(year, event, "Race")
        if session is not None:
            laps = getattr(session, "laps", None)
            if laps is not None and len(laps) > 0:
                driver_laps = laps[laps["Driver"] == driver.upper()]
                if len(driver_laps) > 0:
                    latest_life = driver_laps.iloc[-1].get("TyreLife")
                    if latest_life and not (latest_life != latest_life):  # check not NaN
                        stint_laps = int(latest_life)
    except Exception as exc:
        _logger.warning("FastF1 tyre degradation lookup fallback: %s", exc)
        fallback = True

    # Generate trajectory curve from lap 1 to max_horizon
    trajectory: List[DegradationPoint] = []
    cliff_lap = max_horizon
    cliff_found = False

    for lap in range(1, max_horizon + 1):
        # Quadratic time loss: Delta_t = a * L^2 + b * L + c
        loss_s = round(a * (lap ** 2) + b * lap + c, 3)
        # Derivative dDelta_t/dL = 2 * a * L + b
        rate_of_loss = 2 * a * lap + b
        # Grip percentage decays inversely to time loss
        grip = max(20.0, round(100.0 - (loss_s * 28.0), 1))

        trajectory.append(
            DegradationPoint(
                lap=lap,
                time_loss_s=loss_s,
                grip_percent=grip,
            )
        )

        # Detect cliff when degradation rate crosses 0.20s/lap or cumulative loss >= 2.0s
        if not cliff_found and (rate_of_loss >= 0.20 or loss_s >= 2.0):
            cliff_lap = lap
            cliff_found = True

    current_loss = round(a * (stint_laps ** 2) + b * stint_laps + c, 3)
    laps_until_cliff = max(0, cliff_lap - stint_laps)

    # Optimal pit window centered 3-4 laps prior to cliff
    pit_start = max(1, cliff_lap - 4)
    pit_end = min(max_horizon, cliff_lap + 1)
    undercut_gain = round(max(0.4, (cliff_lap - stint_laps) * 0.25), 2)
    overcut_viable = (cliff_lap - stint_laps) > 5

    return TyreDegradationResponse(
        status="success",
        year=year,
        event=event,
        driver=driver.upper(),
        compound=comp_key,
        current_stint_laps=stint_laps,
        current_time_loss_s=current_loss,
        projected_cliff_lap=cliff_lap,
        laps_until_cliff=laps_until_cliff,
        pit_window_start_lap=pit_start,
        pit_window_end_lap=pit_end,
        undercut_gain_estimate_s=undercut_gain,
        overcut_viable=overcut_viable,
        trajectory=trajectory,
        fallback=fallback,
    )
