"""Unit and API Integration Tests for Pirelli Tyre Degradation Model."""

from fastapi.testclient import TestClient
from app.main import app
from tools.tyre_degradation_model import compute_tyre_degradation_profile

client = TestClient(app)


def test_compute_tyre_degradation_profile_compounds():
    """Verify quadratic degradation wear and cliff points for different compounds."""
    # Hard compound
    hard_res = compute_tyre_degradation_profile(
        year=2024,
        event="Italian Grand Prix",
        driver="LEC",
        compound="HARD",
        current_stint_laps=18,
    )
    assert hard_res.status == "success"
    assert hard_res.compound == "HARD"
    assert hard_res.projected_cliff_lap > 30
    assert len(hard_res.trajectory) == 48
    assert hard_res.pit_window_start_lap < hard_res.pit_window_end_lap

    # Soft compound should have earlier cliff than hard
    soft_res = compute_tyre_degradation_profile(
        year=2024,
        event="Italian Grand Prix",
        driver="LEC",
        compound="SOFT",
        current_stint_laps=8,
    )
    assert soft_res.compound == "SOFT"
    assert soft_res.projected_cliff_lap < hard_res.projected_cliff_lap
    assert len(soft_res.trajectory) == 25


def test_get_tyre_degradation_api_endpoint():
    """Test GET /telemetry/tyre-degradation REST endpoint."""
    response = client.get("/telemetry/tyre-degradation?year=2024&event=Italian%20Grand%20Prix&driver=LEC&compound=HARD&current_stint_laps=18")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["driver"] == "LEC"
    assert data["compound"] == "HARD"
    assert "projected_cliff_lap" in data
    assert "trajectory" in data
    assert len(data["trajectory"]) > 0
