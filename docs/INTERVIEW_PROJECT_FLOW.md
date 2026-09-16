# F1 Race Engineer — Interview Summary

F1 Race Engineer turns historical Formula 1 telemetry into an explainable race-engineering recommendation.

When a user clicks **Analyze** in the Next.js Mission Control UI, the frontend sends the selected race, session, driver, and question to the FastAPI backend. FastAPI validates and rate-limits the request, then passes it into a small LangGraph workflow.

The workflow decides whether the user needs telemetry or strategy analysis. It fetches historical session data through FastF1—such as lap times, speed, throttle, brake, tyre and timing-gap data—then runs deterministic Python logic for tyre degradation, pit windows, and undercut/overcut risk. The data path is cached in memory first and then in Redis, so repeated requests avoid an expensive FastF1 load.

Gemini Flash receives only the computed facts and relevant F1/FIA citations, then turns them into a short engineer-style explanation. If Gemini is unavailable, the backend returns a deterministic template instead of failing. FastAPI returns the result as JSON or as a streamed response, and the frontend renders the charts, strategy call, and explanation.

For signed-in users, there is an optional async path: FastAPI returns the initial result immediately, Celery sends a Gemini-improvement job through RabbitMQ, and a background worker updates the saved analysis. Redis also supports shared caching, idempotency, and worker metrics; RabbitMQ/Celery retries failed jobs and sends permanent failures to a dead-letter queue.

## My contribution

I personally implemented the core product: the Next.js UI, FastAPI APIs, FastF1 integration, LangGraph flow, telemetry and strategy logic, Gemini fallback flow, Redis caching, RAG citations, and the Celery/RabbitMQ async rationale pipeline.

I contributed the application-side Docker/worker configuration, but I would not claim sole ownership of the final DevOps and CI/CD deployment work; that was where I stopped, and the repository also has a separate contributor focused on CI pipeline files.
