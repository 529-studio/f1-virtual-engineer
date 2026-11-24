"""Pace Delta Comparison Engine

Computes multi-driver sector pace splits, benchmark deltas relative to a
reference driver, and session best purple sector designations.
"""

import logging
from typing import Optional, Dict, Any, List
from app.schemas.pace_delta import PaceDeltaResponse, DriverPaceRow, SectorSplit

_logger = logging.getLogger(__name__)

# Fallback realistic fixture (Monza 2024 / Singapore Top Contenders)
_SAMPLE_DRIVERS_TELEMETRY = [
    {
        "driver_code": "LEC",
        "driver_name": "Charles Leclerc",
        "team": "Ferrari",
        "team_color": "#E80020",
        "position": 1,
        "compound": "HARD",
        "tyre_age_laps": 18,
        "s1_time": 27.420,
        "s2_time": 26.850,
        "s3_time": 27.110,
        "speed_trap_kmh": 348.2,
    },
    {
        "driver_code": "PIA",
        "driver_name": "Oscar Piastri",
        "team": "McLaren",
        "team_color": "#FF8000",
        "position": 2,
        "compound": "HARD",
        "tyre_age_laps": 12,
        "s1_time": 27.380,  # Session fastest S1
        "s2_time": 27.010,
        "s3_time": 27.140,
        "speed_trap_kmh": 346.8,
    },
    {
        "driver_code": "NOR",
        "driver_name": "Lando Norris",
        "team": "McLaren",
        "team_color": "#FF8000",
        "position": 3,
        "compound": "HARD",
        "tyre_age_laps": 14,
        "s1_time": 27.450,
        "s2_time": 26.810,  # Session fastest S2
        "s3_time": 27.280,
        "speed_trap_kmh": 347.5,
    },
    {
        "driver_code": "VER",
        "driver_name": "Max Verstappen",
        "team": "Red Bull Racing",
        "team_color": "#3671C6",
        "position": 4,
        "compound": "HARD",
        "tyre_age_laps": 22,
        "s1_time": 27.520,
        "s2_time": 27.040,
        "s3_time": 27.080,  # Session fastest S3
        "speed_trap_kmh": 345.1,
    },
    {
        "driver_code": "HAM",
        "driver_name": "Lewis Hamilton",
        "team": "Mercedes",
        "team_color": "#27F4D2",
        "position": 5,
        "compound": "MEDIUM",
        "tyre_age_laps": 8,
        "s1_time": 27.490,
        "s2_time": 27.120,
        "s3_time": 27.310,
        "speed_trap_kmh": 344.0,
    },
    {
        "driver_code": "RUS",
        "driver_name": "George Russell",
        "team": "Mercedes",
        "team_color": "#27F4D2",
        "position": 6,
        "compound": "MEDIUM",
        "tyre_age_laps": 10,
        "s1_time": 27.540,
        "s2_time": 27.180,
        "s3_time": 27.350,
        "speed_trap_kmh": 343.8,
    },
    {
        "driver_code": "SAI",
        "driver_name": "Carlos Sainz",
        "team": "Ferrari",
        "team_color": "#E80020",
        "position": 7,
        "compound": "HARD",
        "tyre_age_laps": 20,
        "s1_time": 27.510,
        "s2_time": 27.090,
        "s3_time": 27.240,
        "speed_trap_kmh": 346.0,
    },
]


