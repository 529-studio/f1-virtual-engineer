from __future__ import annotations

import logging
from typing import Sequence

logger = logging.getLogger(__name__)

# Nominal race fuel load in modern Formula 1 (FIA Technical Regulations cap: 110 kg)
NOMINAL_INITIAL_FUEL_KG = 105.0

# Circuit-specific fuel sensitivity in seconds per kilogram (s/kg).
# Heavier fuel loads cost more lap time on high-speed / traction-heavy circuits.
CIRCUIT_FUEL_SENSITIVITY: dict[str, float] = {
    "monza": 0.032,
    "italian grand prix": 0.032,
    "spa": 0.037,
    "spa-francorchamps": 0.037,
    "belgian grand prix": 0.037,
    "silverstone": 0.038,
    "british grand prix": 0.038,
    "monaco": 0.024,
    "monaco grand prix": 0.024,
    "suzuka": 0.036,
    "japanese grand prix": 0.036,
    "bahrain": 0.034,
    "bahrain grand prix": 0.034,
    "melbourne": 0.033,
    "australian grand prix": 0.033,
    "albert park": 0.033,
    "austria": 0.030,
    "austrian grand prix": 0.030,
    "red bull ring": 0.030,
    "interlagos": 0.034,
    "são paulo grand prix": 0.034,
    "sao paulo grand prix": 0.034,
    "brazilian grand prix": 0.034,
    "abu dhabi": 0.035,
    "abu dhabi grand prix": 0.035,
    "yas marina": 0.035,
    "singapore": 0.031,
    "singapore grand prix": 0.031,
    "marina bay": 0.031,
    "cota": 0.036,
    "united states grand prix": 0.036,
    "circuit of the americas": 0.036,
    "mexico": 0.032,
    "mexico city grand prix": 0.032,
    "hungary": 0.033,
    "hungarian grand prix": 0.033,
    "hungaroring": 0.033,
    "zandvoort": 0.034,
    "dutch grand prix": 0.034,
    "las vegas": 0.033,
    "las vegas grand prix": 0.033,
    "qatar": 0.035,
    "qatar grand prix": 0.035,
    "losail": 0.035,
    "jeddah": 0.034,
    "saudi arabian grand prix": 0.034,
    "miami": 0.034,
    "miami grand prix": 0.034,
    "shanghai": 0.035,
    "chinese grand prix": 0.035,
    "baku": 0.034,
    "azerbaijan grand prix": 0.034,
    "barcelona": 0.036,
    "spanish grand prix": 0.036,
    "catalunya": 0.036,
    "canada": 0.032,
    "canadian grand prix": 0.032,
    "montreal": 0.032,
    "imola": 0.033,
    "emilia romagna grand prix": 0.033,
}

DEFAULT_FUEL_SENSITIVITY_S_PER_KG = 0.033


def get_fuel_sensitivity(event_name: str | None) -> float:
    """Lookup the circuit-specific fuel time sensitivity factor (s/kg)."""
    if not event_name:
        return DEFAULT_FUEL_SENSITIVITY_S_PER_KG
    key = event_name.lower().strip()
    return CIRCUIT_FUEL_SENSITIVITY.get(key, DEFAULT_FUEL_SENSITIVITY_S_PER_KG)


def calculate_fuel_burn_per_lap(
    total_laps: int,
    initial_fuel_kg: float = NOMINAL_INITIAL_FUEL_KG,
) -> float:
    """Calculate the average nominal fuel mass burned per lap in kg."""
    valid_laps = max(int(total_laps), 1)
    return round(float(initial_fuel_kg) / valid_laps, 4)


def calculate_fuel_time_delta_per_lap(
    total_laps: int,
    event_name: str | None,
    initial_fuel_kg: float = NOMINAL_INITIAL_FUEL_KG,
) -> float:
    """
    Calculate the expected lap time benefit per lap from fuel mass loss (in seconds).

    As the car loses weight each lap, it gains lap time.
    delta_t_fuel = burn_rate_kg_per_lap * sensitivity_s_per_kg
    """
    burn_rate = calculate_fuel_burn_per_lap(total_laps, initial_fuel_kg)
    sensitivity = get_fuel_sensitivity(event_name)
    return round(burn_rate * sensitivity, 4)


def apply_fuel_correction_to_laptimes(
    lap_times_seconds: Sequence[float],
    lap_numbers: Sequence[int],
    fuel_delta_per_lap: float,
) -> list[float]:
    """
    Correct raw lap times to neutralize the lap-time benefit of fuel consumption.

    t_corrected(L) = t_raw(L) + (L - L_0) * delta_t_fuel

    Adding back the fuel advantage yields the true mechanical / tyre degradation curve.
    """
    if not lap_times_seconds or not lap_numbers or len(lap_times_seconds) != len(lap_numbers):
        return list(lap_times_seconds)

    first_lap = min(lap_numbers)
    corrected: list[float] = []
    for t, lap in zip(lap_times_seconds, lap_numbers):
        delta = (lap - first_lap) * fuel_delta_per_lap
        corrected.append(round(t + delta, 4))
    return corrected


def calculate_fuel_corrected_decay_rate(
    lap_times_seconds: Sequence[float],
    lap_numbers: Sequence[int],
    fuel_delta_per_lap: float,
) -> float:
    """
    Fit a linear regression slope over fuel-corrected lap times to determine the
    true tyre degradation rate (seconds per lap).
    """
    if len(lap_times_seconds) <= 1 or len(lap_numbers) <= 1:
        return 0.0

    corrected = apply_fuel_correction_to_laptimes(
        lap_times_seconds, lap_numbers, fuel_delta_per_lap
    )

    n = len(corrected)
    x = list(lap_numbers)
    y = corrected

    x_mean = sum(x) / n
    y_mean = sum(y) / n

    numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return 0.0

    slope = numerator / denominator
    return max(round(float(slope), 4), 0.0)
