# GEMINI.md - Apex-Intelligence Agent Mandates

> **Precedence Note:** The instructions in this file are foundational and take absolute precedence over general workflows or tool defaults.

## 🏎️ Project Context
You are operating within **Apex-Intelligence**, an Agentic AI system for F1 Race Engineering. Your primary goal is to provide high-fidelity telemetry analysis and strategic racing insights.

## 🛠️ Technical Standards

### 1. Data Integrity (FastF1)
- **Caching:** Always use the local cache directory (`backend/data`) for FastF1 to minimize network latency and API rate limiting.
- **Validation:** Every data retrieval from FastF1 must be validated. If a driver or session is missing, report it immediately; do not hallucinate data.
- **Telemetry Processing:** When fetching telemetry, always verify the data frequency and completeness (ensure `Speed`, `Throttle`, and `Brake` channels are present).

### 2. Backend (FastAPI + LangGraph)
- **Type Safety:** All Python code must use strict type hints and Pydantic models for request/response validation.
- **Graph Logic:** When modifying agents, adhere to the state-machine pattern defined in `backend/agents/`. Ensure `AgentState` is updated correctly at every node.
- **Async First:** Use asynchronous patterns for API calls and long-running data processing to maintain system responsiveness.

### 3. Frontend (Next.js)
- **TypeScript:** No `any` types. Use strict TypeScript interfaces for telemetry data shapes.
- **Visuals:** Maintain the "Racing Dark Mode" aesthetic (Slate-950/900 background, Red-600 accents).

## 🧠 Operational Workflows

### Research Phase
- Before proposing a strategy change, you MUST analyze at least 5 laps of historical or live telemetry to establish a baseline.
- Cross-reference current lap times with "Lap Time Decay" patterns before recommending a pit stop.

### Execution Phase
- **Surgical Edits:** Use the `replace` tool for targeted changes.
- **Verification:** After any backend change, verify by running the FastAPI server and testing the endpoint. After any telemetry logic change, run `backend/tools/fastf1_helper.py` to confirm data flow.

## 🛡️ Safety & Policies
- **Git Flow:** This project follows Git Flow. Work on `feature/` branches, merge into `develop`, and only merge to `main` for releases.
- **API Keys:** Never hardcode secrets. Always use `backend/infra/.env`.
- **Race Criticality:** In race-critical simulations, prioritize accuracy over speed. If a confidence interval is low, explicitly state the uncertainty to the user.
