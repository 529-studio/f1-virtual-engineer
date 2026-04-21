# F1 MVP Planning - 5 Week Execution Plan

This plan follows the requested weekly checklist while preserving the core project features:

- Real telemetry ingestion (FastF1)
- Virtual race engineer reasoning (LangGraph agent)
- Memory/context continuity across turns
- Stable orchestration (no infinite loops)
- Demo-ready delivery (Docker + shareable endpoint/UI)

---

## Weekly Progress Checklist

1. [ ] Week 1: Complete Task 1.1 to 1.3. Folder structure and schemas are standardized.
2. [ ] Week 2: Complete Task 2.1 to 2.3. Agent can fetch car speed from natural-language query.
3. [ ] Week 3: Complete Task 3.1 to 3.3. Agent remembers previous user questions/context.
4. [ ] Week 4: Complete Task 4.1 to 4.3. Agent graph runs reliably without infinite loops.
5. [ ] Week 5: Complete Task 5.1 to 5.3. Public demo link or Docker image is ready.

---

## Week 1 - Foundations and Contracts

### Task 1.1 - Backend structure hardening
- Finalize `backend/` module boundaries: `app/`, `agents/`, `tools/`, `core/`, `eval/`, `infra/`.
- Add missing `__init__.py` where needed and baseline config loader.
- Add environment validation at app startup.

### Task 1.2 - API schema and response contracts
- Replace loose `dict` contracts in API with typed Pydantic models.
- Define standard response envelope for success/error.
- Add schema for telemetry query input: year, event, session type, driver.

### Task 1.3 - Frontend-backend contract alignment
- Define TypeScript interfaces matching backend response models.
- Add API client wrapper in frontend for `/analyze` and telemetry route.
- Create initial status cards for telemetry source, selected driver, and API state.

### Week 1 acceptance
- `backend/app/main.py` runs with validated config.
- OpenAPI displays typed request/response schemas.
- Frontend can call backend and render typed placeholder response without runtime errors.

---

## Week 2 - Core Telemetry Capability

### Task 2.1 - FastF1 telemetry tool productionization
- Upgrade `fastf1_helper` to return a normalized telemetry summary (speed min/max/avg, sample points).
- Ensure output includes `speed`, `gear`, and `rpm` slices for `get_telemetry`.
- Add graceful fallbacks for missing driver/session.
- Cache behavior documented and verified.

### Task 2.2 - Agent tool integration
- Connect LangGraph node to telemetry tool call.
- Support natural-language query path: "toc do cua HAM o Japanese GP 2023 la bao nhieu?"
- Return short strategy-friendly explanation, not raw dataframe dumps.

### Task 2.3 - User-visible telemetry command flow
- Add frontend query input and result panel for telemetry question/answer.
- Show selected driver/session and returned speed metrics.
- Show gear/RPM quick stats to satisfy core telemetry capability.
- Add first end-to-end happy path test (manual or automated) for telemetry fetch.

### Week 2 acceptance
- From one user query, agent returns car speed metrics for a valid session/driver.
- Errors are user-readable when data is unavailable.
- Telemetry flow is demoable from UI.

---

## Week 3 - Memory and Conversational Continuity

### Task 3.1 - Conversation state model
- Extend LangGraph `AgentState` with structured conversation memory.
- Store prior questions, selected driver/session context, and last telemetry summary.
- Define memory retention policy for MVP (for example: keep last 10 turns).

### Task 3.2 - Memory-aware responses
- Agent should resolve follow-up queries without repeating full context.
- Example: after asking about HAM, user asks "so voi VER thi sao?" and receives comparative answer.
- Add explicit clarification behavior when memory is ambiguous.

### Task 3.3 - Memory validation scenarios
- Add evaluation cases for multi-turn interaction in `backend/eval/`.
- Verify at least 3 follow-up flows: same driver, driver switch, session switch.
- Add frontend trace snippet showing context carried across turns.
- Add one scenario where `strategy_analyzer` uses context from previous `get_telemetry` call.

### Week 3 acceptance
- Agent reliably handles follow-up questions using prior context.
- Multi-turn behavior is reproducible in local test runs.
- No memory leakage of secrets or unrelated session data.

---

## Week 4 - Graph Stability and Control

### Task 4.1 - LangGraph execution safeguards
- Add explicit termination conditions and max-step limits.
- Ensure every node transition is deterministic and logged.
- Add timeout guards for external tool calls.

### Task 4.2 - Loop and retry policy
- Implement bounded retry strategy for transient FastF1/tool failures.
- Distinguish retryable vs non-retryable failures.
- Add structured error propagation to API layer.

### Task 4.3 - Stability regression checks
- Add tests for loop prevention and fail-safe exits.
- Simulate tool failure to ensure graph exits with actionable response.
- Add basic observability fields: step count, tool latency, termination reason.
- Include tool-specific failures for `predict_tyre_wear` and `knowledge_retriever`.

### Week 4 acceptance
- Agent graph cannot spin indefinitely.
- Failure cases return controlled messages and stop cleanly.
- Stability metrics are visible in logs/traces.

---

## Week 5 - Demo Packaging and Launch

### Task 5.1 - Demo-ready frontend experience
- Polish one complete dashboard flow: ask -> telemetry -> strategy recommendation.
- Improve metadata/title/branding in frontend layout.
- Add "demo script" panel with 3 suggested sample prompts.
- Ensure demo scripts cover all 4 capabilities: telemetry, tyre wear, strategy, regulation lookup.

### Task 5.2 - Docker and runbook
- Create or finalize Docker setup for backend + frontend.
- Add one-command startup instructions.
- Add environment template with required keys and safe defaults.

### Task 5.3 - Public deliverable
- Produce at least one of:
  - Shareable demo URL, or
  - Docker image with usage instructions.
- Record release notes for MVP scope and known limitations.

### Week 5 acceptance
- Reviewer can run the product from docs without tribal knowledge.
- Demo is stable enough for user feedback collection.
- MVP release artifact is published.

---

## GitHub Execution Layer (Optional but Recommended)

If you want tighter tracking, create a GitHub Project and map each task as an issue:

- Epic labels: `week-1` ... `week-5`
- Task labels: `backend`, `frontend`, `agent`, `infra`, `eval`
- Status columns: `Backlog`, `In Progress`, `In Review`, `Done`

Suggested issue titles:
- `W1-T1.1 Harden backend module structure and env validation`
- `W2-T2.2 Integrate LangGraph node with normalized telemetry tool`
- `W3-T3.2 Implement memory-aware follow-up query behavior`
- `W4-T4.1 Add max-step guard and deterministic graph termination`
- `W5-T5.3 Publish Docker image or public demo link`

---

## Definition of MVP Done

MVP is done when all are true:

1. User can ask telemetry and receive useful speed/strategy output.
2. Agent handles follow-up questions with memory.
3. Graph execution is stable and bounded.
4. Frontend + backend run via documented setup.
5. Demo artifact is publicly shareable.
6. The 4 core capabilities are all demoed end-to-end:
   - `get_telemetry`
   - `predict_tyre_wear`
   - `strategy_analyzer`
   - `knowledge_retriever`
