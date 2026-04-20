---
description: "Python/FastAPI quality constraints for backend"
alwaysApply: true
---

# Python FastAPI Quality Rule

Applies to files in `backend/`.

## API and schema discipline

- Every request/response must use explicit Pydantic models.
- Validate user inputs early and return structured error messages.
- Avoid untyped `dict` payloads in public API contracts unless justified.

## Agent and tool boundaries

- Keep tool wrappers in `backend/tools/` deterministic and side-effect-aware.
- Keep orchestration logic in `backend/agents/` separate from transport concerns in `backend/app/`.
- For telemetry access, fail gracefully when session/driver data is unavailable.

## Reliability checks

- Add unit tests for parsing/validation logic before complex orchestration.
- Prefer defensive checks around external APIs (FastF1, external LLM providers).
- Log enough context for debugging, but never log secrets or raw keys.

## Security baseline

- No hardcoded credentials.
- Use environment variables for keys and runtime config.
- Never expose stack traces or internal paths in public API responses.
