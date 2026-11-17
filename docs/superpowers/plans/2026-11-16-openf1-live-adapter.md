# OpenF1 Live Adapter & Session Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dedicated live session mode powered by OpenF1 REST API with server-side polling, SSE streaming, track map coordinate transformation, and an Apple/automotive-themed `LiveRacePanel` in Mission Control.

**Architecture:** A singleton server-side poller in FastAPI polls OpenF1 at an 8-second interval (~15 req/min) during active session windows, writes normalised snapshots into Redis L2 / in-process TTLCache, and streams them to multiple clients via `GET /live/stream` (SSE). An affine transform maps OpenF1 car locations onto FastF1 SVG circuit coordinates. The frontend renders `LiveRacePanel` under a new 'Live' mode tab with Skeleton, Error, and Empty states, zero unicode emojis, and full viewport responsiveness.

**Tech Stack:** FastAPI, Pydantic v2, Redis L2 (`core-network` DB 0), Next.js 16 (App Router, Turbopack), Zustand, Tailwind CSS, Lucide React, Vitest, Pytest.

**Spec:** [`docs/superpowers/specs/2026-11-16-openf1-live-adapter-design.md`](../specs/2026-11-16-openf1-live-adapter-design.md)

## Global Constraints

- Never raise unhandled exceptions from helper functions; follow the fail-closed envelope pattern `{..., fallback: bool, fallback_reason: str | None}`.
- Upstream request rate to `api.openf1.org` must never exceed 30 req/min; 5 concurrent client connections must consume exactly ~15 req/min.
- Outside session window (`date_start - 30m` to `date_end + 30m`), `GET /live/session` must return `204 No Content` and zero OpenF1 requests dispatched.
- STRICT BAN ON UNICODE EMOJIS in UI (no ⚡, 🏁, ⚠️, 🏎️, 🔥); use Lucide vector icons (`Radio`, `Timer`, `Activity`, `Flag`, `AlertTriangle`).
- Mobile touch targets $\ge 44\text{px}$; zero horizontal scroll overflow at 390px, 834px, 1440px.
- Attribution for OpenF1 CC BY-NC-SA 4.0 must be displayed in the footer / about section.

## Review Focus

- OpenF1 upstream connection times out or drops mid-session: stream must emit last known snapshot with `stale: true` rather than terminating or returning 5xx.
- Location coordinates residual fit error $> \epsilon$: map car dots must gracefully hide while keeping position ladder functional.
- Empty state rendering outside active session window: renders countdown to Las Vegas FP1 (Nov 20) with CTA to switch to historical analysis.
- Multi-client concurrency: verify background poller maintains singleton lock and does not multiply polling requests.
- Freshness badge rendering: distinct visual styling for `LIVE · OpenF1 · ~3s delay` (emerald) vs `HISTORICAL · FastF1` (slate blue).

---

### Task 1: OpenF1 Recorded Fixtures & Client Models

**Files:**
- Create: `backend/data/fixtures/openf1_brazil_2026_11412.json`
- Create: `backend/app/schemas/live.py`
- Test: `backend/tests/test_openf1_schemas.py`

**Interfaces:**
- Produces: `LiveSessionMeta`, `LiveDriverSnapshot`, `LiveRaceTick`, `LiveSafetyCarState` in `backend/app/schemas/live.py`.

- [ ] **Step 1: Write the failing test**
Create `backend/tests/test_openf1_schemas.py` asserting model validation of `LiveSessionMeta`, `LiveDriverSnapshot`, `LiveRaceTick`, and fixture loading.

```python
from app.schemas.live import LiveDriverSnapshot, LiveRaceTick, LiveSessionMeta, load_replay_fixture

def test_live_schemas_and_fixture_loading():
    fixture = load_replay_fixture()
    assert fixture["session_key"] == 11412
    tick = LiveRaceTick.model_validate(fixture["sample_tick"])
    assert tick.session_key == 11412
    assert len(tick.drivers) > 0
    assert tick.drivers[0].driver_code == "VER"
```

- [ ] **Step 2: Run test to verify it fails**
Run: `PYTHONPATH=backend pytest backend/tests/test_openf1_schemas.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.schemas.live'`

- [ ] **Step 3: Implement schemas and fixture file**
1. Create `backend/data/fixtures/openf1_brazil_2026_11412.json` containing recorded sessions, intervals, positions, stints, and sample location coordinates for session `11412`.
2. Implement Pydantic models in `backend/app/schemas/live.py`:
   - `LiveSessionMeta(session_key, meeting_key, circuit_key, circuit_short_name, country_name, session_name, session_type, date_start, date_end, is_live, source)`
   - `LiveDriverSnapshot(position, driver_number, driver_code, team_name, interval_to_ahead, gap_to_leader, last_lap_time, current_stint, tyre_compound, tyre_age, pit_stops, in_pit, coordinates)`
   - `LiveRaceTick(session_key, polled_at, delay_seconds, stale, source, safety_car_status, leader_lap, drivers)`
   - `load_replay_fixture() -> dict`

