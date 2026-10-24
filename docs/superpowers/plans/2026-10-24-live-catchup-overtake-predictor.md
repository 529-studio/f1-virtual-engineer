# Implementation Plan: Live Catch-Up & Overtake Predictor (Issue #29)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive, non-linear Catch-Up & Overtake Simulator that projects future lap-by-lap gap convergence, identifies the exact DRS detection capture lap ($G \le 1.0\text{s}$), predicts overtake zones, and flags tyre cliff collisions before the chase stalls.

**Architecture:** A deterministic mathematical simulation engine (`catchup-analytics.ts`) combined with an interactive SVG convergence curve cockpit card (`CatchUpPredictorCard.tsx`) embedded within `StrategyCanvas.tsx`, featuring a live what-if pace slider and F1 pit wall tactical debrief.

**Tech Stack:** TypeScript, React 19, Next.js 16, Vitest (TDD), Tailwind CSS, Framer Motion, Lucide icons.

**Spec:** GitHub Issue #29 (`feat(strategy): Live Catch-Up & Overtake Predictor (Tyre Degradation Delta & DRS Window Engine)`).

---

## Global Constraints
- Comply with `AGENTS.md` and `529-engineering-skills`:
  - `frontend-4file-and-resilient-ui`: Standard 3 states (Skeleton, Error, Empty), minimum touch targets $\ge 44\text{px}$.
  - Resilient layout: Zero horizontal scroll leak (`scrollWidth <= clientWidth`).
  - TDD: Write failing tests first, watch them fail, then write minimal code to pass.
  - Quality gates: 100% passing tests, 0 lint errors, clean production build (10/10 routes).

---

## Review Focus
1. **Starting Inside DRS ($G_0 \le 1.0\text{s}$)**: When chaser is already within 1 second at `currentLap`, the simulation must mark `drsCaptureLap` as immediate and avoid division by zero or negative lap counts.
2. **Tyre Cliff Precedence**: When the chaser hits their compound cliff before reaching the 1.0s window, the simulation must flag `status = "CLIFF_STALLED"` and show the maximum approach distance rather than an erroneous overtake projection.
3. **Pace Delta Inversion (Chaser Slower)**: When leader is pulling away ($\Delta P < 0$), the gap diverges towards infinity; curve must clamp safely at max gap and report `"OUT_OF_LAPS"`.
4. **Final Lap Boundary**: When overtake is projected exactly on the final lap ($L = \text{totalLaps}$), it must be flagged as a "Chequered Flag Climax" rather than an out-of-laps failure.
5. **Interactive Slider Overrides**: When user adjusts the what-if pace delta slider, the calculation must re-evaluate instantaneously without re-fetching network data.

---

## Tasks & Steps

### Task 1: Pure Catch-Up Simulation Engine & Mathematical Models
**Files:**
- Create: `frontend/src/lib/catchup-analytics.ts`
- Test: `frontend/src/lib/__tests__/catchup-analytics.test.ts`

- [ ] **Step 1: Write failing test suite** for catch-up calculations:
  - Standard catch-up with DRS capture on Lap 47 and overtake on Lap 49.
  - Tyre cliff stall (chaser tyre degrades before reaching 1.0s).
  - Out of laps scenario (gap too large).
  - Already inside DRS window ($G_0 \le 1.0\text{s}$).
  - What-if pace slider override.
- [ ] **Step 2: Run tests to verify failure (RED)**:
  - `cd frontend && yarn test catchup-analytics`
- [ ] **Step 3: Implement `catchup-analytics.ts` (GREEN)**:
  - Implement `simulateChaseConvergence()`, `calculateRollingPaceDelta()`, `generateChaseDebrief()`.
- [ ] **Step 4: Run tests to verify they pass (GREEN)**:
  - `cd frontend && yarn test catchup-analytics`
- [ ] **Step 5: Commit**:
  - `git commit -m "feat(strategy): add pure catch-up & overtake simulation engine with TDD unit tests"`

---

### Task 2: Build `CatchUpPredictorCard.tsx` UI Component
**Files:**
- Create: `frontend/src/components/mission-control/CatchUpPredictorCard.tsx`
- Modify: `frontend/src/components/mission-control/index.ts`

- [ ] **Step 1: Create `CatchUpPredictorCard.tsx`**:
  - Skeleton, Empty, and Active states.
  - Dynamic SVG Convergence Graph showing:
    - Trajectory path with gradient fill.
    - 1.0s DRS threshold line with neon dashed stroke.
    - Milestone beads for DRS Capture and Overtake.
  - Metrics Grid: Gap, Pace Delta, DRS Lap, Tyre Cliff margin.
  - Interactive What-If Slider allowing real-time pace delta scrubbing ($\pm 0.8\text{s}$).
  - Pit Wall AI Debrief snippet.
  - Touch targets $\ge 44\text{px}$.
- [ ] **Step 2: Export from `index.ts`**.
- [ ] **Step 3: Verify build and lint**:
  - `cd frontend && yarn lint`
- [ ] **Step 4: Commit**:
  - `git commit -m "feat(mission-control): create CatchUpPredictorCard with interactive SVG convergence curve and what-if slider"`

---

### Task 3: Integration into `StrategyCanvas.tsx` & Mission Control
**Files:**
- Modify: `frontend/src/components/mission-control/StrategyCanvas.tsx`
- Modify: `frontend/src/app/mission-control/page.tsx`

- [ ] **Step 1: Mount `CatchUpPredictorCard`** inside `StrategyCanvas.tsx`:
  - Wire with `driver`, `compareDriver`, `currentLap`, `strat.current_gap_seconds`, `tyreData`.
  - Pass initial historical chase state for Monza demo (LEC vs PIA).
- [ ] **Step 2: Verify responsive layout**:
  - Check desktop side-by-side with TyreCard / GapGauge.
  - Check mobile vertical stacking (0 horizontal scroll leak).
- [ ] **Step 3: Run full verification suite**:
  - `yarn test`
  - `yarn lint`
  - `yarn build`
  - `pytest backend/tests/ -q`
- [ ] **Step 4: Commit**:
  - `git commit -m "feat(strategy): integrate CatchUpPredictorCard into StrategyCanvas with live session sync"`

---

### Task 4: End-to-End Verification & Evidence Collection
- [ ] **Step 1: Launch dev servers and run Playwright tests**:
  - Navigate to `/mission-control` in Strategy mode.
  - Verify `CatchUpPredictorCard` renders with live convergence curve.
  - Verify DRS Capture Lap (L47) and Overtake Lap (L49) markers.
  - Drag What-If slider, verify curve re-projects dynamically.
  - Test mobile viewport (390x844) with zero overflow.
  - Capture Playwright evidence screenshots.
- [ ] **Step 2: Document walkthrough and update `lesson_learn.md`**.
- [ ] **Step 3: Final branch review & PR creation**.
