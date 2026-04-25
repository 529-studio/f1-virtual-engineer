const ribbonItems = [
  "SECTOR 1 +0.184",
  "SECTOR 2 -0.092",
  "TYRE MEDIUM",
  "DRS ENABLED",
  "PACE DELTA -0.31",
  "PIT WINDOW LAP 18-22",
  "UNDERCUT RISK HIGH",
  "BATTERY DEPLOY PUSH",
];

export function TelemetryRibbon() {
  const items = [...ribbonItems, ...ribbonItems];

  return (
    <div className="telemetry-ribbon relative overflow-hidden rounded-full border border-white/10 bg-white/5 py-3 backdrop-blur-sm">
      <div className="telemetry-ribbon__track flex min-w-max items-center gap-8 px-6 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-300 sm:text-[11px]">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
