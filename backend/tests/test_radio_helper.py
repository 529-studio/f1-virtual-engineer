import pytest
from tools.radio_helper import get_team_radio_feed, DRIVER_NUMBER_MAP


def test_driver_number_map_contains_key_drivers():
    assert 55 in DRIVER_NUMBER_MAP
    assert DRIVER_NUMBER_MAP[55]["code"] == "SAI"
    assert DRIVER_NUMBER_MAP[55]["team"] == "Ferrari"
    assert 4 in DRIVER_NUMBER_MAP
    assert DRIVER_NUMBER_MAP[4]["code"] == "NOR"


def test_get_team_radio_feed_returns_fixture_when_offline(monkeypatch):
    # Simulate network failure
    monkeypatch.setattr("tools.radio_helper._fetch_from_openf1", lambda *args, **kwargs: None)
    result = get_team_radio_feed(session_key=9165)
    assert result["status"] in ("success", "fixture_fallback")
    assert result["total_messages"] > 0
    assert len(result["items"]) > 0
    first = result["items"][0]
    assert "recording_url" in first
    assert "transcript" in first
    assert "classification" in first
    assert "urgency" in first


def test_get_team_radio_feed_filters_by_driver(monkeypatch):
    monkeypatch.setattr("tools.radio_helper._fetch_from_openf1", lambda *args, **kwargs: None)
    result = get_team_radio_feed(session_key=9165, driver_number=55)
    assert all(item["driver_number"] == 55 for item in result["items"])
