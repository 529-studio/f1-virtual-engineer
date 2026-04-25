import Link from "next/link";

import { TelemetryQueryPanel } from "@/components/TelemetryQueryPanel";

const navItems = [
  { label: "Back to landing", href: "/" },
  { label: "Mission control", href: "/mission-control" },
];

const systemCards = [
  { label: "Primary mode", value: "Telemetry + strategy" },
  { label: "Context control", value: "Driver / event / session" },
  { label: "Response format", value: "Cards + signals + context" },
];

export default function MissionControlPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#05070b] text-slate-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_28%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-600 font-black italic text-white shadow-[0_0_20px_rgba(239,68,68,0.45)]">
              A
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Apex Intelligence
              </p>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                Mission Control Dashboard
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            Exit
          </Link>
        </div>
      </header>

      <div className="relative z-10 px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
        <div className="mx-auto max-w-7xl">
          <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-red-300">
                CF-06 / dashboard slice 2
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black uppercase tracking-[-0.06em] text-white sm:text-5xl lg:text-7xl">
                A sharper operator surface with configurable context and faster reads.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                This upgrade makes mission control feel less like a fixed demo and more like a usable dashboard by adding session controls and strategy-signal cards around the telemetry loop.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {systemCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-3 text-lg font-bold text-white">{card.value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <TelemetryQueryPanel variant="dashboard" />
          </section>
        </div>
      </div>
    </main>
  );
}
