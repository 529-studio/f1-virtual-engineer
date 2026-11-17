from datetime import datetime, timezone
import pytest

from tools.openf1_helper import (
    fetch_openf1_endpoint,
    get_active_session_meta,
    is_session_window_active,
    normalize_live_snapshot,
)


def test_session_window_guard():
    # Outside window (days before): returns False
    assert is_session_window_active(
        "2026-11-20T00:30:00Z",
        "2026-11-20T01:30:00Z",
        now_utc="2026-11-16T12:00:00Z",
    ) is False

    # 35 minutes before start: returns False (outside 30m window)
    assert is_session_window_active(
        "2026-11-20T00:30:00Z",
        "2026-11-20T01:30:00Z",
        now_utc="2026-11-19T23:54:00Z",
    ) is False

    # 25 minutes before start: returns True (inside 30m window)
    assert is_session_window_active(
        "2026-11-20T00:30:00Z",
        "2026-11-20T01:30:00Z",
        now_utc="2026-11-20T00:05:00Z",
    ) is True

    # During session: returns True
    assert is_session_window_active(
        "2026-11-20T00:30:00Z",
        "2026-11-20T01:30:00Z",
        now_utc="2026-11-20T01:00:00Z",
    ) is True

    # 25 minutes after end: returns True (within 30m after end)
    assert is_session_window_active(
        "2026-11-20T00:30:00Z",
        "2026-11-20T01:30:00Z",
        now_utc="2026-11-20T01:55:00Z",
    ) is True

    # 35 minutes after end: returns False
    assert is_session_window_active(
        "2026-11-20T00:30:00Z",
        "2026-11-20T01:30:00Z",
        now_utc="2026-11-20T02:05:00Z",
    ) is False


def test_get_active_session_meta_replay(monkeypatch):
    monkeypatch.setenv("LIVE_DATA_SOURCE", "replay")
    res = get_active_session_meta()
    assert res["fallback"] is False
    assert res["data"] is not None
    meta = res["data"]
    assert meta["session_key"] == 11412
    assert meta["circuit_short_name"] == "Interlagos"
    assert meta["source"] == "replay"


def test_get_active_session_meta_disabled(monkeypatch):
    monkeypatch.setenv("LIVE_DATA_SOURCE", "none")
    res = get_active_session_meta()
    assert res["fallback"] is False
    assert res["data"] is None


def test_normalize_live_snapshot_replay(monkeypatch):
    monkeypatch.setenv("LIVE_DATA_SOURCE", "replay")
    res = normalize_live_snapshot(session_key=11412)
    assert res["fallback"] is False
    assert res["data"] is not None
    tick = res["data"]
    assert tick["session_key"] == 11412
    assert tick["source"] == "replay"
    assert len(tick["drivers"]) >= 10
    assert tick["drivers"][0]["driver_code"] == "VER"


def test_fetch_openf1_endpoint_resilient_envelope(monkeypatch):
    # Tests that network failure returns fail-closed envelope and does not raise
    def mock_get(*args, **kwargs):
        raise ConnectionError("Network unreachable")

    import httpx
    monkeypatch.setattr(httpx, "get", mock_get)

    res = fetch_openf1_endpoint("sessions", params={"session_key": "latest"})
    assert res["fallback"] is True
    assert "Network unreachable" in res["fallback_reason"]
    assert res["data"] == []


def test_normalize_raw_openf1_payloads():
    from tools.openf1_helper import normalize_openf1_components

    positions = [
        {"driver_number": 1, "position": 1, "date": "2026-11-08T17:42:00Z"},
        {"driver_number": 4, "position": 2, "date": "2026-11-08T17:42:00Z"},
    ]
    intervals = [
        {"driver_number": 1, "gap_to_leader": 0.0, "interval": 0.0},
        {"driver_number": 4, "gap_to_leader": 2.15, "interval": 2.15},
    ]
    drivers = [
        {"driver_number": 1, "name_acronym": "VER", "team_name": "Red Bull Racing"},
        {"driver_number": 4, "name_acronym": "NOR", "team_name": "McLaren"},
    ]
    stints = [
        {"driver_number": 1, "stint_number": 2, "compound": "HARD", "tyre_age_at_start": 0, "laps_in_stint": 15},
        {"driver_number": 4, "stint_number": 2, "compound": "HARD", "tyre_age_at_start": 0, "laps_in_stint": 14},
    ]
    laps = [
        {"driver_number": 1, "lap_number": 35, "lap_duration": 73.412, "is_pit_out_lap": False},
        {"driver_number": 4, "lap_number": 35, "lap_duration": 73.189, "is_pit_out_lap": False},
    ]
    locations = [
        {"driver_number": 1, "x": -452.1, "y": 120.4},
        {"driver_number": 4, "x": -460.5, "y": 115.2},
    ]
    race_control = [
        {"category": "SafetyCar", "flag": "CLEAR", "message": "SAFETY CAR IN THIS LAP"}
    ]

    tick = normalize_openf1_components(
        session_key=11412,
        positions=positions,
        intervals=intervals,
        drivers_meta=drivers,
        stints=stints,
        laps=laps,
        locations=locations,
        race_control=race_control,
        polled_at="2026-11-08T17:42:15Z",
    )

    assert tick["session_key"] == 11412
    assert tick["safety_car_status"] == "NONE"
    assert tick["leader_lap"] == 35
    assert len(tick["drivers"]) == 2
    assert tick["drivers"][0]["driver_code"] == "VER"
    assert tick["drivers"][0]["tyre_compound"] == "HARD"
    assert tick["drivers"][0]["tyre_age"] == 15
    assert tick["drivers"][0]["coordinates"] == (-452.1, 120.4)
