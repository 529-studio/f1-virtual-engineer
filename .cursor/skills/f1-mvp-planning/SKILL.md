# Skill: F1 MVP Planning

## Purpose

Plan and deliver small, demo-ready slices for the Virtual Race Engineer app using a senior end-to-end workflow.

## When to use

- New feature requests touching both `backend/` and `frontend/`.
- Converting issue/spec text into implementable tasks.
- Reducing oversized tasks into 1-2 day increments.

## Input

- Product goal (for example: "show pit window recommendation for selected driver").
- Why this matters to users/business.
- Current constraints (time, missing data, API limits).
- Existing files likely involved.

## Output

1. **Feature slice statement**: one user outcome.
2. **Why statement**: user problem and business value.
3. **Definition of Done (DoD)**:
   - code complete,
   - tests pass,
   - docs updated,
   - PR reviewed and merged,
   - monitoring checks defined.
4. **Contract draft**: endpoint, payload, response shape.
5. **Impact analysis**: regression risk, performance risk, security risk.
6. **Task breakdown**: sub-tasks sized for ~2-4 hours each.
7. **Implementation steps**:
   - Backend changes
   - Frontend changes
   - Validation/testing steps
8. **Release notes**: staging/prod signals to monitor.
9. **Risk notes**: data gaps, assumptions, fallback behavior.

## Workflow (Senior End-to-End)

1. **Requirements clarification**
   - Clarify the "why".
   - Ask edge-case questions (double submit, invalid input, security-sensitive data).
   - Freeze DoD before coding.
2. **Technical design**
   - Define data model, API contracts, and sequence flow.
   - Run impact analysis for regression/performance/security.
3. **Task breakdown**
   - Split work into 2-4 hour sub-tasks.
4. **Implementation + unit tests**
   - Implement by vertical slice.
   - Cover core logic with tests.
   - Handle both happy-path and failure-path.
5. **Self-QA + refactor**
   - Self-review for readability and code smells.
   - Optimize obvious hot paths.
6. **PR and review**
   - Link issue in PR.
   - Explain design decisions and alternatives.
   - Address review feedback.
7. **Deployment + monitoring**
   - Define post-merge log/metric checks.
   - Update docs/runbook.

## Guardrails

- Do not start with broad architecture rewrites.
- Do not add new infrastructure unless required for the current slice.
- Keep language and naming consistent with Formula 1 domain terms in docs.
- Do not close issue until DoD checklist is complete.
