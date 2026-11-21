# Master Implementation Plan — F1 Virtual Engineer V2.0

> **Status**: APPROVED FOR ISSUE CREATION  
> **Target Release**: Apex-Intelligence V2.0  
> **Protocol**: 529 Engineering Protocols & Evidence-Based DoD (`AGENTS.md`)  

---

## 1. Executive Summary & Architecture Roadmap

Based on the independent audit published at `https://docs.529studio.site`, this plan breaks down the next major evolution of **Apex-Intelligence** into 3 production-grade, highly cohesive engineering issues.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       APEX-INTELLIGENCE V2.0 EPIC                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
 [ISSUE 1: BACKEND CORE]     [ISSUE 2: ADVANCED UI]         [ISSUE 3: LIVE & FAN]
 Fuel-corrected Deg &        G-G Friction Circle,           2D Live Car Tracker,
 Raw Telemetry Export        Steering Trace & Stint Scrub   Broadcast Delay Sync &
 Engine                      Cockpit                        Overtake Probability
```

---

## 2. Issue Decomposition & Technical Specifications

### Issue 1: `feat(strategy): Fuel-corrected tyre degradation model & raw telemetry export engine`
- **Subsystem**: Backend Physics & Data Engineering (`backend/tools/`, `backend/app/routers/`)
- **Core Problems Solved**:
  1. *Fuel Mass Distortion*: F1 cars burn $\approx 1.6\text{kg}$ fuel per lap ($\approx 0.065\text{s/lap}$ time gain). Without adjusting for this, the current `predict_tyre_wear` algorithm under-reports tyre degradation.
  2. *Missing Engineering Channels*: FastF1 provides steering angle, DRS activation status, and lateral/longitudinal acceleration ($a_x, a_y$), but current endpoints drop them.
  3. *Data Analyst Export Deficit*: Analysts cannot export normalized telemetry to Pandas/Jupyter.
  4. *Multi-lap Custom Stint Overlay*: Need arbitrary lap comparison ($Lap_A$ vs $Lap_B$).
- **Key Modules to Create/Modify**:
  - `backend/tools/fuel_helper.py`: Computes nominal fuel burn and corrects lap times:
    $$t_{\text{corrected}}(L) = t_{\text{raw}}(L) + (L - 1) \times \Delta t_{\text{fuel}}$$
  - `backend/tools/telemetry_export.py`: Streaming generator for CSV & Apache Parquet formats.
  - `backend/app/routers/telemetry.py`:
    - `GET /api/telemetry/export?year={y}&event={e}&session={s}&driver={d}&lap={l}&format={csv|parquet}`
    - `GET /api/telemetry/stint-compare?year={y}&event={e}&session={s}&driver={d}&lap1={l1}&lap2={l2}`
  - `backend/tests/test_fuel_helper.py`, `backend/tests/test_telemetry_export.py`.

### Issue 2: `feat(ui): Advanced Telemetry Cockpit (G-G friction circle, steering trace, multi-lap overlay & CSV export)`
- **Subsystem**: Frontend Telemetry Cockpit (`frontend/src/`)
- **4-File Pattern Architecture**:
  1. DTO / Types: `frontend/src/types/telemetry-advanced.ts`
  2. Fetch Service: `frontend/src/services/telemetry-export.api.ts`
  3. Custom Hook: `frontend/src/hooks/useAdvancedTelemetry.ts`
  4. UI Components:
     - `frontend/src/components/mission-control/GGFrictionCanvas.tsx`: Interactive SVG G-G diagram ($a_x$ vs $a_y$) with friction limit ellipse ($\mu \approx 1.8 - 2.2$).
     - `frontend/src/components/mission-control/SteeringTraceCard.tsx`: Steering angle trace over distance with dead-zone and oversteer/understeer flags.
     - `frontend/src/components/mission-control/StintCompareModal.tsx`: Dual lap comparison scrubber.
     - Export CTA Button in `TelemetryChartGrid.tsx` with streaming download handling.
- **Ergonomics & Protocols**:
  - 3 UI States: Skeleton (animated pulse), Error (with retry trigger), Empty.
  - Mobile touch targets $\ge 44\text{px}$.
  - Strict ban on raw unicode emojis (Lucide icons only: `Activity`, `Gauge`, `Compass`, `Download`, `Layers`).
  - Zero horizontal overflow across Desktop (1440px), Tablet (834px), and Mobile (390px).

### Issue 3: `feat(live): Real-time 2D Track Car Tracker & broadcast delay sync slider`
- **Subsystem**: Live Session Visualization & Fan Experience (`frontend/src/components/mission-control/`, `backend/core/live_poller.py`)
- **Core Features**:
  1. *2D Live Car Tracker*: Interpolate 20 car positions on the FastF1 SVG circuit track based on lap distance/sector progress or OpenF1 coordinates. Smooth 60fps animation using `requestAnimationFrame`.
  2. *Broadcast Delay Sync Slider*: Ring-buffer in `useLiveStore` retaining 60 seconds of snapshots. A scrubbable slider ($\Delta t \in [0\text{s}, 60\text{s}]$) lets users match their TV broadcast, preventing spoilers.
  3. *Overtake Probability Gauge*: Live calculation ($0 - 100\%$) derived from DRS status, relative pace delta, tyre age difference, and track-specific overtaking difficulty index.
  4. *Mini-Sector Dominance Map*: 25 micro-sectors color-coded by the current session fastest driver.

---

## 3. Evidence-Based Definition of Done (DoD) & Verification Protocol

Per `AGENTS.md`, no issue shall be closed without empirical verification:

| Criterion | Target Verification | Proof Artifacts |
| :--- | :--- | :--- |
| **Physics Correctness** | Fuel-corrected degradation is strictly verified on historical race sets (e.g., Monza 2024 LEC Stint 1). | `pytest backend/tests/test_fuel_helper.py` output. |
| **Data Integrity Gate** | CSV/Parquet export stream conforms to mime-types `text/csv` and `application/vnd.apache.parquet`. | Live cURL headers + byte inspection. |
| **Component Health** | 3 UI states (Skeleton, Error, Empty) rendered and visually tested. | Automated Playwright screenshots. |
| **Responsive Viewports** | Zero horizontal scroll leak ($scrollWidth == clientWidth$) at 1440px, 834px, 390px. | Playwright assertion script. |
| **Visual Iconography** | Zero raw Unicode emojis. Scalable Lucide vector icons only. | AST grep assertion script. |
| **Network & Console** | Zero unhandled JS exceptions or 4xx/5xx network drops. | Playwright console/network log assertion. |

---

## 4. End-to-End Testing Strategy

### E2E Test Suite 1: `frontend/e2e/advanced-telemetry.spec.ts`
1. Load `/mission-control` with Monza 2024 LEC selected.
2. Verify G-G Friction Circle renders canvas points. Hover over high-lateral point, assert tooltip shows $G_{\text{lat}} > 2.0g$.
3. Trigger "Export Telemetry (CSV)", assert file download event emits `LEC_Italian_Grand_Prix_2024_Lap15.csv`.
4. Switch to Stint Compare mode, select Lap 15 vs Lap 48, assert delta curve renders.
5. Resize viewport to 390x844 (iPhone 14), assert zero horizontal scroll leak.

### E2E Test Suite 2: `frontend/e2e/live-tracker-sync.spec.ts`
1. Switch mode tab to "Live".
2. Verify 20 car dots appear on `TrackMapCanvas` with driver tags (e.g. `LEC`, `VER`, `NOR`).
3. Drag Broadcast Delay Slider to `15s`.
4. Verify tick timestamp adjusts backwards by 15 seconds.
5. Assert Overtake Probability Gauge displays numeric probability between $0\%$ and $100\%$.
6. Check console logs for zero runtime warnings or errors.
