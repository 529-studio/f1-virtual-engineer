---
name: mission-control-ux
description: |
  Layout rules and UX patterns for the Mission Control page.
  Use this skill when modifying page.tsx, StrategyHUD, TelemetryChartGrid,
  TrackMapPanel, or any component inside the mission-control route.
---

# Mission Control Layout — Design System

## Core Principle
The app mimics a **race engineer pit wall**: charts and circuit map are always co-visible.
**Never** stack them vertically in the same flex column — they will fight for height.

---

## Viewport Contract
```
h-screen w-screen overflow-hidden
├── NavRail              (48px wide, shrink-0)
└── Main column          (flex-1, flex-col)
    ├── MissionHeader    (shrink-0, ~44px)
    ├── SelectorBar      (shrink-0, ~60px)
    ├── IntentTabBar     (shrink-0, ~36px)
    ├── Content area     (flex-1, min-h-0)   ← HORIZONTAL SPLIT here
    └── MissionFooter    (shrink-0, ~32px)
└── StrategyHUD          (300px wide, shrink-0, flex-col)
```

## Content Area — HORIZONTAL SPLIT (Option A)
```css
/* Content area */
display: flex;
flex-direction: row;    /* ← KEY: horizontal, not vertical */
min-height: 0;
flex: 1;

/* Left: Charts column (60%) */
width: 60%;
display: flex;
flex-direction: column;
min-height: 0;
padding: 12px 16px;

/* Right: Track Map column (40%) */
width: 40%;
display: flex;
flex-direction: column;
min-height: 0;
padding: 12px 16px;
border-left: 1px solid var(--border);
```

### Charts column rules
- Each chart (Speed/Throttle/Brake): `min-h-0 flex-1` — equal height division
- LapDelta chart (when compare active): `min-h-0 flex-1`
- TimeAxis: `shrink-0` — at the bottom, fixed height
- **Minimum** readable chart height: 80px (enforced with `min-h-[80px]`)

### Track map column rules
- TrackMapPanel: `flex-1 min-h-0` — fills remaining height
- TrackMapCanvas SVG: `h-full w-full` — fills its container
- Mode toggle + legend: `shrink-0` — at top/bottom, fixed
- The SVG viewBox is 0–1000 × 0–1000, aspect-ratio is automatic via SVG

---

## StrategyHUD — Tab Structure
```
StrategyHUD (300px, shrink-0)
├── Tab bar: [AI] [HIST] [◉]   (shrink-0)
├── Tab: AI (default)
│   ├── Analysis complete badge
│   ├── Analysis text output
│   ├── Citation chips
│   └── [ANALYZE] button
├── Tab: HIST
│   ├── Recent analyses
│   └── Recently Viewed
└── Tab: RADIO
    └── Radio log entries
```

**Why tabs**: AI analysis needs the full 300px height for useful output.
History/Radio are secondary — user consults them occasionally, not continuously.

---

## TrackMapCanvas Height
- **DO NOT** use `h-[340px]` fixed height on the canvas wrapper
- **DO** use `h-full` — the column provides the height budget
- The SVG scales automatically to fill its container
- Default `heightClass` prop should be `"h-full"` not `"h-[340px]"`

---

## Flex Rules — Cheat Sheet
```
Container (fixed-height ancestor):   height: X; overflow: hidden;
Flex children that must fill height:  flex: 1; min-height: 0;
Children that should NOT shrink:      flex-shrink: 0;
Scrollable overflow child:            overflow-y: auto; (on a shrink-0 or fixed-height wrapper)
```

**Common mistake**: Putting a `shrink-0` fixed-height element (e.g. track map 340px)
inside the same `flex-col` as `flex-1` children → the flex-1 children shrink to near-zero.
**Rule**: If something has a fixed height, it must be in a different flex layer or be scrollable.

---

## Responsive Notes
- At < 1200px viewport: collapse track map into a collapsible panel below charts
- At > 1600px: can widen track map to 45%, charts to 55%
- StrategyHUD always stays 300px (fixed) — hides on mobile

---

## File Locations
| Concern                  | File |
|--------------------------|------|
| Page layout root         | `frontend/src/app/mission-control/page.tsx` |
| Charts (Speed/T/B)       | `TelemetryChartGrid.tsx` |
| Track map canvas         | `TrackMapCanvas.tsx` |
| Track map fetcher        | `TrackMapPanel.tsx` |
| AI + History + Radio HUD | `StrategyHUD.tsx` |
| History panel            | `HistoryPanel.tsx` (to be extracted) |
| Radio panel              | `RadioPanel.tsx` (to be extracted) |
