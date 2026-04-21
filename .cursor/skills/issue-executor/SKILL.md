# Skill: Issue Executor

## Purpose

Execute a GitHub issue end-to-end with senior workflow discipline:
requirements -> design -> implementation -> testing -> PR -> merge -> close issue.

## When to use

- You are asked to "do issue #X" or "implement CAP/CF task".
- Work includes code changes and issue/project status updates.
- You must ensure the issue can be safely moved to Done.

## Inputs

- Issue ID/link and current issue description.
- Priority and estimate (P0/P1/P2, integer estimate).
- Relevant code paths and dependencies.
- Definition of Done constraints from project docs/skills.

## Mandatory workflow

1. **Requirements Clarification**
   - Restate user/business value ("why").
   - Identify edge cases, failure cases, and security constraints.
   - Produce issue-specific DoD checklist.
2. **Technical Design**
   - Define data model, API contract, and execution flow.
   - Run impact analysis (regression, performance, compatibility).
3. **Task Breakdown**
   - Split into 2-4 hour sub-tasks.
   - Mark dependency order (what must happen first).
4. **Implement + Unit Test**
   - Implement incrementally.
   - Add/update tests for core logic and fallback handling.
   - Cover happy-path + at least one failure-path.
5. **Self-QA + Refactor**
   - Run relevant tests/lint/type checks.
   - Self-review for readability and maintainability.
6. **PR + Review**
   - Commit with clear message linked to issue scope.
   - Open PR with summary, rationale, and test plan.
   - Address review comments before merge.
7. **Deploy/Monitor/Docs + Closure**
   - Ensure docs are updated where needed.
   - Define post-merge monitor checks (logs/metrics/manual checks).
   - Close issue and move project item to Done only if DoD is fully met.

## Output format per issue execution

1. **Plan**
   - Why, scope, non-goals, DoD.
2. **Implementation log**
   - Files changed and key decisions.
3. **Verification log**
   - Commands run and results.
4. **PR metadata**
   - Branch, commit(s), PR link, review status, merge status.
5. **Closure recommendation**
   - `can_close_issue=true/false` with reasons.

## Done criteria (hard gate)

Mark issue Done only when all are true:

- Code implementing issue scope is merged to base branch.
- Tests relevant to changed logic pass.
- Error handling/fallback behavior exists for risky paths.
- PR includes clear summary + test evidence.
- Any required docs were updated.
- Monitoring checks are defined (at least minimal).

## Guardrails

- Do not close issue based on "looks good" without test evidence.
- Do not merge large unrelated changes into one issue PR.
- Do not skip review rationale: explain why chosen approach is appropriate.
- If scope drifts, split follow-up work into new issue(s) instead of stretching current one.
