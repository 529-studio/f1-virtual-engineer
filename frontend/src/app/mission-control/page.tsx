"use client";

import { useState, useEffect, FormEvent } from "react";
import { analyzeTelemetry, AnalyzeResponse } from "@/services/api";

const ICON_SIZE = 20;

const SidebarIcon = ({ d }: { d: string }) => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const navIcons = [
  { id: "dashboard", d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "telemetry", d: "M3 3v18h18M7 16l4-4 4 4 5-8" },
  { id: "compare", d: "M18 20V10M12 20V4M6 20v-6" },
  { id: "history", d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "settings", d: "M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" },
];

const TelemetryChart = ({ label, value, unit, color, isLoading }: { label: string, value: string, unit: string, color: string, isLoading: boolean }) => (
  <div className="flex-1 min-h-0 flex flex-col group overflow-hidden">
    <div className="flex justify-between items-end mb-1">
      <h3 className="readout text-[11px] uppercase tracking-wider text-white/50">{label} ({unit})</h3>
      <div className="flex items-baseline gap-1">
        <span className="readout text-2xl font-bold">{isLoading ? "---" : value}</span>
        <span className="readout text-[10px] uppercase text-white/30">{unit}</span>
      </div>
    </div>
    <div className="flex-1 relative border border-white/5 bg-white/2 backdrop-blur-sm overflow-hidden">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-[1px] bg-accent/30 animate-pulse" />
        </div>
      ) : (
        <svg className="w-full h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <path 
            d={generateMockPath(label)} 
            fill="none" 
            stroke={color} 
            strokeWidth="1.5" 
            className="opacity-80"
          />
          <circle cx="85%" cy="30%" r="3" fill={color} />
          <text x="86%" y="28%" className="readout text-[24px] fill-white/80" style={{ fontSize: '24px' }}>{value}</text>
        </svg>
      )}
    </div>
  </div>
);

// Helper to generate different "vibe" paths for charts
function generateMockPath(type: string) {
  if (type === "Speed") return "M0 80 Q 100 20 200 60 T 400 30 T 600 50 T 800 20 T 1000 40";
  if (type === "Throttle") return "M0 20 L 50 20 L 55 90 L 100 90 L 105 10 L 300 10 L 310 80 L 500 80 L 510 20 L 800 20 L 810 95 L 1000 95";
  return "M0 95 L 200 95 L 210 30 L 220 95 L 600 95 L 610 10 L 620 95 L 1000 95";
}

