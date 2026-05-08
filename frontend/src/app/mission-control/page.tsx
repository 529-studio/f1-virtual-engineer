"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeTelemetry, getEventsByYear } from "@/services/api";
import type { AnalyzeResponse, EventInfo } from "@/services/api";
import { useMissionStore } from "@/lib/store";
import { TeamIcon } from "@/components/icons/TeamIcons";

/* ─── Constants ─────────────────────────────────────────────── */
const TEAMS = [
  { id: "ferrari",     color: "#DC0000", label: "Ferrari" },
  { id: "redbull",     color: "#1E2A78", label: "Red Bull" },
  { id: "mercedes",    color: "#00D2BE", label: "Mercedes" },
  { id: "mclaren",     color: "#FF8700", label: "McLaren" },
  { id: "alpine",      color: "#1F5EFF", label: "Alpine" },
  { id: "astonmartin", color: "#006F62", label: "Aston Martin" },
  { id: "williams",    color: "#005AFF", label: "Williams" },
  { id: "haas",        color: "#B6BABD", label: "Haas" },
  { id: "rb",          color: "#6692FF", label: "Racing Bulls" },
  { id: "audi",        color: "#C8C8C8", label: "Revolut Audi" },
  { id: "cadillac",    color: "#D4AF37", label: "Cadillac" },
] as const;
type TeamId = (typeof TEAMS)[number]["id"];

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018] as const;

const SESSIONS = [
  { id: "R",   label: "Race" },
  { id: "Q",   label: "Qualifying" },
  { id: "FP3", label: "FP3" },
  { id: "FP2", label: "FP2" },
  { id: "FP1", label: "FP1" },
] as const;
type SessionId = (typeof SESSIONS)[number]["id"];

const DRIVERS = [
  "VER", "HAM", "LEC", "NOR", "SAI", "RUS", "PIA", "ALO",
  "STR", "PER", "GAS", "OCO", "TSU", "ALB", "HUL", "MAG",
  "BOT", "ZHO", "SAR", "RIC",
] as const;
type DriverCode = (typeof DRIVERS)[number];

const NAV = [
  { id: "home",     d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "telemetry",d: "M3 3v18h18M7 16l4-4 4 4 5-8" },
  { id: "compare",  d: "M18 20V10M12 20V4M6 20v-6" },
  { id: "history",  d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "settings", d: "M10.3 3.9L2 18a2 2 0 001.7 3h16.6A2 2 0 0022 18L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" },
];

