"""DRS Zone Efficiency & Top Speed Trap Optimizer (#96).

Evaluates rear-wing drag load vs straight-line speed delta and DRS effectiveness
across circuit activation zones with physics-calibrated monotonic wing trims
(`LOW_DRAG`, `BALANCED`, `HIGH_DOWNFORCE`) and defensive FastF1 handling.
"""

from __future__ import annotations

import logging
import math
from typing import Any

import fastf1
import numpy as np

from app.schemas.drs_optimizer import WingTrim

_logger = logging.getLogger(__name__)

# Circuit DRS activation straights & baseline aerodynamic profiles
_CIRCUIT_DRS_ZONES: dict[str, dict[str, Any]] = {
    "italian": {
        "base_trap_kmh": 344.0,
        "ideal_trim": "LOW_DRAG",
        "zones": [
            {"id": "DRS1", "name": "Rettilineo Box (Main Straight)", "range": "5200m - 650m", "base_closed": 324.0, "base_gain": 18.5, "weight": 0.56},
            {"id": "DRS2", "name": "Curva Grande -> Roggia", "range": "1480m - 2420m", "base_closed": 318.0, "base_gain": 16.0, "weight": 0.44},
        ],
    },
    "british": {
        "base_trap_kmh": 326.0,
        "ideal_trim": "BALANCED",
        "zones": [
            {"id": "DRS1", "name": "Wellington Straight", "range": "1240m - 1960m", "base_closed": 304.0, "base_gain": 17.5, "weight": 0.48},
            {"id": "DRS2", "name": "Hangar Straight", "range": "3890m - 4680m", "base_closed": 309.0, "base_gain": 18.2, "weight": 0.52},
        ],
    },
    "belgian": {
        "base_trap_kmh": 338.0,
        "ideal_trim": "LOW_DRAG",
        "zones": [
            {"id": "DRS1", "name": "Kemmel Straight", "range": "1120m - 2160m", "base_closed": 319.0, "base_gain": 20.4, "weight": 0.62},
            {"id": "DRS2", "name": "Start / Finish Straight", "range": "6780m - 160m", "base_closed": 298.0, "base_gain": 15.2, "weight": 0.38},
        ],
    },
    "singapore": {
        "base_trap_kmh": 312.0,
        "ideal_trim": "HIGH_DOWNFORCE",
        "zones": [
            {"id": "DRS1", "name": "Raffles Boulevard", "range": "1040m - 1580m", "base_closed": 291.0, "base_gain": 14.5, "weight": 0.36},
            {"id": "DRS2", "name": "Esplanade Bridge", "range": "2640m - 3180m", "base_closed": 286.0, "base_gain": 13.8, "weight": 0.32},
            {"id": "DRS3", "name": "Main Pit Straight", "range": "4620m - 120m", "base_closed": 294.0, "base_gain": 14.9, "weight": 0.32},
        ],
    },
    "paulo": {
        "base_trap_kmh": 331.0,
        "ideal_trim": "BALANCED",
        "zones": [
            {"id": "DRS1", "name": "Reta Oposta", "range": "920m - 1480m", "base_closed": 307.0, "base_gain": 17.8, "weight": 0.45},
            {"id": "DRS2", "name": "Subida dos Boxes", "range": "3680m - 4260m", "base_closed": 314.0, "base_gain": 19.2, "weight": 0.55},
        ],
    },
    "brazil": {
        "base_trap_kmh": 331.0,
        "ideal_trim": "BALANCED",
        "zones": [
            {"id": "DRS1", "name": "Reta Oposta", "range": "920m - 1480m", "base_closed": 307.0, "base_gain": 17.8, "weight": 0.45},
            {"id": "DRS2", "name": "Subida dos Boxes", "range": "3680m - 4260m", "base_closed": 314.0, "base_gain": 19.2, "weight": 0.55},
        ],
    },
    "japanese": {
        "base_trap_kmh": 324.0,
        "ideal_trim": "BALANCED",
        "zones": [
            {"id": "DRS1", "name": "Main Pit Straight", "range": "5380m - 220m", "base_closed": 306.0, "base_gain": 17.2, "weight": 1.0},
        ],
    },
    "bahrain": {
        "base_trap_kmh": 329.0,
        "ideal_trim": "BALANCED",
        "zones": [
            {"id": "DRS1", "name": "T3 -> T4 Straight", "range": "820m - 1410m", "base_closed": 301.0, "base_gain": 17.4, "weight": 0.32},
            {"id": "DRS2", "name": "Back Straight (T10-T11)", "range": "3020m - 3720m", "base_closed": 304.0, "base_gain": 18.1, "weight": 0.34},
            {"id": "DRS3", "name": "Main Pit Straight", "range": "4850m - 150m", "base_closed": 311.0, "base_gain": 18.9, "weight": 0.34},
        ],
    },
    "abu dhabi": {
        "base_trap_kmh": 333.0,
        "ideal_trim": "BALANCED",
        "zones": [
            {"id": "DRS1", "name": "Yas Marina North Straight", "range": "1780m - 2940m", "base_closed": 312.0, "base_gain": 19.4, "weight": 0.56},
            {"id": "DRS2", "name": "Hotel Sector Link", "range": "3120m - 3840m", "base_closed": 304.0, "base_gain": 16.5, "weight": 0.44},
        ],
    },
    "las vegas": {
        "base_trap_kmh": 348.0,
        "ideal_trim": "LOW_DRAG",
        "zones": [
            {"id": "DRS1", "name": "Las Vegas Strip", "range": "3350m - 5220m", "base_closed": 327.0, "base_gain": 21.2, "weight": 0.65},
            {"id": "DRS2", "name": "Koval Lane Straight", "range": "1540m - 2280m", "base_closed": 311.0, "base_gain": 16.8, "weight": 0.35},
        ],
    },
}