- [ ] **Step 4: Run test to verify it passes**
Run: `PYTHONPATH=backend pytest backend/tests/test_openf1_schemas.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/data/fixtures/openf1_brazil_2026_11412.json backend/app/schemas/live.py backend/tests/test_openf1_schemas.py
git commit -m "feat(backend): add OpenF1 schemas and recorded replay fixture (#44)"
```

---

### Task 2: OpenF1 Helper & Normalization Engine with Session Window Guard

**Files:**
- Create: `backend/tools/openf1_helper.py`
- Test: `backend/tests/test_openf1_helper.py`

**Interfaces:**
- Consumes: `app.schemas.live` models and fixture.
- Produces: `get_active_session_meta()`, `normalize_live_snapshot()`, `is_session_window_active()`, `fetch_openf1_endpoint()` in `backend/tools/openf1_helper.py`.

- [ ] **Step 1: Write the failing test**
Create `backend/tests/test_openf1_helper.py` covering:
- Envelope return contract (`fallback`, `fallback_reason`).
- Session-window calculation (`date_start - 30m` to `date_end + 30m`).
- Replay mode normalization converting raw fixture data into `LiveRaceTick`.
- Upstream HTTP failure handling (returns fallback envelope, never raises).

```python
from tools.openf1_helper import get_active_session_meta, is_session_window_active, normalize_live_snapshot

def test_session_window_guard():
    # Outside window returns False
    assert is_session_window_active("2026-11-20T00:30:00Z", "2026-11-20T01:30:00Z", now_utc="2026-11-16T12:00:00Z") is False
    # Inside window returns True
    assert is_session_window_active("2026-11-20T00:30:00Z", "2026-11-20T01:30:00Z", now_utc="2026-11-20T00:15:00Z") is True
```

- [ ] **Step 2: Run test to verify it fails**
Run: `PYTHONPATH=backend pytest backend/tests/test_openf1_helper.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'tools.openf1_helper'`

- [ ] **Step 3: Implement `backend/tools/openf1_helper.py`**
Implement the normalization engine:
- Reads `LIVE_DATA_SOURCE` (`openf1`, `replay`, `none`).
- Enforces resilient HTTP client with identified `User-Agent: f1-virtual-engineer/1.0`.
- Implements normalization for `/intervals`, `/position`, `/stints`, `/pit`, `/laps`, `/race_control`.
- Wraps all network operations with try/except, returning `{..., "fallback": True, "fallback_reason": str(e)}`.

- [ ] **Step 4: Run test to verify it passes**
Run: `PYTHONPATH=backend pytest backend/tests/test_openf1_helper.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/tools/openf1_helper.py backend/tests/test_openf1_helper.py
git commit -m "feat(backend): implement OpenF1 helper and normalization engine (#44)"
```

---

### Task 3: Background Poller Loop, Caching & Budget Assertion

**Files:**
- Create: `backend/core/live_poller.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_live_poller.py`

**Interfaces:**
- Consumes: `openf1_helper`, `core.redis_cache`.
- Produces: `start_live_poller()`, `stop_live_poller()`, `get_latest_live_snapshot()`, `get_poll_counter()` in `backend/core/live_poller.py`.

- [ ] **Step 1: Write the failing test**
Create `backend/tests/test_live_poller.py` testing:
- Poller loops every 8s and caches snapshot into Redis L2 / in-process cache.
- Singleton guarantee: multiple start calls do not spawn multiple background tasks.
- Stale degraded snapshot emission when poll raises an exception.
- Upstream request budget counter: 5 client readers over simulated 1 minute increment upstream counter by exactly $\le 15$.

```python
import pytest
from core.live_poller import LivePoller

@pytest.mark.asyncio
async def test_live_poller_budget_ceiling():
    poller = LivePoller(poll_interval_seconds=0.05, replay_mode=True)
    await poller.start()
    # 5 concurrent reads
    snapshots = [await poller.get_latest_snapshot() for _ in range(5)]
    await poller.stop()
    assert poller.upstream_call_count <= 2
    assert snapshots[0]["session_key"] == 11412
```

- [ ] **Step 2: Run test to verify it fails**
Run: `PYTHONPATH=backend pytest backend/tests/test_live_poller.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'core.live_poller'`