def _build_pace_matrix_from_raw(
    year: int,
    event: str,
    session: str,
    reference_driver: str,
    lap_number: int,
    raw_drivers: List[Dict[str, Any]],
    fallback: bool = False,
) -> PaceDeltaResponse:
    # 1. Find session best sector times
    session_best_s1 = min(d["s1_time"] for d in raw_drivers)
    session_best_s2 = min(d["s2_time"] for d in raw_drivers)
    session_best_s3 = min(d["s3_time"] for d in raw_drivers)
    session_best_lap = min(d["s1_time"] + d["s2_time"] + d["s3_time"] for d in raw_drivers)

    # 2. Locate reference driver (default to first driver if not found)
    ref_row = next((d for d in raw_drivers if d["driver_code"].upper() == reference_driver.upper()), raw_drivers[0])
    ref_s1 = ref_row["s1_time"]
    ref_s2 = ref_row["s2_time"]
    ref_s3 = ref_row["s3_time"]
    ref_lap = ref_s1 + ref_s2 + ref_s3

    rows: List[DriverPaceRow] = []
    for d in raw_drivers:
        s1_time = round(d["s1_time"], 3)
        s2_time = round(d["s2_time"], 3)
        s3_time = round(d["s3_time"], 3)
        lap_time = round(s1_time + s2_time + s3_time, 3)

        s1_delta = round(s1_time - ref_s1, 3)
        s2_delta = round(s2_time - ref_s2, 3)
        s3_delta = round(s3_time - ref_s3, 3)
        lap_delta = round(lap_time - ref_lap, 3)

        # Status determination
        is_ref = d["driver_code"].upper() == ref_row["driver_code"].upper()

        def get_status(t: float, best: float, delta: float) -> str:
            if is_ref:
                return "reference"
            if abs(t - best) < 0.001:
                return "session_fastest"
            if delta < -0.010:
                return "personal_best"
            return "slower"

        rows.append(
            DriverPaceRow(
                driver_code=d["driver_code"],
                driver_name=d["driver_name"],
                team=d["team"],
                team_color=d["team_color"],
                position=d["position"],
                lap_number=lap_number,
                compound=d["compound"],
                tyre_age_laps=d["tyre_age_laps"],
                s1=SectorSplit(
                    time_s=s1_time,
                    delta_s=s1_delta,
                    status=get_status(s1_time, session_best_s1, s1_delta),
                ),
                s2=SectorSplit(
                    time_s=s2_time,
                    delta_s=s2_delta,
                    status=get_status(s2_time, session_best_s2, s2_delta),
                ),
                s3=SectorSplit(
                    time_s=s3_time,
                    delta_s=s3_delta,
                    status=get_status(s3_time, session_best_s3, s3_delta),
                ),
                lap_time_s=lap_time,
                lap_delta_s=lap_delta,
                speed_trap_kmh=round(d["speed_trap_kmh"], 1),
            )
        )

    # Sort rows by position ascending
    rows.sort(key=lambda r: r.position)

    return PaceDeltaResponse(
        status="success",
        year=year,
        event=event,
        session=session,
        reference_driver=ref_row["driver_code"],
        lap_number=lap_number,
        drivers=rows,
        session_best_s1=round(session_best_s1, 3),
        session_best_s2=round(session_best_s2, 3),
        session_best_s3=round(session_best_s3, 3),
        session_best_lap=round(session_best_lap, 3),
        fallback=fallback,
    )


def compute_pace_delta_matrix(
    year: int = 2024,
    event: str = "Italian Grand Prix",
    session_type: str = "Race",
    reference_driver: str = "LEC",
    lap_number: Optional[int] = None,
) -> PaceDeltaResponse:
    """Compute sector pace splits and deltas across all top drivers."""
    target_lap = lap_number or 18

    try:
        from tools.fastf1_helper import get_session
        session = get_session(year, event, session_type)
        if session is None:
            raise ValueError("FastF1 session is None")

        # Defensive access to session.laps (guard against DataNotLoadedError)
        laps = getattr(session, "laps", None)
        if laps is None or len(laps) == 0:
            raise ValueError("No laps loaded in session")

        # If live laps available, process top drivers
        # Extract per-driver sector times for the requested lap
        lap_data = laps[laps["LapNumber"] == target_lap]
        if lap_data is None or len(lap_data) == 0:
            raise ValueError(f"No telemetry laps available for lap {target_lap}")

        extracted = []
        for _, row in lap_data.iterrows():
            d_code = str(row.get("Driver", ""))
            s1 = row.get("Sector1Time")
            s2 = row.get("Sector2Time")
            s3 = row.get("Sector3Time")
            if not s1 or not s2 or not s3:
                continue

            extracted.append({
                "driver_code": d_code,
                "driver_name": str(row.get("Driver", d_code)),
                "team": str(row.get("Team", "F1 Constructor")),
                "team_color": "#38BDF8",
                "position": int(row.get("Position", 1)),
                "compound": str(row.get("Compound", "MEDIUM")),
                "tyre_age_laps": int(row.get("TyreLife", 10)),
                "s1_time": s1.total_seconds(),
                "s2_time": s2.total_seconds(),
                "s3_time": s3.total_seconds(),
                "speed_trap_kmh": float(row.get("SpeedI1", 335.0) or 335.0),
            })

        if len(extracted) >= 3:
            return _build_pace_matrix_from_raw(
                year=year,
                event=event,
                session=session_type,
                reference_driver=reference_driver,
                lap_number=target_lap,
                raw_drivers=extracted,
                fallback=False,
            )

    except Exception as exc:
        _logger.warning("FastF1 pace delta extraction falling back to mock: %s", exc)

    # Return deterministic, high-fidelity fallback fixture
    return _build_pace_matrix_from_raw(
        year=year,
        event=event,
        session=session_type,
        reference_driver=reference_driver,
        lap_number=target_lap,
        raw_drivers=_SAMPLE_DRIVERS_TELEMETRY,
        fallback=True,
    )
