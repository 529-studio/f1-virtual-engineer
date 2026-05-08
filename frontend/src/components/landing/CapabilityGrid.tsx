const capabilityItems = [
  {
    id: "01",
    label: "Telemetry Analysis",
    title: "Compare speed, gear, and RPM across race sessions.",
    body: "Turn raw FastF1 data into readable performance signals — no manual chart parsing.",
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
    body: "Show assumptions, fallback behavior, and reasoning — not hand-wavy AI output.",
  },
];

export function CapabilityGrid() {
  return (
    <div className="grid gap-px md:grid-cols-2 xl:grid-cols-4" style={{ border: "1px solid var(--border)" }}>
      {capabilityItems.map((item, i) => (
        <article
          key={item.id}
          className="p-6 transition-colors group"
          style={{
            background: "var(--surface)",
            borderRight: i < capabilityItems.length - 1 ? "1px solid var(--border)" : undefined,
          }}
        >
          <div className="flex items-start justify-between mb-6">
            <span className="label">{item.label}</span>
            <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-faint)" }}>
              {item.id}
            </span>
          </div>
          {/* accent rule animates on hover */}
          <div
            className="mb-4 h-px transition-all duration-300"
            style={{ background: "var(--accent)", width: "24px" }}
          />
          <h3 className="text-sm font-semibold mb-3 leading-snug" style={{ color: "var(--foreground)" }}>
            {item.title}
          </h3>
          <p className="readout text-[0.65rem] leading-5" style={{ color: "var(--foreground-dim)" }}>
            {item.body}
          </p>
        </article>
      ))}
    </div>
  );
}