/* ─── Small components ───────────────────────────────────────── */
function NavIcon({ d }: { d: string }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function Select<T extends string>({
  value, onChange, options, loading, placeholder,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  loading?: boolean;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={loading}
        className="readout text-[0.6rem] uppercase tracking-widest appearance-none pl-3 pr-7 py-1.5 outline-none transition-colors cursor-pointer disabled:opacity-40"
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          color: value ? "var(--foreground)" : "var(--foreground-dim)",
          minWidth: "9rem",
        }}
        onFocus={(e)  => (e.currentTarget.style.borderColor = "var(--accent)")}
        onBlur={(e)   => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <option value="" disabled>{loading ? "Loading…" : placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      {/* chevron */}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-50">
        <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

/* ─── Chart builds a readable curve from min/avg/max ────────── */
function buildPath(min: number, avg: number, max: number): string {
  // Normalise to SVG viewBox 0-80 (0=top, 80=bottom)
  const vbH = 80;
  const norm = (v: number, lo: number, hi: number) =>
    hi === lo ? vbH / 2 : vbH - ((v - lo) / (hi - lo)) * vbH * 0.85 - vbH * 0.075;

  const lo = min * 0.95;
  const hi = max * 1.05;
  const yMin = norm(min, lo, hi);
  const yAvg = norm(avg, lo, hi);
  const yMax = norm(max, lo, hi);

  // Smooth wave: min at left trough, max at peak, return to avg
  return [
    `M0 ${yMin.toFixed(1)}`,
    `C100 ${yMin.toFixed(1)} 180 ${yMax.toFixed(1)} 300 ${yMax.toFixed(1)}`,
    `C420 ${yMax.toFixed(1)} 500 ${yAvg.toFixed(1)} 650 ${yAvg.toFixed(1)}`,
    `C800 ${yAvg.toFixed(1)} 900 ${yMin.toFixed(1)} 1000 ${(yMin + 4).toFixed(1)}`,
  ].join(" ");
}

function TelemetryChart({
  label, unit, channelData, isLoading, hasData, animateKey,
}: {
  label: string; unit: string;
  channelData?: { min: number; max: number; avg: number } | null;
  isLoading: boolean; hasData: boolean; animateKey: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const pathD = channelData ? buildPath(channelData.min, channelData.avg, channelData.max) : "";

  useEffect(() => {
    if (!pathRef.current || !hasData || !pathD) return;
    const len = pathRef.current.getTotalLength();
    pathRef.current.style.strokeDasharray = `${len}`;
    pathRef.current.style.strokeDashoffset = `${len}`;
    const anim = pathRef.current.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 900, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" },
    );
    return () => anim.cancel();
  }, [hasData, animateKey, pathD]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-baseline justify-between mb-2 shrink-0">
        <span className="label">{label}</span>
        <AnimatePresence mode="wait">
          {hasData && channelData ? (
            <motion.div key="value" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-baseline gap-3">
              <span className="readout text-[0.55rem]" style={{ color: "var(--foreground-faint)" }}>
                {channelData.min.toFixed(0)} <span style={{ color: "var(--foreground-dim)" }}>min</span>
              </span>
              <span className="readout text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                {channelData.avg.toFixed(0)}
              </span>
              <span className="readout text-[0.55rem]" style={{ color: "var(--foreground-faint)" }}>
                {channelData.max.toFixed(0)} <span style={{ color: "var(--foreground-dim)" }}>max</span>
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
            <motion.div className="h-px w-10" style={{ background: "var(--accent)" }}
              animate={{ scaleX: [1, 2.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="readout text-[0.6rem] uppercase tracking-widest"
              style={{ color: "var(--foreground-faint)" }}>
              Select session above and run analysis
            </span>
          </div>
        )}

        {!isLoading && hasData && pathD && (
          <svg className="w-full h-full" viewBox="0 0 1000 80" preserveAspectRatio="none">
            <path ref={pathRef} d={pathD} fill="none" stroke="var(--accent)" strokeWidth="1.4" />
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
  const { theme, setTheme, result, setResult, isLoading, setIsLoading } = useMissionStore();

  // Selector state
  const [year, setYear]       = useState<number>(2024);
  const [eventName, setEvent] = useState<string>("");
  const [session, setSession] = useState<SessionId>("R");
  const [driver, setDriver]   = useState<DriverCode | "">("");

  // Events list fetched per year
  const [events, setEvents]       = useState<EventInfo[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Sync data-theme globally (ThemeProvider in layout handles it, but keep local override)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Fetch events when year changes
  useEffect(() => {
    let cancelled = false;
    getEventsByYear(year)
      .then((res) => {
        if (!cancelled) {
          setEvents(res.events ?? []);
          setEvent("");
          setEventsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
          setEventsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [year]);

  const canRun = !isLoading && !!eventName && !!driver;

  const handleAnalyze = useCallback(async () => {
    if (!canRun) return;
    setIsLoading(true);
    try {
      const res = await analyzeTelemetry({
        query: `Analyse ${driver} ${session} session at ${eventName} ${year}`,
        driver,
        session_info: { event: eventName, year, session_type: session },
      });
      setResult(res as AnalyzeResponse);
    } catch {
      /* silent — HUD shows fallback state */
    } finally {
      setIsLoading(false);
    }
  }, [canRun, driver, session, eventName, year, setIsLoading, setResult]);

  const tel     = result?.telemetry_data;
  const strat   = result?.strategy_data;
  const hasData = !isLoading && !!result;
  const animKey = result ? 1 : 0;

  const displayDriver = result?.intent?.driver ?? driver ?? "—";
  const displayEvent  = result?.intent?.event  ?? eventName ?? "—";

  const activeTeam = TEAMS.find((t) => t.id === theme) ?? TEAMS[0];

  const eventOptions  = events.map((e) => ({ id: e.name, label: e.name }));
  const sessionOptions= SESSIONS.map((s) => ({ id: s.id, label: s.label }));
  const driverOptions = DRIVERS.map((d) => ({ id: d, label: d }));

  return (
    <div className="h-screen w-screen flex overflow-hidden"
      style={{ background: "var(--background)", color: "var(--foreground)" }}>

      {/* ── Sidebar ── */}
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

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">

        {/* Status bar */}
        <header className="h-14 shrink-0 flex items-center gap-3 px-5"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <span className="label text-[0.6rem] shrink-0">Mission Control</span>
          <div className="w-px h-3 shrink-0" style={{ background: "var(--border-strong)" }} />
          <span className="readout text-[0.6rem] shrink-0" style={{ color: "var(--foreground-dim)" }}>
            {displayDriver} {"//"} {displayEvent}
          </span>
          <div className="flex-1" />

          {/* Team switcher */}
          <div className="flex items-center gap-1.5">
            {TEAMS.map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id as TeamId)}
                title={t.label} className="transition-all shrink-0 rounded-sm"
                style={{
                  opacity: theme === t.id ? 1 : 0.35,
                  transform: theme === t.id ? "scale(1.5)" : "scale(1)",
                  outline: theme === t.id ? `1.5px solid ${t.color}` : "none",
                  outlineOffset: "2px",
                }}>
                <TeamIcon id={t.id} size={24} />
              </button>
            ))}
          </div>
        </header>

        {/* ── Selector bar ── */}
        <div className="shrink-0 flex items-center gap-2 px-5 py-2.5"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-elevated)" }}>

          {/* Year */}
          <Select<string>
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={YEARS.map((y) => ({ id: String(y), label: String(y) }))}
            placeholder="Year"
          />

          <div className="w-px h-5 shrink-0" style={{ background: "var(--border)" }} />

          {/* Grand Prix */}
          <Select<string>
            value={eventName}
            onChange={(v) => setEvent(v)}
            options={eventOptions}
            loading={eventsLoading}
            placeholder="Grand Prix"
          />

          <div className="w-px h-5 shrink-0" style={{ background: "var(--border)" }} />

          {/* Session */}
          <Select<SessionId>
            value={session}
            onChange={(v) => setSession(v)}
            options={sessionOptions}
            placeholder="Session"
          />

          <div className="w-px h-5 shrink-0" style={{ background: "var(--border)" }} />

          {/* Driver */}
          <Select<DriverCode | "">
            value={driver}
            onChange={(v) => setDriver(v as DriverCode)}
            options={driverOptions}
            placeholder="Driver"
          />

          <div className="flex-1" />

          {/* Run button */}
          <button
            onClick={handleAnalyze}
            disabled={!canRun}
            className="readout text-[0.6rem] font-bold px-5 py-1.5 transition-all disabled:opacity-30 uppercase tracking-widest shrink-0"
            style={{ background: "var(--accent)", color: "var(--background)" }}
          >
            {isLoading ? "Computing…" : "Analyze"}
          </button>
        </div>

        {/* Telemetry canvas */}
        <div className="flex-1 min-h-0 flex flex-col gap-0 px-6 py-4">
          {(["Speed", "Throttle", "Brake"] as const).map((label, i) => {
            const ch = label === "Speed"    ? tel?.speed
                     : label === "Throttle" ? tel?.throttle
                     :                        tel?.brake;
            return (
              <div key={label} className={`flex-1 min-h-0 ${i > 0 ? "mt-3" : ""}`}>
                <TelemetryChart
                  label={label}
                  unit={label === "Speed" ? "KPH" : label === "Throttle" ? "%" : "BAR"}
                  channelData={ch}
                  isLoading={isLoading}
                  hasData={hasData}
                  animateKey={animKey}
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="h-9 shrink-0 flex items-center px-6 gap-5 overflow-hidden"
          style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          {[
            { label: "RPM",  value: tel?.rpm    ? `${tel.rpm.avg.toFixed(0)} avg`  : "—" },
            { label: "Gear", value: tel?.gear   ? `${tel.gear.avg.toFixed(1)} avg` : "—" },
            { label: "Pts",  value: tel?.sample_points ? `${tel.sample_points} samples` : "—" },
          ].map(({ label, value }, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-px h-3" style={{ background: "var(--border)" }} />}
              <span className="label">{label}</span>
              <span className="readout text-[0.6rem]" style={{ color: "var(--foreground)" }}>{value}</span>
            </div>
          ))}
          <div className="ml-auto readout text-[0.6rem]" style={{ color: "var(--accent)" }}>
            {hasData && strat?.undercut_risk === "high" ? "HIGH UNDERCUT RISK" : hasData ? "ANALYSIS COMPLETE" : "AWAITING SESSION"}
          </div>
        </footer>
      </div>

      {/* ── Strategy HUD ── */}
      <aside className="w-72 shrink-0 flex flex-col"
        style={{ borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>

        <div className="px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <p className="label">Strategy HUD</p>
            <TeamIcon id={activeTeam.id} size={14} />
          </div>
          <div className="flex justify-between items-baseline">
            <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-dim)" }}>
              {session} {"//"} {hasData && strat?.target_lap ? `PIT LAP ${strat.target_lap}` : "NO DATA"}
            </span>
            <span className="readout text-[0.6rem]" style={{ color: "var(--foreground-dim)" }}>
              {hasData && strat?.confidence_band ? strat.confidence_band.toUpperCase() : "—"}
            </span>
          </div>
        </div>

        {/* Alert block */}
        <div className="mx-4 mt-4 p-4 shrink-0"
          style={{ border: "1px solid var(--accent-dim)", background: "var(--accent-dim)" }}>
          <p className="label mb-2" style={{ color: "var(--accent)" }}>
            {hasData && strat?.undercut_risk === "high" ? "⚠ STRATEGY ALERT" : "SYSTEM STATUS"}
          </p>
          <p className="readout text-[0.7rem] font-semibold leading-snug uppercase"
            style={{ color: "var(--foreground)" }}>
            {isLoading
              ? "Fetching telemetry…"
              : hasData
                ? (result?.agent_response ?? "Analysis complete.")
                : "Select year, grand prix, session and driver above."}
          </p>
        </div>

        {/* Rationale */}
        <div className="flex-1 overflow-y-auto px-4 mt-4 min-h-0">
          <p className="label mb-3">Tactical Rationale</p>
          <AnimatePresence mode="wait">
            <motion.ul key={hasData ? "data" : "idle"} className="space-y-2">
              {(hasData && strat?.rationale?.length
                ? strat.rationale
                : [
                    "Awaiting session selection.",
                    "Tyre degradation model ready.",
                    "Pace delta tracking idle.",
                    "Competitor windows standby.",
                  ]
              ).map((line, i) => (
                <motion.li key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3 }}
                  className="flex gap-2 readout text-[0.65rem]"
                  style={{ color: "var(--foreground-dim)" }}>
                  <span style={{ color: "var(--accent)" }}>—</span>
                  <span>{line}</span>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>

          {/* Pit window */}
          {hasData && strat?.recommended_pit_window_laps?.length === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-4 p-3" style={{ border: "1px solid var(--border)" }}>
              <p className="label mb-1">Pit Window</p>
              <p className="readout text-base font-bold" style={{ color: "var(--accent)" }}>
                LAP {strat.recommended_pit_window_laps[0]} – {strat.recommended_pit_window_laps[1]}
              </p>
              {strat.fallback && (
                <p className="readout text-[0.55rem] mt-1" style={{ color: "var(--foreground-faint)" }}>
                  {strat.fallback_reason ?? "Estimate — live data unavailable"}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* CTA */}
        <div className="p-4 shrink-0">
          <button onClick={handleAnalyze} disabled={!canRun}
            className="w-full py-3 readout text-[0.65rem] font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-30"
            style={{ background: "var(--accent)", color: "var(--background)" }}>
            {isLoading ? "Computing…" : "Run Analysis"}
          </button>
        </div>
      </aside>
    </div>
  );
}
