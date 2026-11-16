# 1. Redis L2 Cache in Production

Date: 2026-11-16  
Status: Accepted  
Deciders: Vu Thanh Dat (@thdat-vu), Giang Doan (@giangdq202)  
Consulted: Issue #40, Issue #41, Issue #42, Issue #44  

---

## Context

During the 2026-11-13 infrastructure audit on `home-srv` (Issue #40), container resource allocation and live usage across all active stacks were inspected. Redis 7 (`redis:7-alpine`) is running on `home-srv` within the Docker `core-network` bridge. An inspection of keyspaces showed:
- **DB 0 (F1 Virtual Engineer L2 Cache)**: 0 keys (dormant).
- **DB 1 (Celery Result Backend)**: 0 keys (decommissioned alongside RabbitMQ in Issue #41 / PR #45).
- **DB 2 (Outline Wiki)**: Active session and document caching.

Every Redis call site in `backend/` (`core/redis_cache.py`, `core/llm.py`, `core/idempotency.py`, `core/limiter.py`, `tools/fastf1_helper.py`, `tools/pit_exit_helper.py`) is designed with fail-open semantics: if `REDIS_URL` is omitted or the client fails to connect, the system falls back to in-process memory structures (`cachetools.TTLCache`, `slowapi` memory storage) without raising HTTP 5xx errors.

Because `REDIS_URL` was not populated in the Portainer stack environment, production ran purely on single-tier in-process caches and memory limiters. However, documentation, compose files, and architecture diagrams advertised a two-tier shared caching layer. Issue #42 required an explicit architectural decision:
- **Option 1**: Enable Redis L2 in production.
- **Option 2**: Remove the Redis code paths from the codebase entirely.

---

## Decision

We choose **Option 1: Enable Redis L2 in production**.

The container `redis:7-alpine` is already provisioned on `home-srv` inside `core-network` (~20–30 MB RSS memory footprint), with no public port exposure and password authentication enforced (`--requirepass`).

In PR #50, `REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0` was codified into `docker-compose.staging.yml`, and `REDIS_PASSWORD` was added to `assert_stack_env` in GitHub Actions CI/CD.

---

## Rationale

1. **Gemini Free-Tier Quota Protection**: LLM rationale responses and FastF1 calculations survive backend restarts and redeploys, preventing redundant API calls that burn our free-tier RPM limits.
2. **Idempotency Deduplication**: Durable 60-second storage of `Idempotency-Key` headers prevents double-submissions and client retry duplicates from re-executing expensive LLM/strategy workflows.
3. **Shared Rate Limiting**: `slowapi` counters are unified across multiple uvicorn workers or container replicas.
4. **Prerequisite for Live-Data Rate Budgets (Issue #44)**: The upcoming OpenF1 live ingest operates within strict external API rate limits (30 req/min on free tier, 60 req/min on sponsor tier). A shared Redis cache is critical to cache live ticks and guarantee that concurrent browser sessions do not exhaust the OpenF1 quota.
5. **Fail-Open Resilience**: If Redis becomes unavailable, all call sites degrade gracefully to in-process L1 caching and memory rate limiting without user-visible 5xx errors.

---

## Consequences

- `REDIS_URL` pointing to DB 0 (`redis://:${REDIS_PASSWORD}@redis:6379/0`) is declared in `docker-compose.staging.yml`, and `REDIS_PASSWORD` is a required secret asserted before deploy.
- Backend lifespan logs explicit cache state at startup (`cache: L1+L2 (redis)` or `cache: L1 only`) to prevent silent regressions.
- Documentation (`README.md`, `ARCHITECTURE.md`, `INFRA_HARDENING.md`, `REDIS_NOTES.md`, and `backend/.env.example`) is aligned to describe the actual deployment topology (DB 0: F1, DB 1: retired, DB 2: Outline).
