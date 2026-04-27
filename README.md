# Apex-Intelligence: Virtual Engineer F1

**Apex-Intelligence** is an end-to-end Agentic AI system designed to act as a virtual Formula 1 race engineer. This system leverages advanced Large Language Models to process real-time telemetry, retrieve historical race data, and provide strategic recommendations such as pit-stop timing (undercut/overcut) and tire degradation analysis.

---

## System Architecture

The project follows a robust, production-ready agentic workflow separating business logic from AI execution:

* **Frontend (Next.js Dashboard):** A real-time interface displaying telemetry charts and the agent's reasoning traces.
* **Backend API (FastAPI):** Chosen because FastAPI is fast to develop, supports async, has strong typing via Pydantic, and generates OpenAPI docs[cite: 303].
* **Agent Orchestrator (LangGraph):** Manages multi-agent coordination. It models agent behavior as a graph with nodes (steps) and edges (transitions), which is easier to reason about than implicit loops[cite: 88].
* **Data Connectors:** Custom Python wrappers for the `FastF1` library to extract speed, throttle, brake, and tire data.
* **RAG System:** A vector database (Supabase/ChromaDB) storing FIA regulations and historical race strategies.

---

## Repository Structure

To ensure maintainability and scalability, this project uses a monorepo structure:

* **`backend/`**: Logic Agentic AI (FastAPI + LangGraph)
    * `app/`: API entry points, router configuration.
    * `agents/`: Agent graphs (Nodes, Edges, State).
    * `core/`: System Prompts, core logic, and policies.
    * `tools/`: FastF1 API wrappers with Pydantic schemas.
    * `rag/`: Chunking and retrieval for historical data.
    * `eval/`: Golden sets and evaluation scripts.
    * `infra/`: Docker, environment variables, and config.
* **`frontend/`**: Next.js Dashboard for real-time visualization.
* **`docker-compose.yml`**: Full system containerization.

---

## Tech Stack

* **Language:** Python 3.11+ (Backend) & TypeScript (Frontend)
* **AI Orchestration:** LangGraph, LangChain
* **API Framework:** FastAPI, Pydantic
* **Telemetry Data:** FastF1
* **Vector Database:** Supabase / PostgreSQL
* **Deployment:** Docker, Docker Compose

---

## Core Agent Capabilities

The Virtual Engineer is equipped with strict tool-use policies and capabilities:

* **`get_telemetry`**: Retrieves live speed, gear, and RPM data for specific drivers.
* **`predict_tyre_wear`**: Analyzes lap time decay and surface temperatures to forecast tire degradation.
* **`strategy_analyzer`**: Compares current pace against historical data to recommend optimal pit windows.
* **`knowledge_retriever`**: Queries the RAG system for specific sporting regulations or past race incidents.

---

## Getting Started

The system is containerized for seamless local development, optimized for Apple Silicon (M-series) and cloud deployments.

### Prerequisites
* Docker & Docker Compose
* Python 3.11+
* Node.js 18+

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/f1-virtual-engineer.git](https://github.com/your-username/f1-virtual-engineer.git)
    cd f1-virtual-engineer
    ```

2.  **Environment Setup:**
    * Backend: `cp backend/.env.example backend/.env`
    * Frontend: `cp frontend/.env.local.example frontend/.env.local`
    * Add your required API keys (e.g., Gemini API, Supabase) and backend URL for frontend API calls.

3.  **Run with Docker:**
    ```bash
    docker-compose up --build
    ```
    * *The Backend will be available at `http://localhost:8000`*
    * *The Frontend will be available at `http://localhost:3000`*

### CI/CD recommendation for first user feedback

If your goal is to let the first real user open a browser URL and try the product quickly, use this path:

1. **GitHub Actions for CI**
   - run backend tests
   - run frontend lint/build
   - validate Docker images build successfully

2. **Deploy the built app to a simple platform**
   - easiest choices for indie-hacker speed: **Railway**, **Render**, **Fly.io**, or a small VPS with **Coolify**
   - use the new Dockerfiles or the compose setup as the deployment base

3. **Expose one public staging URL**
   - example: `https://staging.apex-intelligence.app`
   - ask first users to try 2-3 suggested prompts from the landing page / mission-control flow

Important note: GitHub Actions alone does **not** host the app permanently. It is best used as CI, or as a trigger to deploy to a hosting platform that gives you the actual public URL.

Recommended fastest path after this issue lands:
- keep GitHub Actions as CI
- deploy frontend + backend on Railway or Render
- use the platform-generated URL first, add custom domain later

### Staging-like Docker Compose

For a first-publish / reviewer-friendly run path, the repo now includes a staging-like compose file:

```bash
docker compose -f docker-compose.staging.yml up --build
```

Expected URLs after startup:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

Before first run, make sure these files exist:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Notes:
- For plain local dev outside Docker, `frontend/.env.local` can keep `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.
- For staging-like Docker Compose, browser requests should go to `NEXT_PUBLIC_API_BASE_URL=/api`.
- Inside Docker Compose, Next.js rewrites `/api/*` to the internal backend URL from `BACKEND_INTERNAL_URL=http://backend:8000`.
- FastF1 cache is mounted through `./backend/data` so repeated runs are faster.

To stop the stack:

```bash
docker compose -f docker-compose.staging.yml down
```

### API Docs (Swagger / OpenAPI)

When the backend is running, you can inspect and try the API contract from:

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

Recommended quick checks for reviewers:
- use `/telemetry` to verify the strict telemetry schema and fallback contract
- use `/analyze` to inspect telemetry-vs-strategy response envelopes for frontend integration

---

## Safety & Evaluation

To guarantee reliability in race-critical scenarios, the system implements:
* **Validation Gates:** All tool inputs are strictly validated using Pydantic schemas before execution.
* **Evaluation Suites:** Continuous testing against a "golden dataset" of historical race scenarios to measure accuracy and hallucination rates.
* **Observability:** Comprehensive logging of token usage, latency, and reasoning traces.

---

*Developed by ヴ・タイン・ダット - Showcasing the future of Agentic AI in high-performance sports.*