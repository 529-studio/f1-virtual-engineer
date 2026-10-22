# 529 Studio Agent Protocol — F1 Virtual Engineer

> **Core Philosophy**: When tackling any task, **never shy away from effort** — dig deep, be thorough, and resolve problems at their root cause.

## 1. Evidence-Based DoD & Debugging
- **Passing tests is not enough; bugs MUST be reproduced End-to-End**: When a bug occurs, reproduce it in the actual runtime environment (browser, network trace, cURL) and identify the true root cause before coding a fix.
- **Evidence Before Assertions**: Never claim completion without empirical proof (live cURL output, screenshots, browser network traces).

## 2. 529 Senior Skills Protocol
Comply with the 6 core pillars from `529-engineering-skills`:
- `resilient-networking-and-waf`: Enforce identified `User-Agent`, assert upstream headers.
- `env-and-auth-ops-debugging`: Ban bare `load_dotenv()`; use explicit `Path(__file__).resolve().parent...`.
- `frontend-4file-and-resilient-ui`: Standard 4-file pattern, always render 3 states (Skeleton, Error, Empty).
- `evidence-based-dod-and-llm-guardrails`: Read local docs to prevent deprecation traps, zero-leak secrets.

## 3. Tech Stack & Git Flow
- **Data & Backend**: FastAPI + LangGraph + Async first. Use local cache in `backend/data`.
- **Frontend**: Next.js + Zustand + Apple/Automotive aesthetic.
- **Git Flow**: Work on `feature/*` branches, pull request into `develop`.
- **Knowledge Loop**: Document post-mortems in `lesson_learn.md` after resolving complex bugs.
