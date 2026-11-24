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

---

## [2026-11-21] F1 Fuel Mass Correction Physics & Raw Parquet/CSV Export Streaming Engine (Issue #62)

### 1. Physics Context: Fuel Mass Distortion on Tyre Degradation
- **Problem**: In Formula 1, cars start races with up to 110 kg of fuel (nominal ~105 kg). Over a 50-70 lap Grand Prix, cars burn approximately 1.5 to 2.0 kg/lap, lightening continuously. Given circuit fuel sensitivities of 0.030 to 0.038 s/kg (e.g. 0.038 s/kg at Silverstone, 0.032 s/kg at Monza), this weight loss speeds up cars by ~0.055 to ~0.075 s per lap. Naive linear regression over raw lap times mistakenly perceives tyres as degrading much slower than they actually are (or even improving in pace), severely underestimating the pit window and degradation cliff.
- **Solution**: Developed `backend/tools/fuel_helper.py` with circuit-specific fuel sensitivities (covering 25 Grand Prix venues + fallback). The model calculates nominal lap fuel burn $\Delta m = m_{\text{fuel}} / N_{\text{laps}}$ and the lap-time delta $\Delta t_{\text{fuel}} = \Delta m \times S_{\text{circuit}}$. When analyzing race sessions ("R"), the true tyre degradation rate is isolated by adding back the fuel burn-off bonus:
  $$d_{\text{corrected}} = d_{\text{raw}} + \Delta t_{\text{fuel}}$$
  This correction is surfaced transparently in `predict_tyre_wear()` under `fuel_correction: { applied, fuel_delta_seconds_per_lap, nominal_burn_kg_per_lap }` and explicitly skipped in non-race sessions (Qualifying/Practice) where cars do not start with full race fuel loads.

### 2. High-Performance Telemetry Export & Multi-Route Aliasing
- **Problem**: Race strategists and data scientists need raw telemetry in standard data-science formats (CSV and Apache Parquet) without crashing in-memory buffers or encountering 404s due to frontend proxy path mismatches (`/export` vs `/telemetry/export` vs `/api/telemetry/export`).
- **Solution**:
  1. Built `backend/tools/telemetry_export.py` utilizing `pyarrow` for lightning-fast, zero-copy Parquet byte serialization and standard CSV streaming with `Content-Disposition: attachment; filename="<driver>_<event>_<session>_lap<lap>.parquet"`.
  2. Registered route aliases cleanly on `APIRouter`: `@router.get("/export")`, `@router.get("/telemetry/export")`, and `@router.get("/api/telemetry/export")`.
  3. Added stint comparison logic (`/stint-compare`) that interpolates two laps of the same driver onto an equidistant 10m grid, providing speed, throttle, brake, and cumulative time deltas to assess tyre wear effects across stints.

### 3. Defensive Handling of FastF1 Lap Objects vs. Pandas DataFrames
- **Problem**: When slicing a pandas DataFrame containing mock FastF1 laps (`driver_laps[driver_laps["LapNumber"] == lap]`), accessing `.iloc[0]` produces a `pd.Series` rather than a full `fastf1.core.Lap` object, leading to `AttributeError: 'Series' object has no attribute 'get_telemetry'` during unit tests.
- **Solution**: Implemented defensive fallback checking in `build_lap_telemetry_dataframe`:
  ```python
  if hasattr(chosen_lap, "get_telemetry") and callable(chosen_lap.get_telemetry):
      telem = chosen_lap.get_telemetry()
  elif isinstance(chosen_lap, pd.Series) and "_telemetry" in chosen_lap:
      telem = chosen_lap["_telemetry"]
  elif hasattr(chosen_lap, "get") and chosen_lap.get("_telemetry") is not None:
      telem = chosen_lap.get("_telemetry")
  ```
  This guarantees robustness in both production FastF1 sessions and fast in-memory mock testing environments.

---

## [2026-11-21] Advanced Telemetry Cockpit UI, Playwright Standalone Serving & Strict Locators (Issue #63)

### 1. Next.js Standalone Serving Trap in End-to-End Test Harnesses
- **Problem**: When `next.config.ts` specifies `output: "standalone"`, running `next start` fails with `⚠ "next start" does not work with "output: standalone" configuration. Use "node .next/standalone/server.js" instead`. However, launching `server.js` directly serves HTML but produces 404s on all CSS chunks (`/_next/static/css/...`) and public assets (`/ferrari.png`, `/google-icon.svg`), because the standalone output intentionally excludes static chunks to keep Docker layers minimal. In Playwright, this causes buttons to render unstyled with default browser metrics (e.g. 33px height instead of the mandated 44px min-height), failing visual and ergonomic assertions.
- **Solution**: In `frontend/playwright.config.ts`, ensure `webServer.command` stages the static directories before launching `server.js`:
  ```bash
  cp -r public .next/standalone/ 2>/dev/null || true; cp -r .next/static .next/standalone/.next/ 2>/dev/null || true; PORT=3000 node .next/standalone/server.js
  ```
  This serves all CSS modules, font assets, and static SVGs cleanly without requiring a heavyweight dev server.

