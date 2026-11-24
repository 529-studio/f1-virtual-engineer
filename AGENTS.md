# 529 Studio Agent Protocol — F1 Virtual Engineer

> **Core Philosophy**: When tackling any task, **never shy away from effort** ("Đừng sợ tốn sức") — dig deep, be thorough, and resolve problems at their root cause. Never cut corners or take lazy shortcuts.

---

## 1. Evidence-Based DoD & Debugging
- **Passing tests is not enough; bugs and features MUST be verified End-to-End**: 
  - When implementing or modifying features, you MUST create an explicit End-to-End test plan covering real user workflows across viewport breakpoints: **Desktop (1440x900)**, **Tablet (834x1112)**, and **Mobile (390x844)**.
  - You MUST execute end-to-end self-tests hands-on (via Playwright or browser automation), verifying visual rendering, zero horizontal scroll leaks (`scrollWidth === clientWidth`), responsive layout, interaction dynamics, and console/network health.
  - Never claim completion without empirical proof (live cURL output, high-res screenshots, clean console logs, and browser network traces).
- **Playwright Route Mocking & Wildcard Resilience**:
  - Always use resilient wildcard patterns (`page.route("**/*<endpoint>*")`) rather than rigid prefix patterns like `page.route("**/api/<endpoint>*")`. This ensures mocks match regardless of whether `NEXT_PUBLIC_API_BASE_URL` contains `/api`, a custom port, or a root path.
  - Inject custom `EventSource` mocks via `page.addInitScript()` for Server-Sent Events (SSE) rather than trying to route indefinite SSE streams through `page.route`.
- **Sub-Pixel Kiosk Layout Assertions**:
  - Headless Chromium can compute fractional pixel heights (`43.999px`) due to device pixel ratios or flex scaling. In Playwright assertions, always use `Math.round(box?.height ?? 0) >= 44` to avoid sub-pixel false negatives.
- **Rate-Limiter Concurrency Shielding**:
  - Parallel Playwright test workers querying local FastAPI instances can trigger the 30 req/10s rate limiter (HTTP 429). Tests must either route-mock telemetry feeds or safely filter expected 429 warnings during high-concurrency local test passes.

---

## 2. 529 Senior Skills Protocol & Code Hygiene
Comply with the core pillars from `529-engineering-skills`:
- `resilient-networking-and-waf`: Enforce identified `User-Agent` (e.g. `f1-virtual-engineer/1.0`), assert upstream headers, handle fail-closed envelopes.
- `env-and-auth-ops-debugging`: Ban bare `load_dotenv()`; use explicit `Path(__file__).resolve().parent...`.
- `frontend-4file-and-resilient-ui`:
  - **Standard 4-File Pattern**: Every module must follow DTO (`types/*.ts`) $\to$ API Service (`services/*.ts`) $\to$ Custom Hook (`hooks/*.ts`) $\to$ UI Components (`components/*.tsx`).
  - **Always Render 3 UI States**: Skeleton, Error, and Empty states with actionable CTAs.
  - **Kiosk Ergonomics ($\ge 44\text{px}$)**: All interactive touch targets (buttons, filter pills, glossary tooltip triggers, slider thumbs, scrubber controls) MUST declare `min-h-[46px] min-w-[46px]` (or `min-h-[44px] min-w-[44px] inline-flex items-center justify-center` for inline chips) to satisfy WCAG 2.5.5 touch target requirements.
  - **React 19 State Hygiene**: NEVER call `setState()` synchronously inside `useEffect`. Either compute pure **derived state** during render (`val = raw ?? fallback`), or wrap asynchronous data fetching in `queueMicrotask(async () => { if (!cancelled) await loadData(); })`.
  - **Avoid `line-clamp` on Telemetry Cards**: Next.js Turbopack and Chromium can resolve `line-clamp` inside nested flex layouts with `height: 0` (`display: flow-root`). Use `break-words leading-snug` with explicit container bounds instead.
  - **Defensive Telemetry Arrays**: Always provide safe defaults for dynamic data arrays: `(item.drivers_involved || [])` or `(data?.samples ?? [])` to prevent unexpected error boundary crashes.
- `evidence-based-dod-and-llm-guardrails`:
  - **Defensive FastF1 Session Access**: Never call bare `getattr(session, "weather_data", None)` or access `session.laps` directly; FastF1 implements these as lazy properties that throw `fastf1.exceptions.DataNotLoadedError` on vintage circuits or unloaded sessions. Always wrap in `try ... except Exception:` and return a fail-closed envelope (`fallback: true`).
  - **Physics Rate Balance**: When formulating differential rate models (evaporation vs. drainage vs. precipitation, fuel burn-off vs. tyre degradation cliff), always calibrate physical coefficients against empirical F1 telemetry to avoid mathematical dead-zones (e.g. water film remaining $0\text{mm}$ during active rain).
  - Zero-leak secrets: Never commit credentials, tokens, or live production URLs to version control.

---

## 3. UI Design & Iconography Rules (Strict Ban on Emojis)
- **STRICT BAN ON UNICODE EMOJIS**: NEVER use raw unicode emojis (such as ⚡, 🏁, ⚠️, 🏎️, 🔥, 📊, etc.) in user interfaces, telemetry cards, status badges, notifications, buttons, or chart labels. Unicode emojis clash with the professional F1 telemetry pit-wall / Apple automotive aesthetic and appear amateurish.
- **Vector Icons Only**: Always use crisp, scalable vector icons from `lucide-react` (e.g. `Zap`, `Flag`, `AlertTriangle`, `TrendingDown`, `Gauge`, `Timer`, `Activity`, `CheckCircle2`, `CloudRain`, `Radio`, `Eye`) or bespoke inline SVGs with appropriate stroke widths (`strokeWidth={1.5}` or `1.75`), subtle telemetry tinting, and micro-typography.
- **60fps SVG Animation Performance**: For continuous visual elements (track car coordinates along splines, radar rotating sweep lines), decouple animation from React render passes. Store coordinates in `useRef`, drive updates via `requestAnimationFrame` with exponential lerp, and trigger `setState` only when perceptual displacement thresholds are exceeded.

---

## 4. Tech Stack & Git Flow
- **Data & Backend**: FastAPI + LangGraph + Async first. Use local cache in `backend/data` and Redis L2 cache where configured.
- **Frontend**: Next.js + Zustand + Tailwind CSS + Apple/Automotive dark glass aesthetic.
- **Git Flow**:
  - Work on `feature/*` or `bugfix/*` branches branched from `develop`.
  - Open Pull Requests into `develop`.
  - Require passing CI/CD tests (Backend pytest, Frontend lint & build, Secret scan) before merging with `--admin --merge --delete-branch`.
- **Knowledge Loop**: Document post-mortems in `lesson_learn.md` after resolving complex bugs or shipping major features. Keep lessons categorized with clear Problem, Root Cause, and Architectural Solution.
