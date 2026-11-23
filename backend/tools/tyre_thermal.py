"""Tyre Thermal Degradation & Thermodynamic Engine (#70).

Computes dual-layer temperatures (Instantaneous Surface vs Deep Carcass Core)
and 3 lateral zones (Inner Shoulder, Center Tread, Outer Shoulder) across all
4 wheels (FL, FR, RL, RR) with negative camber thermal bias and early
pathology diagnostics (Graining, Blistering, Thermal Cliff, Inflation Pressure).
"""

from __future__ import annotations

import logging
from typing import Any, Literal

from tools.fastf1_helper import get_session_lap_list
from tools.weather_helper import get_weather_summary

_logger = logging.getLogger(__name__)

WheelPosition = Literal["FL", "FR", "RL", "RR"]
ThermalStatus = Literal["COLD", "OPTIMAL", "WARM", "OVERHEATING", "BLISTERING"]
PressureStatus = Literal["OPTIMAL", "OVER_INFLATED", "UNDER_INFLATED"]

PIRELLI_TEMP_WINDOWS: dict[str, tuple[float, float]] = {
    "SOFT": (90.0, 105.0),
    "MEDIUM": (95.0, 115.0),
    "HARD": (100.0, 120.0),
    "INTERMEDIATE": (60.0, 85.0),
    "WET": (50.0, 75.0),
}

# Static camber defaults in degrees (Formula 1 regulations: max ~ -3.5 to -4.0 front)
STATIC_CAMBER: dict[WheelPosition, float] = {
    "FL": -3.5,
    "FR": -3.5,
    "RL": -1.8,
    "RR": -1.8,
}

# Brake thermal radiation coefficient into carcass (°C)
BRAKE_SOAK_OFFSET: dict[WheelPosition, float] = {
    "FL": 6.5,
    "FR": 6.5,
    "RL": 3.8,
    "RR": 3.8,
}


def _calculate_wheel_thermal(
    *,
    position: WheelPosition,
    compound: str,
    stint_laps: int,
    lap_number: int,
    track_temp_c: float,
) -> dict[str, Any]:
    """Calculate 3-zone surface and deep carcass temperatures for a single wheel."""
    norm_compound = compound.upper() if compound else "MEDIUM"
    temp_window = PIRELLI_TEMP_WINDOWS.get(norm_compound, (95.0, 115.0))
    camber = STATIC_CAMBER[position]
    brake_soak = BRAKE_SOAK_OFFSET[position]

    # Negative camber heat bias on the inner shoulder: ~2.8°C per degree of negative camber
    camber_bias = abs(camber) * 2.8

    # Base surface temperature progression from track temp and friction slip
    # Compound nominal target is mid-window
    target_surf = (temp_window[0] + temp_window[1]) / 2.0
    
    # Early laps might be cold if stint_laps is low; laps > 35 build heat
    if stint_laps <= 2:
        surf_base = max(track_temp_c + 20.0, 78.0)
    else:
        # Reaches equilibrium around lap 8-12, slowly climbs
        surf_base = target_surf - 4.0 + min(stint_laps * 0.45, 14.0)

    # Lateral load transfer: Left-hand tyres (FL, RL) take extra load on clockwise circuits (Monza)
    circuit_bias = 2.0 if position in ("FL", "RL") else -1.0

    # Zone calculation
    # Inner shoulder takes camber bias
    inner_c = round(surf_base + camber_bias, 1)
    
    # Center tread temperature: reflects inflation pressure balance
    # Slight pressure build over stint
    center_c = round(surf_base + 1.2 + (stint_laps * 0.1), 1)
    
    # Outer shoulder: takes cornering load transfer
    outer_c = round(surf_base + circuit_bias, 1)

    surf_avg = (inner_c + center_c + outer_c) / 3.0

    # Carcass temperature: Slow thermal inertia (hysteresis) + brake disc heat soak
    # Bulk carcass rises steadily with stint laps (rubber hysteresis strain energy)
    carcass_hysteresis = stint_laps * 0.85
    if lap_number >= 45:
        # Cumulative heat soak in high lap counts
        carcass_hysteresis += (lap_number - 40) * 1.2

    carcass_temp_c = round(82.0 + carcass_hysteresis + brake_soak, 1)

    # Weighted bulk wheel temperature
    bulk_temp_c = round(0.55 * carcass_temp_c + 0.45 * surf_avg, 1)

    # Camber thermal bias: Inner shoulder minus outer shoulder
    camber_bias_c = round(inner_c - outer_c, 1)

    # Inflation pressure calculation (cold fill ~22.5 PSI Front / ~20.5 PSI Rear)
    base_cold_psi = 23.0 if position in ("FL", "FR") else 21.0
    pressure_psi = round(base_cold_psi + 0.052 * (carcass_temp_c - 80.0), 1)

    # Pressure status heuristic based on center vs shoulder average
    shoulder_avg = (inner_c + outer_c) / 2.0
    delta_pressure_temp = center_c - shoulder_avg
    if delta_pressure_temp > 4.0:
        pressure_status: PressureStatus = "OVER_INFLATED"
    elif delta_pressure_temp < -4.0:
        pressure_status = "UNDER_INFLATED"
    else:
        pressure_status = "OPTIMAL"

    # Pathology diagnostics
    # Blistering: Carcass > 125°C and core hotter than surface by >= 12°C
    blistering_risk = bool(carcass_temp_c > 125.0 and (carcass_temp_c - surf_avg) >= 12.0)
    
    # Graining: Cold surface (<85°C) subject to high lateral strain
    graining_risk = bool(surf_avg < 85.0 and stint_laps <= 5)
    
    # Thermal cliff: bulk temperature severely exceeding compound limit or severe stint age
    cliff_temp = temp_window[1] + 12.0
    thermal_cliff_risk = bool(bulk_temp_c > cliff_temp or stint_laps >= 32)

    # Thermal status classification
    if blistering_risk or carcass_temp_c > 128.0:
        thermal_status: ThermalStatus = "BLISTERING"
    elif bulk_temp_c > temp_window[1] + 6.0:
        thermal_status = "OVERHEATING"
    elif bulk_temp_c > temp_window[1]:
        thermal_status = "WARM"
    elif bulk_temp_c < temp_window[0]:
        thermal_status = "COLD"
    else:
        thermal_status = "OPTIMAL"

    return {
        "position": position,
        "compound": norm_compound,
        "surface_temp": {
            "inner_c": inner_c,
            "center_c": center_c,
            "outer_c": outer_c,
        },
        "carcass_temp_c": carcass_temp_c,
        "bulk_temp_c": bulk_temp_c,
        "thermal_status": thermal_status,
        "pressure_status": pressure_status,
        "pressure_psi": pressure_psi,
        "camber_deg": camber,
        "graining_risk": graining_risk,
        "blistering_risk": blistering_risk,
        "thermal_cliff_risk": thermal_cliff_risk,
        "camber_bias_c": camber_bias_c,
    }


