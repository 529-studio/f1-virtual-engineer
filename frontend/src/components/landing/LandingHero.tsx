"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { QuestionRotator } from "@/components/landing/QuestionRotator";
import { JargonTooltip } from "@/components/ui/JargonTooltip";

// ─── Constants ──────────────────────────────────────────────────────────────
// All numeric tokens in one place — no bare literals in render code.
const DEMO_HREF =
  "/mission-control?event=Japanese%20Grand%20Prix&session=R&driver=VER&lap=fastest";

const HERO_STATS = [
  { label: "Multi-agent",   value: "4 agents",  hint: "pit · tyre · weather · pace" },
  { label: "Every call",    value: "Cited",     hint: "linked to FastF1 + regs" },
  { label: "Regulation",    value: "RAG",       hint: "ChromaDB · Gemini embeddings" },
] as const;

// Sector data shown in the HUD card — synthetic but plausible Suzuka 2024 values.
// These exist only to make the hero feel alive on first paint, never quoted as data.
const HERO_SECTORS = [
  { label: "Sector 1", value: "+0.184", positive: true },
  { label: "Sector 2", value: "−0.092", positive: false },
  { label: "Sector 3", value: "+0.221", positive: true },
  { label: "Lap delta", value: "+0.31s", positive: true },
] as const;

// Animation timing constants
const ANIM_EASE = [0.22, 0.61, 0.36, 1] as const;
const ANIM_DUR_COPY = 0.55;
const ANIM_DUR_CARD = 0.65;
const ANIM_DELAY_CARD = 0.28;
const ANIM_DUR_CHART = 1.6;
const ANIM_DELAY_CHART = 0.6;

// Speed line config — 3 lines of decreasing width + opacity
const SPEED_LINES = [
  { width: 120, opacity: 1.0,  delay: 0.05 },
  { width: 80,  opacity: 0.45, delay: 0.10 },
  { width: 44,  opacity: 0.20, delay: 0.15 },
] as const;

// Delta curve — synthetic-but-plausible VER vs HAM at Suzuka
const DELTA_POINTS = [
  0.00, 0.04, 0.09, 0.18, 0.22, 0.19, 0.11, 0.02,
  -0.06, -0.14, -0.21, -0.18, -0.09, 0.04, 0.13, 0.21,
  0.27, 0.31, 0.28, 0.22, 0.17, 0.14, 0.18, 0.24, 0.31,
] as const;

const CHART_W = 380;
const CHART_H = 120;
const CHART_PAD_X = 8;
const CHART_PAD_Y = 12;

const ribbonItems: Array<{ text: string; term?: string }> = [
  { text: "SECTOR 1 +0.184", term: "sector" },
  { text: "SECTOR 2 −0.092", term: "sector" },
  { text: "TYRE MEDIUM" },
  { text: "DRS ENABLED", term: "drs" },
  { text: "PACE DELTA −0.31" },
  { text: "PIT WINDOW LAP 18–22", term: "pit window" },
  { text: "UNDERCUT RISK HIGH", term: "undercut" },
  { text: "REG ART 48.12 · SC RESTART" },
  { text: "BATTERY DEPLOY PUSH" },
  { text: "CONTROVERSY · VSC STRATEGY" },
  { text: "GAP TO LEADER 3.4s", term: "gap" },
  { text: "STEWARD ARGUMENT · ART 33.4" },
  { text: "STINT LENGTH 22 LAPS", term: "stint" },
  { text: "TEAM ARGUMENT · CITED" },
];

