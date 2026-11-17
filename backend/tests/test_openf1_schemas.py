import pytest
from pydantic import ValidationError

from app.schemas.live import (
    LiveDriverSnapshot,
    LiveRaceTick,
    LiveSessionMeta,
    load_replay_fixture,
)


def test_live_schemas_and_fixture_loading():
    fixture = load_replay_fixture()
    assert fixture["session_key"] == 11412
    assert "sample_tick" in fixture

    session_meta = LiveSessionMeta.model_validate(fixture["session_meta"])
    assert session_meta.session_key == 11412
    assert session_meta.circuit_short_name == "Interlagos"
    assert session_meta.country_name == "Brazil"
    assert session_meta.source == "replay"

    tick = LiveRaceTick.model_validate(fixture["sample_tick"])
    assert tick.session_key == 11412
    assert tick.source == "replay"
    assert tick.safety_car_status in ("NONE", "VSC", "SC", "RED_FLAG")
    assert len(tick.drivers) >= 10

    p1 = tick.drivers[0]
    assert p1.position == 1
    assert p1.driver_code == "VER"
    assert p1.tyre_compound in ("SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET", "UNKNOWN")
    assert p1.tyre_age >= 0
    assert p1.coordinates is not None
    assert len(p1.coordinates) == 2


def test_live_driver_snapshot_validation():
    # Valid driver snapshot
    driver = LiveDriverSnapshot(
        position=1,
        driver_number=1,
        driver_code="VER",
        team_name="Red Bull Racing",
        interval_to_ahead=0.0,
        gap_to_leader=0.0,
        last_lap_time=72.451,
        current_stint=2,
        tyre_compound="HARD",
        tyre_age=14,
        pit_stops=1,
        in_pit=False,
        coordinates=(123.4, -567.8),
    )
    assert driver.driver_code == "VER"
    assert driver.in_pit is False

    # Invalid tyre compound
    with pytest.raises(ValidationError):
        LiveDriverSnapshot(
            position=1,
            driver_number=1,
            driver_code="VER",
            team_name="Red Bull Racing",
            interval_to_ahead=0.0,
            gap_to_leader=0.0,
            last_lap_time=72.451,
            current_stint=1,
            tyre_compound="SUPER_HYPER_SOFT",  # invalid
            tyre_age=5,
            pit_stops=0,
            in_pit=False,
        )


def test_live_race_tick_validation():
    tick_data = {
        "session_key": 11412,
        "polled_at": "2026-11-08T17:45:00Z",
        "delay_seconds": 3.2,
        "stale": False,
        "source": "openf1",
        "safety_car_status": "NONE",
        "leader_lap": 42,
        "drivers": [
            {
                "position": 1,
                "driver_number=1": 1,
                "driver_number": 1,
                "driver_code": "VER",
                "team_name": "Red Bull Racing",
                "interval_to_ahead": 0.0,
                "gap_to_leader": 0.0,
                "last_lap_time": 73.12,
                "current_stint": 1,
                "tyre_compound": "MEDIUM",
                "tyre_age": 12,
                "pit_stops": 0,
                "in_pit": False,
                "coordinates": (100.0, 200.0),
            }
        ],
    }
    tick = LiveRaceTick.model_validate(tick_data)
    assert tick.session_key == 11412
    assert tick.leader_lap == 42
    assert not tick.stale
