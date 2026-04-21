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

## Senior workflow integration

Before marking any issue as done, require:

1. **Requirements fit check**
   - Confirm implemented behavior still matches original user/business intent.
2. **Design fit check**
   - Verify selected approach does not introduce unnecessary complexity.
3. **Implementation quality check**
   - Ensure core logic has test coverage.
   - Ensure edge-case and fallback handling is explicit.
4. **PR readiness check**
   - Verify issue link, rationale, and trade-offs are documented in PR.
5. **Post-merge check plan**
   - Define which logs/metrics or manual checks will confirm healthy deployment.

## Output format

- `pass/fail` per dimension.
- List of blocking issues.
- Minimal fixes needed before release/demo.
- Explicit recommendation: `can_close_issue=true/false`.
