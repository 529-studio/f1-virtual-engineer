import Link from "next/link";

interface CapabilityItem {
  id: string;
  label: string;
  title: string;
  body: string;
  href: string;
  preview: React.ReactNode;
}

const capabilityItems: CapabilityItem[] = [
  {
    id: "01",
    label: "Telemetry + Lap Delta",
    title: "Compare two drivers, lap-by-lap, distance-by-distance.",
    body: "Speed, gear, RPM and per-distance Δt — VER vs HAM at Suzuka, no manual chart parsing.",
    href: "/mission-control?event=Japanese%20Grand%20Prix&session=R&driver=VER&compareDriver=HAM",
    preview: <TelemetryPreview />,
  },
  {
    id: "02",
    label: "Strategy Compare",
    title: "What-if pit calls, side by side.",
    body: "Pit-window recommendations with target-driver gap context, tyre features, and rationale you can read.",
    href: "/mission-control?intent=strategy&event=Japanese%20Grand%20Prix&driver=VER&compareDriver=HAM",
    preview: <StrategyPreview />,
  },
  {
    id: "03",
    label: "Cross-Year + Citation",
    title: "Same driver, two seasons, one delta line.",
    body: "Compare a driver's fastest lap year-over-year with citations from a regulation-aware corpus.",
    href: "/mission-control?event=Japanese%20Grand%20Prix&driver=VER&compareYear=2023",
    preview: <CrossYearPreview />,
  },
  {
    id: "04",
    label: "Weather + Tyre Context",
    title: "Conditions in the header, compound history in the card.",
    body: "Per-session weather pill (DRY / MIXED / WET) with tyre framing — the context strategy actually depends on.",
    href: "/mission-control",
    preview: <WeatherPreview />,
  },
];