_GENERIC_CIRCUIT = {
    "base_trap_kmh": 328.0,
    "ideal_trim": "BALANCED",
    "zones": [
        {"id": "DRS1", "name": "Primary Straight (Pit Exit)", "range": "4400m - 300m", "base_closed": 308.0, "base_gain": 17.5, "weight": 0.55},
        {"id": "DRS2", "name": "Secondary Detection Straight", "range": "2100m - 2950m", "base_closed": 302.0, "base_gain": 16.2, "weight": 0.45},
    ],
}

_TRIM_DEFAULT_DRAG: dict[WingTrim, int] = {
    "LOW_DRAG": 20,
    "BALANCED": 50,
    "HIGH_DOWNFORCE": 80,
}


def _resolve_circuit_config(event: str) -> dict[str, Any]:
    lowered = (event or "").lower()
    for key, cfg in _CIRCUIT_DRS_ZONES.items():
        if key in lowered:
            return cfg
    return _GENERIC_CIRCUIT


def _extract_fastf1_drs_stats(session: Any, driver_code: str) -> dict[str, float] | None:
    """Safely extract driver trap speed & DRS open fraction from FastF1."""
    try:
        laps = session.laps
        if laps is None or laps.empty:
            return None
        drv_laps = laps[laps["Driver"] == driver_code]
        if drv_laps.empty:
            return None

        speed_trap = None
        if "SpeedST" in drv_laps.columns:
            st = drv_laps["SpeedST"].dropna().to_numpy(dtype=float)
            st = st[np.isfinite(st) & (st > 180.0)]
            if len(st) > 0:
                speed_trap = float(np.nanmax(st))

        drs_duty = 22.0
        drs_boost = 17.5
        fastest = drv_laps.pick_fastest()
        if fastest is not None:
            tel = fastest.get_car_data()
            if tel is not None and not tel.empty and "Speed" in tel.columns:
                spd = tel["Speed"].to_numpy(dtype=float)
                if len(spd) > 5 and np.isfinite(np.nanmax(spd)):
                    max_spd = float(np.nanmax(spd))
                    speed_trap = max(speed_trap or 0.0, max_spd)

                if "DRS" in tel.columns:
                    drs_vals = tel["DRS"].to_numpy(dtype=float)
                    # FastF1 DRS >= 10 indicates flap open (10, 12, 14)
                    open_mask = drs_vals >= 10
                    if np.any(open_mask):
                        drs_duty = float(np.mean(open_mask) * 100.0)
                        open_mean = float(np.nanmean(spd[open_mask]))
                        high_closed_mask = (~open_mask) & (spd >= 240.0)
                        if np.any(high_closed_mask):
                            closed_mean = float(np.nanmean(spd[high_closed_mask]))
                            drs_boost = max(10.0, min(26.0, open_mean - closed_mean))

        if speed_trap is None:
            return None

        return {
            "speed_trap": speed_trap,
            "drs_duty": max(8.0, min(48.0, drs_duty)),
            "drs_boost": drs_boost,
        }
    except Exception:  # noqa: BLE001
        _logger.debug("FastF1 DRS stats unavailable for %s", driver_code, exc_info=True)
        return None


