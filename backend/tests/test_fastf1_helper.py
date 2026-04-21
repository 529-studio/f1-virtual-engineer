import unittest
from unittest.mock import MagicMock, patch

import pandas as pd

from tools.fastf1_helper import get_session_telemetry_summary


class FastF1HelperTests(unittest.TestCase):
    @patch("tools.fastf1_helper.fastf1.get_session")
    def test_get_session_telemetry_summary_success(self, mock_get_session):
        telemetry_df = pd.DataFrame(
            {
                "Speed": [250.0, 260.0, 255.0],
                "nGear": [7, 8, 7],
                "RPM": [12000, 12500, 12300],
            }
        )

        mock_lap = MagicMock()
        mock_lap.get_telemetry.return_value = telemetry_df

        mock_laps = MagicMock()
        mock_laps.empty = False
        mock_laps.pick_fastest.return_value = mock_lap

        mock_session = MagicMock()
        mock_session.laps.pick_driver.return_value = mock_laps
        mock_get_session.return_value = mock_session

        result = get_session_telemetry_summary(2023, "Japanese Grand Prix", "R", "ham")

        self.assertFalse(result["fallback"])
        self.assertEqual(result["driver"], "HAM")
        self.assertEqual(result["sample_points"], 3)
        self.assertEqual(result["speed"]["unit"], "km/h")
        self.assertEqual(result["gear"]["unit"], "gear")
        self.assertEqual(result["rpm"]["unit"], "rpm")

    @patch("tools.fastf1_helper.fastf1.get_session")
    def test_get_session_telemetry_summary_fallback_when_no_laps(self, mock_get_session):
        mock_laps = MagicMock()
        mock_laps.empty = True

        mock_session = MagicMock()
        mock_session.laps.pick_driver.return_value = mock_laps
        mock_get_session.return_value = mock_session

        result = get_session_telemetry_summary(2023, "Japanese Grand Prix", "R", "HAM")

        self.assertTrue(result["fallback"])
        self.assertEqual(result["sample_points"], 0)
        self.assertEqual(result["speed"]["avg"], 0.0)


if __name__ == "__main__":
    unittest.main()
