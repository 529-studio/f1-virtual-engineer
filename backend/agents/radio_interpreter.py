"""Radio interpreter agent — classify a team-radio transcript.

Single public function ``interpret_radio`` that always returns a complete
dict with a closed enum classification, severity, trigger phrase, and
fallback metadata. Mirrors the fail-closed pattern from
``agents.race_engineer``: when the LLM is unavailable or returns malformed
output we degrade to a deterministic ``"none"`` classification rather than
crashing the request.
"""

from __future__ import annotations

import logging
from typing import Any

from core.llm import generate_structured


_logger = logging.getLogger(__name__)


RADIO_CLASSIFICATIONS = (
    "tyre_issue",
    "brake_issue",
    "engine_issue",
    "traffic",
    "weather",
    "strategy_request",
    "none",
)
RADIO_SEVERITIES = ("low", "medium", "high")


_SYSTEM_PROMPT = (
    "You are an F1 race engineer classifying a team-radio transcript. "
    "Return a single JSON object with EXACTLY three keys: "
    '"classification", "severity", "trigger_phrase". '
    "Allowed classifications: tyre_issue, brake_issue, engine_issue, traffic, "
    "weather, strategy_request, none. "
    "Allowed severities: low, medium, high. "
    "trigger_phrase MUST be a verbatim short snippet from the transcript that "
    "supports the classification (empty string only when classification is 'none'). "
    "RULES: Do NOT invent details not present in the transcript. Do NOT add extra keys. "
    "Output JSON only — no markdown fences, no preamble."
)


def _derive_urgency(severity: str, transcript: str) -> int:
    t_lower = transcript.lower()
    if any(k in t_lower for k in ["wall", "crash", "puncture", "fire", "box box", "emergency"]):
        return 5
    if severity == "high":
        return 4
    if severity == "medium":
        return 3
    if any(k in t_lower for k in ["traffic", "yellow", "gap"]):
        return 2
    return 1


def _derive_speaker(transcript: str) -> str:
    t_lower = transcript.lower()
    if any(k in t_lower for k in ["box box", "copy", "confirm", "radio check", "gap to", "plan b", "plan c"]):
        return "race_engineer"
    return "driver"


def _fallback(reason: str) -> dict[str, Any]:
    return {
        "classification": "none",
        "severity": "low",
        "trigger_phrase": "",
        "urgency": 1,
        "speaker": "driver",
        "fallback": True,
        "fallback_reason": reason,
    }


def _validate(parsed: dict[str, Any], transcript: str = "") -> dict[str, Any] | None:
    """Return a normalised dict, or None if the LLM output failed validation."""
    classification = parsed.get("classification")
    severity = parsed.get("severity")
    trigger_phrase = parsed.get("trigger_phrase")

    if classification not in RADIO_CLASSIFICATIONS:
        return None
    if severity not in RADIO_SEVERITIES:
        return None
    if not isinstance(trigger_phrase, str):
        return None
    # 'none' may legitimately have an empty trigger phrase; everything else needs one.
    if classification != "none" and not trigger_phrase.strip():
        return None

    urgency = parsed.get("urgency")
    if not isinstance(urgency, int) or not (1 <= urgency <= 5):
        urgency = _derive_urgency(severity, transcript)

    speaker = parsed.get("speaker")
    if speaker not in ("driver", "race_engineer"):
        speaker = _derive_speaker(transcript)

    return {
        "classification": classification,
        "severity": severity,
        "trigger_phrase": trigger_phrase.strip(),
        "urgency": urgency,
        "speaker": speaker,
        "fallback": False,
        "fallback_reason": None,
    }


def interpret_radio(transcript: str, driver: str | None = None) -> dict[str, Any]:
    """Classify ``transcript`` into a closed-set radio issue tag.

    Always returns a dict with the same shape — on any failure path the
    caller still gets a well-formed response with ``fallback=True``.
    """
    payload = {"transcript": transcript, "driver": driver}
    raw = generate_structured(payload, system_prompt=_SYSTEM_PROMPT)
    if raw is None:
        return _fallback("LLM unavailable or returned no output")

    validated = _validate(raw, transcript=transcript)
    if validated is None:
        _logger.warning("Radio classifier returned malformed payload: %r", raw)
        return _fallback("LLM response failed schema validation")

    return validated