- [ ] **Step 3: Implement `backend/core/live_poller.py` and hook into lifespan**
- Implement `LivePoller` class with `asyncio.Task`, `_poll_tick()`, and Redis L2 / TTLCache writer.
- In `backend/app/main.py` `_lifespan`: start poller if `LIVE_DATA_SOURCE != "none"`, gracefully cancel on shutdown.

- [ ] **Step 4: Run test to verify it passes**
Run: `PYTHONPATH=backend pytest backend/tests/test_live_poller.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/core/live_poller.py backend/app/main.py backend/tests/test_live_poller.py
git commit -m "feat(backend): add singleton live poller and Redis L2 snapshot caching (#44)"
```

---

### Task 4: Live Endpoints (`GET /live/session` and `GET /live/stream` SSE)

**Files:**
- Create: `backend/app/routers/live.py`
- Modify: `backend/app/main.py` (include router)
- Test: `backend/tests/test_live_api.py`

**Interfaces:**
- Consumes: `core.live_poller`.
- Produces: Endpoints `GET /live/session` and `GET /live/stream`.

- [ ] **Step 1: Write the failing test**
Create `backend/tests/test_live_api.py`:
- `GET /live/session` returns 200 with session descriptor in replay mode.
- `GET /live/session` returns 204 when disabled / outside session window.
- `GET /live/stream` returns `StreamingResponse` (`text/event-stream`) emitting `event: tick` payloads.

```python
from fastapi.testclient import TestClient
from app.main import app

def test_live_session_endpoints():
    client = TestClient(app)
    res = client.get("/live/session")
    # In replay mode returns 200
    assert res.status_code in (200, 204)
```

- [ ] **Step 2: Run test to verify it fails**
Run: `PYTHONPATH=backend pytest backend/tests/test_live_api.py`
Expected: FAIL with 404 Not Found on `/live/session`.

- [ ] **Step 3: Implement router in `backend/app/routers/live.py`**
- Route `GET /live/session`: Check active session; return 204 if none, 200 with `LiveSessionMeta` if active.
- Route `GET /live/stream`: Server-Sent Events stream emitting `event: tick\ndata: {...}\n\n` with keepalive comments.

- [ ] **Step 4: Run test to verify it passes**
Run: `PYTHONPATH=backend pytest backend/tests/test_live_api.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/app/routers/live.py backend/app/main.py backend/tests/test_live_api.py
git commit -m "feat(backend): add /live/session and /live/stream SSE endpoints (#44)"
```

---

### Task 5: Track Map Affine Transform Engine

**Files:**
- Create: `backend/tools/track_transform.py`
- Test: `backend/tests/test_track_transform.py`

**Interfaces:**
- Produces: `fit_affine_transform(openf1_coords, fastf1_coords) -> AffineModel`, `transform_coordinates(point, model) -> (x, y)`.

- [ ] **Step 1: Write the failing test**
Create `backend/tests/test_track_transform.py` testing least-squares 2D affine fitting and projection accuracy on known translation/rotation/scaling points.

```python
from tools.track_transform import fit_affine_transform, transform_point

def test_affine_transform_fitting():
    src_points = [(0, 0), (10, 0), (10, 10), (0, 10)]
    # Translated + scaled
    dst_points = [(100, 50), (120, 50), (120, 70), (100, 70)]
    model = fit_affine_transform(src_points, dst_points)
    assert model.is_valid
    pt = transform_point((5, 5), model)
    assert abs(pt[0] - 110.0) < 0.1
    assert abs(pt[1] - 60.0) < 0.1
```

- [ ] **Step 2: Run test to verify it fails**
Run: `PYTHONPATH=backend pytest backend/tests/test_track_transform.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'tools.track_transform'`

- [ ] **Step 3: Implement `backend/tools/track_transform.py`**
- Implement 2D affine fit matrix using numpy `lstsq`.
- Implement residual error calculation: if root-mean-square error exceeds circuit tolerance threshold, mark `model.is_valid = False`.

- [ ] **Step 4: Run test to verify it passes**
Run: `PYTHONPATH=backend pytest backend/tests/test_track_transform.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add backend/tools/track_transform.py backend/tests/test_track_transform.py
git commit -m "feat(backend): implement 2D affine transform engine for track map car projection (#44)"
```

---

### Task 6: Frontend DTOs, API Client & Zustand Store

**Files:**
- Create: `frontend/src/types/live.ts`
- Create: `frontend/src/services/liveApi.ts`
- Create: `frontend/src/store/useLiveStore.ts`
- Test: `frontend/src/services/__tests__/liveApi.test.ts`

**Interfaces:**
- Produces: `useLiveStore` Zustand store managing `sessionMeta`, `latestTick`, `connectionStatus: 'connecting' | 'connected' | 'stale' | 'error' | 'empty'`.

