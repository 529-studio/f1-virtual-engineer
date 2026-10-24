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
