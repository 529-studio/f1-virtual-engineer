# Lessons Learned & Post-Mortem Log

## [2026-10-22] Mobile Viewport Responsiveness & Layout Traps (iPhone 15/16 Viewport 393x852)

### 1. Incident Overview
Users accessing Mission Control (`/mission-control`) on mobile viewports (e.g. iPhone 15/16, 393 x 852px) experienced severe visual truncation:
- The telemetry charts, strategy comparison, and interactive circuit map were completely cut off below the fold with no way to scroll down.
- Vertical divider ticks (`| | |`) were hanging in empty space between wrapped selector dropdowns.
- The collapsed Strategy HUD rail stole 40px of horizontal width from an already narrow 393px screen.
- Header items (`WeatherPill`, auth button, and team switcher) were pushed off the right edge due to header text overflow (603px scroll width).

### 2. Root Cause Analysis
- **Flexbox Scroll Trap**: The root container set `h-screen overflow-hidden` while the inner column container (`flex min-h-0 min-w-0 flex-1 flex-col`) lacked `overflow-y-auto`. Combined with `min-h-0 flex-1` on the content area, available height was capped at 43.7px and the container trapped all scroll events.
- **Flex-Wrap Divider Artifacts**: In `flex-wrap` rows, static `<div className="w-px shrink-0 ...">` dividers wrap onto new lines as independent elements, rendering as stray vertical marks.
- **Unresponsive Aside Layout**: The collapsed state used `w-10 sm:w-12` inside the root horizontal flex row, permanently claiming >10% of mobile screen real estate.
- **Text Width Without Ellipsis**: `span.readout` with `shrink-0` rendered long session breadcrumbs (`LEC // Italian Grand Prix // LAP 15`) that pushed subsequent header components outside viewport bounds.

### 3. Key Architectural Solutions
1. **Responsive Scroll Strategy**: On desktop (`lg:`), retain the fixed cockpit view (`lg:overflow-hidden`); on mobile (`< lg:`), enable smooth natural scrolling (`overflow-y-auto mc-scroll`) with healthy minimum heights (`min-h-[105px]` per chart, `h-[380px]` for track map).
2. **Responsive Dividers**: Hide dividers on wrapping viewports (`hidden sm:block`) so rows wrap cleanly without stray vertical lines.
3. **Drawer Transition with FAB Trigger**: On small screens, hide the collapsed HUD rail completely (`hidden md:flex`) and provide a sleek floating action button (FAB) with team crest and pulse alert. Tapping smoothly presents the slide-over drawer with backdrop blur.
4. **Header Containment**: Add `min-w-0 truncate` and viewport-adaptive `max-w` constraints to text breadcrumbs so actions stay within visible boundaries.
5. **Smart Initial Defaults**: Default `MissionBoard` to compact ribbon mode on mobile first-visit, recovering ~370px vertical space instantly while keeping full details accessible via 1-tap expansion.

---

## [2026-10-24] Framer Motion SVG Keyframe Array Traps (<circle> attribute cx undefined)

### 1. Symptom & Root Cause
During interactive state transitions (e.g. switching driver matchups in `LandingHero.tsx`), the browser console logged repeated runtime errors:
`Error: <circle> attribute cx: Expected length, "undefined".`
Framer Motion's array keyframe interpolation for native SVG presentation attributes (`cx`, `cy`) evaluates intermediate styles that SVG strict parsers reject if an element's dataset is briefly empty during a key-driven state switch.

### 2. Architectural Solution
Do not pass dynamic multi-value arrays to raw SVG attributes `cx`/`cy` on `<motion.circle>`. Instead, group the target with `<motion.g key={item.id}>` animating CSS opacity/transforms and position a static SVG `<circle cx={targetX} cy={targetY}>` with an outer CSS radar ping ring (`animate-ping`). This eliminates 100% of SVG parser errors while producing an authentic F1 radar bead effect.

---

## [2026-10-24] Dev Server Port Fallback CORS Whitelisting (Ports 3002/3003)

### 1. Symptom & Root Cause
When port 3000 or 3001 is already bound on a developer's machine by another service (e.g. Go server, Docker, or second project), Next.js automatically increments the listening port to `3002` or `3003`. If the backend's default `allowed_origins` only contains `3000` and `3001`, all browser API calls fail silently or log red CORS blocked errors.

### 2. Architectural Solution
Always include fallback developer port ranges (`http://localhost:3002`, `http://localhost:3003`, `http://127.0.0.1:3002`, `http://127.0.0.1:3003`) in backend `allowed_origins` by default so developer environments never face mysterious CORS lockouts during multi-project workflows.

---

## [2026-10-24] React 19 Derived State vs. Cascading Effects (react-hooks/set-state-in-effect)

