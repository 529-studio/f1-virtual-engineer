"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const heroStats = [
  { label: "Live telemetry channels", value: "04" },
  { label: "Strategy modules",        value: "03" },
  { label: "Decision latency",        value: "<5s" },
];

const strategyMetrics = [
  { label: "Tyre delta",    value: "+0.31s/lap" },
  { label: "Undercut risk", value: "High" },
  { label: "Traffic loss",  value: "1.8s" },
  { label: "Confidence",    value: "74%" },
];

/* Reusable fade-up with configurable delay */
function FadeUp({
  delay = 0,
  children,
  className,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: "easeOut" }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function LandingHero() {
  return (
    <section className="relative pt-16 pb-20 overflow-hidden">
      {/* Subtle grid texture */}
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative z-10 grid gap-14 lg:grid-cols-[1fr_420px] lg:items-center">

        {/* ── Left: copy ── */}
        <div>
          {/* Status badge */}
          <FadeUp delay={0}
            className="inline-flex items-center gap-2.5 px-3 py-1.5 mb-8 readout text-[0.6rem] uppercase tracking-widest"
            style={{ border: "1px solid var(--border)", color: "var(--foreground-dim)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
            Race engineer system online
          </FadeUp>

          {/* Headline */}
          <FadeUp delay={0.08}>
            <h1
              className="display text-5xl sm:text-6xl lg:text-[4.5rem] mb-6 leading-[0.95]"
              style={{ color: "var(--foreground)" }}
            >
              Build faster race calls from telemetry, not guesswork.
            </h1>
          </FadeUp>

          <FadeUp delay={0.16}>
            <p className="text-base leading-7 mb-10 max-w-xl" style={{ color: "var(--foreground-dim)" }}>
              Apex Intelligence turns Formula 1 session data into explainable pit-window,
              tyre-decay, and undercut insight — built for solo devs demoing real agentic AI.
            </p>
          </FadeUp>

          <FadeUp delay={0.22}>
            <Link
              href="/mission-control"
              className="inline-flex items-center readout text-[0.65rem] font-bold uppercase tracking-widest px-5 py-3 transition-all"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              Enter Mission Control →
            </Link>
          </FadeUp>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-12">
            {heroStats.map((s, i) => (
              <FadeUp key={s.label} delay={0.3 + i * 0.08}
                className="pt-4"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <p className="display text-2xl mb-1" style={{ color: "var(--foreground)" }}>{s.value}</p>
                <p className="label">{s.label}</p>
              </FadeUp>
            ))}
          </div>
        </div>

        {/* ── Right: strategy preview card ── */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.28, duration: 0.65, ease: "easeOut" }}
          className="glass rounded-sm p-6 space-y-4"
          style={{ background: "var(--surface-elevated)" }}
        >
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <p className="label mb-1">Strategy Core</p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                Japanese GP {"//"} Race {"//"} NOR
              </p>
            </div>
            <span
              className="readout text-[0.55rem] uppercase tracking-widest px-2.5 py-1"
              style={{ border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.08)" }}
            >
              Signal stable
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4, ease: "easeOut" }}
            className="p-4"
            style={{ border: "1px solid var(--accent-dim)", background: "var(--accent-dim)" }}
          >
            <p className="label mb-1" style={{ color: "var(--foreground)" }}>Strategy Alert</p>
            <p className="text-base font-bold mb-1.5" style={{ color: "var(--foreground)" }}>
              Pit window opens in 4 laps.
            </p>
            <p className="readout text-[0.65rem] leading-5" style={{ color: "var(--foreground-dim)" }}>
              Medium compound degradation crossing the threshold where undercut exposure becomes material.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {strategyMetrics.map(({ label, value }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 + i * 0.07, duration: 0.35, ease: "easeOut" }}
                className="p-3"
                style={{ border: "1px solid var(--border)" }}
              >
                <p className="label mb-1">{label}</p>
                <p className="readout text-sm font-semibold" style={{ color: "var(--foreground)" }}>{value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Telemetry ribbon ── */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.6, ease: "easeOut" }}
        className="mt-14"
      >
        <TelemetryRibbon />
      </motion.div>
    </section>
  );
}

/* ── Telemetry ribbon ── */
const ribbonItems = [
  "SECTOR 1 +0.184",
  "SECTOR 2 −0.092",
  "TYRE MEDIUM",
  "DRS ENABLED",
  "PACE DELTA −0.31",
  "PIT WINDOW LAP 18–22",
  "UNDERCUT RISK HIGH",
  "BATTERY DEPLOY PUSH",
  "GAP TO LEADER 3.4s",
  "STINT LENGTH 22 LAPS",
];

function TelemetryRibbon() {
  const doubled = [...ribbonItems, ...ribbonItems];
  return (
    <div
      className="telemetry-ribbon relative overflow-hidden py-2.5"
      style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="telemetry-ribbon__track flex min-w-max items-center gap-10 px-6">
        {doubled.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 shrink-0">
            <span className="w-1 h-1 rounded-full" style={{ background: "var(--foreground-dim)" }} />
            <span className="readout text-[0.6rem] uppercase tracking-widest" style={{ color: "var(--foreground-dim)" }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
