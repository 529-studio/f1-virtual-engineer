# F1 Virtual Engineer: Project Specification (Agent-Ready)

## Overview
**F1 Virtual Engineer** is an on-demand race strategy analysis workbench functioning as a Virtual F1 Race Engineer. It executes deterministic strategy models over historical FastF1 session data and generates citation-grounded natural language rationales (e.g., pit windows, tyre degradation, undercut/overcut predictions).

## Architecture: Monorepo Structure
The project is structured to separate AI reasoning (Backend) from visualization (Frontend).

### `/backend` (FastAPI + LangGraph)
- **`app/`**: API endpoints and router configuration.
- **`agents/`**: Core Agent logic using LangGraph (Nodes, Edges, State).
- **`core/`**: System prompts, domain policies, and LLM configuration.
- **`tools/`**: FastF1 API wrappers with Pydantic schemas for data validation.
- **`rag/`**: Vector storage (Supabase/ChromaDB) for FIA regulations and historical strategy data.
- **`data/`**: Local cache directory for FastF1 telemetry data.
- **`eval/`**: Evaluation suites and "Golden Sets" for testing agent performance.

### `/frontend` (Next.js 15 + TypeScript)
- **Dashboard**: A high-performance UI using Tailwind CSS for session telemetry visualization, what-if strategy comparisons, and Agent feedback.

## Tech Stack
- **Language**: Python 3.11+ (Backend), TypeScript (Frontend).
- **Orchestration**: LangGraph, LangChain.
- **AI Brain**: Gemini API (Flash/Pro) for data analysis and reasoning.
- **Data Source**: FastF1 (Historical session telemetry and schedule data).
- **Database**: Supabase (PostgreSQL + Vector).
- **Styling**: Tailwind CSS (Racing-inspired dark theme).

##  Core Agent Capabilities (Agent-to-Agent Instructions)
1. **Telemetry Analysis**: Retrieve and compare speed, gear, throttle, and brake data across laps/drivers.
2. **Strategy Prediction**: Forecast "Lap Time Decay" and recommend optimal pit-stop windows.
3. **Radio Interpreter**: Analyze radio transcripts to detect technical issues (using LLM reasoning).
4. **Strategic Simulation**: Use historical data to simulate undercut/overcut scenarios.

## Setup & Execution
1. **Backend**:
   - Install dependencies: `pip install -r backend/requirements.txt`.
   - Run server: `python backend/app/main.py`.
2. **Frontend**:
   - Install dependencies: `corepack enable && yarn install --immutable`.
   - Run dev: `yarn dev` (Port 3001).

## Evaluation Standards
- All tool calls must use Pydantic schemas.
- Agents must follow the **Research -> Strategy -> Execution** workflow.
- Critical race logic must be verified against `backend/eval/` golden sets.
