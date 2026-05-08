"use client";

import { FormEvent, useEffect } from "react";
import { analyzeTelemetry } from "@/services/api";
import { useMissionStore } from "@/lib/store";

/* ─── Types ────────────────────────────────────────────────── */
type TeamTheme =
  | "apex" | "ferrari" | "redbull" | "mercedes" | "mclaren"
  | "alpine" | "astonmartin" | "williams" | "haas" | "rb" | "sauber";

const TEAM_THEMES: { id: TeamTheme; color: string; label: string }[] = [
  { id: "apex",        color: "#E8002D", label: "Apex" },
  { id: "ferrari",     color: "#E8002D", label: "Ferrari" },
  { id: "redbull",     color: "#3671C6", label: "Red Bull" },
  { id: "mercedes",    color: "#00A19B", label: "Mercedes" },
  { id: "mclaren",     color: "#FF8000", label: "McLaren" },
  { id: "alpine",      color: "#0090FF", label: "Alpine" },
  { id: "astonmartin", color: "#358C75", label: "Aston Martin" },
  { id: "williams",    color: "#64C4FF", label: "Williams" },
  { id: "haas",        color: "#B6BABD", label: "Haas" },
  { id: "rb",          color: "#6692FF", label: "RB" },
  { id: "sauber",      color: "#52E252", label: "Sauber" },
];

/* ─── Sub-components ───────────────────────────────────────── */
function NavIcon({ d }: { d: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const NAV_ICONS = [
  { id: "home",     d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "telemetry",d: "M3 3v18h18M7 16l4-4 4 4 5-8" },
  { id: "compare",  d: "M18 20V10M12 20V4M6 20v-6" },
  { id: "history",  d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "settings", d: "M10.3 3.9L2 18a2 2 0 001.7 3h16.6A2 2 0 0022 18L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" },
];

function TelemetryChart({
  label, value, unit, isLoading, markerLap,
}: {
  label: string;
  value: string;
  unit: string;
  isLoading: boolean;
  markerLap?: number | null;
}) {
  const markerX = markerLap ? (markerLap / 71) * 1000 : null;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-2 shrink-0">
        <span className="label">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="readout text-lg font-semibold text-foreground">
            {isLoading ? "—" : value}
          </span>
          <span className="label" style={{ color: "var(--foreground-faint)" }}>{unit}</span>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 relative border border-border bg-surface overflow-hidden min-h-0">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-px bg-accent/40 animate-pulse" />
          </div>
        ) : (
          <svg className="w-full h-full" viewBox="0 0 1000 80" preserveAspectRatio="none">
            <path d={mockPath(label)} fill="none"
              stroke="var(--accent)" strokeWidth="1.2" opacity="0.7" />

            {markerX && (
              <>
                <line x1={markerX} y1="0" x2={markerX} y2="80"
                  stroke="var(--accent)" strokeWidth="0.8" strokeDasharray="3 2" />
                <circle cx={markerX} cy="25" r="2.5" fill="var(--accent)" />
              </>
            )}

            {/* Live-end dot */}
            <circle cx="960" cy="30" r="2" fill="var(--foreground-dim)" />
          </svg>
        )}
        {/* Accent rule at bottom */}
        <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: "var(--accent)", opacity: 0.15 }} />
      </div>
    </div>
  );
}

