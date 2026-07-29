---
name: landing-page-designer
description: >
  Visual identity and implementation mandates for the F1 Virtual Engineer
  landing page (f1.529studio.site). Distilled from research on real F1 pit
  wall software UI, premium SaaS hero section patterns (Linear/Vercel/Raycast),
  and official F1 brand visual language.
---

# Landing Page Designer Skill

## Research Basis

### Real F1 Pit Wall Software (source material)
- **McLaren ATLAS**: oscilloscope-style multi-channel traces, tabbed workbooks,
  kdb+ time-series data feed. Sub-millisecond telemetry. Black canvas + color-coded traces.
- **Ferrari WinTAX/System 5**: multi-lap overlay analysis, histogram suspension plots,
  automated anomaly event triggers.
- **Mercedes RaceWatch (Palantir/AWS)**: unified audio + gap prediction + weather radar
  + tire degradation modelling on one screen.
- **Red Bull / Oracle**: millions of simulation iterations per lap, SC/VSC probability.

### Real Pit Wall Monitor Layout (3–6 screens)
1. Primary telemetry traces (Speed, Throttle, Brake, Gear, DRS)
2. Timing tower: sector times, speed traps, gap intervals
3. GPS track map + car icons + delta bubbles
4. Wear degradation curves + pit window overlay + weather radar
5. Comms panel: audio waveform analyzer + radio status logs

### Steering Wheel Display Anatomy (McLaren PCU-8D, 480x272)
- Center: large monospaced gear indicator
- Top L/R: speed km/h + RPM bar
- Middle: live delta time (green = ahead, red = behind)
- Bottom L: brake bias %, Bottom R: ERS SOC %
- Tire quadrant: 4-corner thermal grid

---

## Design Philosophy

> "Signal over noise. Data is the hero. Not graphics."

The F1 Virtual Engineer landing page must feel like stepping into a real pit wall:
purposeful, precise, premium — not a consumer app. Every element earns its place.

**Three pillars:**
1. **Engineering aesthetic** — black canvas, monospaced readouts, thin 1px borders
2. **Speed language** — diagonal lines, tight italic display type, motion that feels fast
3. **Data as hero** — live animated charts replace lifestyle photography

---

## Color System

### Canvas & Surface
```
--bg-carbon:    #080808    /* true black, OLED-first */
--bg-surface:   #131313    /* card surface */
--bg-elevated:  #1c1c1c    /* modal / elevated surface */
```

### Brand Accent (F1 Identity)
```
--f1-red:       #E10600    /* official F1 Warm Red — CTA, alerts */
--f1-red-glow:  rgba(225,6,0,0.18)  /* ambient glow behind hero */
--f1-red-dim:   rgba(225,6,0,0.10)  /* badge backgrounds */
```

### Status Colors (stable, never team-remapped)
```
--ok:           #22c55e    /* sector PB, viable gap */
--warn:         #f59e0b    /* cliff approaching, marginal window */
--error:        #ef4444    /* past cliff, undercut risk HIGH */
--info:         #38bdf8    /* neutral data, citations */
```

### Team Accent Colors (applied via data-theme)
| Team      | Primary       | Secondary      |
|-----------|---------------|----------------|
| Ferrari   | #DC0000       | #FFF200        |
| McLaren   | #FF8000       | #0090FF        |
| Red Bull  | #3671C6       | #CC1E4A        |
| Mercedes  | #00D2BE       | #C0C0C0        |
| Alpine    | #FF87BC       | #0090FF        |

---

## Typography

### Display / Headline
- Font: `-apple-system, "SF Pro Display"` with `font-style: italic` for hero
- Weight: 800-900
- Tracking: `--track-display: -0.04em` (tight, speed-forward)
- Line-height: 0.92-0.95 (compressed, aggressive)

### Monospace Data Readouts
- Font: `"JetBrains Mono", "SF Mono", ui-monospace`
- Use for: sector times, lap deltas, speed values, status badges
- Size: 0.55rem-0.7rem for labels, up to 2rem for hero stats
- ALWAYS uppercase + `letter-spacing: 0.14em+`

### Anti-patterns
- No serif fonts
- No decorative script
- No gradient text (except rare hero accent word)
- No system emoji in headings

---

## Graphic Language

### Speed Lines
Horizontal 1px red speed lines at the hero — bleeding from left edge.
Use `linear-gradient(90deg, var(--f1-red) 0%, transparent 80%)`.
Width: 120px fixed. NOT full width. Multiple lines stacked 8px apart.

### Scanline Overlay
Subtle CRT/telemetry monitor scanline effect on chart backgrounds only.
Use `repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)`.
Apply via `::after` pseudo-element, `pointer-events: none`.

### Corner Cuts (F1 Wedge)
45-degree corner clip on CTA buttons and hero cards — F1 brand language.
`clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)`.
Use sparingly — primary CTA only.

### Dot Matrix Grid Background
Sub-pixel dot grid — eliminates color banding, adds technical depth.
`background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)`.
`background-size: 24px 24px`.

