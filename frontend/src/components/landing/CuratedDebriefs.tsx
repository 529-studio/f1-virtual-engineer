"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

interface DebriefCase {
  id: string;
  year: number;
  event: string;
  drivers: string;
  tag: string;
  headline: string;
  tacticalAnalysis: string;
  regCited: string;
  href: string;
}

const CASES: DebriefCase[] = [
  {
    id: "monza-2023",
    year: 2023,
    event: "Italian Grand Prix",
    drivers: "LEC vs SAI",
    tag: "Tyre Cliff & Intra-Team Battle",
    headline: "Monza Turn 1 Divebomb: Lockup Risk vs Podium Glory",
    tacticalAnalysis:
      "Telemetry reveals Leclerc braking 12 meters later into Prima Variante, spiking rear tyre surface temps by +8°C. Our strategy model flagged a 78% probability of severe flat-spotting.",
    regCited: "FIA Art 33.4 (Manoeuvres & Defending)",
    href: "/mission-control?event=Italian%20Grand%20Prix&year=2023&session=R&driver=LEC",
  },
  {
    id: "abu-dhabi-2021",
    year: 2021,
    event: "Abu Dhabi Grand Prix",
    drivers: "VER vs HAM",
    tag: "Regulatory Controversy",
    headline: "Lap 58 Safety Car Unlapping Procedure",
    tacticalAnalysis:
      "Dual-perspective reasoning dissects the contested restart: balancing the steward argument on Race Director authority against the team protest on full safety car protocol.",
    regCited: "FIA Art 48.12 vs Art 15.3",
    href: "/mission-control?event=Abu%20Dhabi%20Grand%20Prix&year=2021&session=R&driver=VER",
  },
  {
    id: "hungary-2024",
    year: 2024,
    event: "Hungarian Grand Prix",
    drivers: "NOR vs PIA",
    tag: "Undercut & Team Orders",
    headline: "The 2.4s Undercut Margin & Pit Stop Priority",
    tacticalAnalysis:
      "Pitting Norris first yielded a 2.4-second delta advantage on fresh Hards over Piastri, creating the infamous pit wall radio dilemma.",
    regCited: "Pirelli Hard Compound Stint Curve",
    href: "/mission-control?event=Hungarian%20Grand%20Prix&year=2024&session=R&driver=NOR",
  },
];

export function CuratedDebriefs() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="debriefs" className="py-20 border-t border-border">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-status-error" />
            <p className="label">Founder&apos;s Curated Debriefs</p>
          </div>
          <h2 className="display text-[length:var(--text-h1)] text-foreground">
            Dissecting Iconic Race Drama with Telemetry & Rules
          </h2>
          <p className="text-[length:var(--text-body)] text-foreground-dim max-w-2xl leading-relaxed">
            Three legendary Grands Prix where intuition clashed with data and regulation. Launch any case study directly into Mission Control.
          </p>
        </div>

        {/* 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CASES.map((c, i) => (
            <motion.div
              key={c.id}
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className="f1-clip card card--elevated p-6 flex flex-col justify-between border border-border hover:border-accent/60 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="readout text-[0.62rem] font-bold text-accent uppercase tracking-[var(--track-wide)]">
                    {c.event} · {c.year}
                  </span>
                  <span className="readout text-[0.58rem] border border-border px-2 py-0.5 uppercase tracking-[var(--track-wide)] text-foreground-dim">
                    {c.drivers}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="readout text-[0.58rem] uppercase font-bold text-status-warn tracking-[var(--track-wide)]">
                    {c.tag}
                  </span>
                  <h3 className="text-[0.95rem] font-bold text-foreground leading-snug group-hover:text-accent transition-colors">
                    {c.headline}
                  </h3>
                  <p className="text-[0.78rem] leading-relaxed text-foreground-dim">
                    {c.tacticalAnalysis}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-border space-y-3">
                <p className="readout text-[0.58rem] text-foreground-faint uppercase tracking-[var(--track-wide)] truncate">
                  Citation: <span className="text-foreground-dim font-bold">{c.regCited}</span>
                </p>
                <Link
                  href={c.href}
                  className="flex items-center justify-between w-full readout text-[0.65rem] font-bold uppercase tracking-[var(--track-wide)] text-foreground group-hover:text-accent transition-colors"
                >
                  <span>Replay in Mission Control</span>
                  <span>→</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
