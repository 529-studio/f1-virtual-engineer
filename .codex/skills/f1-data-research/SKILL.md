---
name: f1-data-research
description: Research FastF1 behavior, telemetry availability, session/event normalization, and Formula 1 strategy assumptions before implementing backend helpers, agents, prompts, tests, or UI that depends on race data. Use when a task touches `backend/tools/`, `backend/agents/`, telemetry endpoints, strategy logic, race-domain reasoning, fallback design, or any feature that claims insight from F1 telemetry or historical session data.
---

# F1 Data Research

## Goal

Reduce hallucinated domain assumptions before coding.

## Research sequence

### 1. Inspect existing repo behavior first

Read the minimum relevant files first:

- `backend/tools/fastf1_helper.py`
- `backend/tools/strategy_helper.py`
- `backend/agents/race_engineer.py`
- relevant tests in `backend/tests/`

Prefer local evidence before external research.

### 2. Normalize the data question

Translate the task into explicit data assumptions:

- Which year/event/session?
- Which driver code(s)?
- Is the request about telemetry, tyre wear, pit window, or explanation text?
- Is historical data acceptable or does the user sound like they expect live data?

### 3. Verify F1-domain assumptions

Check:

- driver code format,
- session token mapping,
- event naming consistency,
- whether the requested metric exists in current helpers,
- what fallback should happen if data is unavailable.

### 4. Prefer safe product decisions

If data quality is uncertain:

- degrade confidence,
- expose assumptions,
- keep the response explicit about limits,
- design a fallback instead of pretending certainty.

### 5. Feed implementation with a short research note

Before coding, summarize:

- confirmed facts,
- assumptions,
- risks,
- recommended implementation constraints.

## Guardrails

- Do not assume live FastF1 coverage exists for every scenario.
- Do not invent strategy logic without tying it to available features.
- Do not hide uncertainty from the user-facing output.
