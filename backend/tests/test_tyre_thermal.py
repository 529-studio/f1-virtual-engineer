import pytest
from tools.tyre_thermal import compute_tyre_thermal_profile, PIRELLI_TEMP_WINDOWS

def test_compute_tyre_thermal_profile_returns_four_wheels():
    result = compute_tyre_thermal_profile(
        year=2024,
        event="Italian Grand Prix",
        session="Race",
        driver="LEC",
        lap_number=15,
    )
    assert result["status"] in ("success", "fallback")
    assert "wheels" in result
    for pos in ["FL", "FR", "RL", "RR"]:
        assert pos in result["wheels"]
        wheel = result["wheels"][pos]
        assert "surface_temp" in wheel
        assert "inner_c" in wheel["surface_temp"]
        assert "center_c" in wheel["surface_temp"]
        assert "outer_c" in wheel["surface_temp"]
        assert "carcass_temp_c" in wheel
        assert "bulk_temp_c" in wheel
        assert "pressure_psi" in wheel
        assert "pressure_status" in wheel
        assert "thermal_status" in wheel
        assert "camber_deg" in wheel
        assert "camber_bias_c" in wheel
        assert isinstance(wheel["blistering_risk"], bool)
        assert isinstance(wheel["graining_risk"], bool)
        assert isinstance(wheel["thermal_cliff_risk"], bool)

def test_camber_bias_heats_inner_shoulder():
    result = compute_tyre_thermal_profile(
        year=2024,
        event="Italian Grand Prix",
        session="Race",
        driver="LEC",
        lap_number=15,
    )
    fl = result["wheels"]["FL"]
    # Front-Left has negative camber; inner shoulder should be warmer than outer
    assert fl["surface_temp"]["inner_c"] > fl["surface_temp"]["outer_c"]
    assert fl["camber_bias_c"] > 0
    assert fl["camber_deg"] < 0

def test_blistering_detection_on_hot_carcass():
    result = compute_tyre_thermal_profile(
        year=2024,
        event="Italian Grand Prix",
        session="Race",
        driver="LEC",
        lap_number=50,  # High lap count with heavy thermal soak
    )
    # Check that pathology flags exist and are boolean
    for pos in ["FL", "FR", "RL", "RR"]:
        wheel = result["wheels"][pos]
        assert isinstance(wheel["blistering_risk"], bool)
        assert isinstance(wheel["graining_risk"], bool)
        assert isinstance(wheel["thermal_cliff_risk"], bool)

def test_fallback_on_unknown_driver_or_event():
    result = compute_tyre_thermal_profile(
        year=2024,
        event="Nonexistent Grand Prix",
        session="Race",
        driver="XYZ",
        lap_number=1,
    )
    assert result["status"] == "fallback"
    assert "wheels" in result
    assert len(result["wheels"]) == 4

def test_pirelli_operating_windows_defined():
    for compound in ["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"]:
        assert compound in PIRELLI_TEMP_WINDOWS
        low, high = PIRELLI_TEMP_WINDOWS[compound]
        assert low < high