### 1. Symptom & Root Cause
When auto-selecting a default entity (such as Turn 1 upon track map data arrival) or resetting zoom focus, calling `setSelectedCorner(...)` synchronously within `useEffect([data, selectedCorner])` triggers ESLint `react-hooks/set-state-in-effect` and Next.js compiler warnings. In React 19 / Turbopack, synchronous state updates inside effects trigger cascading render passes and performance degradation.

### 2. Architectural Solution
Adopt pure derived state:
```typescript
const [selectedCornerRaw, setSelectedCornerRaw] = useState<CornerInfo | null>(null);
const selectedCorner = selectedCornerRaw ?? (activeTrackMap?.corners?.[0] ?? null);
```
State is computed deterministically during the render pass without any `useEffect`, eliminating redundant render cycles and satisfying strict compiler checks.

---

## [2026-10-24] Micro-Sector Boundary Sampling Traps in Telemetry Envelope Integration

### 1. Symptom & Root Cause
In telemetry envelopes (e.g. $[D_{\text{corner}} - 160\text{m}, D_{\text{corner}} + 100\text{m}]$), cars traveling at high speed (e.g. >320 km/h) traverse distance rapidly, resulting in fewer sample points than on low-speed sections. An indexing loop checking deceleration via `points[i + 1].speed - points[i].speed` with `i < len - 1` fails to evaluate the final point or crashes on single-point slices.

### 2. Architectural Solution
Always safeguard boundary lookaheads:
```typescript
for (let i = 0; i < cornerPts.length; i++) {
  const pt = cornerPts[i];
  const next = i < cornerPts.length - 1 ? cornerPts[i + 1] : null;
  const dDist = next ? next.distance - pt.distance : 0;
  const accelRate = next && dDist > 0 ? (next.speed - pt.speed) / dDist : 0;
  if (pt.brake || (next && accelRate < -0.12)) { ... }
}
```
This ensures zero index-out-of-bounds risks while accurately detecting both direct brake pedal sensor flags and derivative-based deceleration on sparse arrays.

---

## [2026-10-24] Non-Linear Catch-Up Simulation & SVG Telemetry Traps (Issue #29)

### 1. Falsy Guard Trap on Zero Values (`stintLaps === 0`)
In F1 pit-wall telemetry, a driver exiting the pits on fresh rubber has `stintLaps = 0`. Using `stintLaps && stintLaps > 0 ? stintLaps : fallback` evaluates `0` as falsy, silently clobbering fresh tyres and substituting worn defaults (e.g. 10 or 23 laps). Always use explicit nullish checks:
`stintLaps != null && stintLaps >= 0 ? stintLaps : fallback`.

### 2. Continuous vs. Discrete Step-Jump in Tyre Wear Models
Multiplying a cliff multiplier (e.g. `2.5x`) retroactively against the entire stint horizon creates an unphysical instantaneous step-jump (e.g. a 1.7s penalty in a single lap). Physical degradation penalty must accumulate only for laps strictly exceeding the cliff boundary:
`baseDegradation * lapOffset + (multiplier - 1) * baseDegradation * Math.max(0, stintAge - cliffLapOffset)`.

### 3. Dynamic SVG Ceiling on Divergence & Negative Pace Overrides
When modeling what-if pace slider scrubbers (e.g. `-0.80s` tyre conservation) or slower chasers, the gap expands over time. Capping `maxGap` at `initialGap * 1.12` clips the SVG curve into a flat line pinned to the upper bounding box. Always calculate the SVG ceiling dynamically across the projected trajectory:
`maxGap = Math.max(trajectory.reduce((m, pt) => Math.max(m, pt.gapSeconds), initialGap) * 1.15, 6.0)`.

### 4. Strict Ban on Raw Unicode Emojis
Raw unicode emojis (⚡, 🏁, ⚠️, 🏎️, 🔥) look amateurish and clash with the Apple automotive / F1 telemetry dark glass aesthetic. Enforce scalable vector icons (`lucide-react`: `Zap`, `Flag`, `AlertTriangle`, `Timer`) with subtle telemetry tinting and micro-typography.

---

## [2026-11-17] OpenF1 Live Adapter & Live Session Mode (Issue #44)

### 1. Upstream Rate Limiting & Singleton Poller Architecture
- **Problem**: OpenF1 free tier enforces a strict ceiling of 30 requests/minute. Directly fetching upstream telemetry from multiple connected client browsers would exhaust the quota within seconds and trigger HTTP 429 errors.
- **Solution**: Implemented a server-side singleton background poller (`core.live_poller.py`) polling at an 8-second tick ($\approx 15\text{ req/min}$ total, well below the 30 req/min limit). Polled snapshots are persisted into Redis L2 / in-process cache with a 30s TTL and fanned out to connected clients via `GET /live/stream` (SSE: `text/event-stream`). Ten browser tabs consume identical broadcast streams with zero additional upstream requests.

