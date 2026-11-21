import unittest

from tools.fuel_helper import (
    DEFAULT_FUEL_SENSITIVITY_S_PER_KG,
    NOMINAL_INITIAL_FUEL_KG,
    apply_fuel_correction_to_laptimes,
    calculate_fuel_burn_per_lap,
    calculate_fuel_corrected_decay_rate,
    calculate_fuel_time_delta_per_lap,
    get_fuel_sensitivity,
)


class FuelHelperTests(unittest.TestCase):
    def test_get_fuel_sensitivity_known_circuits(self):
        self.assertEqual(get_fuel_sensitivity("Monza"), 0.032)
        self.assertEqual(get_fuel_sensitivity("Italian Grand Prix"), 0.032)
        self.assertEqual(get_fuel_sensitivity("Spa-Francorchamps"), 0.037)
        self.assertEqual(get_fuel_sensitivity("Monaco Grand Prix"), 0.024)
        self.assertEqual(get_fuel_sensitivity("Silverstone"), 0.038)

    def test_get_fuel_sensitivity_fallback(self):
        self.assertEqual(get_fuel_sensitivity("Unknown Track GP"), DEFAULT_FUEL_SENSITIVITY_S_PER_KG)
        self.assertEqual(get_fuel_sensitivity(None), DEFAULT_FUEL_SENSITIVITY_S_PER_KG)

    def test_calculate_fuel_burn_per_lap(self):
        # 53 laps (Monza) with 105 kg fuel
        burn = calculate_fuel_burn_per_lap(53, 105.0)
        self.assertAlmostEqual(burn, 105.0 / 53, places=3)
        # Edge case: zero or negative laps handled safely
        self.assertEqual(calculate_fuel_burn_per_lap(0), NOMINAL_INITIAL_FUEL_KG)

    def test_calculate_fuel_time_delta_per_lap(self):
        delta = calculate_fuel_time_delta_per_lap(53, "Italian Grand Prix", 105.0)
        expected = (105.0 / 53) * 0.032
        self.assertAlmostEqual(delta, expected, places=3)
        self.assertGreater(delta, 0.05)
        self.assertLess(delta, 0.08)

    def test_apply_fuel_correction_to_laptimes(self):
        raw_laps = [85.0, 85.0, 85.0, 85.0]
        lap_nums = [1, 2, 3, 4]
        fuel_delta = 0.065

        corrected = apply_fuel_correction_to_laptimes(raw_laps, lap_nums, fuel_delta)
        self.assertEqual(len(corrected), 4)
        self.assertAlmostEqual(corrected[0], 85.0, places=3)
        self.assertAlmostEqual(corrected[1], 85.065, places=3)
        self.assertAlmostEqual(corrected[2], 85.130, places=3)
        self.assertAlmostEqual(corrected[3], 85.195, places=3)

    def test_apply_fuel_correction_mismatched_inputs(self):
        self.assertEqual(apply_fuel_correction_to_laptimes([85.0], [1, 2], 0.065), [85.0])
        self.assertEqual(apply_fuel_correction_to_laptimes([], [], 0.065), [])

    def test_calculate_fuel_corrected_decay_rate(self):
        # Case A: flat raw lap times (slope = 0)
        # Fuel correction reveals the true tyre degradation (+0.065 s/lap)
        raw_laps = [85.0, 85.0, 85.0, 85.0, 85.0]
        lap_nums = [10, 11, 12, 13, 14]
        fuel_delta = 0.065

        corrected_rate = calculate_fuel_corrected_decay_rate(raw_laps, lap_nums, fuel_delta)
        self.assertAlmostEqual(corrected_rate, 0.065, places=3)

        # Case B: raw laps already degrading at +0.10 s/lap
        decaying_laps = [85.0, 85.10, 85.20, 85.30, 85.40]
        corrected_rate_b = calculate_fuel_corrected_decay_rate(decaying_laps, lap_nums, fuel_delta)
        # Expected combined slope ~ 0.10 + 0.065 = 0.165 s/lap
        self.assertAlmostEqual(corrected_rate_b, 0.165, places=3)

    def test_calculate_fuel_corrected_decay_rate_edge_cases(self):
        self.assertEqual(calculate_fuel_corrected_decay_rate([], [], 0.065), 0.0)
        self.assertEqual(calculate_fuel_corrected_decay_rate([85.0], [1], 0.065), 0.0)
        # If corrected times get faster (negative slope, e.g. track evolution > tyre wear), clamp to 0.0
        improving_laps = [90.0, 88.0, 86.0]
        self.assertEqual(calculate_fuel_corrected_decay_rate(improving_laps, [1, 2, 3], 0.01), 0.0)
