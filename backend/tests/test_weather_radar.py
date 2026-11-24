import unittest
from unittest.mock import MagicMock, patch
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from tools.weather_radar import (
    SLICK_GRIP_THRESHOLD,
    INTER_GRIP_THRESHOLD,
    _calculate_water_film_and_grip,
    _generate_radar_frames,
    get_weather_radar_data,
)


class TestWeatherRadar(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_water_film_and_grip_dynamics(self):
        """Verify that precipitation reduces grip and dry conditions restore grip."""
        # 10 minute sequence: 5 mins dry, 3 mins rain, 2 mins drying
        times = [pd.Timedelta(minutes=i) for i in range(10)]
        rain = [False] * 5 + [True] * 3 + [False] * 2
        df = pd.DataFrame({
            "Time": times,
            "Rainfall": rain,
            "AirTemp": [18.0] * 10,
            "TrackTemp": [32.0] * 10,
            "Humidity": [65.0] * 10,
            "WindSpeed": [4.0] * 10,
            "WindDirection": [220.0] * 10,
        })

        timeline = _calculate_water_film_and_grip(df)
        self.assertEqual(len(timeline), 10)

        # Initial dry grip should be 100%
        self.assertEqual(timeline[0]["track_grip_pct"], 100.0)
        self.assertEqual(timeline[0]["recommended_compound"], "SLICK")

        # After 3 minutes of rain, water film must be > 0 and grip must decay
        rain_sample = timeline[7]
        self.assertGreater(rain_sample["water_film_mm"], 0.0)
        self.assertLess(rain_sample["track_grip_pct"], SLICK_GRIP_THRESHOLD)

        # In drying phase (sample 9), water film should start decreasing
        self.assertLess(timeline[9]["water_film_mm"], timeline[7]["water_film_mm"])

    def test_radar_sweep_forecast_frames(self):
        """Verify generation of 5 forecast frames with wind drift."""
        frames = _generate_radar_frames(
            has_rain=True,
            wind_speed_kmh=24.0,
            wind_dir_deg=90.0,
            base_grip=82.0,
        )
        self.assertEqual(len(frames), 5)
        offsets = [f["time_offset_min"] for f in frames]
        self.assertEqual(offsets, [0, 5, 10, 15, 20])

        for frame in frames:
            self.assertIn("cells", frame)
            self.assertIn("track_impact", frame)
            self.assertIn("projected_grip_pct", frame)
            self.assertGreater(len(frame["cells"]), 0)

    def test_fallback_on_invalid_session(self):
        """Verify fail-closed envelope on non-existent session."""
        result = get_weather_radar_data(1950, "NonExistent GP", "Race")
        self.assertTrue(result["fallback"])
        self.assertIsNotNone(result["fallback_reason"])
        self.assertEqual(result["current_metrics"]["track_grip_pct"], 100.0)
        self.assertEqual(len(result["radar_frames"]), 5)

    @patch("tools.weather_radar.fastf1.get_session")
    def test_crossover_prediction_mock(self, mock_get_session):
        """Verify intermediate compound crossover is correctly identified."""
        mock_session = MagicMock()
        # Mock weather dataframe transitioning to rain
        times = [pd.Timedelta(minutes=i * 2) for i in range(12)]
        rain = [False] * 4 + [True] * 8
        mock_weather = pd.DataFrame({
            "Time": times,
            "Rainfall": rain,
            "AirTemp": [16.0] * 12,
            "TrackTemp": [22.0] * 12,
            "Humidity": [85.0] * 12,
            "WindSpeed": [5.0] * 12,
            "WindDirection": [180.0] * 12,
        })
        mock_session.weather_data = mock_weather

        # Mock laps
        mock_laps = pd.DataFrame({
            "LapNumber": list(range(1, 13)),
            "LapStartTime": [pd.Timedelta(minutes=i * 2) for i in range(12)],
        })
        mock_session.laps = mock_laps
        mock_get_session.return_value = mock_session

        result = get_weather_radar_data(2024, "British Grand Prix", "Race", selected_lap=2)
        self.assertFalse(result["fallback"])
        self.assertIn("crossover", result)
        crossover = result["crossover"]
        self.assertIn(crossover["crossover_status"], ["APPROACHING", "CRITICAL", "OPTIMAL"])
        self.assertIn("BOX IN", crossover["pit_call"])

    def test_api_endpoint_weather_radar(self):
        """Verify GET /api/weather/radar returns 200 with valid schema."""
        resp = self.client.get("/api/weather/radar?year=2024&event=British+Grand+Prix&session=Race&lap=5")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("current_metrics", data)
        self.assertIn("crossover", data)
        self.assertIn("radar_frames", data)
        self.assertEqual(len(data["radar_frames"]), 5)
        self.assertIn("wind_vector", data)


if __name__ == "__main__":
    unittest.main()
