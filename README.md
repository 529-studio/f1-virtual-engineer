# Apex-Intelligence: Virtual Engineer F1

**Apex-Intelligence** is an end-to-end Agentic AI system designed to act as a virtual Formula 1 race engineer. This system leverages advanced Large Language Models to process real-time telemetry, retrieve historical race data, and provide strategic recommendations such as pit-stop timing (undercut/overcut) and tire degradation analysis.

---

## System Architecture

The project follows a robust, production-ready agentic workflow separating business logic from AI execution:

* **Frontend (Next.js Dashboard):** A real-time interface displaying telemetry charts and the agent's reasoning traces.
* [cite_start]**Backend API (FastAPI):** Chosen because FastAPI is fast to develop, supports async, has strong typing via Pydantic, and generates OpenAPI docs[cite: 303].
* **Agent Orchestrator (LangGraph):** Manages multi-agent coordination. [cite_start]It models agent behavior as a graph with nodes (steps) and edges (transitions), which is easier to reason about than implicit loops[cite: 88].
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
    * Copy the example environment file: `cp .env.example .env`
    * Add your required API keys (e.g., Gemini API, Supabase).

3.  **Run with Docker:**
    ```bash
    docker-compose up --build
    ```
    * *The Backend will be available at `http://localhost:8000`*
    * *The Frontend will be available at `http://localhost:3000`*

---

## Safety & Evaluation

To guarantee reliability in race-critical scenarios, the system implements:
* **Validation Gates:** All tool inputs are strictly validated using Pydantic schemas before execution.
* **Evaluation Suites:** Continuous testing against a "golden dataset" of historical race scenarios to measure accuracy and hallucination rates.
* **Observability:** Comprehensive logging of token usage, latency, and reasoning traces.

---

*Developed by [Your Name] - Showcasing the future of Agentic AI in high-performance sports.*