export function CapabilityGrid() {
  return (
    <div className="grid gap-px border border-border md:grid-cols-2 xl:grid-cols-2">
      {capabilityItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="group flex flex-col bg-surface transition-colors hover:bg-surface-elevated"
        >
          <div className="relative aspect-[2/1] overflow-hidden border-b border-border bg-surface-elevated">
            {item.preview}
          </div>

          <div className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <span className="label">{item.label}</span>
              <span className="readout text-[length:var(--text-label)] text-foreground-faint">
                {item.id}
              </span>
            </div>
            <div className="mb-4 h-px w-6 bg-accent transition-all duration-300 group-hover:w-12" />
            <h3 className="mb-3 text-[length:var(--text-h3)] font-semibold leading-snug text-foreground">
              {item.title}
            </h3>
            <p className="readout text-[length:var(--text-readout)] leading-5 text-foreground-dim">
              {item.body}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// All four previews are CSS/SVG-only — no PNGs, no data fetch. They
// reuse the same accent + border tokens as Mission Control so that
// the landing tiles stay visually consistent with the live app.

function PreviewFrame({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full w-full p-5">
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative flex h-full w-full flex-col gap-3">{children}</div>
      <span className="readout absolute bottom-3 right-4 text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
        {caption}
      </span>
    </div>
  );
}

function TelemetryPreview() {
  const traceA =
    "M0,68 C30,40 50,55 80,30 110,8 140,28 180,22 220,16 260,42 300,30 340,18 380,38 420,28";
  const traceB =
    "M0,75 C30,55 50,62 80,42 110,22 140,38 180,34 220,28 260,52 300,42 340,32 380,48 420,38";

  return (
    <PreviewFrame caption="Telemetry · VER vs HAM">
      <div className="flex items-center justify-between">
        <span className="readout text-[0.6rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
          Speed (km/h)
        </span>
        <div className="flex gap-3">
          <DriverChip color="var(--accent)" code="VER" />
          <DriverChip color="rgba(0,210,190,0.85)" code="HAM" />
        </div>
      </div>
      <div className="relative flex-1 border border-border bg-background/60">
        <svg viewBox="0 0 420 90" className="block h-full w-full" preserveAspectRatio="none" aria-hidden>
          <path d={traceA} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" />
          <path d={traceB} fill="none" stroke="rgba(0,210,190,0.85)" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Top", "326 km/h"],
          ["DRS", "ENABLED"],
          ["Δt", "+0.31"],
        ].map(([k, v]) => (
          <div key={k} className="border border-border bg-background/60 px-2 py-1">
            <p className="readout text-[0.5rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">{k}</p>
            <p className="readout text-[0.65rem] font-semibold text-foreground">{v}</p>
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}

function StrategyPreview() {
  return (
    <PreviewFrame caption="Strategy · what-if">
      <div className="flex items-center justify-between">
        <span className="readout text-[0.6rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
          Pit window — side by side
        </span>
        <span className="readout border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[0.5rem] uppercase tracking-[var(--track-wide)] text-emerald-400">
          Cited
        </span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2">
        <StrategyCard driver="VER" lap="L18 → L22" tyre="MED → HARD" risk="LOW" highlight />
        <StrategyCard driver="HAM" lap="L20 → L24" tyre="MED → HARD" risk="MED" />
      </div>
    </PreviewFrame>
  );
}

function StrategyCard({
  driver,
  lap,
  tyre,
  risk,
  highlight,
}: {
  driver: string;
  lap: string;
  tyre: string;
  risk: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex flex-col justify-between border bg-background/60 p-2"
      style={{ borderColor: highlight ? "var(--accent)" : "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="readout text-[0.6rem] font-semibold text-foreground">{driver}</span>
        <span className="readout text-[0.5rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
          {risk}
        </span>
      </div>
      <div>
        <p className="readout text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
          Window
        </p>
        <p className="readout text-[0.7rem] font-semibold text-foreground">{lap}</p>
      </div>
      <p className="readout text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
        {tyre}
      </p>
    </div>
  );
}

function CrossYearPreview() {
  const path24 =
    "M0,38 C30,32 60,40 100,28 140,18 180,30 220,22 260,12 300,28 340,20 380,14 420,22";
  const path23 =
    "M0,52 C30,46 60,54 100,42 140,32 180,44 220,38 260,28 300,42 340,34 380,28 420,38";

  return (
    <PreviewFrame caption="Cross-year · Δ fastest lap">
      <div className="flex items-center justify-between">
        <span className="readout text-[0.6rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
          VER · Suzuka
        </span>
        <div className="flex gap-3">
          <DriverChip color="var(--accent)" code="2024" />
          <DriverChip color="rgba(245,245,247,0.45)" code="2023" />
        </div>
      </div>
      <div className="relative flex-1 border border-border bg-background/60">
        <svg viewBox="0 0 420 70" className="block h-full w-full" preserveAspectRatio="none" aria-hidden>
          <path d={path23} fill="none" stroke="rgba(245,245,247,0.45)" strokeWidth={1.4} strokeDasharray="3 2" />
          <path d={path24} fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex items-center justify-between border border-border bg-background/60 px-2 py-1.5">
        <span className="readout text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
          Best lap delta
        </span>
        <span className="readout text-[0.7rem] font-semibold text-foreground">−0.42s · 2024 faster</span>
      </div>
    </PreviewFrame>
  );
}

function WeatherPreview() {
  return (
    <PreviewFrame caption="Header context">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-pill text-foreground" data-status="info">
          ◐ MIXED · 23°C track
        </span>
        <span className="status-pill text-foreground">MED · 14 laps</span>
        <span className="status-pill text-foreground" data-status="warn">
          DEG · HIGH
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2">
        <div className="border border-border bg-background/60 p-2">
          <p className="readout text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
            Compound history
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {[
              { c: "MED", w: 14 },
              { c: "HARD", w: 22 },
              { c: "MED", w: 17 },
            ].map((s, i) => (
              <div
                key={i}
                className="h-2 flex-1"
                style={{
                  background:
                    s.c === "MED" ? "rgba(245, 158, 11, 0.55)" : "rgba(245, 245, 247, 0.45)",
                  width: `${s.w * 4}px`,
                }}
                title={`${s.c} · ${s.w} laps`}
              />
            ))}
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

function DriverChip({ color, code }: { color: string; code: string }) {
  return (
    <span className="readout flex items-center gap-1.5 text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {code}
    </span>
  );
}
