---
name: f1-strategy-self-qa
description: Validate telemetry, tyre-wear, pit-window, recommendation, and strategy-explanation changes for plausibility, fallback behavior, explainability, and frontend/API contract integrity before commit or PR. Use when changes affect `backend/tools/strategy_helper.py`, `backend/tools/fastf1_helper.py`, `backend/agents/`, telemetry-facing tests, API payloads, or any UI that presents race strategy insight.
---

# F1 Strategy Self-QA

## Validate these dimensions

### 1. Data integrity

Confirm:

- selected driver/session/year inputs are normalized correctly,
- fallback behavior is returned when telemetry is missing,
- units and field names stay consistent.

### 2. Decision plausibility

Check whether the recommendation matches the available heuristics and extracted features.

Questions to answer:

- Does the pit-window logic align with the degradation signal?
- Are undercut/overcut claims tied to explicit gap assumptions?
- Is confidence level proportional to evidence quality?

### 3. Explainability

Confirm the output can answer “why?” in one or two sentences using real metrics, not vague language.

### 4. Contract safety

For API/UI changes, verify:

- response fields remain typed and predictable,
- empty/error/loading states are handled,
- new metadata is reflected in tests or manual verification notes.

### 5. Verification log

Run the smallest relevant commands and record the result.

Preferred order:

1. `./.codex/scripts/self-qa.sh --staged`
2. backend tests if backend changed,
3. frontend lint if frontend changed.

## Output format

Return:

- `pass/fail` by dimension,
- blocking issues,
- minimal fixes before PR,
- `ready_for_commit=true/false`.

## Guardrails

- Do not approve a change that hides missing-data uncertainty.
- Do not approve unexplained strategy claims.
- Do not mark pass without actual verification evidence.
