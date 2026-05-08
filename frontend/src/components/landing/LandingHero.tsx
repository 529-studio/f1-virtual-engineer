import Link from "next/link";

const heroStats = [
  { label: "Live telemetry channels", value: "04" },
  { label: "Strategy modules",        value: "03" },
  { label: "Decision latency",        value: "<5s" },
];

export function LandingHero() {
  return (
    <section className="relative pt-16 pb-20 overflow-hidden">
      {/* Subtle grid */}
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative z-10 grid gap-14 lg:grid-cols-[1fr_420px] lg:items-center">

        {/* Left — copy */}
        <div>
          <div
            className="inline-flex items-center gap-2.5 px-3 py-1.5 mb-8 text-[0.6rem] readout uppercase tracking-widest"
            style={{ border: "1px solid var(--border)", color: "var(--foreground-dim)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
            Race engineer system online
          </div>

          <h1
            className="display text-5xl sm:text-6xl lg:text-7xl mb-6"
            style={{ color: "var(--foreground)" }}
          >
            Build faster race calls from telemetry, not guesswork.
          </h1>

          <p className="text-base leading-7 mb-10 max-w-xl" style={{ color: "var(--foreground-dim)" }}>
            Apex Intelligence turns Formula 1 session data into explainable pit-window,
            tyre-decay, and undercut insight — built for solo devs demoing real agentic AI.
          </p>

          <Link
            href="/mission-control"
            className="inline-flex items-center readout text-[0.65rem] font-bold uppercase tracking-widest px-5 py-3 transition-all"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Enter Mission Control →
          </Link>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-12">
            {heroStats.map((s) => (
              <div key={s.label} className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="display text-2xl mb-1" style={{ color: "var(--foreground)" }}>{s.value}</p>
                <p className="label">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — strategy card preview */}
        <div
          className="glass rounded-sm p-6 space-y-4"
          style={{ background: "var(--surface-elevated)" }}
        >
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <p className="label mb-1">Strategy Core</p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Japanese GP // Race // NOR</p>
            </div>
            <span
              className="readout text-[0.55rem] uppercase tracking-widest px-2.5 py-1"
              style={{ border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", background: "rgba(74,222,128,0.08)" }}
            >
              Signal stable
            </span>
          </div>

          <div className="p-4" style={{ border: "1px solid var(--accent-dim)", background: "var(--accent-dim)" }}>
            <p className="label mb-1" style={{ color: "var(--accent)" }}>Strategy Alert</p>
            <p className="text-base font-bold mb-1.5" style={{ color: "var(--foreground)" }}>
              Pit window opens in 4 laps.
            </p>
            <p className="readout text-[0.65rem] leading-5" style={{ color: "var(--foreground-dim)" }}>
              Medium compound degradation crossing the threshold where undercut exposure becomes material.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tyre delta",    value: "+0.31s/lap" },
              { label: "Undercut risk", value: "High" },
              { label: "Traffic loss",  value: "1.8s" },
              { label: "Confidence",    value: "74%" },
            ].map(({ label, value }) => (
              <div key={label} className="p-3" style={{ border: "1px solid var(--border)" }}>
                <p className="label mb-1">{label}</p>
                <p className="readout text-sm font-semibold" style={{ color: "var(--foreground)" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