- [ ] **Step 1: Write the failing test**
Create `frontend/src/services/__tests__/liveApi.test.ts` testing SSE event parsing and reconnection handling.

```typescript
import { parseLiveTickEvent } from '../liveApi';

describe('liveApi SSE parser', () => {
  it('parses live tick data correctly', () => {
    const rawData = JSON.stringify({ session_key: 11412, delay_seconds: 3, drivers: [] });
    const parsed = parseLiveTickEvent(rawData);
    expect(parsed.session_key).toBe(11412);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `yarn --cwd frontend test src/services/__tests__/liveApi.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement DTOs, API service, and Zustand store**
- Define `LiveSessionMeta`, `LiveDriverSnapshot`, `LiveRaceTick` in `frontend/src/types/live.ts`.
- Implement `liveApi.ts` connecting to `/api/live/stream` with reconnect exponential backoff.
- Implement `useLiveStore.ts` handling states: Skeleton, Connected, Stale, Error, Empty.

- [ ] **Step 4: Run test to verify it passes**
Run: `yarn --cwd frontend test src/services/__tests__/liveApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add frontend/src/types/live.ts frontend/src/services/liveApi.ts frontend/src/store/useLiveStore.ts frontend/src/services/__tests__/liveApi.test.ts
git commit -m "feat(frontend): add live streaming types, API service, and Zustand store (#44)"
```

---

### Task 7: Frontend `LiveRacePanel`, Freshness Badge, Mode Tab & E2E Validation

**Files:**
- Create: `frontend/src/components/mission-control/LiveRacePanel.tsx`
- Modify: `frontend/src/components/mission-control/IntentTabBar.tsx`
- Modify: `frontend/src/app/mission-control/page.tsx`
- Modify: `frontend/src/components/mission-control/TrackMap.tsx`
- Modify: `frontend/src/components/common/MissionFooter.tsx`
- Test: `frontend/e2e/live-mode.spec.ts`

**Interfaces:**
- Consumes: `useLiveStore`, `TrackMap`, `IntentTabBar`.
- Produces: Integrated Live Mode UI in Mission Control.

- [ ] **Step 1: Implement `LiveRacePanel.tsx` with 3 required states**
- Skeleton: Shimmer glass cards while waiting for initial SSE connection.
- Error: Explicit connection failure message with `RotateCcw` retry button.
- Empty: "NO LIVE SESSION ACTIVE" with countdown to Las Vegas FP1 and button to switch to historical analysis.
- Active: Gap ladder table, tyre compound badges (`H`, `M`, `S`), pit stop counts, Safety Car banner.
- Strict ban on unicode emojis (Lucide icons: `Radio`, `Timer`, `Activity`, `Flag`, `AlertTriangle`).
- Freshness badge: `LIVE · OpenF1 · ~3s delay` (emerald telemetry tint) vs `HISTORICAL · FastF1`.

- [ ] **Step 2: Integrate into `IntentTabBar` and `page.tsx`**
- In `IntentTabBar.tsx`: add `live` tab beside `telemetry` and `strategy`, rendering pulsing live dot if session active.
- In `mission-control/page.tsx`: render `LiveRacePanel` when `intent === 'live'`.
- In `TrackMap.tsx`: render live car dot overlay using coordinates from `LiveDriverSnapshot`.
- In `MissionFooter.tsx`: add OpenF1 CC BY-NC-SA 4.0 attribution credit link.

- [ ] **Step 3: Write and run Playwright E2E test**
Create `frontend/e2e/live-mode.spec.ts` testing Desktop (1440px), Tablet (834px), and Mobile (390px):
- Verify zero console errors, zero horizontal overflow (`scrollWidth === clientWidth`).
- Verify switching to `Live` tab loads ticks and renders live ladder.
- Verify touch targets $\ge 44\text{px}$.

Run: `npx playwright test frontend/e2e/live-mode.spec.ts`
Expected: PASS with screenshots captured.

- [ ] **Step 4: Verify full test suite**
Run:
- `PYTHONPATH=backend pytest backend/tests`
- `yarn --cwd frontend lint`
- `yarn --cwd frontend build`
Expected: ALL PASS

- [ ] **Step 5: Commit**
```bash
git add frontend/src/components/mission-control/LiveRacePanel.tsx frontend/src/components/mission-control/IntentTabBar.tsx frontend/src/app/mission-control/page.tsx frontend/src/components/mission-control/TrackMap.tsx frontend/src/components/common/MissionFooter.tsx frontend/e2e/live-mode.spec.ts
git commit -m "feat(frontend): integrate LiveRacePanel with 3 states, live badge, and track map projection (#44)"
```
