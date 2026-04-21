import unittest
from unittest.mock import patch

from agents.race_engineer import analyze_query, parse_telemetry_intent


class RaceEngineerTests(unittest.TestCase):
    def test_parse_telemetry_intent_requires_driver(self):
        intent = parse_telemetry_intent("toc do o japanese gp 2023")
        self.assertTrue(intent["needs_clarification"])
        self.assertIsNotNone(intent["clarification_message"])

    def test_parse_telemetry_intent_extracts_driver_and_year(self):
        intent = parse_telemetry_intent("show HAM speed at japan 2023 race")
        self.assertFalse(intent["needs_clarification"])
        self.assertEqual(intent["driver"], "HAM")
        self.assertEqual(intent["year"], 2023)
        self.assertEqual(intent["session_type"], "R")

    @patch("agents.race_engineer.get_session_telemetry_summary")
    def test_analyze_query_returns_formatted_telemetry_text(self, mock_summary):
        mock_summary.return_value = {
            "driver": "HAM",
            "year": 2023,
            "event": "Japanese Grand Prix",
            "session_type": "R",
            "sample_points": 3,
            "speed": {"min": 250.0, "max": 260.0, "avg": 255.0, "unit": "km/h"},
            "gear": {"min": 7.0, "max": 8.0, "avg": 7.3, "unit": "gear"},
            "rpm": {"min": 12000.0, "max": 12500.0, "avg": 12300.0, "unit": "rpm"},
            "source": "fastf1",
            "fallback": False,
            "fallback_reason": None,
        }
        result = analyze_query("ham japan 2023 race telemetry")

        self.assertIn("HAM telemetry", result["response_text"])
        self.assertIsNone(result["error"])
        self.assertFalse(result["telemetry_data"]["fallback"])


if __name__ == "__main__":
    unittest.main()