// ─── FadeUp ─────────────────────────────────────────────────────────────────
function FadeUp({
  delay = 0,
  children,
  className,
}: {
  delay?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: ANIM_DUR_COPY, ease: ANIM_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── SpeedLineGroup ──────────────────────────────────────────────────────────
// Three 1px red horizontal lines bleeding from left edge — F1 speed language.
function SpeedLineGroup() {
  const prefersReduced = useReducedMotion();
  return (
    <div className="mb-5 flex flex-col gap-2" aria-hidden>
      {SPEED_LINES.map((line, i) => (
        <motion.div
          key={i}
          className="speed-line"
          style={{ width: line.width, opacity: line.opacity }}
          initial={prefersReduced ? {} : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: line.delay, duration: 0.4, ease: ANIM_EASE }}
        />
      ))}
    </div>
  );
}

// ─── LandingHero ─────────────────────────────────────────────────────────────
export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20">
      {/* Dot-matrix background grid */}
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
      {/* Left-column red ambient glow — behind headline */}
      <div className="hero-headline-glow pointer-events-none absolute inset-0" />

      <div className="relative z-10 grid gap-14 lg:grid-cols-[1fr_460px] lg:items-center">

        {/* ── Left column — copy ─────────────────────────────────── */}
        <div>
          {/* Eyebrow badge */}
          <FadeUp
            delay={0}
            className="mb-6 inline-flex items-center gap-2.5 border border-border px-3 py-1.5 readout text-[length:var(--text-label)] uppercase tracking-[var(--track-wide)] text-foreground-dim"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
            Race engineer · in your browser
          </FadeUp>

          {/* Speed lines — above headline, evoke forward motion */}
          <FadeUp delay={0.04}>
            <SpeedLineGroup />
          </FadeUp>

          {/* Hero H1 — italic bold, tight line-height */}
          <FadeUp delay={0.08}>
            <h1
              className="display mb-6 text-[length:var(--text-display)] leading-[0.93] text-foreground"
              style={{ fontStyle: "italic", fontWeight: 800 }}
            >
              Ask any lap.<br />Get the call.
            </h1>
          </FadeUp>

          {/* Sample query rotator */}
          <FadeUp delay={0.14}>
            <QuestionRotator />
          </FadeUp>

          {/* Body copy */}
          <FadeUp delay={0.16}>
            <p className="mb-10 max-w-xl text-[length:var(--text-body)] leading-7 text-foreground-dim">
              Compare drivers, replay strategy, read every pit recommendation backed by FastF1
              telemetry and a regulation-aware corpus. Race analysis auto-detects controversies —
              safety car restarts, VSC windows, track limits — and argues both sides from the FIA
              Sporting Regulations.{" "}
              <span className="text-foreground">No spreadsheets.</span>
            </p>
          </FadeUp>

          {/* CTA row */}
          <FadeUp delay={0.22} className="flex flex-wrap items-center gap-3">
            {/* Primary CTA — F1 wedge clip + red bg */}
            <Link
              href={DEMO_HREF}
              className="f1-clip btn readout bg-[#E10600] px-5 py-3 text-[length:var(--text-label)] text-white transition-opacity hover:opacity-90"
            >
              Open Mission Control on Suzuka 2024 →
            </Link>
            <Link
              href="#capabilities"
              className="readout text-[length:var(--text-readout)] uppercase tracking-[var(--track-wide)] text-foreground-dim transition-colors hover:text-foreground"
            >
              See a sample query →
            </Link>
          </FadeUp>

          {/* Stats bar — large monospace readouts */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            {HERO_STATS.map((s, i) => (
              <FadeUp key={s.label} delay={0.3 + i * 0.08} className="divider pt-4">
                <p className="readout mb-1 text-[length:var(--text-h2)] font-bold text-foreground">
                  {s.value}
                </p>
                <p className="label">{s.label}</p>
                <p className="readout mt-1 text-[length:var(--text-readout)] text-foreground-faint">
                  {s.hint}
                </p>
              </FadeUp>
            ))}
          </div>
        </div>

        {/* ── Right column — animated HUD card ─────────────────────── */}
        <HudCard />
      </div>

      {/* Telemetry ribbon below hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.6, ease: ANIM_EASE }}
        className="mt-14"
      >
        <TelemetryRibbon />
      </motion.div>
    </section>
  );
}

// ─── HudCard ─────────────────────────────────────────────────────────────────
// Glass HUD card with: scanline overlay on chart, bottom-edge red glow,
// F1 wedge corner cut, animated lap-delta trace.
function HudCard() {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: ANIM_DELAY_CARD, duration: ANIM_DUR_CARD, ease: ANIM_EASE }}
      // F1 wedge clip (top-right), glass surface, bottom-edge red inner glow
      className="f1-clip card card--elevated space-y-4 p-6"
      style={{
        boxShadow: [
          "0 -1px 0 0 rgba(225,6,0,0.55) inset", // bottom inner red line (pit monitor edge)
          "0 0 48px 0 rgba(225,6,0,0.07)",         // outer ambient glow
        ].join(", "),
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="label mb-1">Lap delta</p>
          <p className="text-[length:var(--text-small)] font-semibold text-foreground">
            Suzuka 2024 {"//"}  Race {"//"}  VER vs HAM
          </p>
        </div>
        {/* Citation badge — green, glowing */}
        <span
          className="readout px-2.5 py-1 text-[0.55rem] uppercase tracking-[var(--track-wide)]"
          style={{
            border: "1px solid rgba(34,197,94,0.4)",
            background: "rgba(34,197,94,0.10)",
            color: "var(--status-ok)",
            textShadow: "0 0 8px rgba(34,197,94,0.5)",
          }}
        >
          Cited · 3 sources
        </span>
      </div>

      {/* Animated lap-delta chart with scanline overlay */}
      <LapDeltaPreview />

      {/* Sector grid */}
      <div className="grid grid-cols-2 gap-3">
        {HERO_SECTORS.map(({ label, value, positive }, i) => (
          <motion.div
            key={label}
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: 0.55 + i * 0.07,
              duration: 0.35,
              ease: ANIM_EASE,
            }}
            className="border border-border p-3"
          >
            <p className="label mb-1">{label}</p>
            <p
              className="readout text-[length:var(--text-small)] font-semibold"
              style={{ color: positive ? "var(--status-ok)" : "var(--status-warn)" }}
            >
              {value}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── LapDeltaPreview ─────────────────────────────────────────────────────────
// SVG chart with stroke-dashoffset draw-on animation + scanline overlay.
function LapDeltaPreview() {
  const prefersReduced = useReducedMotion();

  // Build SVG path from delta points
  const xs = DELTA_POINTS.map(
    (_, i) => CHART_PAD_X + (i / (DELTA_POINTS.length - 1)) * (CHART_W - CHART_PAD_X * 2),
  );
  const max = Math.max(...DELTA_POINTS.map(Math.abs));
  const ys = DELTA_POINTS.map(
    (v) => CHART_H / 2 - (v / max) * (CHART_H / 2 - CHART_PAD_Y),
  );
  const path = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");

  // Chord of the midpoints for the marker animation
  const midI = Math.floor(xs.length / 2);

  return (
    // scanline-overlay class adds the CRT scanline ::after pseudo-element
    <div className="scanline-overlay border border-border bg-surface">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="block h-[120px] w-full"
        aria-hidden
      >
        {/* Zero-delta baseline */}
        <line
          x1={CHART_PAD_X}
          x2={CHART_W - CHART_PAD_X}
          y1={CHART_H / 2}
          y2={CHART_H / 2}
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeDasharray="2 4"
        />
        <text
          x={CHART_PAD_X}
          y={CHART_H / 2 - 4}
          fontSize={8}
          fill="currentColor"
          fillOpacity={0.35}
          fontFamily="ui-monospace,SFMono-Regular,monospace"
        >
          Δt = 0
        </text>

        {/* Telemetry trace — draws on mount via pathLength animation */}
        <motion.path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          // pathLength 0→1 is framer-motion's equivalent of strokeDashoffset draw-on
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: {
              delay: ANIM_DELAY_CHART,
              duration: ANIM_DUR_CHART,
              ease: [0.16, 1, 0.3, 1],
            },
            opacity: { delay: ANIM_DELAY_CHART, duration: 0.2 },
          }}
        />

        {/* Moving marker dot that follows the trace as it draws */}
        {!prefersReduced && (
          <motion.circle
            r={3}
            fill="var(--accent)"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              cx: [xs[0], xs[midI], xs[xs.length - 1], xs[xs.length - 1]],
              cy: [ys[0], ys[midI], ys[ys.length - 1], ys[ys.length - 1]],
            }}
            transition={{
              delay: ANIM_DELAY_CHART,
              duration: ANIM_DUR_CHART,
              ease: "linear",
              times: [0, 0.5, 1, 1],
            }}
          />
        )}
      </svg>

      {/* Footer readout */}
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
        <span className="readout text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
          T1 → finish
        </span>
        <span className="readout text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
          VER ahead by 0.31s
        </span>
      </div>
    </div>
  );
}

// ─── TelemetryRibbon ─────────────────────────────────────────────────────────
function TelemetryRibbon() {
  const doubled = [...ribbonItems, ...ribbonItems];
  return (
    <div className="telemetry-ribbon relative overflow-hidden border-y border-border py-2.5">
      <div className="telemetry-ribbon__track flex min-w-max items-center gap-10 px-6">
        {doubled.map((item, idx) => (
          <div key={idx} className="flex shrink-0 items-center gap-3">
            <span className="h-1 w-1 rounded-full bg-foreground-dim" />
            <span className="readout text-[length:var(--text-label)] uppercase tracking-[var(--track-wide)] text-foreground-dim">
              {item.term ? (
                <JargonTooltip term={item.term}>{item.text}</JargonTooltip>
              ) : (
                item.text
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
