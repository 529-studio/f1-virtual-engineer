# Design Spec: OpenF1 Adapter + Live Session Mode (Thin Slice)

- **Date:** 2026-11-16
- **Status:** Proposed (Under Review)
- **Author:** Vu Thanh Dat (@thdat-vu)
- **Target Release:** Las Vegas GP 2026 (Practice 1: 2026-11-20 00:30 UTC)
- **Issue Reference:** [Issue #44](https://github.com/529-studio/f1-virtual-engineer/issues/44)

---

## 1. Executive Summary & Goals

### Goal
Add a dedicated, honest **Live Mode** to F1 Virtual Engineer:
- During an active race session window (`date_start - 30m` to `date_end + 30m`), display live positions, timing gaps to ahead/leader, tyre compound and age, pit-stop history, and safety-car state with a 3–4 second delay.
- Clearly differentiate live data from historical post-session analysis using distinct visual telemetry badges (`LIVE · OpenF1 · ~3s delay` vs `HISTORICAL · FastF1`).
- Outside an active session window (or with `LIVE_DATA_SOURCE=none`), the platform degrades cleanly to `204 No Content` / Empty State, and behaves byte-identically to the historical FastF1 analysis path.

### Upstream Provider
**OpenF1 (`api.openf1.org`)**:
- 18 REST endpoints, ~3.7 Hz telemetry sampling.
- Verified live on 2026-11-12 against session `11412` (Brazil 2026).
- Unofficial and licensed under CC BY-NC-SA 4.0 (attribution required in UI/About).
- Rate limits: 30 requests/minute (Free Tier), 60 requests/minute (EUR 9.90 Sponsor Tier).

---

## 2. Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│                   OpenF1 REST API                      │
│                  (api.openf1.org)                      │
└──────────────────────────┬─────────────────────────────┘
                           │ ~15 req/min (poll tick = 8s)
                           ▼
┌────────────────────────────────────────────────────────┐
│             backend/tools/openf1_helper.py             │
│        (Singleton Poller & Normalization Engine)       │
└────────────┬─────────────────────────────┬─────────────┘
             │ Writes Snapshot (TTL 8s)    │ Writes L1 TTLCache
             ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│       Redis L2 Cache      │ │    In-Process TTLCache    │
│  (f1:cache:openf1:live:*) │ │      (Fail-Open L1)       │
└────────────┬──────────────┘ └────────────┬──────────────┘
             │ Reads cached snapshot       │
             └──────────────┬──────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│              GET /live/stream (SSE Route)              │
│       (FastAPI StreamingResponse: text/event-stream)    │
└───────────────────────────┬────────────────────────────┘
                            │ SSE Broadcast (Zero Upstream Multiplier)
                            ▼
┌────────────────────────────────────────────────────────┐
│           Frontend Next.js: LiveRacePanel              │
│       - Live Gaps & Position Ladder                    │
│       - Tyre Compound & Stint Age                      │
│       - Safety Car (SC/VSC/Yellow) Status              │
│       - Affine-Projected Circuit Car Dots              │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1 Backend: `backend/tools/openf1_helper.py`

#### Interface Contract
Following the 529 Engineering Protocol and the identical contract pattern of `fastf1_helper.py`:
- Every function returns a typed dictionary envelope with `fallback: bool` and `fallback_reason: str | None`.
- Never raise unhandled HTTP or network exceptions to caller.

#### Normalization Mappings
1. **`/intervals`**:
   - Maps `gap_to_leader` (float in seconds or "+1 LAP").
   - Maps `interval` to ahead (`interval_to_ahead`).
2. **`/laps`**:
   - Lap duration, sector 1/2/3 durations, `is_pit_out_lap`.
3. **`/stints`**:
   - `compound` (`SOFT`, `MEDIUM`, `HARD`, `INTERMEDIATE`, `WET`), `lap_start`, `lap_end`, `tyre_age_at_start`.
4. **`/pit`**:
   - `stop_duration` (stationary time), `lane_duration` (pit lane transit time).
5. **`/race_control`**:
   - Flag events: `CLEAR`, `YELLOW`, `DOUBLE YELLOW`, `SAFETY CAR` (`SC`), `VIRTUAL SAFETY CAR` (`VSC`), `RED`.
6. **`/position`**:
   - Real-time classification table (position 1 through 20).
7. **`/location`**:
   - Coordinate tuple `(x, y, z)` per driver sampled at ~3.7 Hz.

### 3.2 Polling Budget & Rate Ceiling
- **Poller Loop**: Centralized singleton `asyncio.Task` managed in the FastAPI lifespan when a session is active.
- **Poll Interval**: `LIVE_POLL_INTERVAL_SECONDS = 8` (configurable via env).
- **Hot Endpoints**: Only `/intervals` and `/position` polled every 8 seconds (= 15 req/min).
- **Warm Endpoints**: `/stints`, `/pit`, `/race_control` cached for 30–60 seconds.
- **Resulting Upstream Load**:
  $$\text{Requests/Minute} = \frac{60}{8} \times 2 = 15\text{ req/min} \le 30\text{ req/min limit}$$
- Regardless of whether 1 user or 100 concurrent browser tabs connect to `GET /live/stream`, the upstream request rate remains fixed at 15 req/min.

### 3.3 Session-Window Guard
- `is_live_session_eligible(session_meta) -> bool`:
  $$\text{Eligible} \iff \text{date\_start} - 30\text{m} \le \text{Current Time (UTC)} \le \text{date\_end} + 30\text{m}$$
- Outside this window:
  - Poller stays idle.
  - `GET /live/session` immediately returns `204 No Content`.
  - Zero requests are sent to `api.openf1.org`.

### 3.4 Replay / Mock Fixture Mode
For offline development, unit tests, and verifying behavior before Las Vegas FP1 (2026-11-20):
- Env: `LIVE_DATA_SOURCE=replay`.
- Fixture path: `backend/data/fixtures/openf1_brazil_2026_11412.json` (recorded snapshot containing intervals, positions, stints, and reference location trace from Brazil 2026).
- Emits realistic live ticks through `GET /live/stream` simulating a 71-lap race with realistic tyre decay and position changes.

### 3.5 Endpoints Contract

#### 1. `GET /live/session`
- **Response 200 (Active Session):**
  ```json
  {
    "session_key": 11412,
    "meeting_key": 1300,
    "circuit_key": 63,
    "circuit_short_name": "Las Vegas",
    "country_name": "United States",
    "session_name": "Practice 1",
    "session_type": "Practice",
    "date_start": "2026-11-20T00:30:00Z",
    "date_end": "2026-11-20T01:30:00Z",
    "is_live": true,
    "source": "openf1"
  }
  ```
- **Response 204:** No active session in session-window.

#### 2. `GET /live/stream` (SSE: `text/event-stream`)
- Emits SSE events with 3-4s delay watermark:
  ```json
  event: tick
  data: {
    "session_key": 11412,
    "polled_at": "2026-11-16T19:55:00Z",
    "delay_seconds": 3,
    "stale": false,
    "source": "openf1",
    "safety_car": { "status": "NONE", "message": null },
    "leader_lap": 34,
    "drivers": [
      {
        "position": 1,
        "driver_number": 1,
        "driver_code": "VER",
        "team_name": "Red Bull Racing",
        "interval_to_ahead": 0.0,
        "gap_to_leader": 0.0,
        "last_lap_time": 74.521,
        "current_stint": 2,
        "tyre_compound": "HARD",
        "tyre_age": 14,
        "pit_stops": 1,
        "in_pit": false,
        "coordinates": { "x": 142.3, "y": 88.7 }
      }
    ]
  }
  ```
- **Graceful Outage Handling:** If upstream OpenF1 fails or returns 5xx/timeout mid-session, emit the last known snapshot with `"stale": true` and a visual amber warning rather than dropping the connection.

### 3.6 Track Map Affine Transformation
OpenF1 `/location` uses arbitrary origin millimeters, whereas FastF1 track map renders an SVG centered around `[0, 0]` with normalized viewBox.
- Fit a 2D affine transformation:
  $$\begin{bmatrix} x_{svg} \\ y_{svg} \end{bmatrix} = \begin{bmatrix} s_x \cos\theta & -s_y \sin\theta \\ s_x \sin\theta & s_y \cos\theta \end{bmatrix} \begin{bmatrix} x_{openf1} \\ y_{openf1} \end{bmatrix} + \begin{bmatrix} t_x \\ t_y \end{bmatrix}$$
- Fit computed once per session on 1 reference lap of location points using least-squares against the FastF1 circuit path coordinates.
- If residual error exceeds threshold $\epsilon$ (e.g., mismatched circuit layout), car dots on map are hidden and position ladder remains active.

---

## 4. Frontend Design (`frontend/src/`)

### 4.1 4-File Architecture
1. **DTOs:** `frontend/src/types/live.ts` (LiveSessionMeta, LiveDriverSnapshot, LiveRaceTick, LiveSafetyCarState).
2. **Fetch Client:** `frontend/src/services/liveApi.ts` (fetch session meta, connect SSE stream with reconnect backoff).
3. **State Management:** `frontend/src/store/useLiveStore.ts` (or integrated hook `useLiveStream.ts` in Zustand).
4. **UI Presentation:** `frontend/src/components/mission-control/LiveRacePanel.tsx`.

### 4.2 3 Required UI States
1. **Skeleton State:** Pulsing dark glass shimmer rows while establishing SSE stream.
2. **Error State:** Explicit connection banner with retry action if SSE fails.
3. **Empty State:** When `GET /live/session` is 204:
   - "NO LIVE SESSION ACTIVE"
   - Next scheduled event countdown pill: "Next live session: Las Vegas GP FP1 (Nov 20)".
   - Action button: "Switch to Historical FastF1 Strategy Analysis".

### 4.3 UI Design & Iconography Rules (Strict Ban on Emojis)
- STRICT BAN ON UNICODE EMOJIS (no ⚡, 🏁, ⚠️, 🏎️).
- Scalable Lucide vector icons only (`Radio`, `Timer`, `Activity`, `Flag`, `AlertTriangle`, `RotateCcw`, `CheckCircle2`).
- Freshness Badges:
  - Active: `LIVE · OpenF1 · ~3s delay` (emerald telemetry badge with subtle pulse).
  - Stale warning: `STALE · OpenF1 · Reconnecting...` (amber).
  - Historical comparison: `HISTORICAL · FastF1` (slate blue).
- OpenF1 CC BY-NC-SA 4.0 attribution footer link.
- Mobile ergonomics: Minimum touch targets $\ge 44\text{px}$, responsive layout at 390px, 834px, 1440px with zero horizontal scroll leaks.

---

## 5. Definition of Done & Verification Plan

1. **Acceptance Criteria Verification:**
   - [ ] With `LIVE_DATA_SOURCE=none`, historical FastF1 behavior is 100% byte-identical.
   - [ ] Polling budget test: 5 concurrent client tabs generate strictly 15 req/min upstream to OpenF1.
   - [ ] Outside session window: `/live/session` returns 204, zero OpenF1 requests dispatched.
   - [ ] Upstream outage: Last good snapshot retained with `stale: true`, no 5xx.
   - [ ] Recorded-fixture unit tests cover `/intervals`, `/laps`, `/stints`, `/pit`, and affine projection with zero live network calls in CI.
2. **Evidence-Based E2E QA:**
   - Execute Playwright test suite capturing screenshots across Desktop (1440px), Tablet (834px), and Mobile (390px).
   - Verify zero console errors, zero network leak, zero horizontal scroll overflow.
   - Verify OpenF1 CC BY-NC-SA 4.0 credit rendered.
