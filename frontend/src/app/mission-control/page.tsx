"use client";

import { FormEvent, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeTelemetry } from "@/services/api";
import { useMissionStore } from "@/lib/store";

/* ─── Team config ───────────────────────────────────────────── */
const TEAMS = [
  { id: "apex",        abbr: "APX", color: "#f5f5f7", label: "Apex" },
  { id: "ferrari",     abbr: "FER", color: "#E8002D", label: "Ferrari" },
  { id: "redbull",     abbr: "RBR", color: "#3671C6", label: "Red Bull" },
  { id: "mercedes",    abbr: "MER", color: "#00A19B", label: "Mercedes" },
  { id: "mclaren",     abbr: "MCL", color: "#FF8000", label: "McLaren" },
  { id: "alpine",      abbr: "ALP", color: "#0090FF", label: "Alpine" },
  { id: "astonmartin", abbr: "AMR", color: "#358C75", label: "Aston Martin" },
  { id: "williams",    abbr: "WIL", color: "#64C4FF", label: "Williams" },
  { id: "haas",        abbr: "HAS", color: "#B6BABD", label: "Haas" },
  { id: "rb",          abbr: "RB",  color: "#6692FF", label: "RB" },
  { id: "sauber",      abbr: "SAU", color: "#52E252", label: "Sauber" },
] as const;

type TeamId = (typeof TEAMS)[number]["id"];