export default function MissionControlPage() {
  const [theme, setTheme] = useState<"apex" | "mercedes">("apex");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleRunAnalysis = async (e: FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setIsLoading(true);
    try {
      const response = await analyzeTelemetry({ query });
      setResult(response);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const telemetry = result?.telemetry_data;
  const strategy = result?.strategy_data;

  return (
    <main className="h-screen w-screen flex bg-background text-foreground transition-colors duration-500 overflow-hidden">
      {/* Left Sidebar Rail */}
      <nav className="w-16 border-r border-border bg-black/50 flex flex-col items-center py-6 gap-8 z-50 shrink-0">
        <div className="h-8 w-8 bg-accent flex items-center justify-center font-black italic rounded-sm">
          A
        </div>
        <div className="flex flex-col gap-6 text-white/40">
          {navIcons.map((icon) => (
            <button key={icon.id} className={`hover:text-accent transition-colors ${icon.id === "telemetry" ? "text-accent" : ""}`}>
              <SidebarIcon d={icon.d} />
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-6 text-white/20">
          <SidebarIcon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="pt-8 px-10 pb-4 shrink-0">
          <h1 className="monumental leading-[0.85] w-full">
            {theme === "apex" ? "Apex-Intelligence Mission Control" : "Apex-Intelligence Mercedes Edition"}
          </h1>
          <div className="flex items-center gap-6 mt-4">
            <form onSubmit={handleRunAnalysis} className="flex-1 max-w-xl">
              <input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="PROMPT ENGINEER COMMAND..." 
                className="w-full bg-white/5 border border-white/10 px-4 py-2 readout text-[10px] uppercase tracking-widest outline-none focus:border-accent/50 transition-colors"
              />
            </form>
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <span className="readout text-[9px] text-white/30 uppercase tracking-widest">Team Theme</span>
              <button 
                onClick={() => setTheme("apex")}
                className={`w-4 h-4 rounded-full border ${theme === "apex" ? "border-white scale-125" : "border-white/20"} bg-[#FF2800] transition-all`}
                title="Apex Default"
              />
              <button 
                onClick={() => setTheme("mercedes")}
                className={`w-4 h-4 rounded-full border ${theme === "mercedes" ? "border-white scale-125" : "border-white/20"} bg-[#00A19B] transition-all`}
                title="Mercedes AMG"
              />
            </div>
            <p className="readout text-[10px] text-white/20 uppercase tracking-[0.2em] ml-auto hidden xl:block">
              {result?.intent?.driver || "NO_DRIVER"} {"//"} {result?.intent?.event || "NO_EVENT"}
            </p>
          </div>
        </header>

        {/* Telemetry Canvas */}
        <div className="flex-1 px-10 pb-6 flex flex-col gap-4 min-h-0 overflow-hidden">
          <TelemetryChart 
            label="Speed" 
            value={telemetry?.speed?.avg.toFixed(0) || "322"} 
            unit="KPH" 
            color="currentColor" 
            isLoading={isLoading}
          />
          <TelemetryChart 
            label="Throttle" 
            value={telemetry?.throttle?.avg?.toFixed(0) || "98"} 
            unit="%" 
            color="currentColor" 
            isLoading={isLoading}
          />
          <TelemetryChart 
            label="Brake" 
            value={telemetry?.brake?.avg?.toFixed(0) || "145"} 
            unit="BAR" 
            color="currentColor" 
            isLoading={isLoading}
          />
        </div>

        {/* Bottom Status Bar */}
        <footer className="h-12 border-t border-border bg-black/30 flex items-center px-10 gap-6 overflow-hidden shrink-0">
          <div className="flex gap-4 shrink-0 items-center">
            <span className="readout text-[9px] text-white/30 uppercase">Tyre Temp</span>
            <div className="flex gap-3 text-[9px] font-bold">
              <span>FL 102°C</span> <span>FR 104°C</span> <span>RL 98°C</span> <span>RR 99°C</span>
            </div>
          </div>
          <div className="w-px h-3 bg-white/10 shrink-0" />
          <div className="flex gap-2 text-[9px] font-bold shrink-0 items-center">
            <span className="text-white/30 uppercase">Fuel</span> <span>28.5 KG</span>
          </div>
          <div className="w-px h-3 bg-white/10 shrink-0" />
          <div className="flex gap-2 text-[9px] font-bold shrink-0 items-center">
            <span className="text-white/30 uppercase">ERS</span> <span>85%</span>
          </div>
          <div className="ml-auto flex gap-4 text-[9px] font-bold shrink-0">
            <span className={strategy?.undercut_risk === "high" ? "text-accent animate-pulse" : "text-accent"}>
              {strategy?.undercut_risk ? `${strategy.undercut_risk.toUpperCase()} UNDERCUT RISK` : "DRS AVAILABLE"}
            </span>
            <span className="text-white/30">WEATHER DRY</span>
          </div>
        </footer>
      </div>

      {/* Right Strategy HUD */}
      <aside className="w-[380px] h-full border-l border-border bg-surface/40 backdrop-blur-2xl p-8 flex flex-col shrink-0 overflow-y-auto">
        <div className="mb-8">
          <h2 className="monumental text-2xl mb-1 uppercase">Strategy Insights</h2>
          <p className="readout text-[9px] text-white/30 uppercase tracking-widest">Operator HUD V2.4</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="readout text-[9px] text-white/30 uppercase mb-1">Race Status</p>
            <p className="readout text-xs font-bold uppercase truncate">{result?.intent?.session_type || "RACE"} {"//"} LAP 43/71</p>
          </div>
          <div className="text-right">
            <p className="readout text-[9px] text-white/30 uppercase mb-1">Interval</p>
            <p className="readout text-xs font-bold">+1.8S</p>
          </div>
        </div>

        {/* Critical Alert Box */}
        <div className={`border ${strategy?.undercut_risk === "high" ? "border-accent" : "border-white/10"} border-dashed p-5 bg-white/5 mb-8 transition-colors`}>
          <div className="flex items-center gap-2 mb-2 text-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="readout text-[10px] font-black uppercase tracking-widest">System Alert</span>
          </div>
          <p className="readout text-[11px] font-bold leading-relaxed uppercase">
            {isLoading ? "UPDATING STRATEGY..." : (result?.agent_response || "Waiting for command input to analyze strategy signals.")}
          </p>
        </div>

        {/* AI Reasoning List */}
        <div className="flex-1 min-h-[200px]">
          <h4 className="readout text-[10px] text-white/30 uppercase mb-4 tracking-widest">Tactical Rationale</h4>
          <ul className="space-y-3 readout text-[10px] font-medium leading-relaxed opacity-80">
            {(strategy?.rationale || [
              "Awaiting real-time telemetry feed.",
              "Ready to compute tyre degradation.",
              "Pace delta tracking idle.",
              "Competitor pit windows standby."
            ]).map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Primary Box Call Button */}
        <button 
          disabled={isLoading}
          onClick={handleRunAnalysis}
          className="w-full bg-accent py-4 readout text-[11px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-[0.98] mt-6 disabled:opacity-50"
        >
          {isLoading ? "Computing..." : "Confirm Box Call"}
        </button>
      </aside>
    </main>
  );
}