### 2. Dual Responsive Toolbars in DOM & Playwright Locator Disambiguation
- **Problem**: In `SelectorBar.tsx`, responsive design necessitates distinct layouts for mobile (`sm:hidden`) and desktop (`hidden sm:flex`). When E2E locators match buttons by name (e.g. `page.getByRole("button", { name: /Export/i })`), Playwright encounters multiple matching DOM nodes. Simply calling `.first()` on desktop resolves to the mobile hidden button, throwing strict visibility errors.
- **Solution**: Always disambiguate responsive duplicates using locator chaining or filtering by visibility:
  ```typescript
  const exportBtn = page.getByRole("button", { name: /Export/i }).filter({ visible: true }).first();
  ```
  Additionally, avoid generic substring locators like `locator("text=VER")` which match substrings inside common words like `"Driver"` (`driVER`). Always use exact matching: `getByText("VER", { exact: true })`.

### 3. Server-Sent Events (SSE) Mocking via `addInitScript`
- **Problem**: Live telemetry streams rely on `new EventSource(url)` emitting custom `"tick"` events. Playwright's network routing (`page.route`) cannot cleanly simulate indefinite EventSource event streams without hanging or connection leaks.
- **Solution**: Inject a mock `EventSource` class before navigation via `page.addInitScript()`. The mock captures `addEventListener("tick", ...)` and dispatches structured `LiveRaceTick` payloads with a small microtask/timeout delay, allowing full end-to-end testing of live stream UI states without external SSE servers.

---

## [2026-11-21] Real-time 2D Track Car Tracker, Broadcast Delay Ring Buffer & Multi-Widget Strict Locators (Issue #64)

### 1. High-Performance 60fps SVG Spline Interpolation with `requestAnimationFrame`
- **Problem**: Polling or streaming live ticks delivers coordinate updates intermittently (every 3s to 8s). Naively updating state via `setState` directly on every tick causes car dots to teleport abruptly across the circuit. Furthermore, running animation calculations inside `useEffect` calling synchronous `setState` triggers React 19 / Turbopack `react-hooks/set-state-in-effect` errors.
- **Solution**: Decouple target calculation from render animation:
  1. Compute discrete target coordinates along the track spline: `interpolateSplinePosition(progress, points)`.
  2. Maintain animated car positions inside a mutable `useRef`.
  3. Drive fluid interpolation via `requestAnimationFrame` with exponential lerp (`x += (targetX - x) * 0.15`), calling `setState` exclusively inside the RAF loop when displacement exceeds a perceptual threshold (`> 0.05px`).
  4. Derive `carsToRender = animatedCars.length > 0 ? animatedCars : targetPositions` so initial SVG rendering occurs without flash-of-empty-content.

### 2. Broadcast Delay Ring Buffer Synchronization
- **Problem**: Viewers watching television broadcasts experience delays between 15s and 60s compared to raw timing feeds, causing live telemetry dashboards to act as unwanted spoilers.
- **Solution**: Implemented an in-memory rolling FIFO ring buffer in Zustand (`useLiveStore`). Incoming ticks are appended with wall-clock timestamps and pruned beyond 75s. A dedicated `BroadcastDelaySlider` offsets the active displayed state to `targetTimestamp = Date.now() - delaySeconds * 1000`. If the buffer has not yet accumulated enough historical seconds, it gracefully serves the earliest available snapshot without crashing or stalling.

### 3. Multi-Widget Strict Locator Resolution in Playwright
- **Problem**: As telemetry cockpits grow in richness, driver codes (e.g. `"VER"`, `"NOR"`) appear in multiple concurrent widgets: the Overtake Forecast card, the 2D Track Map SVG car pills, the Mini-Sector Dominance ribbon, and the Position Ladder table. Unscoped locators like `page.getByText("VER", { exact: true })` trigger Playwright strict mode violations (`resolved to 5 elements`).
- **Solution**: Scope locators to their respective semantic ARIA regions or container elements:
  ```typescript
  const table = page.getByRole("table");
  await expect(table.getByText("VER", { exact: true })).toBeVisible();
  ```

---

## [2026-11-22] AI Team Radio Cockpit, Web Audio Intercom EQ & Multi-Viewport Drawer Playwright Testing (Issue #69 / V2.1)

