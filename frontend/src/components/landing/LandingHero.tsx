import Link from "next/link";

import { TelemetryRibbon } from "@/components/landing/TelemetryRibbon";

const heroStats = [
  { label: "Live telemetry channels", value: "04" },
  { label: "Race strategy modules", value: "03" },
  { label: "Decision window latency", value: "< 5s" },
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="hero-radial pointer-events-none absolute inset-x-0 top-0 h-[32rem]" />
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-300 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
            Race engineer system online
          </div>

          <h1 className="mt-8 max-w-5xl text-5xl font-black uppercase leading-[0.92] tracking-[-0.07em] text-white sm:text-6xl lg:text-8xl">
            Build faster race calls from telemetry, not guesswork.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Apex Intelligence turns Formula 1 session data into explainable pit-window,
            tyre-decay, and undercut insight so solo builders can demo real agentic AI with real motorsport context.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="#mission-control"
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] text-white transition hover:bg-red-500"
            >
              Enter mission control
            </Link>
            <Link
              href="#strategy-story"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-slate-200 transition hover:border-white/25 hover:bg-white/10"
            >
              See how it thinks
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_40px_80px_rgba(2,6,23,0.6)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.24),transparent_45%)]" />
            <div className="relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                    Strategy Core
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">Japanese GP // Race // NOR</p>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-300">
                  Signal stable
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-red-300">
                    Strategy alert
                  </p>
                  <p className="mt-2 text-xl font-bold text-white">Pit window opens in 4 laps.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Medium compound degradation is crossing the threshold where undercut exposure becomes material.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricPanel label="Tyre delta" value="+0.31s/lap" />
                  <MetricPanel label="Undercut risk" value="High" />
                  <MetricPanel label="Traffic loss" value="1.8s" />
                  <MetricPanel label="Confidence" value="74%" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl">
        <TelemetryRibbon />
      </div>
    </section>
  );
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-xl font-bold text-white">{value}</p>
    </div>
  );
}
