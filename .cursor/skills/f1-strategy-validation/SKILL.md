# Skill: F1 Strategy Validation

## Purpose

Validate that telemetry-based strategy outputs are plausible, explainable, and safe to present.

## When to use

- Any change to strategy recommendation logic.
- FastF1 ingestion updates.
- Prompt/policy updates that alter reasoning traces.

## Validation dimensions

1. **Data integrity**
   - Is telemetry present for selected driver/session?
   - Are units and timestamps consistent?
2. **Decision plausibility**
   - Does pit-window logic align with tyre wear trend?
   - Are undercut/overcut claims tied to actual gap assumptions?
3. **Explainability**
   - Can UI show a short "because" explanation using real metrics?
4. **Failure behavior**
   - If data is missing, does API return a useful fallback response?

## Suggested checks

- Use one known historical race sample as a baseline regression scenario.
- Compare recommendation changes before/after code changes.
- Record confidence level and major assumptions in output metadata when possible.

## Output format

- `pass/fail` per dimension.
- List of blocking issues.
- Minimal fixes needed before release/demo.
