"""Unit tests for the pure pit exit predictor helpers (#pit-exit)."""

from __future__ import annotations

import unittest
import pandas as pd
import numpy as np

from tools.pit_exit_helper import (
    build_classification_at_lap,
    reference_pace,
    project_pit_exit,
    CLEAR_AIR_S,
    DRS_RANGE_S,
    CONTESTED_S,
)


def _build_test_laps_dataframe() -> pd.DataFrame:
    """Build a deterministic synthetic 3-car field across 5 laps."""
    records = []
    # Driver A: leader, lap times ~90s
    for lap in range(1, 6):
        records.append({
            "Driver": "VER",
            "LapNumber": lap,
            "LapTime": pd.Timedelta(seconds=90.0),
            "Time": pd.Timedelta(seconds=90.0 * lap),
            "Position": 1,
            "PitInTime": pd.NaT,
            "PitOutTime": pd.NaT,
            "TrackStatus": "1",
        })
    # Driver B: P2, gap 5s behind VER
    for lap in range(1, 6):
        records.append({
            "Driver": "NOR",
            "LapNumber": lap,
            "LapTime": pd.Timedelta(seconds=90.0),
            "Time": pd.Timedelta(seconds=90.0 * lap + 5.0),
            "Position": 2,
            "PitInTime": pd.NaT,
            "PitOutTime": pd.NaT,
            "TrackStatus": "1",
        })
    # Driver C: P3, gap 20s behind VER (15s behind NOR)
    for lap in range(1, 6):
        records.append({
            "Driver": "LEC",
            "LapNumber": lap,
            "LapTime": pd.Timedelta(seconds=90.0),
            "Time": pd.Timedelta(seconds=90.0 * lap + 20.0),
            "Position": 3,
            "PitInTime": pd.NaT,
            "PitOutTime": pd.NaT,
            "TrackStatus": "1",
        })
    return pd.DataFrame(records)


