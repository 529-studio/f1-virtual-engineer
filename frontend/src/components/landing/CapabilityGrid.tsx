const capabilityItems = [
  {
    id: "01",
    label: "Telemetry Analysis",
    title: "Compare speed, gear, and RPM across race sessions.",
    body: "Turn raw FastF1 data into readable performance signals without forcing users to parse charts alone.",
  },
  {
    id: "02",
    label: "Tyre Intelligence",
    title: "Read tyre decay before the pace cliff hits.",
    body: "Surface lap-time decay, compound context, and degradation signals as strategy-ready insight.",
  },
  {
    id: "03",
    label: "Pit Strategy",
    title: "Spot undercut windows and strategic risk earlier.",
    body: "Translate telemetry, gaps, and session context into explainable pit-window recommendations.",
  },
  {
    id: "04",
    label: "Race Narrative",
    title: "Understand why the recommendation exists.",
    body: "Show assumptions, fallback behavior, and reasoning instead of hand-wavy AI output.",
  },
];

export function CapabilityGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {capabilityItems.map((item) => (
        <article
          key={item.id}
          className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-red-500/30 hover:bg-white/8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.16),transparent_45%)] opacity-0 transition duration-300 group-hover:opacity-100" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                {item.label}
              </span>
              <span className="font-mono text-sm text-slate-500">{item.id}</span>
            </div>
            <h3 className="mt-8 text-xl font-bold tracking-[-0.03em] text-white">
              {item.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">{item.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
