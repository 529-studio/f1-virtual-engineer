"""Tests for DRS Zone Efficiency & Top Speed Trap Optimizer (#96)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from tools.drs_optimizer import compute_drs_efficiency


def _make_mock_drs_session():
    session = MagicMock()
    laps_df = pd.DataFrame(
        {
            "Driver": ["LEC", "LEC", "PIA", "PIA"],
            "SpeedST": [346.0, 344.0, 339.0, 338.0],
        }
    )

    class _LapsWrapper(pd.DataFrame):
        def pick_fastest(self):
            row = MagicMock()
            spd = np.concatenate([np.full(20, 260.0), np.full(20, 342.0)])
            drs = np.concatenate([np.zeros(20), np.full(20, 12)])
            row.get_car_data.return_value = pd.DataFrame({"Speed": spd, "DRS": drs})
            return row

    orig_getitem = pd.DataFrame.__getitem__

    class _DynamicLaps:
        empty = False
        columns = laps_df.columns

        def __getitem__(self, key):
            return _LapsWrapper(orig_getitem(laps_df, key))

    session.laps = _DynamicLaps()
    return session


def test_drs_wing_trim_physics_monotonicity():
    mock_session = _make_mock_drs_session()
    with patch("tools.drs_optimizer.fastf1.get_session", return_value=mock_session):
        low_drag = compute_drs_efficiency(2024, "Italian Grand Prix", "R", "LEC", "PIA", wing_trim="LOW_DRAG")
        balanced = compute_drs_efficiency(2024, "Italian Grand Prix", "R", "LEC", "PIA", wing_trim="BALANCED")
        high_df = compute_drs_efficiency(2024, "Italian Grand Prix", "R", "LEC", "PIA", wing_trim="HIGH_DOWNFORCE")

    assert low_drag["fallback"] is False
    assert low_drag["speed_trap_primary_kmh"] > balanced["speed_trap_primary_kmh"] > high_df["speed_trap_primary_kmh"]
    assert low_drag["zones"][0]["drs_open_speed_kmh"] > high_df["zones"][0]["drs_open_speed_kmh"]
    assert low_drag["recommended_trim"] == "LOW_DRAG"


def test_drs_unlisted_circuit_fallback_zones():
    with patch("tools.drs_optimizer.fastf1.get_session", side_effect=RuntimeError("Offline unlisted circuit")):
        res = compute_drs_efficiency(2024, "Unknown Street Circuit", "R", "VER", wing_trim="BALANCED")
    assert len(res["zones"]) >= 2
    assert res["avg_drs_gain_kmh"] > 0
    assert 0.0 <= res["aero_efficiency_index"] <= 100.0


def test_drs_vintage_and_missing_column_fail_closed():
    vintage = compute_drs_efficiency(1995, "Italian Grand Prix", "R", "MSC")
    assert vintage["fallback"] is True
    assert vintage["status"] == "error"
    assert len(vintage["zones"]) >= 1

    with patch("tools.drs_optimizer.fastf1.get_session", side_effect=RuntimeError("DataNotLoadedError")):
        err = compute_drs_efficiency(2024, "British Grand Prix", "R", "HAM")
    assert err["fallback"] is True
    assert err["status"] == "error"
    assert len(err["zones"]) >= 2


def test_drs_api_endpoint_and_alias():
    mock_session = _make_mock_drs_session()
    client = TestClient(app)
    with patch("tools.drs_optimizer.fastf1.get_session", return_value=mock_session):
        resp = client.get(
            "/telemetry/drs-efficiency",
            params={
                "year": 2024,
                "event": "Italian Grand Prix",
                "driver": "LEC",
                "compare_driver": "PIA",
                "wing_trim": "LOW_DRAG",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["wing_trim"] == "LOW_DRAG"
        assert len(body["zones"]) == 2

        alias = client.get("/api/telemetry/drs-efficiency", params={"year": 2024, "event": "British Grand Prix"})
        assert alias.status_code == 200
