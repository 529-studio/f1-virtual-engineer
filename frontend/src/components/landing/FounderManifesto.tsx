"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const ANIM_EASE = [0.22, 0.61, 0.36, 1] as const;

export function FounderManifesto() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="manifesto" className="py-20">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: ANIM_EASE }}
          className="f1-clip card card--elevated relative overflow-hidden p-8 sm:p-12 border border-border"
          style={{
            boxShadow: [
              "0 -1px 0 0 rgba(225,6,0,0.6) inset", // red pit monitor bottom accent
              "0 0 50px 0 rgba(225,6,0,0.06)",
            ].join(", "),
          }}
        >
          {/* Subtle ambient racing glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 600px 300px at 0% 0%, rgba(225,6,0,0.12) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 space-y-6">
            {/* Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="readout text-[0.68rem] uppercase tracking-[var(--track-widest)] text-foreground font-bold">
                  Founder&apos;s Engineering Log // 529 Studio
                </span>
              </div>
              <span className="readout text-[0.62rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
                Tokyo / Hanoi · 2026
              </span>
            </div>

            {/* Manifesto Headline */}
            <h2
              className="display text-[length:var(--text-h1)] sm:text-3xl text-foreground leading-tight"
              style={{ fontStyle: "italic", fontWeight: 800 }}
            >
              Built for the fans who crave the engineering behind the drama.
            </h2>

            {/* Core Manifesto Narrative */}
            <div className="space-y-4 text-[length:var(--text-body)] leading-relaxed text-foreground-dim max-w-3xl">
              <p>
                Watching a Grand Prix through broadcast commentary often leaves the real story untold. 
                When a driver radios in about tyre degradation or questions an undercut strategy, TV graphics 
                rarely tell you the exact stint degradation slope, the traffic delta, or which specific paragraph 
                of the FIA Sporting Regulations governs the stewards&apos; impending verdict.
              </p>
              <p>
                I built <strong className="text-foreground">F1 Virtual Engineer</strong> as an uncompromising, 
                tactile engineering playground. It brings together raw 
                <span className="text-foreground"> FastF1 sensor traces</span>, mathematical 
                <span className="text-foreground"> tyre degradation curves</span>, and an autonomous 
                <span className="text-foreground"> LangGraph state machine</span> that debates controversial 
                moments from both the team&apos;s and the stewards&apos; perspectives.
              </p>
              <p className="text-foreground font-medium italic">
                &ldquo;It is not about replacing human race engineers. It is about exploring the immense tactical 
                depth of modern Formula 1 through code, data, and autonomous systems.&rdquo;
              </p>
            </div>

            {/* Founder Signature Block & Stack Badges */}
            <div className="pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent bg-surface-elevated text-xs font-black tracking-wider text-accent shadow-sm">
                  VD
                </div>
                <div>
                  <p className="text-[length:var(--text-small)] font-bold text-foreground">
                    Vu Thanh Dat <span className="text-foreground-dim font-normal text-xs">(ヴ・タイン・ダット)</span>
                  </p>
                  <p className="readout text-[0.62rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
                    Creator & Lead Engineer · 529 Studio
                  </p>
                </div>
              </div>

              {/* Quick Tech Architecture Tags */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  "FastAPI Async",
                  "LangGraph Agent",
                  "FastF1 Telemetry",
                  "ChromaDB RAG",
                  "Next.js App Router",
                  "Redis L2 Cache",
                ].map((tech) => (
                  <span
                    key={tech}
                    className="readout border border-border bg-surface px-2.5 py-1 text-[0.58rem] uppercase tracking-[var(--track-wide)] text-foreground-dim"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/mission-control"
                className="f1-clip btn readout bg-accent px-5 py-2.5 text-[length:var(--text-label)] text-background font-bold transition-opacity hover:opacity-90 active:scale-98"
              >
                Launch Cockpit in Mission Control →
              </Link>
              <Link
                href="#agent-blueprint"
                className="readout text-[length:var(--text-readout)] uppercase tracking-[var(--track-wide)] text-foreground-dim transition-colors hover:text-foreground"
              >
                Inspect Agent Architecture ↓
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
