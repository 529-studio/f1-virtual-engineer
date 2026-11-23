import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_tyre_thermal_endpoint():
    response = client.get(
        "/api/telemetry/tyre-thermal?year=2024&event=Italian%20Grand%20Prix&session_type=Race&driver=LEC&lap_number=15"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("success", "fallback")
    assert data["year"] == 2024
    assert data["event"] == "Italian Grand Prix"
    assert data["session"] == "Race"
    assert data["driver"] == "LEC"
    assert data["lap_number"] == 15
    assert "wheels" in data
    assert "FL" in data["wheels"]
    assert "FR" in data["wheels"]
    assert "RL" in data["wheels"]
    assert "RR" in data["wheels"]
    
    fl = data["wheels"]["FL"]
    assert fl["position"] == "FL"
    assert "surface_temp" in fl
    assert "inner_c" in fl["surface_temp"]
    assert "center_c" in fl["surface_temp"]
    assert "outer_c" in fl["surface_temp"]
    assert "carcass_temp_c" in fl
    assert "bulk_temp_c" in fl
    assert "pressure_status" in fl
    assert "thermal_status" in fl
    assert "critical_alerts" in data

def test_get_tyre_thermal_validation():
    # Invalid year
    response = client.get(
        "/api/telemetry/tyre-thermal?year=1940&event=Unknown&session_type=Race&driver=LEC"
    )
    assert response.status_code in (400, 404, 422)