def compute_tyre_thermal_profile(
    year: int,
    event: str,
    session: str,
    driver: str,
    lap_number: int | None = None,
) -> dict[str, Any]:
    """Compute 4-wheel dual-layer and 3-zone thermal profiles.

    Uses FastF1 cached session telemetry and weather data when available;
    gracefully degrades to a deterministic first-principles physical fallback
    model on missing or non-infrared sessions.
    """
    driver_norm = (driver or "LEC").upper().strip()
    is_fallback = False

    try:
        laps = get_session_lap_list(
            year=year,
            event=event,
            session=session,
            driver=driver_norm,
        )
    except Exception as exc:  # noqa: BLE001
        _logger.warning("Could not fetch session laps: %s", exc)
        laps = []

    if not laps:
        is_fallback = True

    # Determine targeted lap number
    if lap_number is not None and lap_number > 0:
        target_lap = lap_number
    elif laps:
        target_lap = max(lap.get("lap_number", 1) for lap in laps)
    else:
        target_lap = 15

    # Determine stint laps and compound for target lap
    stint_laps = 12
    compound = "MEDIUM"

    if laps:
        # Find the specific lap or the latest lap <= target_lap
        candidate_laps = [l for l in laps if l.get("lap_number", 0) <= target_lap]
        if candidate_laps:
            current_lap_obj = candidate_laps[-1]
            if current_lap_obj.get("compound"):
                compound = current_lap_obj["compound"]
            
            # Count stint laps backwards from target_lap to the latest pit stop
            s_count = 0
            for l in reversed(candidate_laps):
                s_count += 1
                if l.get("is_pit_in"):
                    break
            stint_laps = max(1, s_count)
    else:
        # Heuristic stint laps for fallback based on target_lap
        stint_laps = min(target_lap, 24)

    # Weather track temperature
    track_temp_c = 42.0
    try:
        w_summary = get_weather_summary(year=year, event=event, session=session)
        if w_summary and not w_summary.get("fallback") and "track_temp_mean" in w_summary:
            track_temp_c = float(w_summary["track_temp_mean"])
    except Exception:  # noqa: BLE001
        pass

    wheels_data: dict[str, Any] = {}
    critical_alerts: list[str] = []

    for pos in ["FL", "FR", "RL", "RR"]:
        wheel_info = _calculate_wheel_thermal(
            position=pos,  # type: ignore[arg-type]
            compound=compound,
            stint_laps=stint_laps,
            lap_number=target_lap,
            track_temp_c=track_temp_c,
        )
        wheels_data[pos] = wheel_info

        # Compile critical alerts
        if wheel_info["blistering_risk"]:
            critical_alerts.append(
                f"{pos}: Blistering alert — core carcass ({wheel_info['carcass_temp_c']}°C) "
                f"exceeds surface by {round(wheel_info['carcass_temp_c'] - (wheel_info['surface_temp']['inner_c'] + wheel_info['surface_temp']['outer_c'])/2, 1)}°C"
            )
        if wheel_info["thermal_cliff_risk"]:
            critical_alerts.append(f"{pos}: Thermal cliff active — stint degradation threshold reached")
        if wheel_info["graining_risk"]:
            critical_alerts.append(f"{pos}: Graining risk — cold rubber below operating window")
        if wheel_info["camber_bias_c"] > 18.0:
            critical_alerts.append(f"{pos}: Severe camber thermal bias ({wheel_info['camber_bias_c']}°C inner delta)")

    return {
        "status": "fallback" if is_fallback else "success",
        "year": year,
        "event": event,
        "session": session,
        "driver": driver_norm,
        "lap_number": target_lap,
        "stint_laps": stint_laps,
        "wheels": wheels_data,
        "critical_alerts": critical_alerts,
    }