### 2. Session-Window Guard & Idle Polling Prevention
- **Problem**: Polling OpenF1 when no race or session is taking place burns upstream budget unnecessarily and generates empty polling cycles.
- **Solution**: Implemented a session-window guard `[date_start - 30m, date_end + 30m]`. When the current time falls outside this window, `GET /live/session` returns HTTP `204 No Content` and zero upstream requests are dispatched. The frontend transitions to an Empty state displaying a countdown to the upcoming Las Vegas GP Free Practice 1 with a quick CTA to switch to historical telemetry analysis.

### 3. Fail-Closed Envelope & Resilient Degradation
- **Problem**: Upstream network timeouts or transient hiccups could throw uncaught exceptions, breaking client streams or displaying blank error pages.
- **Solution**: Followed the fail-closed envelope pattern `{..., fallback: bool, fallback_reason: str | None}` and resilient User-Agent header (`f1-virtual-engineer/1.0`). If an upstream poll fails mid-session, the poller emits the last known snapshot marked with `stale: true`. The UI surfaces an amber `LIVE · OpenF1 · STALE DATA` badge with an alert icon while keeping the position ladder and gap data visible.

### 4. Coordinate Transformation & Circuit SVG Alignment
- **Problem**: OpenF1 `/location` coordinates use arbitrary Cartesian coordinates without track boundaries, making direct rendering onto FastF1 SVG circuit paths impossible.
- **Solution**: Implemented a least-squares 2D affine transform engine (`tools.track_transform.py`) mapping $(x_{openf1}, y_{openf1}) \to (x_{svg}, y_{svg})$. Residual root-mean-square error (RMSE) is checked against a threshold ($\le 25\text{ px}$); if the fit exceeds the threshold or points are collinear, `is_valid` is set to `False` and car dots are hidden safely without breaking the position ladder.

### 5. Async Testing Across Heterogeneous Environments
- **Problem**: Test functions decorated with `@pytest.mark.asyncio` failed during git pre-commit hooks in environments that only had `anyio` installed, reporting `Unknown pytest.mark.asyncio`.
- **Solution**: Standardized on Python's standard library `unittest.IsolatedAsyncioTestCase` for asynchronous test suites (`backend/tests/test_live_poller.py`). This guarantees zero dependency on third-party pytest plugins across CI/CD, local developer machines, and pre-commit hooks.

### 6. Strict Ban on Unicode Emojis & Multi-Viewport Verification
- **Solution**: Followed the Apple automotive dark glass aesthetic with vector icons (`Radio`, `Timer`, `Activity`, `Flag`, `AlertTriangle`), eliminating all unicode emojis. Verified responsive rendering with Playwright end-to-end testing across 1440px (Desktop), 834px (Tablet), and 390px (Mobile), confirming zero horizontal scroll leakage (`scrollWidth === clientWidth`) and touch target heights $\ge 44\text{px}$.

---

## [2026-11-16] Redis L2 Cache Decision & Product Positioning Realignment (Issues #42 & #43)

### 1. Context & Architectural Dilemma
- Infrastructure audit (#40) revealed that Redis was deployed on `core-network` but unpopulated (0 keys in DB 0). Every Redis call site had fail-open handlers, so production ran quietly on single-tier in-process caches while documentation and architecture diagrams claimed a shared 2-tier cache.
- The repository previously oversold its capabilities using buzzwords like "Real-time Telemetry" and "production-ready", which posed a credibility risk when reviewers noticed the engine relies on historical FastF1 session data and single-process hosting.

### 2. Architectural Solution
1. **Formalized ADR 0001 (Redis L2 Option 1)**: Codified the decision in `docs/adr/0001-redis-l2-cache.md`. Retained Redis L2 to protect Gemini free-tier RPM limits across restarts, preserve idempotency deduplication, and support the rate-limiting budget required by the upcoming OpenF1 live adapter (#44).
2. **Explicit Startup Cache Mode Logging**: Added explicit startup logging in FastAPI lifespan (`cache: L1+L2 (redis)` vs `cache: L1 only`) so that configuration drift or missing `REDIS_URL` immediately surfaces in deployment container logs instead of failing silently.
3. **Honest Product Positioning**: Realigned `README.md` and project specs (`docs/PROJECT_SPEC.md`, `docs/PROJECT_SPEC_VN.md`) by defining the product as an on-demand *race-strategy analysis workbench* using deterministic Python models over historical FastF1 archives. Added a "What this is / What this isn't" section and a Data Freshness & Provenance table so users can answer "is this live?" in under 10 seconds.
