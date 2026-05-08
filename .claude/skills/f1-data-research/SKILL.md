---
name: f1-data-research
description: Research FastF1 behavior, telemetry availability, session/event normalization, driver-code formats, and Formula 1 strategy assumptions before writing code that touches them. Use this skill whenever a task involves `backend/tools/`, `backend/agents/`, telemetry endpoints, strategy logic, race-domain reasoning, fallback design, or any feature that claims insight from F1 telemetry or historical session data — even when the user just says "add a tyre wear chart" or "explain this pit stop".
---

# F1 Data Research

Reduce hallucinated F1-domain assumptions before coding. Local evidence beats external research.

## 1. Inspect the repo first

Read the minimum relevant files:

- `backend/tools/fastf1_helper.py`
- `backend/tools/strategy_helper.py`
- `backend/agents/race_engineer.py`
- existing tests in `backend/tests/`

If the answer is in the code, stop researching.

## 2. Normalize the data question

Translate the task into explicit data assumptions:

- Which year / event / session?
- Which driver code(s)?
- Telemetry, tyre wear, pit window, or explanation text?
- Historical data acceptable, or does the user expect live data?

## 3. Verify F1-domain assumptions

Before writing code, confirm:

- **Driver code format** — three-letter uppercase codes (`VER`, `HAM`); confirm against current code, don't guess.
- **Session token mapping** — `FP1`, `FP2`, `FP3`, `Q`, `R`, `S` (sprint), `SQ` (sprint qualifying). Sprint weekends differ.
- **Event naming** — FastF1 event names are not always the GP marketing name; check against the Round number where possible.
- **Telemetry availability** — pre-2018 telemetry is sparse; some sessions have no car data; FastF1's cache may be empty.
- **Fallback contract** — when telemetry is missing, the response must be a structured fallback, not a synthesized number.

## 4. Record the assumption set

Before coding, write down (in chat or as a comment in the PR body):

- exact session/year/driver normalization rule used,
- what counts as "telemetry unavailable",
- what the fallback payload looks like,
- which heuristic produced any strategy claim.

## 5. External research — only if local is insufficient

FastF1 docs, GitHub issues, and Formula1.com are acceptable. F1-domain blog posts are not authoritative. Cite the source in the PR if you used one.

## Deeper detail

`.codex/skills/f1-data-research/SKILL.md` has the long-form codex version.
