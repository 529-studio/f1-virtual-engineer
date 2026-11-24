import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_race_control_feed_endpoint():
    response = client.get("/api/race-control/feed?year=2023&event=Singapore%20Grand%20Prix&session=Race")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("success", "fallback")
    assert data["year"] == 2023
    assert data["event"] == "Singapore Grand Prix"
    assert data["session"] == "Race"
    assert "items" in data
    assert len(data["items"]) > 0


def test_post_steward_investigation_endpoint():
    response = client.post(
        "/api/race-control/investigate",
        json={
            "incident_id": "SGP_2023_R_INC_05",
            "year": 2023,
            "event": "Singapore Grand Prix",
            "session": "Race",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("success", "fallback")
    assert data["incident_id"] == "SGP_2023_R_INC_05"
    assert "regulation_article" in data
    assert "regulation_snippet" in data
    assert "penalty_breakdown" in data
    assert len(data["penalty_breakdown"]) > 0


def test_post_steward_investigation_missing_id():
    response = client.post(
        "/api/race-control/investigate",
        json={
            "year": 2023,
            "event": "Singapore Grand Prix",
        },
    )
    assert response.status_code == 422