### Glass Cards (Glassmorphism — restrained)
Background: `rgba(19, 19, 19, 0.85)` + `backdrop-filter: blur(12px)`.
Border: `1px solid rgba(255,255,255,0.10)`.
Bottom inner glow: `box-shadow: 0 1px 0 0 rgba(225,6,0,0.4) inset` — simulates
the red edge light from an actual pit wall monitor edge.

---

## Animation Mandates

### Entry Animations (framer-motion)
Standard FadeUp for all content sections:
- `initial: { opacity: 0, y: 24 }`, `animate: { opacity: 1, y: 0 }`
- `duration: 0.55`, `ease: [0.22, 0.61, 0.36, 1]`

SlideIn from right for hero card / preview panel:
- `initial: { opacity: 0, x: 40 }`, delay: 0.28s

### Chart / Telemetry SVG Animations
Stroke-dashoffset draw-on animation for telemetry line traces.
0 to strokeDasharray over 1.2s with ease-out.
Stagger: 0.1s per trace line (VER first, then HAM).

### Gradient Orb / Glow Pulse
Hero background ambient glow — slow float, not distracting.
`scale: [1, 1.08, 1]`, `opacity: [0.6, 0.9, 0.6]`.
Duration: 6s, `repeat: Infinity`, `ease: "easeInOut"`.

### Hover Effects
- Cards: `translateY(-2px)` + border brightens to `rgba(255,255,255,0.18)` on hover
- CTA buttons: `scale(1.02)` + box-shadow expands (100ms ease)
- Nav links: opacity 0.6 to 1 on hover, no underlines

---

## Hero Section Architecture

Layout (desktop 1024px+): 60/40 split (copy left / HUD card right)

LEFT COLUMN (60%):
1. Eyebrow badge: glowing green dot + "RACE ENGINEER · IN YOUR BROWSER"
2. H1: "Ask any lap.\nGet the call." — bold italic, tight line-height
3. Speed line group (1px red, 3 lines stacked)
4. QuestionRotator (sample queries cycling)
5. Body copy paragraph
6. CTA row: [LAUNCH MISSION CONTROL →] [See a sample query →]
7. Stats bar: 4 agents | Cited | RAG | 92% CI

RIGHT COLUMN (40%):
Glass HUD card containing:
- Header: "LAP DELTA" label + session info + "CITED · 3 SOURCES" badge
- SVG telemetry chart with scanline overlay (draws on mount)
- Sector breakdown grid: S1, S2, S3, Total in monospace readouts

BACKGROUND:
- dot matrix grid (hero-grid class, opacity 0.4)
- Left ambient red glow: radial-gradient behind headline, 400px radius, opacity 0.15

### Anti-patterns for Hero
- No hero background photo (car/race/driver) — too generic, too consumer
- No full-width gradient as main background
- No animated particle field — distracting noise
- No auto-playing video

---

## Section-by-Section Mandates

### 1. Hero (LandingHero)
- MUST: Animated SVG lap delta chart that draws stroke on mount
- MUST: Speed line elements (1px red horizontal bars, left-bleed from left edge)
- MUST: Glass HUD card with scanline overlay on chart area
- MUST: The HUD card has bottom-edge red inner glow (pit monitor aesthetic)

### 2. Capabilities (CapabilityGrid)
- Bento grid 2x2 or 3x2
- Each card: eyebrow label + headline + body + animated micro-icon or SVG preview
- Cards stagger-animate on scroll into view (IntersectionObserver or framer-motion whileInView)

### 3. "How It's Built" (EvalArcSection)
- Vertical timeline arc: 40% -> 65% -> 92%
- Vertical progress line with node dots + labels
- CI gate snapshot widget on right with subtle pulse on the percentage counter
- Section eyebrow: "FOR THE CURIOUS"

### 4. CTA Section (LandingCTA)
- Full-width dark block with red ambient glow (centered radial)
- Single strong headline: "Step into the pit wall."
- One red button, centered — nothing else
- Tiny caption below: "One demo session loaded. Pick any race after that."

---

## Responsive Rules
- Mobile (<768px): single-column, HUD card moves below copy, speed lines hidden
- Tablet (768px+): 50/50 split
- Desktop (1024px+): 60/40 split (copy / card)
- Container: `max-w-6xl` (1152px) with `px-6` gutters

---

## Implementation Stack
- Framework: Next.js App Router, Server Components where possible
- Animation: framer-motion v11 (motion.*, AnimatePresence, whileInView)
- Charts: Custom SVG on landing — no Recharts/Chart.js (keeps bundle lean)
- Key animations in globals.css keyframes, not inline style objects

---

## Quality Bar

A landing page hero MUST achieve:
- First paint impression = "this is a real engineering tool, not a toy"
- Animated telemetry chart visible above the fold (not below)
- Red accent used for CTA and speed lines only — not sprayed everywhere
- All text contrast ratio >= 4.5:1 (WCAG AA)
- prefers-reduced-motion respected — all framer-motion animations wrapped in
  `useReducedMotion()` guard
- Core Web Vitals: LCP <= 2.5s (hero chart is SVG, not a raster image)
- No layout shift from lazy-loaded fonts (use `font-display: swap`)