function mockPath(type: string) {
  if (type === "Speed")
    return "M0 60 Q100 15 220 45 T440 22 T620 38 T800 16 T1000 30";
  if (type === "Throttle")
    return "M0 15 L60 15 L62 70 L110 70 L112 8 L310 8 L312 65 L500 65 L502 15 L810 15 L812 72 L1000 72";
  return "M0 74 L210 74 L212 22 L224 74 L600 74 L602 8 L614 74 L1000 74";
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function MissionControlPage() {
  const { theme, setTheme, query, setQuery, result, setResult, isLoading, setIsLoading } =
    useMissionStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleAnalyze = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const res = await analyzeTelemetry({ query });
      setResult(res);
    } catch {
      // error kept silent — HUD shows fallback state
    } finally {
      setIsLoading(false);
    }
  };

  const tel = result?.telemetry_data;
  const strat = result?.strategy_data;
  const driver = result?.intent?.driver ?? "—";
  const event  = result?.intent?.event  ?? "—";

  return (
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* ── Sidebar rail ── */}
      <nav
        className="w-14 shrink-0 flex flex-col items-center py-5 gap-0 z-40"
        style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {/* Logo mark */}
        <div
          className="w-8 h-8 flex items-center justify-center font-black italic text-sm rounded-sm mb-8 shrink-0"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          A
        </div>

        {/* Nav icons */}
        <div className="flex flex-col items-center gap-5" style={{ color: "var(--foreground-dim)" }}>
          {NAV_ICONS.map((icon) => (
            <button
              key={icon.id}
              className="p-1 rounded transition-colors hover:text-foreground"
              style={{ color: icon.id === "telemetry" ? "var(--accent)" : undefined }}
            >
              <NavIcon d={icon.d} />
            </button>
          ))}
        </div>

        {/* Bottom user icon */}
        <div className="mt-auto" style={{ color: "var(--foreground-faint)" }}>
          <NavIcon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
        </div>
      </nav>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* Status bar — compact, no monumental title */}
        <header
          className="h-11 shrink-0 flex items-center gap-4 px-6"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
        >
          {/* Session identity */}
          <span className="label text-[0.6rem]">Mission Control</span>
          <div className="w-px h-3" style={{ background: "var(--border-strong)" }} />
          <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-dim)" }}>
            {driver} {"//"} {event}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Query input */}
          <form onSubmit={handleAnalyze} className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query..."
              className="readout text-[0.65rem] w-56 px-3 py-1.5 outline-none transition-colors"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="readout text-[0.6rem] px-3 py-1.5 transition-all disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {isLoading ? "…" : "RUN"}
            </button>
          </form>

          {/* Team theme picker */}
          <div className="flex items-center gap-1.5 ml-2">
            {TEAM_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                title={t.label}
                className="w-3 h-3 rounded-full transition-transform"
                style={{
                  background: t.color,
                  outline: theme === t.id ? `2px solid ${t.color}` : "none",
                  outlineOffset: "2px",
                  transform: theme === t.id ? "scale(1.25)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </header>

        {/* ── Telemetry canvas — takes all remaining vertical space ── */}
        <div className="flex-1 min-h-0 flex flex-col gap-0 px-6 py-4">
          <TelemetryChart
            label="Speed" unit="KPH"
            value={tel?.speed?.avg?.toFixed(0) ?? "322"}
            isLoading={isLoading}
            markerLap={strat?.target_lap}
          />
          <div className="h-3 shrink-0" />
          <TelemetryChart
            label="Throttle" unit="%"
            value={tel?.throttle?.avg?.toFixed(0) ?? "98"}
            isLoading={isLoading}
            markerLap={strat?.target_lap}
          />
          <div className="h-3 shrink-0" />
          <TelemetryChart
            label="Brake" unit="BAR"
            value={tel?.brake?.avg?.toFixed(0) ?? "145"}
            isLoading={isLoading}
            markerLap={strat?.target_lap}
          />
        </div>

        {/* ── Footer status strip ── */}
        <footer
          className="h-9 shrink-0 flex items-center px-6 gap-5 overflow-hidden"
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
        >
          {[
            { label: "Tyre", value: "FL 102° FR 104° RL 98° RR 99°" },
            { label: "Fuel", value: "28.5 kg" },
            { label: "ERS",  value: "85%" },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-px h-3" style={{ background: "var(--border)" }} />}
              <span className="label">{label}</span>
              <span className="readout text-[0.6rem] text-foreground">{value}</span>
            </div>
          ))}
          <div className="ml-auto readout text-[0.6rem]" style={{ color: "var(--accent)" }}>
            {strat?.undercut_risk === "high" ? "HIGH UNDERCUT RISK" : "DRS AVAILABLE"}
          </div>
        </footer>
      </div>

      {/* ── Strategy HUD ── */}
      <aside
        className="w-72 shrink-0 flex flex-col"
        style={{ borderLeft: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {/* HUD header */}
        <div className="px-5 pt-5 pb-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="label mb-1">Strategy HUD</p>
          <div className="flex justify-between items-baseline">
            <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-dim)" }}>
              {result?.intent?.session_type ?? "RACE"} {"//"} LAP 43/71
            </span>
            <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-dim)" }}>+1.8s</span>
          </div>
        </div>

        {/* Alert block */}
        <div className="mx-4 mt-4 p-4 shrink-0" style={{ border: "1px solid var(--border)", background: "var(--accent-dim)" }}>
          <p className="label mb-2" style={{ color: "var(--accent)" }}>
            {strat?.undercut_risk === "high" ? "⚠ STRATEGY ALERT" : "SYSTEM STATUS"}
          </p>
          <p className="readout text-[0.7rem] font-semibold leading-snug uppercase" style={{ color: "var(--foreground)" }}>
            {isLoading
              ? "Updating strategy…"
              : (result?.agent_response ?? "Waiting for command input.")}
          </p>
        </div>

        {/* Rationale list */}
        <div className="flex-1 overflow-y-auto px-4 mt-4 min-h-0">
          <p className="label mb-3">Tactical Rationale</p>
          <ul className="space-y-2">
            {(strat?.rationale ?? [
              "Awaiting telemetry feed.",
              "Tyre degradation ready.",
              "Pace delta tracking idle.",
              "Competitor windows standby.",
            ]).map((line, i) => (
              <li key={i} className="flex gap-2 readout text-[0.65rem]" style={{ color: "var(--foreground-dim)" }}>
                <span style={{ color: "var(--accent)" }}>—</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Box call CTA */}
        <div className="p-4 shrink-0">
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full py-3 readout text-[0.65rem] font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {isLoading ? "Computing…" : "Confirm Box Call"}
          </button>
        </div>
      </aside>
    </div>
  );
}
