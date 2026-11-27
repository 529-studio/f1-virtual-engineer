# S4 Handoff & Sprint S5 Horizon

**Document**: `docs/HANDOFF-s4.md`  
**Date**: 2026-11-27  
**Repository**: `529-studio/f1-virtual-engineer`  
**Charter**: Transition ledger for a fresh conversation: branch state, merged deliverables, open work, settled decisions, pitfalls, and the next sprint's tasks.

---

## 1. Branch & Commit Status

- **Active branch**: `develop` (handoff PR from `docs/s4-handoff`)
- **Head commit on `develop`**: `3c20c6d` (`Merge pull request #110 from 529-studio/feature/100-s4-e2e-suite`)
- **Worktree**: clean (`INTERVIEW_DEFENSE.md` is gitignored via PR #106)
- **Merged in Sprint 4**:
  - PR #101 (`bugfix/94-fix-demo-telemetry-ui-regressions`, commit `e3e4281`): Demo telemetry & Mission Control UI regression fixes (Closes #94)
  - PR #102 (`feature/95-driver-telemetry-radar-chart`, commit `b5ad669`): Driver Telemetry 6-Axis Performance Radar Chart (Closes #95)
  - PR #103 (`feature/96-drs-efficiency-optimizer`, commit `85da0a4`): DRS Zone Efficiency & Top Speed Trap Optimizer (Closes #96)
  - PR #106 (`chore/gitignore-interview-defense`, commit `9bb0d0a`): Gitignore local `INTERVIEW_DEFENSE.md`
  - PR #107 (`feature/97-live-track-gps-spline`, commit `34651cb`): 60fps Dynamic Live Track Position Minimap with GPS Spline Interpolation (Closes #97)
  - PR #108 (`feature/98-steward-report-exporter`, commit `055562f`): Automated Post-Race Steward Incident Report Exporter (Closes #98)
  - PR #109 (`feature/99-fia-regulation-assistant`, commit `3be1197`): Interactive FIA Sporting Regulations RAG Assistant & Deep Search (Closes #99)
  - PR #110 (`feature/100-s4-e2e-suite`, commit `3c20c6d`): Sprint 4 Consolidated Multi-Viewport Playwright E2E Suite (Closes #100)

---

## 2. Merged Deliverables

| PR | Task | Subsystem | Delivered capability |
| :-- | :--- | :-------- | :------------------- |
| #101 | S4-T0 (Issue #94) | `frontend/src/components/mission-control/` | Resolved Mission Control demo telemetry hydration and UI formatting regressions. |
| #102 | S4-T1 (Issue #95) | `backend/app/schemas/driver_performance.py`, `backend/tools/driver_performance.py`, `backend/app/routers/performance.py`, `frontend/src/components/mission-control/DriverRadarChart.tsx` | 6-axis hexagonal telemetry radar (Braking, Cornering, Throttle Pick-Up, Tyre Management, Top Speed, Consistency) with `session_relative` / `historic_benchmark` normalization. |
| #103 | S4-T2 (Issue #96) | `backend/app/schemas/drs_optimizer.py`, `backend/tools/drs_optimizer.py`, `backend/app/routers/performance.py`, `frontend/src/components/mission-control/DrsOptimizerCard.tsx` | Monotonic DRS & drag trade-off calculator across `LOW_DRAG`, `BALANCED`, and `HIGH_DOWNFORCE` trims with interactive speed-trap comparison. |
| #107 | S4-T3 (Issue #97) | `frontend/src/components/mission-control/LiveTrackGpsSpline.tsx`, `frontend/src/components/mission-control/LiveRacePanel.tsx` | Decoupled 60fps `requestAnimationFrame` SVG spline minimap across 9 F1 circuits with DRS zone overlays, `.live-car-dot` markers, and interactive driver telemetry popover, replacing the stalled `TrackMapPanel`. |
| #108 | S4-T4 (Issue #98) | `frontend/src/types/stewardReport.ts`, `frontend/src/services/stewardReport.ts`, `frontend/src/components/mission-control/StewardReportExporter.tsx`, `RaceControlPanel.tsx` | Client-side FIA Post-Race Steward Dossier exporter supporting Markdown (`.md`), Clipboard Copy, and Print/PDF (`@media print`) for single incidents or full sessions. |
| #109 | S4-T5 (Issue #99) | `backend/tools/knowledge_retriever.py`, `backend/app/routers/knowledge.py`, `frontend/src/components/mission-control/FiaRegulationAssistant.tsx`, `StrategyHUD.tsx` | Hybrid BM25 + ChromaDB semantic fallback retriever with `category`/`article`/`season` filtering, mounted as the `REGS` tab in `StrategyHUD` with expandable full-article reader. |
| #110 | S4-T6 (Issue #100) | `frontend/e2e/s4-features.spec.ts` | Consolidated multi-viewport Playwright E2E suite verifying all Sprint 4 features across Desktop (`1440x900`), Tablet (`834x1112`), and Mobile (`390x844`). |

---

## 3. Open Issues & Backlog

- **GitHub Issues**: 0 open issues on `529-studio/f1-virtual-engineer`.
- **GitHub Pull Requests**: 0 open PRs (aside from this handoff PR).
- **Sprint S5 Candidate Focus**: Multi-worker horizontal scaling readiness, Redis-backed shared state, and production observability.

---

## 4. Settled Architectural Decisions

- **Decoupled 60fps SVG Animation**: `LiveTrackGpsSpline.tsx` stores per-driver progress in `useRef` and mutates `<g>` `transform` attributes directly inside `requestAnimationFrame` with exponential lerp, avoiding per-frame React `setState` and satisfying React 19 `react-hooks/refs` rules (no `.current` reads during render).
- **Client-Side Steward Dossier Generation**: `stewardReport.ts` generates `.md` and `@media print` HTML deterministically on the client without backend PDF dependencies.
- **Hybrid RAG Filtering**: `knowledge_retriever.py` applies deterministic `category` / `article` / `season` filtering over BM25 and blends `vector_store.semantic_lookup` fail-closed when BM25 returns fewer than `k` hits.
- **Kiosk Ergonomics & Emoji Ban**: All interactive controls enforce `>= 44px` touch targets (`Math.round(box.height) >= 44`) and exclusively use `lucide-react` vector icons.

---

## 5. Pitfalls Encountered

- **React 19 `react-hooks/refs` ESLint Rule**: Reading `ref.current` inside JSX render (`animStateRef.current.get(...)`) fails `yarn lint`. Compute initial render positions purely from props and mutate DOM transforms inside `useEffect`/`requestAnimationFrame`.
- **Existing E2E Selector Coupling**: `frontend/e2e/live-tracker-sync.spec.ts` asserts `.live-car-dot` visibility inside `LiveRacePanel`; any live track map replacement must preserve `.live-car-dot` on car markers.
- **Playwright Hydration Timing**: Reading `document.body.innerText` immediately after `page.goto("/mission-control")` can capture pre-hydration `SYNCING…` state; always `await expect(locator).toBeVisible()` on a target feature card before asserting page-wide text.
- **Protected `develop` Merge Policy**: Direct `gh pr merge --admin` is blocked by pre-tool security hooks and `develop` requires PR approval; open PRs and let the human approve/merge on GitHub.

---

## 6. Sprint S5 Horizon: Next Tasks

1. Migrate `MEMORY_STORE` (`backend/agents/race_engineer.py`) from in-process `deque` to Redis-backed per-session conversation state for multi-worker uvicorn compatibility.
2. Decouple `LivePoller` (`backend/core/live_poller.py`) into a single-producer Redis Pub/Sub / Streams publisher so multi-worker API pods do not multiply upstream OpenF1 calls.
3. Add Redis distributed single-flight locking (`SET NX PX`) around cold FastF1 session loads in `backend/tools/fastf1_helper.py`.
4. Add unit tests for `LiveTrackGpsSpline` spline math and `FiaRegulationAssistant` hook (`frontend/src/hooks/__tests__/useFiaRegulations.test.ts`).
5. Run full-suite Playwright regression across all `frontend/e2e/*.spec.ts` specs against a staging Docker Compose stack (`docker-compose.staging.yml`).
6. Audit `backend/evals/cases/strategy_pit_fixtures.py` to raise eval pass rate from `23/25` (92%) to `25/25` (100%).

---

## 7. Open Questions For The Human

- For Sprint 5 multi-worker scaling, should `LivePoller` run as a dedicated container service in `docker-compose.staging.yml` or remain an elected leader task inside the backend?
- Should `strategy_pit_status.json` be updated via an automated CI step when `test_strategy_pit_eval.py` runs?
