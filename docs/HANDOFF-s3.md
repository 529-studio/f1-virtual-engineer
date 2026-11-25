# S3 Handoff & Sprint S4 Horizon

**Document**: `docs/HANDOFF-s3.md`  
**Date**: 2026-11-25  
**Repository**: `529-studio/f1-virtual-engineer`  
**Charter**: Transition ledger for a fresh conversation: branch state, merged deliverables, open work, settled decisions, pitfalls, and the next sprint's tasks.

---

## 1. Branch & Commit Status

- **Active branch**: `develop`
- **Head commit**: `75d57a5` (`Merge pull request #92 from 529-studio/feature/85-s3-e2e-suite`)
- **Worktree**: clean
- **Merged in this sprint**:
  - PR #87 (`feature/80-chassis-cad-blueprint`): Next-Gen F1 Chassis CAD Blueprint & Custom Dark-Glass Scrollbars (Closes #80, #86)
  - PR #88 (`feature/81-pace-delta-matrix`): Multi-Driver Pace Delta Matrix & Sector Split Engine (Closes #81)
  - PR #89 (`feature/82-tyre-degradation-cliff-advisor`): Pirelli Tyre Degradation Polynomial Model & Stint Cliff Advisor (Closes #82)
  - PR #90 (`feature/83-voice-pit-wall-audio`): Hands-Free Pit-Wall Voice Synthesizer with Realistic Radio Distortion (Closes #83)
  - PR #91 (`feature/84-ghost-lap-telemetry-overlay`): Head-to-Head Ghost Lap Telemetry Trace Overlay Canvas (Closes #84)
  - PR #92 (`feature/85-s3-e2e-suite`): Sprint 3 Consolidated Multi-Viewport Playwright E2E Suite (Closes #85)

---

## 2. Merged Deliverables

| PR | Task | Subsystem | Delivered capability |
| :-- | :--- | :-------- | :------------------- |
| #87 | S3-T1 & S3-T7 (Issues #80, #86) | `frontend/src/components/mission-control/F1ChassisBlueprint.tsx`, `IsometricTyreCanvas.tsx`, `frontend/src/app/globals.css` | Next-Gen 2026 Ground Effect F1 Chassis CAD Blueprint SVG with aerodynamic flow streamlines, halo fairings, venturi strakes, and custom dark-glass scrollbars replacing OS default scrollbars. |
| #88 | S3-T2 (Issue #81) | `backend/app/schemas/pace_delta.py`, `backend/tools/pace_delta.py`, `backend/app/routers/pace.py`, `frontend/src/components/mission-control/PaceDeltaMatrix.tsx` | Real-time multi-driver pace delta matrix calculating sector-by-sector splits (S1/S2/S3) against selectable baseline reference drivers (LEC/VER/PIA/NOR/HAM) with micro-sector heat tints and kiosk ergonomics ($\ge 44\text{px}$). |
| #89 | S3-T3 (Issue #82) | `backend/app/schemas/tyre_degradation.py`, `backend/tools/tyre_degradation_model.py`, `backend/app/routers/tyre_degradation.py`, `frontend/src/components/mission-control/StintCliffAdvisor.tsx` | Pirelli tyre degradation polynomial model ($L(t) = a + bt + ct^2 + dt^3$) calculating projected stint cliff laps, grip percentage trajectories, and optimal pit window triggers for SOFT/MEDIUM/HARD compounds. |
| #90 | S3-T4 (Issue #83) | `frontend/src/services/pitWallAudio.ts`, `frontend/src/components/mission-control/VoicePitWallAudio.tsx` | Hands-free pit-wall audio synthesizer utilizing Web Speech API combined with a Web Audio API biquad bandpass filter ($800\text{Hz}-3\text{kHz}$) and white-noise squelch burst generator for authentic F1 pit radio distortion. |
| #91 | S3-T5 (Issue #84) | `frontend/src/components/mission-control/GhostLapOverlay.tsx` | Synchronized dual-driver telemetry trace canvas along Monza 5793m distance datum with dynamic speed polylines, cumulative delta progression, corner markers, and interactive hover scrubber. |
| #92 | S3-T6 (Issue #85) | `frontend/e2e/s3-features.spec.ts` | Consolidated multi-viewport Playwright E2E test suite validating all Sprint 3 features across Desktop (1440x900), Tablet (834x1112), and Mobile (390x844) with zero emoji, zero horizontal scroll leak, and kiosk touch compliance. |

---

## 3. Open Issues & Backlog

