import io
import unittest
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pyarrow.parquet as pq
from fastapi.testclient import TestClient

from app.main import app
from tools.telemetry_export import (
    build_lap_telemetry_dataframe,
    compare_stint_laps,
    export_telemetry_bytes,
)


class MockLaps(pd.DataFrame):
    @property
    def _constructor(self):
        return MockLaps

    def pick_fastest(self):
        return self.iloc[0]


class TelemetryExportUnitTests(unittest.TestCase):
    def _create_mock_session(self):
        mock_session = MagicMock()

        # Create synthetic lap telemetry
        n_points = 50
        dist = np.linspace(0, 5000, n_points)
        time_td = pd.to_timedelta(np.linspace(0, 80, n_points), unit="s")
        speed = np.linspace(100, 320, n_points)
        gear = np.random.randint(2, 8, size=n_points)
        rpm = np.random.randint(9000, 12000, size=n_points)
        throttle = np.linspace(50, 100, n_points)
        brake = np.zeros(n_points, dtype=bool)
        drs = np.zeros(n_points, dtype=int)
        steering = np.linspace(-5, 5, n_points)
        x = np.sin(np.linspace(0, np.pi, n_points)) * 1000
        y = np.cos(np.linspace(0, np.pi, n_points)) * 1000

        mock_telem_df = pd.DataFrame({
            "Distance": dist,
            "Time": time_td,
            "Speed": speed,
            "nGear": gear,
            "RPM": rpm,
            "Throttle": throttle,
            "Brake": brake,
            "DRS": drs,
            "Steering": steering,
            "X": x,
            "Y": y,
        })

        lap1 = pd.Series({
            "LapNumber": 10,
            "LapTime": pd.Timedelta(seconds=82.5),
            "_telemetry": mock_telem_df,
        })
        lap2 = pd.Series({
            "LapNumber": 40,
            "LapTime": pd.Timedelta(seconds=84.2),
            "_telemetry": mock_telem_df,
        })

        laps_df = MockLaps([lap1, lap2])
        mock_session.laps = laps_df
        return mock_session, laps_df

    @patch("tools.telemetry_export._get_loaded_telemetry_session")
    @patch("tools.telemetry_export._pick_driver_laps")
    def test_build_lap_telemetry_dataframe_success(self, mock_pick, mock_session):
        sess, laps_df = self._create_mock_session()
        mock_session.return_value = sess
        mock_pick.return_value = laps_df

        df, lap_num = build_lap_telemetry_dataframe(
            2024, "Italian Grand Prix", "R", "LEC", lap_number=10
        )
        self.assertEqual(lap_num, 10)
        self.assertFalse(df.empty)
        self.assertIn("distance_m", df.columns)
        self.assertIn("speed_kmh", df.columns)
        self.assertIn("gear", df.columns)
        self.assertIn("steering_deg", df.columns)
        self.assertIn("g_long", df.columns)
        self.assertIn("g_lat", df.columns)

    @patch("tools.telemetry_export._get_loaded_telemetry_session")
    @patch("tools.telemetry_export._pick_driver_laps")
    def test_export_telemetry_bytes_csv(self, mock_pick, mock_session):
        sess, laps_df = self._create_mock_session()
        mock_session.return_value = sess
        mock_pick.return_value = laps_df

        content_bytes, media_type, filename = export_telemetry_bytes(
            2024, "Italian Grand Prix", "R", "LEC", lap_number=10, export_format="csv"
        )
        self.assertEqual(media_type, "text/csv; charset=utf-8")
        self.assertTrue(filename.endswith(".csv"))
        self.assertIn("LEC_Italian_Grand_Prix_2024_lap10.csv", filename)

        decoded = content_bytes.decode("utf-8")
        self.assertIn("distance_m,time_s,speed_kmh", decoded)

    @patch("tools.telemetry_export._get_loaded_telemetry_session")
    @patch("tools.telemetry_export._pick_driver_laps")
    def test_export_telemetry_bytes_parquet(self, mock_pick, mock_session):
        sess, laps_df = self._create_mock_session()
        mock_session.return_value = sess
        mock_pick.return_value = laps_df

        content_bytes, media_type, filename = export_telemetry_bytes(
            2024, "Italian Grand Prix", "R", "LEC", lap_number=10, export_format="parquet"
        )
        self.assertEqual(media_type, "application/vnd.apache.parquet")
        self.assertTrue(filename.endswith(".parquet"))

        # Verify bytes are valid Parquet readable by pyarrow
        table = pq.read_table(io.BytesIO(content_bytes))
        self.assertGreater(table.num_rows, 0)
        self.assertIn("speed_kmh", table.column_names)
        self.assertIn("g_lat", table.column_names)

    @patch("tools.telemetry_export._get_loaded_telemetry_session")
    @patch("tools.telemetry_export._pick_driver_laps")
    def test_compare_stint_laps(self, mock_pick, mock_session):
        sess, laps_df = self._create_mock_session()
        mock_session.return_value = sess
        mock_pick.return_value = laps_df

        result = compare_stint_laps(
            2024, "Italian Grand Prix", "R", "LEC", lap1=10, lap2=40, points=100
        )
        self.assertFalse(result["fallback"])
        self.assertEqual(result["lap1"], 10)
        self.assertEqual(result["lap2"], 40)
        self.assertEqual(len(result["distance"]), 100)
        self.assertEqual(len(result["lap1_speed"]), 100)
        self.assertEqual(len(result["cumulative_time_delta_s"]), 100)
        self.assertAlmostEqual(result["net_time_delta_s"], -1.7, places=1)


class TelemetryExportApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.routers.telemetry.export_telemetry_bytes")
    def test_export_endpoint_csv(self, mock_export):
        mock_export.return_value = (
            b"driver,lap_number,distance_m\nLEC,15,100.5\n",
            "text/csv; charset=utf-8",
            "LEC_Italian_Grand_Prix_2024_lap15.csv",
        )

        resp = self.client.get(
            "/api/telemetry/export?year=2024&event=Italian%20Grand%20Prix&session_type=R&driver=LEC&lap_number=15&format=csv"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "text/csv; charset=utf-8")
        self.assertIn('attachment; filename="LEC_Italian_Grand_Prix_2024_lap15.csv"', resp.headers["content-disposition"])
        self.assertIn(b"LEC,15,100.5", resp.content)

    @patch("app.routers.telemetry.export_telemetry_bytes")
    def test_export_endpoint_parquet(self, mock_export):
        mock_export.return_value = (
            b"PAR1dummyparquetbytes",
            "application/vnd.apache.parquet",
            "LEC_Italian_Grand_Prix_2024_lap15.parquet",
        )

        resp = self.client.get(
            "/api/telemetry/export?year=2024&event=Italian%20Grand%20Prix&session_type=R&driver=LEC&lap_number=15&format=parquet"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers["content-type"], "application/vnd.apache.parquet")
        self.assertIn(".parquet", resp.headers["content-disposition"])

    @patch("app.routers.telemetry.export_telemetry_bytes")
    def test_export_endpoint_driver_not_found(self, mock_export):
        mock_export.side_effect = ValueError("Driver XYZ not found")
        resp = self.client.get(
            "/api/telemetry/export?year=2024&event=Italian%20Grand%20Prix&session_type=R&driver=XYZ&format=csv"
        )
        self.assertEqual(resp.status_code, 404)
        self.assertIn("Driver XYZ not found", resp.json()["detail"])

    @patch("app.routers.telemetry.compare_stint_laps")
    def test_stint_compare_post_endpoint(self, mock_compare):
        mock_compare.return_value = {
            "driver": "LEC",
            "year": 2024,
            "event": "Italian Grand Prix",
            "session_type": "R",
            "lap1": 15,
            "lap2": 45,
            "lap1_time_s": 81.2,
            "lap2_time_s": 83.0,
            "net_time_delta_s": -1.8,
            "sample_points": 50,
            "distance": [10.0, 20.0],
            "lap1_speed": [200.0, 250.0],
            "lap2_speed": [195.0, 245.0],
            "delta_speed": [5.0, 5.0],
            "lap1_throttle": [100.0, 100.0],
            "lap2_throttle": [90.0, 95.0],
            "lap1_brake": [0.0, 0.0],
            "lap2_brake": [0.0, 0.0],
            "cumulative_time_delta_s": [-0.05, -0.1],
            "fallback": False,
            "fallback_reason": None,
        }

        payload = {
            "year": 2024,
            "event": "Italian Grand Prix",
            "session_type": "R",
            "driver": "LEC",
            "lap1": 15,
            "lap2": 45,
        }
        resp = self.client.post("/api/telemetry/stint-compare", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["driver"], "LEC")
        self.assertEqual(data["lap1"], 15)
        self.assertEqual(data["lap2"], 45)
        self.assertEqual(data["net_time_delta_s"], -1.8)

    @patch("app.routers.telemetry.compare_stint_laps")
    def test_stint_compare_get_endpoint(self, mock_compare):
        mock_compare.return_value = {
            "driver": "LEC",
            "year": 2024,
            "event": "Italian Grand Prix",
            "session_type": "R",
            "lap1": 15,
            "lap2": 45,
            "fallback": False,
        }
        resp = self.client.get(
            "/api/telemetry/stint-compare?year=2024&event=Italian%20Grand%20Prix&session_type=R&driver=LEC&lap1=15&lap2=45"
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["driver"], "LEC")
        self.assertFalse(data["fallback"])
