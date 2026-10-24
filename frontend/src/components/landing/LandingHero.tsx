"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { QuestionRotator } from "@/components/landing/QuestionRotator";
import { JargonTooltip } from "@/components/ui/JargonTooltip";

// ─── Matchup Datasets for Interactive Cockpit ──────────────────────────────
interface MatchupData {
  id: string;
  label: string;
  year: number;
  event: string;
  session: string;
  driver: string;
  rival: string;
  href: string;
  deltaPoints: number[];
  sectors: Array<{ label: string; value: string; positive: boolean }>;
  summary: string;
  radioSnippet: string;
  citations: string;
}

const MATCHUPS: MatchupData[] = [
  {
    id: "ver-ham",
    label: "VER vs HAM",
    year: 2024,
    event: "Suzuka 2024",
    session: "Race",
    driver: "VER",
    rival: "HAM",
    href: "/mission-control?event=Japanese%20Grand%20Prix&year=2024&session=R&driver=VER",
    deltaPoints: [
      0.00, 0.04, 0.09, 0.18, 0.22, 0.19, 0.11, 0.02,
      -0.06, -0.14, -0.21, -0.18, -0.09, 0.04, 0.13, 0.21,
      0.27, 0.31, 0.28, 0.22, 0.17, 0.14, 0.18, 0.24, 0.31,
    ],
    sectors: [
      { label: "Sector 1", value: "+0.184", positive: true },
      { label: "Sector 2", value: "−0.092", positive: false },
      { label: "Sector 3", value: "+0.221", positive: true },
      { label: "Lap delta", value: "+0.31s", positive: true },
    ],
    summary: "VER ahead by 0.31s through Degner curve",
    radioSnippet: "VER holding 0.31s delta on Mediums. Pit window opens lap 21 to cover undercut.",
    citations: "Cited · 3 sources",
  },
  {
    id: "lec-sai",
    label: "LEC vs SAI",
    year: 2023,
    event: "Monza 2023",
    session: "Race",
    driver: "LEC",
    rival: "SAI",
    href: "/mission-control?event=Italian%20Grand%20Prix&year=2023&session=R&driver=LEC",
    deltaPoints: [
      0.00, -0.05, -0.12, -0.08, 0.02, 0.15, 0.08, -0.02,
      -0.18, -0.24, -0.15, -0.05, 0.05, 0.12, 0.08, -0.03,
      -0.11, -0.07, 0.01, 0.09, 0.15, 0.12, 0.06, -0.04, -0.08,
    ],
    sectors: [
      { label: "Sector 1", value: "−0.052", positive: false },
      { label: "Sector 2", value: "+0.141", positive: true },
      { label: "Sector 3", value: "−0.173", positive: false },
      { label: "Lap delta", value: "−0.08s", positive: false },
    ],
    summary: "LEC trailing SAI by 0.08s into Parabolica",
    radioSnippet: "LEC slipstream active into T1. Rear tyre temps +6°C above optimal window.",
    citations: "Telemetry + Art 33.4",
  },
  {
    id: "nor-pia",
    label: "NOR vs PIA",
    year: 2024,
    event: "Hungary 2024",
    session: "Race",
    driver: "NOR",
    rival: "PIA",
    href: "/mission-control?event=Hungarian%20Grand%20Prix&year=2024&session=R&driver=NOR",
    deltaPoints: [
      0.00, 0.08, 0.15, 0.25, 0.38, 0.45, 0.52, 0.61,
      0.70, 0.78, 0.85, 0.92, 0.98, 1.05, 1.12, 1.18,
      1.25, 1.30, 1.35, 1.40, 1.44, 1.48, 1.51, 1.54, 1.58,
    ],
    sectors: [
      { label: "Sector 1", value: "+0.412", positive: true },
      { label: "Sector 2", value: "+0.655", positive: true },
      { label: "Sector 3", value: "+0.513", positive: true },
      { label: "Lap delta", value: "+1.58s", positive: true },
    ],
    summary: "NOR pulling +1.58s gap on fresher Hards",
    radioSnippet: "Undercut delta +2.4s achieved. Radio instruction: 'The way to win a championship is with the team.'",
    citations: "FastF1 + Stint Deg",
  },
];

