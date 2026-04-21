import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


class AnalyzeApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("app.main.analyze_query")
    def test_analyze_endpoint_returns_agent_payload(self, mock_analyze):
        mock_analyze.return_value = {
            "intent": {"driver": "HAM", "year": 2023, "session_type": "R"},
            "telemetry_data": {"fallback": False},
            "response_text": "HAM telemetry (Japanese Grand Prix 2023 R): speed avg 255.0 km/h.",
            "error": None,
        }
        response = self.client.post(
            "/analyze",
            json={"query": "show ham telemetry", "driver": "HAM", "session_info": {"event": "Japanese Grand Prix"}},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "success")
        self.assertIn("agent_response", payload)
        self.assertEqual(payload["intent"]["driver"], "HAM")


if __name__ == "__main__":
    unittest.main()
