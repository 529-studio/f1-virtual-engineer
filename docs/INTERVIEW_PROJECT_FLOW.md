# F1 Race Engineer — Interview Summary

F1 Race Engineer turns historical Formula 1 telemetry into an explainable race-engineering recommendation.

When a user clicks **Analyze** in the Next.js Mission Control UI, the frontend sends the selected race, session, driver, and question to the FastAPI backend. FastAPI validates and rate-limits the request, then passes it into a small LangGraph workflow.

The workflow decides whether the user needs telemetry or strategy analysis. It fetches historical session data through FastF1—such as lap times, speed, throttle, brake, tyre and timing-gap data—then runs deterministic Python logic for tyre degradation, pit windows, and undercut/overcut risk. The data path is cached in memory first and then in Redis, so repeated requests avoid an expensive FastF1 load.

Gemini Flash receives only the computed facts and relevant F1/FIA citations, then turns them into a short engineer-style explanation. If Gemini is unavailable, the backend returns a deterministic template instead of failing. FastAPI returns the result as JSON or as a streamed response, and the frontend renders the charts, strategy call, and explanation.

For signed-in users, results are persisted to Supabase so the history panel can reload them later. Redis, when configured, provides the shared L2 cache and short-lived idempotency keys; when it is absent the API falls back to an in-process cache and runs every request normally.

## My contribution

I personally implemented the core product: the Next.js UI, FastAPI APIs, FastF1 integration, LangGraph flow, telemetry and strategy logic, Gemini fallback flow, Redis caching, and RAG citations.

I contributed the application-side Docker configuration, but I would not claim sole ownership of the final DevOps and CI/CD deployment work; that was where I stopped, and the repository also has a separate contributor focused on CI pipeline files.

I also built and then removed an opt-in Celery/RabbitMQ rationale pipeline after production telemetry showed it processed zero tasks; the synchronous path with template fallback was simpler and had no user-visible downside.
