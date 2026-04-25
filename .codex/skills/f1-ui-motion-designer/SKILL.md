---
name: f1-ui-motion-designer
description: Design or rework F1-themed landing pages, product surfaces, and motion-first UI experiences for this indie-hacker repo. Use when a task asks for stronger visual identity, modern UI/UX direction, motion design, landing page restructuring, reference synthesis, or implementation planning for a cinematic but buildable frontend.
---

# F1 UI Motion Designer

## Goal

Create a landing page or product surface that feels unmistakably Formula 1:

- fast,
- precise,
- technical,
- premium,
- demoable by a solo builder.

Prefer a strong branded experience over generic SaaS blocks, but keep the implementation realistic for Next.js + Tailwind.

## Design stance for this repo

Optimize for an indie hacker MVP:

- one memorable hero moment,
- a small set of high-leverage motion patterns,
- reusable visual primitives,
- clear product understanding within 5 seconds,
- performance and accessibility that survive real devices.

Do not design an expensive agency-only concept that depends on custom WebGL, video production, or weeks of asset work unless the user explicitly asks for it.

## Core F1 visual vocabulary

Use these motifs selectively, not all at once:

- telemetry traces,
- speed-line gradients,
- sector timing bars,
- racing line curves,
- tyre compound color accents,
- carbon-fiber or brushed-metal texture hints,
- pit-wall dashboard cards,
- grid systems and HUD overlays,
- countdown / lap / delta language,
- redline or DRS-style highlight moments.

## Recommended UX structure

For a landing page, bias toward this sequence:

1. **Cinematic hero**
   - bold statement of product value,
   - one dominant motion moment,
   - primary CTA,
   - supporting telemetry/HUD artifact.
2. **What the product actually does**
   - 3 to 4 capability modules,
   - each tied to user outcomes, not vague AI claims.
3. **Why this feels different**
   - strategy reasoning,
   - telemetry-backed insights,
   - explainability,
   - fast demo flow.
4. **Interface preview / mission-control strip**
   - show how the dashboard or query flow works.
5. **Conversion CTA**
   - enter mission control,
   - explore telemetry,
   - see strategy analysis.

## Motion heuristics

Prefer motion that communicates speed, precision, and system confidence:

- staggered reveal for headline and metrics,
- scroll-linked opacity/translate/scale changes,
- sticky storytelling blocks,
- metric counters or telemetry sweeps,
- horizontal track or timeline movement,
- hover states with subtle glow/parallax,
- section transitions that feel like mode switches.

Avoid:

- random floating blobs,
- too many simultaneous loops,
- heavy animation with no information value,
- mobile-hostile parallax,
- flashy effects that obscure CTA clarity.

## Implementation guidance

Default stack recommendation:

- Tailwind for layout and visual system,
- CSS gradients, masks, shadows, and transforms for most effects,
- Framer Motion for orchestrated entrance/scroll/hover motion,
- optional lightweight SVG paths for telemetry/racing-line visuals.

Only escalate to heavier animation stacks if the user explicitly wants advanced scenes that cannot be achieved with CSS + Framer Motion.

## Technical review checklist

Before implementation or issue creation, define:

- visual concept in one sentence,
- section list,
- motion system,
- component boundaries,
- fallback behavior for reduced motion,
- mobile simplifications,
- performance budget,
- acceptance criteria tied to visible UX outcomes.

## Output expectations

When using this skill, provide:

1. concept direction,
2. references/patterns worth borrowing,
3. implementation architecture,
4. phased delivery plan,
5. explicit non-goals,
6. measurable acceptance criteria.
