# Skill: F1 MVP Planning

## Purpose

Plan and deliver small, demo-ready slices for the Virtual Race Engineer app.

## When to use

- New feature requests touching both `backend/` and `frontend/`.
- Converting idea/spec text into implementable tasks.
- Reducing oversized tasks into 1-2 day increments.

## Input

- Product goal (for example: "show pit window recommendation for selected driver").
- Current constraints (time, missing data, API limits).
- Existing files likely involved.

## Output

1. **Feature slice statement**: one user outcome.
2. **Contract draft**: endpoint, payload, response shape.
3. **Implementation steps**:
   - Backend changes
   - Frontend changes
   - Validation/testing steps
4. **Risk notes**: external data gaps, assumptions, fallback behavior.

## Workflow

1. Read spec and existing code for only relevant modules.
2. Propose the thinnest vertical slice that can be demoed.
3. Define API contract before UI wiring.
4. Implement backend baseline, then frontend integration.
5. Verify with one concrete scenario and document next slice.

## Guardrails

- Do not start with broad architecture rewrites.
- Do not add new infrastructure unless required for the current slice.
- Keep language and naming consistent with Formula 1 domain terms in docs.
