import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_radio_feed_endpoint():
    response = client.get("/api/radio/feed?session_key=9165")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("success", "fixture_fallback")
    assert "items" in data
    assert len(data["items"]) > 0


def test_get_radio_feed_driver_filter():
    response = client.get("/api/radio/feed?session_key=9165&driver_number=55")
    assert response.status_code == 200
    data = response.json()
    assert all(item["driver_code"] == "SAI" for item in data["items"])


def test_post_radio_analyze_urgency_and_trigger(monkeypatch):
    monkeypatch.setattr(
        "agents.radio_interpreter.generate_structured",
        lambda *args, **kwargs: {
            "classification": "strategy_request",
            "severity": "high",
            "trigger_phrase": "on purpose",
            "urgency": 4,
            "speaker": "driver",
        },
    )
    payload = {
        "transcript": "Yeah it is on purpose to give him DRS",
        "driver": "SAI",
    }
    response = client.post("/api/radio/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] == "strategy_request"
    assert "urgency" in data
    assert data["urgency"] == 4
    assert data["speaker"] == "driver"
    assert data["trigger_phrase"] == "on purpose"
