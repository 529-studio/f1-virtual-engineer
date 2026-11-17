import json
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_live_session_replay_mode(monkeypatch):
    monkeypatch.setenv("LIVE_DATA_SOURCE", "replay")
    res = client.get("/live/session")
    assert res.status_code == 200
    data = res.json()
    assert data["session_key"] == 11412
    assert data["circuit_short_name"] == "Interlagos"
    assert data["source"] == "replay"


def test_live_session_disabled_mode(monkeypatch):
    monkeypatch.setenv("LIVE_DATA_SOURCE", "none")
    res = client.get("/live/session")
    assert res.status_code == 204


def test_live_stream_sse_initial_tick(monkeypatch):
    monkeypatch.setenv("LIVE_DATA_SOURCE", "replay")
    with client.stream("GET", "/live/stream") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        # Read first line / event
        lines = []
        for line in response.iter_lines():
            if line:
                lines.append(line)
            if len(lines) >= 2:
                break

        full_stream_prefix = "\n".join(lines)
        assert "event: tick" in full_stream_prefix or "data:" in full_stream_prefix
