---
name: ui-ux-designer
description: >
  UI/UX design skill for F1 Virtual Engineer's Mission Control interface.
  Activate whenever designing new layouts, re-working existing screens,
  proposing component changes, or evaluating information architecture.
  Ensures all design decisions align with the Apple × Automotive aesthetic
  and the "data-dense but legible" principle used throughout the app.
---

# UI/UX Designer — Mission Control

## Core Design Philosophy

> "Every pixel serves a purpose. If it isn't data, it earns its space."

Mission Control is a **race engineer's cockpit**, not a dashboard. Information
hierarchy must match how a race engineer actually thinks:
1. **Headline decision** — what do I do, when?
2. **Confidence signal** — how sure is the system?
3. **Evidence** — why this call, what data supports it?
4. **Context** — tyres, rival, weather.
5. **Alternatives** — what-if scenarios.

## Design System

### Layout Principle: Zone-Based Architecture
The viewport is divided into three fixed zones:
- **Left Rail** (`w-14`): global nav icons only, no labels.
- **Main Canvas** (flex-1): primary visualisation area — NEVER leave this empty.
- **Right HUD** (`w-72`): strategy decisions, metadata, history.

**Rule**: The Main Canvas must always render something meaningful.
In Strategy mode, it MUST show strategy-specific visualisations,
not blank telemetry charts with "NO DATA".

### Mode Contracts
| Mode      | Main Canvas shows                        | HUD shows                          |
|-----------|------------------------------------------|------------------------------------|
| TELEMETRY | Speed / Throttle / Brake charts + LapΔ  | Tyre, rationale, citations, history|
| STRATEGY  | Pit window timeline + Tyre wear arc + Scenario cards | Summary, why-this-call, references |

### Color Tokens (from globals.css)
- `--accent` (#FF2800) — only for primary CTA and critical data points
- `--status-ok` (green) — positive signals, undercut viable
- `--status-warn` (amber) — risk, fallback, estimate
- `--status-error` (red) — high undercut risk, alert
- `--status-info` (blue/teal) — neutral informational
- `--foreground-dim` — secondary text, labels
- `--foreground-faint` — tertiary text, units

### Typography Rules
- **Section labels**: `label` class — small-caps, 0.6rem, tracking-wide
- **Data readout**: `readout` class — JetBrains Mono, tabular numbers
- **Big numbers**: `text-base font-bold` + accent color for pit laps
- **Body rationale**: `text-[0.7rem] leading-relaxed text-foreground-dim`

### Component Patterns
- **Zero border-radius** on all interactive elements and chart containers
- **1px borders** using `--border` or status colors — no shadows except HUD panels
- **Glassmorphism**: `backdrop-blur-sm bg-surface/60` on floating panels only
- **Micro-animation**: framer-motion `initial={{ opacity: 0, y: 8 }}` on data reveals
- **No rounded corners** — the only exception is team badge icons
- **No placeholder text in main canvas** — show a loading skeleton or meaningful empty state

### Empty States
- Loading: animated skeleton bars matching the shape of the expected content
- No data yet: a contextual prompt explaining what the user needs to do
- Error: red-bordered status bar with specific failure reason

## Strategy Mode — Design Mandates

### Main Canvas MUST contain in Strategy mode:
1. **Pit Window Timeline** — a horizontal lap-axis bar showing the full race
   distance, with the recommended pit window highlighted, actual stops marked,
   and the tyre cliff annotated.
2. **Tyre Wear Arc** — a compact visual showing stint length vs degradation
   curve with the cliff lap.
3. **Scenario Comparison Cards** — the what-if grid, promoted from the HUD
   collapse to a first-class canvas element (still uses `/strategy/compare`).
4. **Gap / Undercut Gauge** — visual representation of gap to rival vs
   pit-loss threshold.

### Right HUD in Strategy mode:
- Keep: analysis status bar, pit window headline, confidence band, citations
- Remove from HUD: scenario comparison cards (move to canvas)
- Keep compact: WhyThisCallPanel stays collapsible in HUD

### Information Density
- Prefer 2-column grid for scenario cards on canvas (min 480px per card)
- Use `grid-cols-1 md:grid-cols-2` — never force 3 columns on 1440px
- Charts: minimum 120px height, preferred 180px for primary chart

## Brainstorm Process

When asked to brainstorm, follow this order:
1. Identify the **user job-to-be-done** in this mode
2. List the data available from the API for this mode
3. Map data → visual component (what chart type fits this data?)
4. Propose a layout with zone assignment
5. Rate each proposal: Impact (H/M/L) × Effort (H/M/L)
6. Output a ranked implementation plan

## Anti-Patterns to Avoid
- ❌ Blank/empty main canvas in any mode
- ❌ Showing telemetry charts in Strategy mode (they're irrelevant)
- ❌ More than 4 scroll-depth items in HUD before fold
- ❌ Generic "No data available" without context
- ❌ Charts without labels, units, or axis context
- ❌ Auto-expanding all panels by default (causes scroll fatigue)
- ❌ Mixing strategy and telemetry content in same canvas view