- **GitHub Issues**: 0 open issues on `529-studio/f1-virtual-engineer`.
- **GitHub Pull Requests**: 0 open PRs.
- **Sprint S4 Candidate Features**:
  - **Feature 1**: Driver Telemetry Radar Chart (6-axis spider graph evaluating Braking, Cornering, Throttle Pick-Up, Tyre Management, Top Speed, and Consistency).
  - **Feature 2**: DRS Zone Efficiency & Top Speed Trap Optimizer (evaluates wing aerodynamic load vs straight-line speed delta).
  - **Feature 3**: Dynamic Live Track Position Minimap with Real-Time Spline Interpolation (smooth 60fps car dots along actual circuit GPS coordinates).
  - **Feature 4**: Automated Post-Race Steward Incident Report Exporter (generates formatted PDF/Markdown steward deliberation report).
  - **Feature 5**: FIA Sporting Regulations Rulebook RAG Assistant Deep Search (hybrid vector + BM25 search with regulation citation links).

---

## 4. Settled Architectural Decisions

- **CAD Blueprint Vector Architecture**: Minimalist SVG vector blueprint chosen over 3D WebGL (Three.js) to guarantee zero client bundle bloat, zero GPU compilation latency, instant hydration, and 100% deterministic headless testing across all viewports.
- **Custom Dark-Glass Scrollbar Architecture**: Applied global CSS standards (`* { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.16) transparent; }` and `-webkit-scrollbar` pseudoclasses) to eliminate default gray scrollbars while preserving native smooth scrolling dynamics.
- **Dual-Filter Audio Processing**: Radio distortion combines Web Speech API synthesis with Web Audio API nodes (`BiquadFilterNode` peaking filter + pink/white noise buffer burst) to emulate realistic team radio transmission acoustics.
- **Kiosk Touch Ergonomics ($\ge 44\text{px}$)**: All interactive buttons, chips, and controls must strictly satisfy WCAG 2.5.5 touch target size ($\ge 44\text{px} \times 44\text{px}$) with `min-h-[46px] min-w-[46px]` classes.
- **Strict Ban on Raw Unicode Emojis**: System-wide ban enforced in code and verified via automated Playwright regex scanning; exclusively use scalable `lucide-react` vector icons.

---

## 5. Pitfalls Encountered

- **Playwright Glob Pattern Matching**: Using `**/*<endpoint>*` can fail to match full URLs with query parameters in headless Chromium if single `*` does not cross path delimiters. Use regex patterns (`page.route(/.*<endpoint>.*/, ...)`) for guaranteed route interception.
- **Next.js Body Text Locator vs `<main>`**: `/mission-control` is structured with top-level container `div`s inside `body` rather than a `<main>` semantic element. Playwright assertions checking whole-page text must query `page.locator("body")` to avoid timeout hangs.
- **State Transition Button Selectors**: Interactive action buttons that alter their text and `aria-label` upon state change (e.g. `RADIO CALLOUT` vs `STOP TRANSMIT`) require resilient regex matchers (`/callout|transmit/i`) in test assertions.
- **Relative Pytest Execution Directory**: Running `pytest` inside the `backend/` directory created accidental nested cache paths `backend/backend/data/`. Always execute backend test passes from repository root via `pytest backend/tests/...`.

---

## 6. Sprint S4 Horizon: Next Tasks

1. Define Driver Radar Performance DTOs — `backend/app/schemas/driver_performance.py`
2. Implement backend 6-axis performance metrics calculator — `backend/tools/driver_performance.py` & `backend/app/routers/performance.py`
3. Build responsive Driver Performance Radar Spider Chart — `frontend/src/components/mission-control/DriverRadarChart.tsx`
4. Formulate DRS zone efficiency and drag reduction model — `backend/tools/drs_optimizer.py`
5. Implement DRS Speed Trap Optimizer telemetry component — `frontend/src/components/mission-control/DrsOptimizerCard.tsx`
6. Build 60fps Track Car GPS Spline Interpolator — `frontend/src/components/mission-control/LiveTrackGpsSpline.tsx`
7. Implement Post-Race Steward Incident Report Exporter — `frontend/src/components/mission-control/StewardReportExporter.tsx`
8. Author comprehensive multi-viewport Playwright End-to-End test suite for S4 features — `frontend/e2e/s4-features.spec.ts`

---

## 7. Open Questions For The Human

- For the Driver Performance Radar Chart, should the 6-axis metric scale be dynamically normalized against the session-fastest driver (0 to 100%), or calibrated against absolute historic benchmarks?
- For the Steward Incident Report Exporter, should we generate client-side downloadable Markdown / PDF, or integrate with an automated GitHub Issue / Slack webhook notification channel?
