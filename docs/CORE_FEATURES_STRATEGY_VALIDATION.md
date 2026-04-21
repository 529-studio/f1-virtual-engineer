# Core Features to Implement (Strategy Validation View)

This list defines the project's core implementation scope through a validation-first lens.

## CF-01: Telemetry Ingestion and Normalization
- Fetch FastF1 session telemetry for selected driver/event/session.
- Normalize output into stable metrics (min/avg/max speed, samples, metadata).
- Handle missing session/driver data with controlled fallback responses.

## CF-02: Agent Question-to-Telemetry Execution
- Convert natural language query into telemetry lookup intent.
- Execute LangGraph node/tool chain to retrieve real data.
- Return concise, decision-ready explanations (not raw dataframe output).

## CF-03: Memory-Aware Multi-turn Assistant
- Persist short conversation context (driver, session, recent question).
- Resolve follow-up queries without requiring full re-input.
- Ask clarification question when context is ambiguous.

## CF-04: Strategy Reasoning (Pit Window and Undercut Signals)
- Compute strategy hints from telemetry trend and gap assumptions.
- Produce transparent recommendation with rationale fields.
- Include confidence and assumptions where possible.

## CF-05: Stable LangGraph Orchestration
- Enforce bounded steps and explicit termination conditions.
- Add retry policy for transient tool failures.
- Prevent infinite loops and surface termination reason for observability.

## CF-06: Frontend Mission-Control Dashboard
- Support query input and display telemetry/strategy response cards.
- Render loading, empty, and error states for backend-driven widgets.
- Keep driver/session context visible for user trust.

## CF-07: Demo and Deployment Readiness
- Run frontend + backend via documented Docker/dev workflow.
- Publish demo artifact (live URL or Docker image).
- Provide quickstart and demo script prompts for reviewers.

---

## Capability Mapping (Must-implement)

The following capabilities are mandatory and map directly to implementation scope:

### CAP-01: `get_telemetry`
- **Primary goal:** Retrieve speed, gear, and RPM for a selected driver/session.
- **Depends on:** CF-01, CF-02, CF-06
- **Inputs:** year, event, session type, driver
- **Outputs:** normalized metrics + key telemetry samples + data quality status
- **Validation:** Data Integrity Gate + API contract test

### CAP-02: `predict_tyre_wear`
- **Primary goal:** Forecast tyre degradation from lap-time decay and temperature trend.
- **Depends on:** CF-01, CF-04, CF-05
- **Inputs:** lap time series, stint info, tyre compound, surface/track temperature
- **Outputs:** degradation rate, confidence band, expected performance drop window
- **Validation:** Strategy Plausibility Gate + backtest on historical stints

### CAP-03: `strategy_analyzer`
- **Primary goal:** Recommend pit windows by comparing current pace to historical scenarios.
- **Depends on:** CF-03, CF-04, CF-05, CF-06
- **Inputs:** current telemetry pace, tyre wear prediction, historical race priors
- **Outputs:** suggested pit lap range, undercut/overcut risk, assumptions
- **Validation:** Strategy Plausibility Gate + Conversation Continuity Gate

### CAP-04: `knowledge_retriever`
- **Primary goal:** Retrieve FIA regulation context and relevant past incidents through RAG.
- **Depends on:** CF-03, CF-05, CF-07
- **Inputs:** user question, regulation/incident query intent
- **Outputs:** cited regulation snippets, confidence, and source identifiers
- **Validation:** Execution Safety Gate + source-grounded response check

---

## Validation Gates by Core Feature

- **Data Integrity Gate** (CF-01, CF-02): telemetry schema and units are consistent.
- **Conversation Continuity Gate** (CF-03): follow-up questions pass regression scenarios.
- **Strategy Plausibility Gate** (CF-04): recommendations map to measurable metrics.
- **Execution Safety Gate** (CF-05): no unbounded graph execution in failure scenarios.
- **User Experience Gate** (CF-06, CF-07): end-to-end demo flow is reproducible.

## Validation Gates by Capability

- **`get_telemetry`**: speed/gear/RPM fields present and unit-consistent for valid sessions.
- **`predict_tyre_wear`**: degradation trend is reproducible on known historical stints.
- **`strategy_analyzer`**: pit-window output includes explicit assumptions and confidence.
- **`knowledge_retriever`**: responses include source traces from regulation/incident corpus.
