import unittest
from unittest.mock import patch

from tools.strategy_helper import predict_tyre_wear


class StrategyHelperTests(unittest.TestCase):
    @patch("tools.strategy_helper.extract_tyre_wear_features")
    def test_predict_tyre_wear_success(self, mock_extract):
        mock_extract.return_value = {
            "driver": "HAM",
            "year": 2023,
            "event": "Japanese Grand Prix",
            "session_type": "R",
            "fallback": False,
            "fallback_reason": None,
            "features": {
                "lap_count": 20,
                "stint_count": 2,
                "lap_time_decay_seconds_per_lap": 0.22,
                "stint_progress_ratio": 0.6,
                "avg_track_temp_c": 34.0,
                "track_temp_trend_c_per_lap": 0.2,
                "temperature_missing": False,
            },
        }
        result = predict_tyre_wear(2023, "Japanese Grand Prix", "R", "HAM")

        self.assertFalse(result["fallback"])
        self.assertGreaterEqual(result["prediction"]["degradation_rate_seconds_per_lap"], 0.0)
        self.assertIn(result["prediction"]["confidence_band"], {"high", "medium", "low"})
        self.assertEqual(len(result["prediction"]["expected_performance_drop_window_laps"]), 2)

    @patch("tools.strategy_helper.extract_tyre_wear_features")
    def test_predict_tyre_wear_handles_fallback(self, mock_extract):
        mock_extract.return_value = {
            "driver": "HAM",
            "year": 2023,
            "event": "Japanese Grand Prix",
            "session_type": "R",
            "fallback": True,
            "fallback_reason": "No laps found",
            "features": {
                "lap_count": 0,
                "stint_count": 0,
                "lap_time_decay_seconds_per_lap": 0.0,
                "stint_progress_ratio": 0.0,
                "avg_track_temp_c": None,
                "track_temp_trend_c_per_lap": None,
                "temperature_missing": True,
            },
        }
        result = predict_tyre_wear(2023, "Japanese Grand Prix", "R", "HAM")

        self.assertTrue(result["fallback"])
        self.assertEqual(result["prediction"]["confidence_band"], "low")


if __name__ == "__main__":
    unittest.main()
