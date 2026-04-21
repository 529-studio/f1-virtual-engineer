# Skill: Indie Launch Loop

## Purpose

Run a practical weekly build-measure-learn loop for a solo founder shipping this app.

## When to use

- Weekly planning.
- Preparing public updates/demos.
- Prioritizing backlog under tight time constraints.

## Weekly loop

1. **Pick one north-star user outcome**
   - Example: "User can ask for pit timing and get a justified answer in <10 seconds."
2. **Ship one thin slice**
   - API capability + visible frontend surface + one verification check.
3. **Measure**
   - Response latency, API failure rate, and user-perceived usefulness.
4. **Learn**
   - Capture what worked and convert repeatable actions into new rules/skills.

## Issue-to-implementation protocol (Senior Workflow)

When this skill is used to execute an issue, follow this strict sequence:

1. **Requirements Clarification**
   - Restate the issue "why" and expected business/user impact.
   - Ask/record edge cases and security constraints.
   - Define issue-level DoD checklist.
2. **Technical Design**
   - Write implementation sketch: data model, API contract, flow.
   - Record impact analysis: regression, performance, compatibility.
3. **Task Breakdown**
   - Split into sub-tasks of 2-4 hours.
   - Mark dependency order.
4. **Implement + Unit Test**
   - Implement each sub-task with tests.
   - Include error handling beyond happy-path.
5. **Self-QA + Refactor**
   - Run tests/lint and self-review code quality.
   - Refactor obvious complexity.
6. **PR + Code Review**
   - Open PR linked to issue.
   - Include rationale and alternatives.
   - Resolve review comments.
7. **Deploy + Monitor + Docs**
   - Define monitor checks/log signals post-merge.
   - Update docs before issue closure.

Only close/move issue to Done when all 7 steps are complete.

## Prioritization rubric

Score candidate tasks from 1-5 on:

- User impact
- Build effort
- Demo value
- Risk reduction

Do highest `(impact + demo + risk reduction) - effort` first.

## Guardrails

- No hidden complexity tasks without near-term user value.
- Avoid "perfect architecture" before first strong feedback loop.
- Keep each weekly goal small enough to finish end-to-end.
- Never mark issue Done based on coding alone; require test + review + monitor plan.
