# 529 Studio Agent Protocol — F1 Virtual Engineer

> **Core Philosophy**: When tackling any task, **never shy away from effort** ("Đừng sợ tốn sức") — dig deep, be thorough, and resolve problems at their root cause. Never cut corners or take lazy shortcuts.

## 1. Evidence-Based DoD & Debugging
- **Passing tests is not enough; bugs and features MUST be verified End-to-End**: 
  - When implementing or modifying features, you MUST create an explicit End-to-End test plan covering real user workflows across viewport breakpoints (Desktop, Tablet, Mobile).
  - You MUST execute end-to-end self-tests hands-on (via Playwright or browser automation), verifying visual rendering, zero horizontal leaks, responsive layout, interaction dynamics, and console/network health.
  - Never claim completion without empirical proof (live cURL output, high-res screenshots, clean console logs, and browser network traces).

## 2. 529 Senior Skills Protocol
Comply with the core pillars from `529-engineering-skills`:
- `resilient-networking-and-waf`: Enforce identified `User-Agent`, assert upstream headers.
- `env-and-auth-ops-debugging`: Ban bare `load_dotenv()`; use explicit `Path(__file__).resolve().parent...`.
- `frontend-4file-and-resilient-ui`: Standard 4-file pattern, always render 3 states (Skeleton, Error, Empty), ensure mobile touch targets $\ge 44\text{px}$.
- `evidence-based-dod-and-llm-guardrails`: Read local docs to prevent deprecation traps, zero-leak secrets.

## 3. UI Design & Iconography Rules (Strict Ban on Emojis)
- **STRICT BAN ON UNICODE EMOJIS**: NEVER use raw unicode emojis (such as ⚡, 🏁, ⚠️, 🏎️, 🔥, 📊, etc.) in user interfaces, telemetry cards, status badges, notifications, buttons, or chart labels. Unicode emojis clash with the professional F1 telemetry pit-wall / Apple automotive aesthetic and appear amateurish.
- **Vector Icons Only**: Always use crisp, scalable vector icons from `lucide-react` (e.g. `Zap`, `Flag`, `AlertTriangle`, `TrendingDown`, `Gauge`, `Timer`, `Activity`, `CheckCircle2`) or bespoke inline SVGs with appropriate stroke widths (`strokeWidth={1.5}` or `1.75`), subtle telemetry tinting, and micro-typography.

## 4. Tech Stack & Git Flow
- **Data & Backend**: FastAPI + LangGraph + Async first. Use local cache in `backend/data`.
- **Frontend**: Next.js + Zustand + Apple/Automotive aesthetic.
- **Git Flow**: Work on `feature/*` branches, pull request into `develop`.
- **Knowledge Loop**: Document post-mortems in `lesson_learn.md` after resolving complex bugs or shipping major features.