def _build_zone_metrics(
    circuit_cfg: dict[str, Any],
    effective_drag: int,
    base_trap_kmh: float,
    drs_boost_scale: float,
    activation_rate: float,
) -> tuple[list[dict[str, Any]], float, float, float]:
    """Compute monotonic straight-line speed & DRS delta across drag setting.

    Higher `effective_drag` (0..100) monotonically lowers base straight speed
    while slightly amplifying relative DRS flap drag-shedding delta.
    Net DRS-open speed strictly increases as drag decreases (`LOW_DRAG` > `BALANCED` > `HIGH_DOWNFORCE`).
    """
    # Monotonic drag penalty relative to BALANCED (50): -0.26 km/h per drag point
    drag_delta_from_mid = (50 - effective_drag) * 0.26
    # Flap shedding factor: high-downforce wing gains more from opening DRS, but never reverses net top speed
    drs_shed_mult = 0.90 + (effective_drag / 100.0) * 0.20

    zones_out: list[dict[str, Any]] = []
    gains: list[float] = []
    total_time_gain = 0.0
    peak_open_speed = 0.0

    for idx, z in enumerate(circuit_cfg["zones"]):
        closed_spd = round(z["base_closed"] + drag_delta_from_mid, 1)
        speed_delta = round(z["base_gain"] * drs_boost_scale * drs_shed_mult, 1)
        open_spd = round(closed_spd + speed_delta, 1)
        peak_open_speed = max(peak_open_speed, open_spd)

        # Time delta on straight ~ (delta_v / v_avg) * segment_time
        zone_time_gain = round((speed_delta / max(220.0, open_spd)) * (4.2 * z["weight"] * 2.0), 3)
        total_time_gain += zone_time_gain
        gains.append(speed_delta)

        zones_out.append(
            {
                "zone_id": z["id"],
                "zone_name": z["name"],
                "distance_range_m": z["range"],
                "drs_closed_speed_kmh": closed_spd,
                "drs_open_speed_kmh": open_spd,
                "speed_delta_kmh": speed_delta,
                "time_gain_s": zone_time_gain,
                "activation_rate_pct": round(min(99.0, max(55.0, activation_rate - idx * 3.5)), 1),
            }
        )

    trap_speed = round(max(base_trap_kmh + drag_delta_from_mid * 0.85, peak_open_speed), 1)
    avg_gain = round(sum(gains) / max(1, len(gains)), 1)
    return zones_out, trap_speed, avg_gain, round(total_time_gain, 3)