/* ─── Nav icons ─────────────────────────────────────────────── */
const NAV = [
  { id: "home",     d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "telemetry",d: "M3 3v18h18M7 16l4-4 4 4 5-8" },
  { id: "compare",  d: "M18 20V10M12 20V4M6 20v-6" },
  { id: "history",  d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "settings", d: "M10.3 3.9L2 18a2 2 0 001.7 3h16.6A2 2 0 0022 18L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ─── Animated SVG chart ─────────────────────────────────────── */
const PATHS: Record<string, string> = {
  Speed:    "M0 60 Q100 15 220 45 T440 22 T620 38 T800 16 T1000 30",
  Throttle: "M0 15 L60 15 L62 70 L110 70 L112 8 L310 8 L312 65 L500 65 L502 15 L810 15 L812 72 L1000 72",
  Brake:    "M0 74 L210 74 L212 22 L224 74 L600 74 L602 8 L614 74 L1000 74",
};

function TelemetryChart({
  label, value, unit, isLoading, hasData, markerLap, animateKey,
}: {
  label: string; value: string; unit: string;
  isLoading: boolean; hasData: boolean; markerLap?: number | null;
  animateKey: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const markerX = markerLap ? (markerLap / 71) * 1000 : null;

  useEffect(() => {
    if (!pathRef.current || !hasData) return;
    const len = pathRef.current.getTotalLength();
    pathRef.current.style.strokeDasharray = `${len}`;
    pathRef.current.style.strokeDashoffset = `${len}`;
    const anim = pathRef.current.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 900, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" },
    );
    return () => anim.cancel();
  }, [hasData, animateKey]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-baseline justify-between mb-2 shrink-0">
        <span className="label">{label}</span>
        <AnimatePresence mode="wait">
          {hasData ? (
            <motion.div
              key="value"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-baseline gap-1"
            >
              <span className="readout text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {isLoading ? "—" : value}
              </span>
              <span className="label" style={{ color: "var(--foreground-faint)" }}>{unit}</span>
            </motion.div>
          ) : (
            <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="label" style={{ color: "var(--foreground-faint)" }}>
              no data
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 relative border border-border overflow-hidden min-h-0"
        style={{ background: "var(--surface)" }}>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="h-px w-10"
              style={{ background: "var(--accent)" }}
              animate={{ scaleX: [1, 2.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="readout text-[0.6rem] uppercase tracking-widest"
              style={{ color: "var(--foreground-faint)" }}>
              Run a query to load telemetry
            </span>
          </div>
        )}

        {!isLoading && hasData && (
          <svg className="w-full h-full" viewBox="0 0 1000 80" preserveAspectRatio="none">
            <path
              ref={pathRef}
              d={PATHS[label] ?? PATHS.Speed}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.4"
            />
            {markerX && (
              <g>
                <line x1={markerX} y1="0" x2={markerX} y2="80"
                  stroke="var(--accent)" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" />
                <circle cx={markerX} cy="24" r="2.5" fill="var(--accent)" />
              </g>
            )}
            <circle cx="960" cy="28" r="2" fill="var(--foreground-faint)" />
          </svg>
        )}

        <div className="absolute bottom-0 inset-x-0 h-px"
          style={{ background: "var(--accent)", opacity: hasData ? 0.2 : 0.06 }} />
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function MissionControlPage() {
  const { theme, setTheme, query, setQuery, result, setResult, isLoading, setIsLoading } =
    useMissionStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleAnalyze = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const res = await analyzeTelemetry({ query });
      setResult(res);
    } catch {
      /* silent — HUD shows fallback state */
    } finally {
      setIsLoading(false);
    }
  };

  const tel   = result?.telemetry_data;
  const strat = result?.strategy_data;
  const hasData = !isLoading && !!result;
  const animKey = result ? 1 : 0;

  const driver = result?.intent?.driver ?? "—";
  const event  = result?.intent?.event  ?? "—";

  const activeTeam = TEAMS.find((t) => t.id === theme) ?? TEAMS[0];

  return (
    <div className="h-screen w-screen flex overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}>

      {/* ── Sidebar rail ── */}
      <nav className="w-14 shrink-0 flex flex-col items-center py-5 gap-0 z-40"
        style={{ borderRight: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="w-8 h-8 flex items-center justify-center font-black italic text-sm rounded-sm mb-8 shrink-0"
          style={{ background: "var(--accent)", color: "var(--background)" }}>
          A
        </div>
        <div className="flex flex-col items-center gap-5" style={{ color: "var(--foreground-dim)" }}>
          {NAV.map((icon) => (
            <button key={icon.id} className="p-1 rounded transition-colors hover:text-foreground"
              style={{ color: icon.id === "telemetry" ? "var(--accent)" : undefined }}>
              <NavIcon d={icon.d} />
            </button>
          ))}
        </div>
        <div className="mt-auto" style={{ color: "var(--foreground-faint)" }}>
          <NavIcon d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
        </div>
      </nav>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* Status bar */}
        <header className="h-11 shrink-0 flex items-center gap-4 px-6"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>

          <span className="label text-[0.6rem]">Mission Control</span>
          <div className="w-px h-3" style={{ background: "var(--border-strong)" }} />
          <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-dim)" }}>
            {driver} {"//"} {event}
          </span>

          <div className="flex-1" />

          {/* Query input */}
          <form onSubmit={handleAnalyze} className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Analyse Verstappen lap times at Suzuka 2024"
              className="readout text-[0.65rem] w-72 px-3 py-1.5 outline-none transition-colors"
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <button type="submit" disabled={isLoading}
              className="readout text-[0.6rem] font-bold px-4 py-1.5 transition-all disabled:opacity-40 uppercase tracking-widest"
              style={{ background: "var(--accent)", color: "var(--background)" }}>
              {isLoading ? "…" : "Run"}
            </button>
          </form>

          {/* Team switcher — text badges */}
          <div className="flex items-center gap-1 ml-3 overflow-x-auto">
            {TEAMS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as TeamId)}
                title={t.label}
                className="readout text-[0.5rem] font-bold uppercase px-1.5 py-0.5 rounded-sm transition-all shrink-0"
                style={{
                  background: theme === t.id ? t.color : "transparent",
                  color: theme === t.id ? "#080808" : "var(--foreground-faint)",
                  border: `1px solid ${theme === t.id ? t.color : "var(--border)"}`,
                  letterSpacing: "0.05em",
                }}
              >
                {t.abbr}
              </button>
            ))}
          </div>
        </header>

        {/* Telemetry canvas */}
        <div className="flex-1 min-h-0 flex flex-col gap-0 px-6 py-4">
          {(["Speed", "Throttle", "Brake"] as const).map((label, i) => (
            <div key={label} className={`flex-1 min-h-0 ${i > 0 ? "mt-3" : ""}`}>
              <TelemetryChart
                label={label}
                unit={label === "Speed" ? "KPH" : label === "Throttle" ? "%" : "BAR"}
                value={
                  label === "Speed"    ? (tel?.speed?.avg?.toFixed(0) ?? "—") :
                  label === "Throttle" ? (tel?.throttle?.avg?.toFixed(0) ?? "—") :
                                         (tel?.brake?.avg?.toFixed(0) ?? "—")
                }
                isLoading={isLoading}
                hasData={hasData}
                markerLap={strat?.target_lap}
                animateKey={animKey}
              />
            </div>
          ))}
        </div>

        {/* Footer strip */}
        <footer className="h-9 shrink-0 flex items-center px-6 gap-5 overflow-hidden"
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          {[
            { label: "Tyre", value: "FL 102° FR 104° RL 98° RR 99°" },
            { label: "Fuel", value: "28.5 kg" },
            { label: "ERS",  value: "85%" },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-px h-3" style={{ background: "var(--border)" }} />}
              <span className="label">{label}</span>
              <span className="readout text-[0.6rem]" style={{ color: "var(--foreground)" }}>{value}</span>
            </div>
          ))}
          <div className="ml-auto readout text-[0.6rem]" style={{ color: "var(--accent)" }}>
            {hasData && strat?.undercut_risk === "high" ? "HIGH UNDERCUT RISK" : "DRS AVAILABLE"}
          </div>
        </footer>
      </div>

      {/* ── Strategy HUD ── */}
      <aside className="w-72 shrink-0 flex flex-col"
        style={{ borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>

        {/* HUD header */}
        <div className="px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <p className="label">Strategy HUD</p>
            {/* Active team badge */}
            <span
              className="readout text-[0.5rem] font-bold px-1.5 py-0.5 rounded-sm"
              style={{ background: activeTeam.color, color: "#080808", letterSpacing: "0.05em" }}
            >
              {activeTeam.abbr}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-dim)" }}>
              {result?.intent?.session_type ?? "RACE"} {"//"} LAP 43/71
            </span>
            <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-dim)" }}>+1.8s</span>
          </div>
        </div>

        {/* Alert block */}
        <div className="mx-4 mt-4 p-4 shrink-0"
          style={{ border: `1px solid var(--accent-dim)`, background: "var(--accent-dim)" }}>
          <p className="label mb-2" style={{ color: "var(--accent)" }}>
            {hasData && strat?.undercut_risk === "high" ? "⚠ STRATEGY ALERT" : "SYSTEM STATUS"}
          </p>
          <p className="readout text-[0.7rem] font-semibold leading-snug uppercase"
            style={{ color: "var(--foreground)" }}>
            {isLoading
              ? "Updating strategy…"
              : hasData
                ? (result?.agent_response ?? "Analysis complete.")
                : "Enter a query above to begin analysis."}
          </p>
        </div>

        {/* Rationale list — staggered when data arrives */}
        <div className="flex-1 overflow-y-auto px-4 mt-4 min-h-0">
          <p className="label mb-3">Tactical Rationale</p>
          <AnimatePresence mode="wait">
            <motion.ul key={hasData ? "data" : "idle"} className="space-y-2">
              {(hasData && strat?.rationale
                ? strat.rationale
                : [
                    "Awaiting telemetry feed.",
                    "Tyre degradation model ready.",
                    "Pace delta tracking idle.",
                    "Competitor windows standby.",
                  ]
              ).map((line, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}
                  className="flex gap-2 readout text-[0.65rem]"
                  style={{ color: "var(--foreground-dim)" }}
                >
                  <span style={{ color: "var(--accent)" }}>—</span>
                  <span>{line}</span>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <div className="p-4 shrink-0">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !query.trim()}
            className="w-full py-3 readout text-[0.65rem] font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--background)" }}
          >
            {isLoading ? "Computing…" : "Confirm Box Call"}
          </button>
        </div>
      </aside>
    </div>
  );
}
