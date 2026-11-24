# S2 Handoff & Sprint S3 Horizon

**Document**: `docs/HANDOFF-s2.md`  
**Date**: 2026-11-24  
**Repository**: `529-studio/f1-virtual-engineer`  
**Charter**: Transition ledger for a fresh conversation: branch state, merged deliverables, open work, settled decisions, pitfalls, and the next sprint's tasks.

---

## 1. Branch & Commit Status

- **Active branch**: `develop`
- **Head commit**: `d91a1d2` (`Merge pull request #77 from 529-studio/feature/76-weather-radar-crossover`)
- **Worktree**: clean
- **Merged in this sprint**:
  - PR #68 (`docs/s1-handoff`): S1 handoff documentation (`docs/HANDOFF-s1.md`)
  - PR #69 (`feature/69-team-radio-whisper-cockpit`): AI Team Radio & Whisper Audio Cockpit
  - PR #70 (`docs/compose-desk-srv-01`): Target host comment update
  - PR #71 (`fix/site-url-canonical-origin`): Pin auth callback origin to public hostname
  - PR #72 (`feature/70-tyre-thermal-3d-heatmap`): 3D Isometric Tyre Thermal Degradation Heatmap
  - PR #73 (`feature/73-race-control-steward-engine`): AI Race Control & Steward Deliberation Engine
  - PR #75 (`bugfix/74-kiosk-touch-targets-and-ux`): Mobile kiosk touch targets ($\ge 44\text{px}$) & UX hardening
  - PR #77 (`feature/76-weather-radar-crossover`): Live Track Weather Radar & Compound Cross-Over Predictor

---

## 2. Merged Deliverables

| PR | Task | Subsystem | Delivered capability |
| :-- | :--- | :-------- | :------------------- |
| #69 | S2-T1 (Issue #69) | `backend/app/routers/radio.py`, `frontend/src/components/mission-control/RadioWaveformPlayer.tsx` | AI Team Radio cockpit with Singapore 2023 telemetry fixtures, Web Audio API waveform visualizer, Whisper transcript display, tactical sentiment tags, and multi-viewport E2E tests (`frontend/e2e/team-radio.spec.ts`). |
| #72 | S2-T2 (Issue #70) | `backend/tools/tyre_thermal.py`, `frontend/src/components/mission-control/TyreThermalHeatmap.tsx` | Thermodynamic tyre degradation model calculating inner/center/outer carcass and surface thermal bands, isometric 3D tyre SVG canvas, cross-section heat profile, blistering/graining telemetry alerts, and E2E tests (`frontend/e2e/tyre-thermal.spec.ts`). |
| #73 | S2-T3 (Issue #73) | `backend/tools/race_control_engine.py`, `frontend/src/components/mission-control/RaceControlPanel.tsx` | FIA Sporting Regulations rule engine detecting track limit breaches, collision fault probabilities, steward investigation timelines, penalty severity badges, and E2E tests (`frontend/e2e/race-control.spec.ts`). |
| #75 | S2-T4 (Issue #74) | `frontend/src/components/` | System-wide mobile kiosk touch ergonomics hardening: expanded all interactive touch targets to $\ge 44\text{px} \times 44\text{px}$, fixed landing page capability card grid visibility, improved canvas touch-scroll dynamics, and Playwright touch verification (`frontend/e2e/kiosk-touch-targets.spec.ts`). |
| #77 | S2-T5 (Issue #76) | `backend/tools/weather_radar.py`, `frontend/src/components/mission-control/WeatherRadarCanvas.tsx`, `WeatherRadarPanel.tsx` | Live Doppler weather radar simulator (25km radius sweep), differential water film accumulation ($dh_w/dt = R - D - E$), exponential track grip decay ($\mu_{\text{track}}$), compound cross-over threshold prediction (Slick $\ge 88\%$, Inters $65-88\%$, Wet $<65\%$), and E2E tests (`frontend/e2e/weather-radar.spec.ts`). |

---

## 3. Open Issues & Backlog