const HERO_STATS = [
  { label: "Multi-agent",   value: "4 agents",  hint: "pit · tyre · weather · pace" },
  { label: "Every call",    value: "Cited",     hint: "linked to FastF1 + regs" },
  { label: "Regulation",    value: "RAG",       hint: "ChromaDB · Gemini embeddings" },
] as const;

// Animation timing constants
const ANIM_EASE = [0.22, 0.61, 0.36, 1] as const;
const ANIM_DUR_COPY = 0.55;
const ANIM_DUR_CARD = 0.65;
const ANIM_DELAY_CARD = 0.28;
const ANIM_DUR_CHART = 1.4;
const ANIM_DELAY_CHART = 0.15;

const SPEED_LINES = [
  { width: 120, opacity: 1.0,  delay: 0.05 },
  { width: 80,  opacity: 0.45, delay: 0.10 },
  { width: 44,  opacity: 0.20, delay: 0.15 },
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

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="hero-headline-glow pointer-events-none absolute inset-0" />

      <div className="relative z-10 grid gap-12 lg:grid-cols-[1fr_470px] lg:items-center">
        {/* ── Left column — copy ─────────────────────────────────── */}
        <div>
          <FadeUp
            delay={0}
            className="mb-6 inline-flex items-center gap-2.5 border border-border px-3 py-1.5 readout text-[length:var(--text-label)] uppercase tracking-[var(--track-wide)] text-foreground-dim"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
            Autonomous AI Race Engineer · Real FastF1 Telemetry
          </FadeUp>

          <FadeUp delay={0.04}>
            <SpeedLineGroup />
          </FadeUp>

          <FadeUp delay={0.08}>
            <h1
              className="display mb-6 text-[length:var(--text-display)] leading-[0.93] text-foreground"
              style={{ fontStyle: "italic", fontWeight: 800 }}
            >
              Ask any lap.<br />Get the call.
            </h1>
          </FadeUp>

          <FadeUp delay={0.14}>
            <QuestionRotator />
          </FadeUp>

          <FadeUp delay={0.16}>
            <p className="mb-10 max-w-xl text-[length:var(--text-body)] leading-7 text-foreground-dim">
              Compare telemetry, replay tyre wear degradation, and inspect pit window models built on real lap data. 
              Dual-perspective reasoning argues controversial race moments straight from the official FIA Sporting Regulations.{" "}
              <span className="text-foreground">Tactical clarity without the spreadsheets.</span>
            </p>
          </FadeUp>

          <FadeUp delay={0.22} className="flex flex-wrap items-center gap-3">
            <Link
              href="/mission-control"
              className="f1-clip btn readout bg-[#E10600] px-5 py-3 text-[length:var(--text-label)] text-white transition-opacity hover:opacity-90 active:scale-98"
            >
              Open Mission Control →
            </Link>
            <Link
              href="#manifesto"
              className="readout text-[length:var(--text-readout)] uppercase tracking-[var(--track-wide)] text-foreground-dim transition-colors hover:text-foreground"
            >
              The Founder&apos;s Story →
            </Link>
          </FadeUp>

          {/* Stats bar */}
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

        {/* ── Right column — Interactive Micro-Cockpit Sandbox ──────── */}
        <InteractiveCockpitSandbox />
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

// ─── InteractiveCockpitSandbox ────────────────────────────────────────────────
function InteractiveCockpitSandbox() {
  const prefersReduced = useReducedMotion();
  const [activeMatchup, setActiveMatchup] = useState<MatchupData>(MATCHUPS[0]);

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: ANIM_DELAY_CARD, duration: ANIM_DUR_CARD, ease: ANIM_EASE }}
      className="f1-clip card card--elevated space-y-4 p-5 sm:p-6"
      style={{
        boxShadow: [
          "0 -1px 0 0 rgba(225,6,0,0.55) inset",
          "0 0 48px 0 rgba(225,6,0,0.07)",
        ].join(", "),
      }}
    >
      {/* Sandbox Header with driver battle selector tabs */}
      <div className="flex flex-col gap-3 border-b border-border pb-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-status-error animate-pulse" />
            <p className="label">Live Cockpit Sandbox</p>
          </div>
          <span
            className="readout px-2 py-0.5 text-[0.55rem] uppercase tracking-[var(--track-wide)] rounded-xs"
            style={{
              border: "1px solid rgba(34,197,94,0.4)",
              background: "rgba(34,197,94,0.10)",
              color: "var(--status-ok)",
              textShadow: "0 0 8px rgba(34,197,94,0.4)",
            }}
          >
            {activeMatchup.citations}
          </span>
        </div>

        {/* Interactive Matchup Tabs */}
        <div className="flex items-center gap-1.5 rounded-sm border border-border bg-surface p-1">
          {MATCHUPS.map((m) => {
            const active = m.id === activeMatchup.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMatchup(m)}
                className={`flex-1 readout py-1 text-[0.62rem] font-bold uppercase tracking-[var(--track-wide)] transition-all cursor-pointer rounded-xs ${
                  active
                    ? "bg-accent text-background shadow-xs font-black"
                    : "text-foreground-dim hover:text-foreground hover:bg-surface-elevated"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Telemetry Waveform */}
      <LapDeltaPreview key={activeMatchup.id} matchup={activeMatchup} />

      {/* Sector Delta Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {activeMatchup.sectors.map(({ label, value, positive }) => (
          <div
            key={label}
            className="border border-border bg-surface px-3 py-2 rounded-xs"
          >
            <p className="label text-[0.55rem] mb-0.5">{label}</p>
            <p
              className="readout text-[0.75rem] font-bold"
              style={{ color: positive ? "var(--status-ok)" : "var(--status-warn)" }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Simulated AI Team Radio Callout */}
      <div className="rounded-xs border border-border bg-surface-elevated/70 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem]">📻</span>
            <span className="readout text-[0.58rem] uppercase font-bold text-accent tracking-[var(--track-wide)]">
              AI Race Engineer Call ({activeMatchup.driver})
            </span>
          </div>
          <div className="flex items-center gap-0.5" aria-hidden>
            <span className="h-2 w-0.5 bg-accent/80 animate-pulse" />
            <span className="h-3.5 w-0.5 bg-accent animate-pulse delay-75" />
            <span className="h-2 w-0.5 bg-accent/60 animate-pulse delay-150" />
          </div>
        </div>
        <p className="text-[0.7rem] leading-relaxed text-foreground-dim italic">
          &ldquo;{activeMatchup.radioSnippet}&rdquo;
        </p>
      </div>

      {/* Direct launch link to Mission Control preloaded */}
      <div className="pt-1">
        <Link
          href={activeMatchup.href}
          className="flex items-center justify-center gap-2 w-full readout border border-border hover:border-accent bg-surface hover:bg-surface-elevated py-2 text-[0.62rem] font-bold uppercase tracking-[var(--track-wide)] text-foreground transition-all cursor-pointer"
        >
          <span>Inspect {activeMatchup.event} in Mission Control</span>
          <span>→</span>
        </Link>
      </div>
    </motion.div>
  );
}

// ─── LapDeltaPreview ─────────────────────────────────────────────────────────
function LapDeltaPreview({ matchup }: { matchup: MatchupData }) {
  const prefersReduced = useReducedMotion();
  const points = matchup.deltaPoints;

  const xs = points.map(
    (_, i) => CHART_PAD_X + (i / (points.length - 1)) * (CHART_W - CHART_PAD_X * 2),
  );
  const max = Math.max(...points.map(Math.abs), 0.1);
  const ys = points.map(
    (v) => CHART_H / 2 - (v / max) * (CHART_H / 2 - CHART_PAD_Y),
  );
  const path = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");

  return (
    <div className="scanline-overlay border border-border bg-surface">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="block h-[115px] w-full"
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

        {/* Telemetry trace */}
        <motion.path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
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

        {!prefersReduced && (
          <motion.g
            key={matchup.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: ANIM_DELAY_CHART + 0.3, duration: 0.4 }}
          >
            <circle
              cx={xs[xs.length - 1]}
              cy={ys[ys.length - 1]}
              r={6}
              fill="var(--accent)"
              className="animate-ping"
              opacity={0.35}
            />
            <circle
              cx={xs[xs.length - 1]}
              cy={ys[ys.length - 1]}
              r={3}
              fill="var(--accent)"
            />
          </motion.g>
        )}
      </svg>

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
        <span className="readout text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
          {matchup.event} · {matchup.session}
        </span>
        <span className="readout text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
          {matchup.summary}
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
