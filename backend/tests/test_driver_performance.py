"""Tests for 6-Axis Driver Telemetry Performance Radar tool & router (#95)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from tools.driver_performance import compute_driver_performance


def _make_mock_session():
    session = MagicMock()
    lec_times = pd.to_timedelta([82.1, 82.3, 82.4, 82.5, 82.6, 82.7], unit="s")
    pia_times = pd.to_timedelta([82.5, 82.8, 83.0, 83.3, 83.6, 83.9], unit="s")
    laps_df = pd.DataFrame(
        {
            "Driver": ["LEC"] * 6 + ["PIA"] * 6,
            "LapTime": list(lec_times) + list(pia_times),
            "SpeedST": [344.0, 342.0, 345.0, 341.0, 343.0, 344.0, 338.0, 337.0, 339.0, 336.0, 338.0, 337.0],
        }
    )

    class _LapsWrapper(pd.DataFrame):
        def pick_fastest(self):
            row = MagicMock()
            spd = np.linspace(82.0, 345.0, 40)
            thr = np.where(spd > 200.0, 100.0, 25.0)
            brk = np.where(spd < 130.0, 100.0, 0.0)
            row.get_car_data.return_value = pd.DataFrame(
                {"Speed": spd, "Throttle": thr, "Brake": brk}
            )
            return row

    wrapped = _LapsWrapper(laps_df)
    # Wrap slice indexing to retain pick_fastest
    orig_getitem = pd.DataFrame.__getitem__

    class _DynamicLaps:
        empty = False
        columns = laps_df.columns

        def __getitem__(self, key):
            sub = orig_getitem(laps_df, key)
            return _LapsWrapper(sub)

    session.laps = _DynamicLaps()
    return session


def test_compute_driver_performance_session_relative_and_historic():
    mock_session = _make_mock_session()
    with patch("tools.driver_performance.fastf1.get_session", return_value=mock_session):
        rel = compute_driver_performance(
            year=2024,
            event="Italian Grand Prix",
            session_type="R",
            driver="LEC",
            compare_driver="PIA",
            mode="session_relative",
        )
        hist = compute_driver_performance(
            year=2024,
            event="Italian Grand Prix",
            session_type="R",
            driver="LEC",
            compare_driver="PIA",
            mode="historic_benchmark",
        )

    assert rel["status"] == "success"
    assert rel["fallback"] is False
    assert rel["mode"] == "session_relative"
    assert rel["primary"]["driver_code"] == "LEC"
    assert rel["compare"]["driver_code"] == "PIA"
    assert len(rel["primary"]["axes"]) == 6
    assert len(rel["compare"]["axes"]) == 6
    for ax in rel["primary"]["axes"] + rel["compare"]["axes"]:
        assert 0.0 <= ax["score"] <= 100.0

    # Normalization mode toggle measurably shifts axis scores
    rel_scores = [a["score"] for a in rel["primary"]["axes"]]
    hist_scores = [a["score"] for a in hist["primary"]["axes"]]
    assert rel_scores != hist_scores


def test_compute_driver_performance_dedupes_identical_compare_driver():
    mock_session = _make_mock_session()
    with patch("tools.driver_performance.fastf1.get_session", return_value=mock_session):
        res = compute_driver_performance(
            year=2024,
            event="Italian Grand Prix",
            session_type="R",
            driver="LEC",
            compare_driver="LEC",
            mode="session_relative",
        )
    assert res["compare"] is None


def test_compute_driver_performance_vintage_fallback():
    res = compute_driver_performance(
        year=1999,
        event="Italian Grand Prix",
        session_type="R",
        driver="SCH",
        compare_driver="HAK",
        mode="session_relative",
    )
    assert res["fallback"] is True
    assert res["status"] == "error"
    assert "2018+" in (res["fallback_reason"] or "")
    assert len(res["primary"]["axes"]) == 6
    assert len(res["compare"]["axes"]) == 6


def test_compute_driver_performance_fastf1_exception_fail_closed():
    with patch("tools.driver_performance.fastf1.get_session", side_effect=RuntimeError("FastF1 unavailable")):
        res = compute_driver_performance(
            year=2024,
            event="Italian Grand Prix",
            session_type="R",
            driver="LEC",
            compare_driver=None,
            mode="historic_benchmark",
        )
    assert res["fallback"] is True
    assert res["status"] == "error"
    assert res["compare"] is None
    assert len(res["primary"]["axes"]) == 6


def test_driver_performance_api_endpoint():
    mock_session = _make_mock_session()
    client = TestClient(app)
    with patch("tools.driver_performance.fastf1.get_session", return_value=mock_session):
        resp = client.get(
            "/telemetry/driver-performance",
            params={
                "year": 2024,
                "event": "Italian Grand Prix",
                "session": "R",
                "driver": "LEC",
                "compare_driver": "PIA",
                "mode": "session_relative",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert body["primary"]["driver_code"] == "LEC"
        assert body["compare"]["driver_code"] == "PIA"
        assert len(body["primary"]["axes"]) == 6

        alias_resp = client.get(
            "/api/telemetry/driver-performance",
            params={"year": 2024, "event": "Italian Grand Prix", "driver": "LEC"},
        )
        assert alias_resp.status_code == 200