def compute_drs_efficiency(
    year: int = 2024,
    event: str = "Italian Grand Prix",
    session_type: str = "R",
    driver: str = "LEC",
    compare_driver: str | None = None,
    wing_trim: WingTrim = "BALANCED",
    drag_level: int | None = None,
) -> dict[str, Any]:
    """Compute DRS zone efficiency, speed trap delta, and wing trim recommendation."""
    primary_code = (driver or "LEC").strip().upper()
    compare_code = compare_driver.strip().upper() if compare_driver else None
    if compare_code == primary_code or compare_code == "":
        compare_code = None

    effective_drag = (
        max(0, min(100, int(drag_level)))
        if drag_level is not None
        else _TRIM_DEFAULT_DRAG.get(wing_trim, 50)
    )

    circuit_cfg = _resolve_circuit_config(event)
    recommended_trim: WingTrim = circuit_cfg["ideal_trim"]

    if recommended_trim == "LOW_DRAG":
        reason = f"{event} rewards low drag trim to maximize slipstream defense on high-speed straights."
    elif recommended_trim == "HIGH_DOWNFORCE":
        reason = f"{event} corner density favors higher wing load for apex traction and brake stability."
    else:
        reason = f"{event} requires balanced rear-wing trim to protect DRS trap speed without starving mid-corner grip."

    def _build_envelope(
        base_trap: float,
        comp_trap: float | None,
        drs_scale: float,
        act_rate: float,
        fallback: bool,
        fallback_reason: str | None,
        source: str,
    ) -> dict[str, Any]:
        zones, trap_primary, avg_gain, lap_gain = _build_zone_metrics(
            circuit_cfg, effective_drag, base_trap, drs_scale, act_rate
        )
        # Aero efficiency peaks near the circuit's ideal drag target
        ideal_drag = _TRIM_DEFAULT_DRAG[recommended_trim]
        drag_alignment = max(0.0, 100.0 - abs(effective_drag - ideal_drag) * 0.45)
        efficiency_index = round(
            max(45.0, min(99.0, 0.55 * drag_alignment + 0.45 * min(100.0, avg_gain * 4.6))),
            1,
        )
        if not math.isfinite(efficiency_index):
            efficiency_index = 78.0

        return {
            "status": "error" if fallback else "success",
            "year": year,
            "event": event,
            "session": session_type,
            "driver": primary_code,
            "compare_driver": compare_code,
            "wing_trim": wing_trim,
            "drag_level": effective_drag,
            "aero_efficiency_index": efficiency_index,
            "avg_drs_gain_kmh": avg_gain,
            "total_lap_gain_s": lap_gain,
            "speed_trap_primary_kmh": trap_primary,
            "speed_trap_compare_kmh": round(comp_trap + (50 - effective_drag) * 0.20, 1) if comp_trap else None,
            "recommended_trim": recommended_trim,
            "recommendation_reason": reason,
            "zones": zones,
            "fallback": fallback,
            "fallback_reason": fallback_reason,
            "source": source,
        }

    if year < 2018:
        comp_base = circuit_cfg["base_trap_kmh"] - 3.2 if compare_code else None
        return _build_envelope(
            base_trap=circuit_cfg["base_trap_kmh"],
            comp_trap=comp_base,
            drs_scale=1.0,
            act_rate=86.0,
            fallback=True,
            fallback_reason=f"FastF1 DRS telemetry unavailable for {year} season (2018+ required).",
            source="fallback",
        )

    try:
        session = fastf1.get_session(year, event, session_type)
        session.load(laps=True, telemetry=True, weather=False, messages=False)
        primary_stats = _extract_fastf1_drs_stats(session, primary_code)
        if primary_stats is None:
            raise ValueError(f"DRS telemetry unavailable for {primary_code} at {year} {event}")

        comp_trap = None
        if compare_code:
            comp_stats = _extract_fastf1_drs_stats(session, compare_code)
            comp_trap = comp_stats["speed_trap"] if comp_stats else (primary_stats["speed_trap"] - 3.4)

        drs_scale = max(0.75, min(1.30, primary_stats["drs_boost"] / 17.5))
        return _build_envelope(
            base_trap=primary_stats["speed_trap"],
            comp_trap=comp_trap,
            drs_scale=drs_scale,
            act_rate=min(98.0, max(72.0, primary_stats["drs_duty"] * 3.4)),
            fallback=False,
            fallback_reason=None,
            source="fastf1",
        )
    except Exception as exc:  # noqa: BLE001 — fail-closed
        _logger.warning("DRS efficiency fallback for %s %s %s: %s", year, event, primary_code, exc)
        comp_base = circuit_cfg["base_trap_kmh"] - 3.2 if compare_code else None
        return _build_envelope(
            base_trap=circuit_cfg["base_trap_kmh"],
            comp_trap=comp_base,
            drs_scale=1.0,
            act_rate=86.0,
            fallback=True,
            fallback_reason=f"FastF1 DRS data unavailable ({exc}); displaying circuit aero model.",
            source="fallback",
        )
