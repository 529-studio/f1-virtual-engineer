import pytest
from tools.race_control_helper import (
    get_race_control_feed,
    deliberate_steward_investigation,
)


def test_get_race_control_feed_singapore_2023():
    feed = get_race_control_feed(year=2023, event="Singapore Grand Prix", session="Race")
    assert feed["status"] in ("success", "fallback")
    assert feed["total_incidents"] > 0
    assert len(feed["items"]) > 0

    first = feed["items"][0]
    assert "id" in first
    assert "lap" in first
    assert "category" in first
    assert "status" in first
    assert "message" in first
    assert "description" in first
    assert "drivers_involved" in first


def test_deliberate_steward_investigation():
    result = deliberate_steward_investigation(
        incident_id="SGP_2023_R_INC_05",
        year=2023,
        event="Singapore Grand Prix",
        session="Race",
    )
    assert result["status"] in ("success", "fallback")
    assert "incident_id" in result
    assert "regulation_article" in result
    assert "regulation_title" in result
    assert "regulation_snippet" in result
    assert "team_defense_argument" in result
    assert "steward_prosecution_argument" in result
    assert "predicted_verdict" in result
    assert "confidence_pct" in result
    assert "penalty_breakdown" in result
    assert len(result["penalty_breakdown"]) > 0

    total_pct = sum(p["probability_pct"] for p in result["penalty_breakdown"])
    assert total_pct == 100


def test_race_control_feed_fallback_on_unknown_event(monkeypatch):
    import fastf1
    def mock_get_session(*args, **kwargs):
        raise ValueError("Simulated network timeout")
    monkeypatch.setattr(fastf1, "get_session", mock_get_session)

    feed = get_race_control_feed(year=2020, event="Nonexistent Grand Prix", session="Race")
    assert feed["status"] == "fallback"
    assert "items" in feed
    assert isinstance(feed["items"], list)