### 1. Web Audio API Autoplay Policy & Pit-Wall Intercom BiquadFilter Cascade
- **Problem**: Modern browser security policies suspend `AudioContext` automatically on page load until an explicit user interaction occurs. Attempting to route audio or read frequency data from a suspended context logs warnings or stalls playback. In headless CI runners or environments with strict CORS on external F1 CDN MP3 streams (`livetiming.formula1.com`), audio elements can fail to load.
- **Solution**:
  1. Lazy context initialization with explicit resume guard:
     ```typescript
     if (audioContextRef.current && audioContextRef.current.state === "suspended") {
       await audioContextRef.current.resume();
     }
     ```
  2. Authentic Pit-Wall Intercom Acoustic Filter:
     Route audio through a cascaded dual BiquadFilter:
     - Highpass at $300\,\text{Hz}$ ($Q = 1.0$) to eliminate engine low-frequency rumble.
     - Lowpass at $3400\,\text{Hz}$ ($Q = 1.2$) to mimic military/racing walkie-talkie bandpass limitations.
  3. Resilient Synthetic Oscillator Fallback:
     Catch media load errors on `<audio>` and activate an internal Web Audio oscillator synthesizing simulated telemetry beeps and frequency harmonics, ensuring 100% test reliability in headless CI.

### 2. Hydration Race Conditions in Responsive Drawer Testing
- **Problem**: Dispatching synthetic custom window events (`window.dispatchEvent(new CustomEvent("apex:open-hud"))`) immediately after `await page.goto(...)` can be dropped if the React component has not completed hydration and attached its `useEffect` listeners.
- **Solution**: Interact with the actual responsive trigger buttons (`page.getByRole("button", { name: /Strategy HUD/i })`). Playwright's auto-waiting mechanism ensures React is fully hydrated and interactive before clicking, avoiding race conditions on Tablet and Mobile viewports.

---

## [2026-11-23] Tyre Thermal Degradation, 3D Isometric SVG Projection & Kiosk Sub-Pixel Anti-Aliasing (Issue #70 / V2.1)

### 1. Isometric Lateral Gradient Orientation and Perspective Symmetry
- **Problem**: In Formula 1 chassis geometry, left-hand wheels (`FL`, `RL`) and right-hand wheels (`FR`, `RR`) run mirror-image negative camber ($-3.5^\circ$ Front, $-1.8^\circ$ Rear). When rendered in top-isometric 3D perspective, the inner shoulder of left-hand wheels physically faces rightward (toward the chassis centerline), whereas the inner shoulder of right-hand wheels faces leftward. Naively applying the same lateral array order (`[inner, center, outer]`) across all 4 wheels causes left tyres to incorrectly display negative camber heating on their outside shoulder.
- **Solution**: Explicitly invert the lateral band ordering based on wheel chassis side:
  ```typescript
  const leftZoneTemp = isLeft ? surface_temp.outer_c : surface_temp.inner_c;
  const centerZoneTemp = surface_temp.center_c;
  const rightZoneTemp = isLeft ? surface_temp.inner_c : surface_temp.outer_c;
  ```
  This preserves physical accuracy, ensuring camber heat accumulation cleanly faces the vehicle's longitudinal centerline.

### 2. Kiosk Ergonomics & Sub-Pixel Anti-Aliasing Rounding Traps
- **Problem**: When styling buttons with strict minimum touch targets (e.g. `min-h-[44px]`), fractional CSS scaling, device pixel ratios (DPR), and nested flex padding can cause headless Chromium to calculate `boundingBox().height` as `43.99993896484375px`. A naive Playwright test assertion `expect(height).toBeGreaterThanOrEqual(44)` triggers intermittent sub-pixel test failures despite compliant styling.
- **Solution**:
  1. In Tailwind CSS, declare `min-h-[46px] min-w-[46px]` or `min-h-[48px] min-w-[48px]` on interactive buttons, providing a solid safety margin above the 44px kiosk threshold.
  2. In Playwright assertions, use `Math.round(box?.height ?? 0) >= 44` to neutralize floating-point sub-pixel inaccuracies.

### 3. Non-Destructive Carcass Cutaway Mode via SVG Layer Composition
- **Problem**: Exposing deep internal carcass core temperatures ($T_{\text{carcass}}$) must not alter the SVG coordinate space or displace adjacent labels and wishbones, which would cause jarring layout shifts when toggling between surface tread and internal core views.
- **Solution**: Layer the carcass core disc (`<ellipse>`) directly beneath the surface tread bands. In cutaway mode, transition the outer tread bands to `opacity: 0.35` with dashed outline styling, revealing the glowing carcass core and its digital readout without shifting SVG viewBox dimensions or triggering re-layouts.

---

## [2026-11-24] Mobile Kiosk Touch Targets, Landing Capability Grid Visibility & Strategy Canvas Scroll Ergonomics (Issue #74)