class PitExitHelperTests(unittest.TestCase):
    def test_clean_case_arithmetic(self):
        """Clean case: stable field, driver exits exactly where arithmetic says."""
        laps = _build_test_laps_dataframe()
        # VER at lap 3: T = 270.0s, Position 1
        # Pit loss = 22.0s -> t_exit = 292.0s
        # At lap 3: NOR T = 275.0s (< 292.0s -> ahead by 17.0s)
        # LEC T = 290.0s (< 292.0s -> ahead by 2.0s)
        # Projected position for VER = 1 + 2 = 3
        res = project_pit_exit(laps, driver="VER", lap=3, pit_loss_s=22.0)

        self.assertFalse(res["fallback"])
        self.assertEqual(res["current_position"], 1)
        self.assertEqual(res["projected_position"], 3)
        self.assertEqual(res["position_delta"], -2)
        self.assertIsNotNone(res["car_ahead"])
        self.assertEqual(res["car_ahead"]["driver_code"], "LEC")
        self.assertAlmostEqual(res["car_ahead"]["gap_s"], 2.0, places=1)
        self.assertIsNone(res["car_behind"])
        self.assertEqual(res["confidence"], "HIGH")

    def test_boundary_case_contested(self):
        """Boundary case: exit time within CONTESTED_S (0.8s) of rival -> contested is True."""
        laps = _build_test_laps_dataframe()
        # Pit loss = 20.3s -> t_exit = 270.0 + 20.3 = 290.3s
        # LEC T(3) = 290.0s -> gap = 0.3s <= 0.8s -> position_is_contested is True!
        res = project_pit_exit(laps, driver="VER", lap=3, pit_loss_s=20.3)

        self.assertFalse(res["fallback"])
        self.assertTrue(res["position_is_contested"])
        self.assertEqual(res["confidence"], "LOW")
        self.assertTrue(any("position boundary" in r for r in res["confidence_reasons"]))

    def test_sc_lap_reduces_confidence(self):
        """SC lap inside the pace window -> confidence drops, SC noted in notes."""
        laps = _build_test_laps_dataframe()
        # Mark lap 3 as SC ("4")
        laps.loc[laps["LapNumber"] == 3, "TrackStatus"] = "4"

        res = project_pit_exit(laps, driver="VER", lap=3, pit_loss_s=22.0)
        self.assertFalse(res["fallback"])
        self.assertEqual(res["confidence"], "LOW")
        self.assertTrue(any("Safety Car" in n for n in res["notes"]))

    def test_rival_with_few_usable_laps_low_pace_confidence(self):
        """Rival with < 2 usable laps in window falls back to stint median with low confidence."""
        laps = _build_test_laps_dataframe()
        # Make NOR lap 1 and 2 non-green (SC) so NOR has only 1 green lap
        laps.loc[(laps["Driver"] == "NOR") & (laps["LapNumber"].isin([1, 2])), "TrackStatus"] = "4"

        pace = reference_pace(laps, "NOR", lap=3)
        self.assertEqual(pace.confidence, "low")
        self.assertEqual(pace.usable_laps, 1)

        res = project_pit_exit(laps, driver="VER", lap=3, pit_loss_s=22.0)
        self.assertFalse(res["fallback"])
        # VER's immediate rival ahead is LEC (gap 2s), but NOR is also evaluated
        self.assertIn("rivals hold current pace", res["assumptions"])

    def test_lap_beyond_session_length_returns_fallback(self):
        """lap beyond session length -> populated fallback, not a 500."""
        laps = _build_test_laps_dataframe()
        res = project_pit_exit(laps, driver="VER", lap=99, pit_loss_s=22.0)

        self.assertTrue(res["fallback"])
        self.assertIn("not present in session lap data", res["fallback_reason"])
        self.assertEqual(res["total_laps"], 5)

    def test_driver_retired_before_lap_returns_fallback(self):
        """Driver retired before lap N -> populated fallback with a readable reason."""
        laps = _build_test_laps_dataframe()
        # Drop laps 4 and 5 for LEC (simulate retirement at lap 3)
        laps = laps[~((laps["Driver"] == "LEC") & (laps["LapNumber"] > 3))]

        res = project_pit_exit(laps, driver="LEC", lap=4, pit_loss_s=22.0)
        self.assertTrue(res["fallback"])
        self.assertIn("retired before lap 4", res["fallback_reason"])

    def test_lapped_car_flagging(self):
        """Lapped cars occupy grid positions but are marked is_lapped."""
        laps = _build_test_laps_dataframe()
        # Make LEC a lap down (only completed up to lap 2 while leader is on lap 3)
        laps = laps[~((laps["Driver"] == "LEC") & (laps["LapNumber"] >= 3))]

        cls = build_classification_at_lap(laps, lap=3)
        lec_entry = next(c for c in cls if c.driver_code == "LEC")
        self.assertTrue(lec_entry.is_lapped)

        ver_entry = next(c for c in cls if c.driver_code == "VER")
        self.assertFalse(ver_entry.is_lapped)

    def test_traffic_states(self):
        """Verify CLEAR_AIR, DRS_RANGE, and TRAFFIC transitions."""
        laps = _build_test_laps_dataframe()
        # Pit loss = 20.8s -> gap to LEC = 0.8s (<= 1.0s) -> DRS_RANGE
        res_drs = project_pit_exit(laps, driver="VER", lap=3, pit_loss_s=20.8)
        self.assertEqual(res_drs["traffic_state"], "DRS_RANGE")

        # Pit loss = 22.0s -> gap to LEC = 2.0s (> 1.0 and <= 2.5) -> TRAFFIC
        res_traffic = project_pit_exit(laps, driver="VER", lap=3, pit_loss_s=22.0)
        self.assertEqual(res_traffic["traffic_state"], "TRAFFIC")

        # Pit loss = 24.0s -> gap to LEC = 4.0s (> 2.5s) -> CLEAR_AIR
        res_clear = project_pit_exit(laps, driver="VER", lap=3, pit_loss_s=24.0)
        self.assertEqual(res_clear["traffic_state"], "CLEAR_AIR")


if __name__ == "__main__":
    unittest.main()
