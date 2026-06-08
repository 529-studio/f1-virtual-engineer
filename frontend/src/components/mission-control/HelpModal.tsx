"use client";

import { useEffect } from "react";

interface HelpModalProps {
  onClose: () => void;
}

const GLOSSARY: { term: string; def: string }[] = [
  { term: "Pit Window", def: "The lap range where pitting is strategically optimal given tyre life and traffic." },
  { term: "Undercut", def: "Pitting earlier than the car ahead so fresh tyres gain enough time to come out in front after they pit." },
  { term: "Overcut", def: "Staying out longer than the car ahead, banking on cleaner air and tyre warm-up to gain position." },
  { term: "Tyre Deg", def: "Tyre degradation — gradual loss of grip and lap time as a tyre wears." },
  { term: "Cliff", def: "The lap where pace drops sharply as tyre rubber degrades past a threshold." },
  { term: "Stint", def: "A continuous run on one set of tyres between pit stops." },
  { term: "DRS", def: "Drag Reduction System — rear-wing flap that opens on straights to reduce drag and aid overtaking." },
  { term: "Dirty Air", def: "Turbulent airflow behind another car that reduces downforce and overheats tyres." },
  { term: "Safety Car", def: "SC — a pace car deployed on track to neutralise the race." },
  { term: "VSC", def: "Virtual Safety Car — all cars maintain a prescribed delta time without bunching. No physical pace car." },
];

const SELECTORS = [
  { label: "Year", desc: "Season to load data from. FastF1 covers 2018–current." },
  { label: "Grand Prix", desc: "Race weekend. Loads the event roster once selected." },
  { label: "Session", desc: "R = Race · Q = Qualifying · FP1/FP2/FP3 = Practice. Strategy analysis works best on R." },
  { label: "Driver", desc: "Three-letter code (e.g. VER, HAM). Fetched live from FastF1 with a 24 h cache." },
  { label: "Lap", desc: "Visible in Telemetry mode only. Defaults to Lap 1 — change to compare any lap's sensor trace." },
  { label: "vs Driver", desc: "Overlay a second driver's speed trace on the same chart." },
  { label: "vs Year", desc: "Cross-year lap delta — compare the same driver across seasons." },
];

const HUD_PANELS = [
  { label: "Pit Window", desc: "Headline recommendation. Shows target lap range + undercut risk vs the car ahead." },
  { label: "Tyre Status", desc: "Current compound, laps on tyre, predicted cliff lap, and decay rate from FastF1." },
  { label: "Steward's View", desc: "RAG-powered regulation lookup. Flags potential controversies and cites FIA Sporting Regulation articles." },
  { label: "Why This Call", desc: "LLM rationale behind the strategy recommendation. Upgraded asynchronously to full reasoning." },
  { label: "References", desc: "Source citations used by the agent — FastF1 data points, regulation articles, heuristics." },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <p
        className="readout mb-2 text-[0.55rem] font-bold uppercase tracking-[var(--track-wide)]"
        style={{ color: "var(--accent)" }}
      >
        {title}
      </p>
      {children}
    </section>
  );
}

export function HelpModal({ onClose }: HelpModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Mission Control help"
    >
      <div
        className="relative max-h-[82vh] w-full max-w-lg overflow-y-auto border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="label text-foreground">Mission Control</p>
            <p className="readout text-[0.6rem] text-foreground-faint">Quick reference · press ESC to close</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="readout flex h-6 w-6 items-center justify-center border border-border text-[0.65rem] text-foreground-faint transition-colors hover:border-foreground-dim hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Quick Start */}
        <Section title="Quick Start">
          <ol className="readout space-y-1.5 text-[0.65rem] leading-snug text-foreground-dim">
            {[
              ["Pick a Year + Grand Prix", "Loads the event roster from FastF1."],
              ["Pick Session", "R (Race) gives full strategy analysis. Q = qualifying."],
              ["Pick Driver", "Fetched live — first visit may take a moment."],
              ["Press Analyze", "Backend runs LangGraph agent → returns pit window + rationale."],
            ].map(([step, detail], i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-bold" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                <span>
                  <span className="text-foreground">{step}</span>
                  {" — "}
                  {detail}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        {/* Selectors */}
        <Section title="Selectors">
          <div className="space-y-1.5">
            {SELECTORS.map(({ label, desc }) => (
              <div key={label} className="flex gap-2 text-[0.62rem] leading-snug">
                <span
                  className="readout shrink-0 border px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-[var(--track-wide)]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground-dim)" }}
                >
                  {label}
                </span>
                <span className="text-foreground-dim">{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* HUD Panels */}
        <Section title="HUD Panels">
          <div className="space-y-1.5">
            {HUD_PANELS.map(({ label, desc }) => (
              <div key={label} className="flex gap-2 text-[0.62rem] leading-snug">
                <span className="shrink-0 font-semibold text-foreground">{label}:</span>
                <span className="text-foreground-dim">{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Glossary */}
        <Section title="F1 Glossary">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {GLOSSARY.map(({ term, def }) => (
              <div key={term} className="text-[0.6rem] leading-snug">
                <span className="font-semibold text-foreground">{term}: </span>
                <span className="text-foreground-faint">{def}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
