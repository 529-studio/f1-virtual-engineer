"""Unit and API Integration Tests for Pace Delta Matrix Engine."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from tools.pace_delta import compute_pace_delta_matrix

client = TestClient(app)


def test_compute_pace_delta_matrix_fallback():
    """Verify compute_pace_delta_matrix returns structured response with zero delta for reference driver."""
    res = compute_pace_delta_matrix(
        year=2024,
        event="Italian Grand Prix",
        session_type="Race",
        reference_driver="LEC",
        lap_number=18,
    )
    assert res.status == "success"
    assert res.reference_driver == "LEC"
    assert res.lap_number == 18
    assert len(res.drivers) >= 5

    # Check LEC reference row
    lec_row = next((d for d in res.drivers if d.driver_code == "LEC"), None)
    assert lec_row is not None
    assert lec_row.lap_delta_s == 0.0
    assert lec_row.s1.status == "reference"

    # Verify session best sector calculations
    assert res.session_best_s1 > 0
    assert res.session_best_s2 > 0
    assert res.session_best_s3 > 0
    assert res.session_best_lap > 0


def test_compute_pace_delta_matrix_switch_reference():
    """Verify changing reference driver recalculates deltas properly."""
    res = compute_pace_delta_matrix(
        year=2024,
        event="Italian Grand Prix",
        session_type="Race",
        reference_driver="VER",
        lap_number=18,
    )
    assert res.reference_driver == "VER"
    ver_row = next((d for d in res.drivers if d.driver_code == "VER"), None)
    assert ver_row is not None
    assert ver_row.lap_delta_s == 0.0


def test_get_pace_delta_api_endpoint():
    """Test GET /telemetry/pace-delta REST endpoint."""
    response = client.get("/telemetry/pace-delta?year=2024&event=Italian%20Grand%20Prix&reference_driver=PIA&lap_number=18")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["reference_driver"] == "PIA"
    assert len(data["drivers"]) >= 5
    assert "session_best_s1" in data