- **GitHub Issues**: 0 open issues on `529-studio/f1-virtual-engineer`.
- **GitHub Pull Requests**: 0 open PRs.
- **Sprint S3 Candidate Features**:
  - **Feature 1**: Multi-Driver Pace Delta Matrix (sector split delta matrix comparing active driver against Top 5 leaders in real-time).
  - **Feature 2**: Automated Pit-Wall Speech Synthesizer (hands-free radio readout via Web Speech API with pit-crew radio distortion effect).
  - **Feature 3**: Pirelli Tyre Degradation Polynomial Curve Extrapolation (tyre life cliff prediction based on continuous stint telemetry).
  - **Feature 4**: Head-to-Head Ghost Lap Telemetry Overlay (synchronized dual telemetry trace comparison for qualifying shootout).

---

## 4. Settled Architectural Decisions

- **Frontend 4-File Architecture Pattern**: All modules strictly adhere to DTO (`types/*.ts`) -> API Service (`services/*.ts`) -> Custom Hook (`hooks/*.ts`) -> UI Component (`components/*.tsx`).
- **Zero Raw Unicode Emojis**: Hard protocol ban on emojis in UI; all visual indicators, icons, and status badges exclusively use scalable `lucide-react` vector icons with refined stroke widths (`strokeWidth={1.5}` or `1.75`).
- **Kiosk Ergonomics**: All interactive elements (buttons, slider thumbs, toggles, selectors) must strictly satisfy minimum $44\text{px} \times 44\text{px}$ touch target bounds across Desktop, Tablet, and Mobile viewports.
- **Defensive FastF1 Property Access**: `session.weather_data` and `session.laps` are property getters that throw `fastf1.exceptions.DataNotLoadedError` if accessed improperly; wrap all FastF1 session queries in `try ... except Exception:` returning safe fallback envelopes.
- **React 19 Linting Hygiene**: Never invoke state update functions synchronously inside `useEffect`. Wrap asynchronous initialization in `queueMicrotask` to avoid `react-hooks/set-state-in-effect` linting errors.

---

## 5. Pitfalls Encountered

- **FastF1 DataNotLoadedError Trap**: Calling `getattr(session, "weather_data", None)` triggers property execution in `fastf1.core`, throwing `DataNotLoadedError` on mock or unloaded sessions. Use explicit try-except guards.
- **Evaporation vs. Drainage Equilibrium in Weather Simulation**: Overestimating track drainage and evaporation caused zero net water film accumulation during simulated rainfall. Calibrate drainage to $0.015\text{mm/min}$ and temperature-scaled evaporation to $(T - 15) \times 0.001\text{mm/min}$ for physically realistic wet track transitions.
- **Local Rate Limiting on Parallel E2E Test Runs**: Running multi-viewport Playwright suites concurrently against local FastAPI can hit the `30/10s` rate limit; test harnesses should anticipate or filter expected 429 status codes during rapid suite teardown/setup.
- **Next.js Standalone CSS Asset Routing**: In standalone mode, static assets (`.next/static` and `public`) must be explicitly preserved to prevent unstyled layout shifts during automated browser testing.

---

## 6. Sprint S3 Horizon: Next Tasks

1. Define Multi-Driver Pace Delta DTOs and sector split endpoint — `backend/app/schemas/pace_delta.py` & `backend/app/routers/pace.py`
2. Implement backend sector pace delta comparison engine — `backend/tools/pace_delta.py`
3. Build responsive Multi-Driver Pace Delta Matrix UI table with delta heat tints — `frontend/src/components/mission-control/PaceDeltaMatrix.tsx`
4. Formulate Pirelli tyre degradation polynomial curve fitting model — `backend/tools/tyre_degradation_model.py`
5. Integrate hands-free Web Speech API pit-wall voice announcements — `frontend/src/components/mission-control/VoicePitWallAudio.tsx`
6. Build Head-to-Head Ghost Lap Telemetry Overlay canvas — `frontend/src/components/telemetry/GhostLapOverlay.tsx`
7. Author comprehensive multi-viewport Playwright End-to-End test suite for S3 features — `frontend/e2e/s3-features.spec.ts`

---

## 7. Open Questions For The Human

- For the Multi-Driver Pace Delta Matrix, should comparison be locked to Top 5 drivers automatically, or should the user have a multi-select dropdown to pit any arbitrary drivers against each other?
- For hands-free radio readout, is browser-native Web Speech API sufficient, or should we pipe audio through an audio filter node (biquad bandpass filter) to simulate an authentic F1 pit radio distortion effect?
