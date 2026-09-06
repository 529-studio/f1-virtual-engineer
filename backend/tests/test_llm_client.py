"""Unit tests for ``core.llm.generate_rationale`` itself.

These complement ``test_llm_rationale.py`` (which monkeypatches the wrapper
from above). Here we exercise the wrapper's fail-closed branches directly:
no API key, and exception inside the genai client.
"""

import unittest
from unittest.mock import MagicMock, patch

from core import llm as core_llm


class GenerateRationaleTests(unittest.TestCase):
    def setUp(self):
        core_llm._reset_cache_for_tests()
        # Reset the lazily-configured module so each test re-enters _ensure_configured.
        core_llm._genai_module = None
        core_llm._configured_key = None
        self.redis_get = patch.object(core_llm.redis_cache, "get", return_value=None)
        self.redis_set = patch.object(core_llm.redis_cache, "set")
        self.redis_get.start()
        self.redis_set.start()
        self.model_env = patch.dict("os.environ", {"GEMINI_MODEL": ""}, clear=False)
        self.model_env.start()

    def tearDown(self):
        self.model_env.stop()
        self.redis_set.stop()
        self.redis_get.stop()

    def test_returns_none_when_api_key_missing(self):
        with patch.dict("os.environ", {}, clear=False):
            # Drop the key whether or not it's present in the dev environment.
            import os

            os.environ.pop("GEMINI_API_KEY", None)
            result = core_llm.generate_rationale({"x": 1})
        self.assertIsNone(result)

    def test_returns_none_on_exception(self):
        fake_genai = MagicMock()
        fake_genai.GenerativeModel.side_effect = RuntimeError("boom")

        with patch.dict("os.environ", {"GEMINI_API_KEY": "test-key"}):
            with patch.object(core_llm, "_ensure_configured", return_value=fake_genai):
                result = core_llm.generate_rationale({"x": 2})

        self.assertIsNone(result)
        fake_genai.GenerativeModel.assert_called_once()

    def test_returns_none_when_response_text_empty(self):
        fake_response = MagicMock()
        fake_response.text = "   "  # whitespace only — should be treated as empty
        fake_client = MagicMock()
        fake_client.generate_content.return_value = fake_response
        fake_genai = MagicMock()
        fake_genai.GenerativeModel.return_value = fake_client

        with patch.object(core_llm, "_ensure_configured", return_value=fake_genai):
            result = core_llm.generate_rationale({"x": 3})

        self.assertIsNone(result)

    def test_rationale_uses_gemini_3_6_flash_by_default(self):
        fake_response = MagicMock()
        fake_response.text = "Race pace is stable."
        fake_client = MagicMock()
        fake_client.generate_content.return_value = fake_response
        fake_genai = MagicMock()
        fake_genai.GenerativeModel.return_value = fake_client

        with patch.object(core_llm, "_ensure_configured", return_value=fake_genai):
            core_llm.generate_rationale({"x": 4})

        fake_genai.GenerativeModel.assert_called_once_with(
            model_name="gemini-3.6-flash",
            system_instruction=core_llm._SYSTEM_PROMPT,
        )

    def test_structured_output_uses_gemini_3_6_flash_by_default(self):
        fake_response = MagicMock()
        fake_response.text = "{}"
        fake_client = MagicMock()
        fake_client.generate_content.return_value = fake_response
        fake_genai = MagicMock()
        fake_genai.GenerativeModel.return_value = fake_client

        with patch.object(core_llm, "_ensure_configured", return_value=fake_genai):
            core_llm.generate_structured({"x": 5}, system_prompt="Return JSON.")

        fake_genai.GenerativeModel.assert_called_once_with(
            model_name="gemini-3.6-flash",
            system_instruction="Return JSON.",
            generation_config={"response_mime_type": "application/json"},
        )

    def test_streaming_uses_gemini_3_6_flash_by_default(self):
        fake_chunk = MagicMock()
        fake_chunk.text = "Race pace is stable."
        fake_client = MagicMock()
        fake_client.generate_content.return_value = [fake_chunk]
        fake_genai = MagicMock()
        fake_genai.GenerativeModel.return_value = fake_client

        with patch.object(core_llm, "_ensure_configured", return_value=fake_genai):
            list(core_llm.stream_rationale({"x": 6}))

        fake_genai.GenerativeModel.assert_called_once_with(
            model_name="gemini-3.6-flash",
            system_instruction=core_llm._SYSTEM_PROMPT,
        )

    def test_rationale_uses_model_configured_in_environment(self):
        fake_response = MagicMock()
        fake_response.text = "Race pace is stable."
        fake_client = MagicMock()
        fake_client.generate_content.return_value = fake_response
        fake_genai = MagicMock()
        fake_genai.GenerativeModel.return_value = fake_client

        with (
            patch.dict("os.environ", {"GEMINI_MODEL": "gemini-test-model"}, clear=False),
            patch.object(core_llm, "_ensure_configured", return_value=fake_genai),
        ):
            core_llm.generate_rationale({"x": 7})

        fake_genai.GenerativeModel.assert_called_once_with(
            model_name="gemini-test-model",
            system_instruction=core_llm._SYSTEM_PROMPT,
        )

    def test_rationale_does_not_reuse_cache_across_configured_models(self):
        first_response = MagicMock()
        first_response.text = "First model response."
        second_response = MagicMock()
        second_response.text = "Second model response."
        fake_client = MagicMock()
        fake_client.generate_content.side_effect = [first_response, second_response]
        fake_genai = MagicMock()
        fake_genai.GenerativeModel.return_value = fake_client

        with patch.object(core_llm, "_ensure_configured", return_value=fake_genai):
            with patch.dict("os.environ", {"GEMINI_MODEL": "model-a"}, clear=False):
                first = core_llm.generate_rationale({"x": 8})
            with patch.dict("os.environ", {"GEMINI_MODEL": "model-b"}, clear=False):
                second = core_llm.generate_rationale({"x": 8})

        self.assertEqual(first, "First model response.")
        self.assertEqual(second, "Second model response.")
        self.assertEqual(fake_genai.GenerativeModel.call_count, 2)


if __name__ == "__main__":
    unittest.main()
