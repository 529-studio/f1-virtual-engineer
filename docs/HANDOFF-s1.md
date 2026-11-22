# S1 Handoff & Sprint S2 Horizon

**Document**: `docs/HANDOFF-s1.md`  
**Date**: 2026-11-22  
**Repository**: `529-studio/f1-virtual-engineer`  
**Charter**: Transition ledger for a fresh conversation: branch state, merged deliverables, open work, settled decisions, pitfalls, and the next sprint's tasks.

---

## 1. Branch & Commit Status

- **Active branch**: `develop`
- **Head commit**: `20e5cfb` (`Merge pull request #67 from 529-studio/feature/64-realtime-track-car-tracker`)
- **Worktree**: clean
- **Merged in this sprint**:
  - PR #65 (`feature/62-fuel-correction-export`)
  - PR #66 (`feature/63-advanced-telemetry-cockpit`)
  - PR #67 (`feature/64-realtime-track-car-tracker`)

---

## 2. Merged Deliverables

| PR | Task | Subsystem | Delivered capability |
| :-- | :--- | :-------- | :------------------- |
| #65 | S1-T1 (Issue #62) | `backend/tools`, `backend/app/routers` | Fuel lap-time correction engine (`fuel_helper.py`), FastF1 raw telemetry exporter to CSV/Parquet (`telemetry_export.py`), multi-lap stint telemetry compare endpoint `/api/telemetry/stint-compare`. |
| #66 | S1-T2 (Issue #63) | `frontend/src/components/mission-control` | Advanced Telemetry Cockpit UI with G-G Friction Circle SVG canvas (`GGFrictionCanvas.tsx`), Oversteer/Understeer Steering Trace card (`SteeringTraceCard.tsx`), Multi-lap Stint Comparison modal (`StintCompareModal.tsx`), Telemetry Export action button with $\ge 44\text{px}$ touch target (`ExportButton.tsx`). E2E Playwright tests (`frontend/e2e/advanced-telemetry.spec.ts`) passing across Desktop, Tablet, Mobile. |
| #67 | S1-T3 (Issue #64) | `frontend/src/components/live`, `frontend/src/lib/stores` | Real-time 2D Track Car Tracker (`TrackMapCanvas.tsx`) with animated SVG car pills along track spline, in-memory 75s ring buffer broadcast sync slider (`BroadcastDelaySlider.tsx`, `useLiveStore.ts`), radial SVG overtake probability gauge (`OvertakeProbabilityGauge.tsx`), 24-sector dominance ribbon (`MiniSectorBar.tsx`), split live race cockpit view (`LiveRacePanel.tsx`). E2E Playwright tests (`frontend/e2e/live-tracker-sync.spec.ts`) passing across Desktop, Tablet, Mobile. |

---

## 3. Open Issues & Backlog

- **GitHub Issues**: 0 open issues on `529-studio/f1-virtual-engineer`.
- **GitHub Pull Requests**: 0 open PRs.
- **V2.1 Backlog Candidate Features**:
  - **Feature 1**: AI Team Radio Voice & Whisper Transcription (Web Audio API waveform player, Whisper STT streaming, tactical sentiment & urgency tags).
  - **Feature 2**: Tyre Thermal Surface Degradation 3D/Isometric (Inner/Center/Outer carcass and tread thermal bands, blistering/graining telemetry warnings).
  - **Feature 3**: AI Race Control & Steward Investigation Engine (automated track limits/collision incident detection against FIA Sporting Regulations RAG).

---

## 4. Settled Architectural Decisions

- `docs/adr/0001-redis-l2-cache.md` — Redis L2 caching layer with fast-fail fallback for heavy FastF1 telemetry and lap queries.
- Strict 4-file pattern for all frontend feature modules: `types/*.ts` (DTOs) -> `services/*.ts` (API fetch) -> `hooks/*.ts` (Zustand/SWR) -> `components/*.tsx` (UI).
- Hard rule: Zero unicode emojis in UI. Vector icons exclusively from `lucide-react` or bespoke SVG.
- Kiosk ergonomics: Minimum $44\text{px} \times 44\text{px}$ interactive touch targets across all viewports.

---

## 5. Pitfalls Encountered

- **Next.js Standalone CSS Missing in Playwright**: With `output: "standalone"` enabled, running `node .next/standalone/server.js` fails to serve `/_next/static` unless `.next/static` and `public/` are copied into `.next/standalone/`. This caused headless UI tests to render unstyled markup (e.g. 33px buttons failing 44px checks). Solution configured in `playwright.config.ts`.
- **React 19 `react-hooks/set-state-in-effect`**: Calling state setters directly in `useEffect` causes ESLint compilation errors in Next.js 15 / React 19. State animations must use `requestAnimationFrame` with dirty checks or derived state calculations.
- **Playwright Selector Strictness**: Locators matching short driver acronyms (e.g. `getByText("VER")`) collide across timing ladders, track maps, and overtake gauges. Locators must always be scoped to specific section containers or ARIA roles (`page.getByRole("table").getByText("VER")`).
- **Zsh Double Quote Math Expansion**: Shell commands containing `$[...]` trigger `zsh: bad math expression`. Never use unescaped `$[` within double-quoted strings in shell commands.

---

## 6. Sprint S2 Horizon: Next Tasks

1. Define Team Radio audio stream DTOs and simulated audio feed router — `backend/app/routers/radio.py`
2. Implement Web Audio waveform canvas visualizer and radio message queue card — `frontend/src/components/mission-control/RadioWaveformPlayer.tsx`
3. Expand Whisper speech-to-text pipeline with strategic urgency heuristics and telemetry timestamp sync — `backend/agents/radio_interpreter.py`
4. Formulate Tyre Thermal Surface Degradation model (Inner/Center/Outer thermal bands, lateral slip heat generation) — `backend/tools/tyre_thermal.py`
5. Build interactive SVG Tyre Thermal Heatmap component with thermal degradation thresholds — `frontend/src/components/mission-control/TyreThermalHeatmap.tsx`
6. Integrate real-time blistering/graining alert telemetry badges into Strategy HUD — `frontend/src/components/mission-control/StrategyHUD.tsx`
7. Author Playwright End-to-End test suites across Desktop, Tablet, and Mobile viewports — `frontend/e2e/v2.1-features.spec.ts`

---

## 7. Open Questions For The Human

- Which V2.1 feature should be prioritized first: **Option A (AI Team Radio Voice & Whisper Transcription)** or **Option B (Tyre Thermal Surface Degradation 3D/Isometric)**?
- For Team Radio, is a browser-synthesized audio waveform (Web Audio API synthetic tone / voice mock) preferred over pre-recorded MP3/WAV telemetry radio sample files?