### 1. Kiosk Touch Target Deficits on Inline Utility & Glossary Buttons
- **Problem**: Micro-elements and inline text buttons (`HintTooltip`, `JargonTooltip`, `TeamSwitcher`, `StarButton`, `ReferencesPanel` citation chips) rendered with default inline padding, producing hitboxes as small as $13\text{px}$ to $30\text{px}$ height. On touchscreens and kiosk terminals, this caused mis-taps and failed WCAG 2.5.5 / 2.5.8 touch target requirements.
- **Solution**:
  - Enforced `min-h-[44px] min-w-[44px] inline-flex items-center justify-center` across all interactive buttons.
  - Added click handler support (`onClick={() => setOpen((prev) => !prev)}`) to `JargonTooltip` so mobile touch users without hover cursors can easily inspect glossary definitions.
  - Retained clean typography by using `flex items-center justify-center` so that text font size remains compact while the interactive touch footprint satisfies $\ge 44\text{px} \times 44\text{px}$.

### 2. Framer Motion `whileInView` IntersectionObserver Margin Trap on Landing Pages
- **Problem**: In `CapabilityGrid.tsx`, cards used `viewport={{ once: true, margin: "-60px" }}` with `initial={{ opacity: 0, y: 28 }}`. On rapid page scrolls, automated audit captures, or shorter viewports, the negative margin prevented the IntersectionObserver from triggering the entrance transition, resulting in an $800\text{px}$ empty black void.
- **Solution**: Replaced negative margin with `viewport={{ once: true, amount: 0.05 }}` and set initial visibility to a subtle preview `initial={{ opacity: 0.15, y: 16 }}`. Cards immediately trigger smoothly upon 5% entering the viewport, ensuring zero blank voids.

### 3. Strategy Canvas Scroll Ergonomics & Active Pill Telemetry Contrast
- **Problem**: With deep telemetry stacks (Pit Window Timeline $\to$ Pit Exit Call $\to$ Tyre Degradation $\to$ 3D Tyre Thermal $\to$ AI Race Control $\to$ Catch-Up Predictor $\to$ Scenarios), users lacked clear visual affordance that rich modules existed below the fold. In addition, Race Control category filter pills had subtle active styling that blended into the dark background.
- **Solution**:
  - Added a dedicated scroll affordance header banner (`Extended Telemetry: Tyre Thermal · Race Control · Catch-Up · Scenarios`) with an animated indicator chevron, plus an end-of-deck marker at the canvas base.
  - Enhanced active category filter pills with high-contrast cyan glow (`bg-cyan-950/80 text-cyan-200 border-cyan-400 font-bold shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-500/50`) and an active indicator dot (`bg-cyan-400`).

---

## [2026-11-24] AI Race Control & Steward Investigation Engine, Tailwind Line-Clamp Display Collapse & Route Interception Dynamics (Issue #73 / V2.1)

### 1. Next.js Turbopack & Tailwind CSS `line-clamp` Display Collapse Trap
- **Problem**: Applying utility class `line-clamp-2` on `<p>` elements inside responsive flex/grid layouts in Next.js Turbopack caused Chromium to resolve `display: flow-root` with `rect.height = 0` (`offsetHeight: 0`). Playwright flagged the element as `hidden`, failing `toBeVisible()` assertions despite the text node being present in the DOM tree.
- **Solution**: Prefer explicit `break-words leading-snug` with container boundary constraints for text wrapping rather than `line-clamp` on critical telemetry cards, preventing browser layout engines from collapsing block heights to 0.

### 2. API URL Prefix Alignment in Playwright Route Mocks
- **Problem**: Frontend services configure `apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api"`. In environments where `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001`, endpoints resolve to `http://localhost:8001/race-control/feed` (without `/api`). A Playwright route mock pattern `page.route("**/api/race-control/feed*")` failed to match, allowing un-intercepted network requests to escape and fail with `Failed to fetch`.
- **Solution**: Use resilient route wildcard patterns: `page.route("**/race-control/feed*")` and `page.route("**/race-control/investigate*")` to reliably intercept requests regardless of whether the base URL contains `/api`.

### 3. Scroll Container Visibility & Defensive Array Handling
- **Problem**: In high-density pit-wall dashboards with nested scroll containers (`div.overflow-y-auto`), components placed below the fold (e.g. below 3D Tyre Thermal) require explicit scroll targeting. Furthermore, if telemetry messages contain optional or undefined driver arrays, calling `.length` crashes React into the error boundary.
- **Solution**: Explicitly invoke `scrollIntoViewIfNeeded()` on both parent panels and target incident cards before asserting `toBeVisible()`. Ensure all dynamic arrays have safe fallback defaults (`(item.drivers_involved || [])`) to guarantee fail-safe UI rendering.






