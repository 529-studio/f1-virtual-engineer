"""API endpoint tests for POST /strategy/pit-exit."""

from __future__ import annotations

import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from tests._helpers import reset_rate_limiter
from tools.pit_exit_helper import _clear_cache_for_tests


def _sample_projection_result():
    return {
        "as_of_lap": 19,
        "total_laps": 53,
        "current_position": 4,
        "projected_position": 6,
        "position_delta": -2,
        "position_is_contested": False,
        "car_ahead": {
            "driver_code": "LAW",
            "gap_s": 1.2,
            "is_lapped": False,
            "has_pitted": False,
            "pace_confidence": "high",
        },
        "car_behind": {
            "driver_code": "GAS",
            "gap_s": -2.1,
            "is_lapped": False,
            "has_pitted": True,
            "pace_confidence": "high",
        },
        "traffic_state": "TRAFFIC",
        "pit_loss_s": 22.0,
        "pit_loss_source": "per-track table: Italian Grand Prix",
        "confidence": "HIGH",
        "confidence_reasons": [">= 3 green laps of pace data for driver and neighbours, no SC/VSC in window."],
        "assumptions": ["rivals hold current pace", "no safety car during the stop"],
        "field": [
            {
                "driver_code": "LAW",
                "gap_s": 1.2,
                "is_lapped": False,
                "has_pitted": False,
                "pace_confidence": "high",
            },
            {
                "driver_code": "GAS",
                "gap_s": -2.1,
                "is_lapped": False,
                "has_pitted": True,
                "pace_confidence": "high",
            },
        ],
        "notes": [],
        "fallback": False,
        "fallback_reason": None,
    }


class PitExitApiTests(unittest.TestCase):
    def setUp(self):
        reset_rate_limiter()
        _clear_cache_for_tests()
        self.client = TestClient(app)

    @patch("tools.pit_exit_helper.compute_pit_exit")
    def test_pit_exit_success_200(self, mock_compute):
        mock_compute.return_value = _sample_projection_result()

        payload = {
            "year": 2024,
            "event": "Italian Grand Prix",
            "session": "R",
            "driver": "VER",
            "lap": 19,
            "include_rivals": 5,
        }
        res = self.client.post("/strategy/pit-exit", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["as_of_lap"], 19)
        self.assertEqual(data["projected_position"], 6)
        self.assertEqual(data["car_ahead"]["driver_code"], "LAW")
        self.assertEqual(data["car_behind"]["driver_code"], "GAS")
        self.assertFalse(data["fallback"])

    def test_pit_exit_rejects_qualifying_422(self):
        payload = {
            "year": 2024,
            "event": "Italian Grand Prix",
            "session": "Q",
            "driver": "VER",
            "lap": 19,
        }
        res = self.client.post("/strategy/pit-exit", json=payload)
        self.assertEqual(res.status_code, 422)

    def test_pit_exit_rejects_practice_422(self):
        payload = {
            "year": 2024,
            "event": "Italian Grand Prix",
            "session": "FP1",
            "driver": "VER",
            "lap": 1,
        }
        res = self.client.post("/strategy/pit-exit", json=payload)
        self.assertEqual(res.status_code, 422)

    def test_pit_exit_rejects_invalid_lap_422(self):
        payload = {
            "year": 2024,
            "event": "Italian Grand Prix",
            "session": "R",
            "driver": "VER",
            "lap": 0,
        }
        res = self.client.post("/strategy/pit-exit", json=payload)
        self.assertEqual(res.status_code, 422)

    @patch("tools.pit_exit_helper.compute_pit_exit")
    def test_pit_exit_caches_good_results(self, mock_compute):
        mock_compute.return_value = _sample_projection_result()

        payload = {
            "year": 2024,
            "event": "Italian Grand Prix",
            "session": "R",
            "driver": "VER",
            "lap": 19,
        }
        res1 = self.client.post("/strategy/pit-exit", json=payload)
        self.assertEqual(res1.status_code, 200)
        res2 = self.client.post("/strategy/pit-exit", json=payload)
        self.assertEqual(res2.status_code, 200)

        # Should only compute once due to L1 cache
        self.assertEqual(mock_compute.call_count, 1)

    @patch("tools.pit_exit_helper.compute_pit_exit")
    def test_pit_exit_does_not_cache_fallback(self, mock_compute):
        fallback_res = _sample_projection_result()
        fallback_res["fallback"] = True
        fallback_res["fallback_reason"] = "lap 99 not present"
        mock_compute.return_value = fallback_res

        payload = {
            "year": 2024,
            "event": "Italian Grand Prix",
            "session": "R",
            "driver": "VER",
            "lap": 99,
        }
        res1 = self.client.post("/strategy/pit-exit", json=payload)
        self.assertEqual(res1.status_code, 200)
        res2 = self.client.post("/strategy/pit-exit", json=payload)
        self.assertEqual(res2.status_code, 200)

        # compute must be called both times because fallback is not cached
        self.assertEqual(mock_compute.call_count, 2)

    def test_pit_exit_in_openapi_schema(self):
        schema = app.openapi()
        self.assertIn("/strategy/pit-exit", schema["paths"])
        op = schema["paths them" if "paths them" in schema else "paths"]["/strategy/pit-exit"]["post"]
        self.assertEqual(op["summary"], "Predict pit exit position and immediate rivals on track")


if __name__ == "__main__":
    unittest.main()
