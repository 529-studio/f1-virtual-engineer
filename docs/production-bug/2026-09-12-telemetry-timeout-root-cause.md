# Production telemetry timeout: root cause and remediation

**Status:** Confirmed root cause; remediation in progress
**Observed:** 2026-09-11 and 2026-09-12
**Affected surface:** Mission Control telemetry, track map, and analysis requests at `f1.529studio.site`

## User-visible symptom

`POST /api/telemetry`, `POST /api/track-map`, and sometimes `POST /api/analyze` return `500 Internal Server Error`. The response body is the proxy's generic `Internal Server Error`, so the UI cannot show its normal FastF1 fallback state.

The issue reproduces while signed out. Authentication and Supabase are therefore not prerequisites.

## Evidence

Production `/api/metrics` recorded:

| Route | Backend duration |
| --- | ---: |
| `POST /telemetry` | 180.5 s |
| `POST /track-map` | 154.0 s |
| `POST /weather` | 6.3 s |

`/weather` returned `200` with real FastF1-derived data, while the telemetry and track-map requests were converted to `500` by the `/api` proxy before the backend completed. This rules out missing telemetry coverage, authentication, Redis, Gemini, and ChromaDB as the primary cause.

## Root cause

The backend helpers independently call `fastf1.get_session(...).load(laps=True, telemetry=True, ...)` for telemetry and track-map work. Mission Control can request telemetry, track map, and analysis concurrently for the same session; analysis also obtains telemetry internally.

There is a completed-result TTL cache, but no in-flight coalescing and no shared loaded-session boundary. On the resource-constrained production host, concurrent cold FastF1 telemetry/position loads take longer than the reverse-proxy budget. The proxy emits its generic `500`, even though the backend later completes and records a successful route metric.

Local development hides the problem because its disk cache is warm and the machine has more available CPU and memory.

## Remediation

1. Coalesce concurrent FastF1 session loads with the same session key.
2. Enforce a backend time budget below the proxy deadline and return the existing typed fallback envelope.
3. Keep successful response schemas unchanged; do not cache fallback responses.
4. Add regression tests for timeout/fallback behaviour.

## Independent console errors

Two malformed static SVG Bézier paths in `frontend/src/components/landing/CapabilityGrid.tsx` end with only two coordinate pairs after a `C` command. Browser console errors identify their suffixes as `...380,28 420,38` and `...380,14 420,22`. They do not cause the API `500`, but this patch also corrects the paths.

The `VM... Cannot read properties of undefined (reading 'startTime')` stack is injected DevTools/extension code, not a source-mapped application frame. It is not included in the application patch.
