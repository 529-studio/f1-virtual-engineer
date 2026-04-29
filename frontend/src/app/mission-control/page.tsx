"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

const TelemetryChart = ({ label, value, unit, color, points }: { label: string, value: string, unit: string, color: string, points: string }) => (
  <div className="flex-1 min-h-0 flex flex-col group">
    <div className="flex justify-between items-end mb-1">
      <h3 className="readout text-[11px] uppercase tracking-wider text-white/50">{label} ({unit})</h3>
      <div className="flex items-baseline gap-1">
        <span className="readout text-2xl font-bold">{value}</span>
        <span className="readout text-[10px] uppercase text-white/30">{unit}</span>
      </div>
    </div>
    <div className="flex-1 relative border border-white/5 bg-white/2 backdrop-blur-sm overflow-hidden">
      {/* Mock Chart SVG */}
      <svg className="w-full h-full" preserveAspectRatio="none">
        <path d={points} fill="none" stroke={color} strokeWidth="1.5" className="opacity-80" />
        {/* Mock Data Points */}
        <circle cx="45%" cy="30%" r="3" fill={color} />
        <text x="45.5%" y="28%" className="readout text-[9px] fill-white/80">325</text>
      </svg>
    </div>
  </div>
);

export default function MissionControlPage() {
  const [theme, setTheme] = useState<"apex" | "mercedes">("apex");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <main className="h-screen w-screen flex bg-background text-foreground transition-colors duration-500">
      {/* Left Sidebar Rail */}
      <nav className="w-16 border-r border-border bg-black/50 flex flex-col items-center py-6 gap-8 z-50">
        <div className="h-8 w-8 bg-accent flex items-center justify-center font-black italic rounded-sm cursor-pointer" onClick={() => setTheme(theme === "apex" ? "mercedes" : "apex")}>
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="pt-10 px-10 pb-6">
          <h1 className="monumental leading-[0.85] max-w-2xl">
            {theme === "apex" ? "Apex-Intelligence Mission Control" : "Apex-Intelligence Mercedes Edition"}
          </h1>
          <p className="readout text-[10px] text-white/30 mt-4 uppercase tracking-[0.2em]">
            Monumental SF Pro Display, 4rem, 800, uppercase
          </p>
        </header>

        {/* Telemetry Canvas */}
        <div className="flex-1 px-10 pb-8 flex flex-col gap-6">
          <TelemetryChart 
            label="Speed" value="322" unit="KPH" color="currentColor" 
            points="M0 80 Q 50 20 100 70 T 200 40 T 300 90 T 400 30 T 500 60 T 600 20 T 700 80 T 800 40 T 1000 60" 
          />
          <TelemetryChart 
            label="Throttle" value="98" unit="%" color="currentColor" 
            points="M0 20 L 20 20 L 22 90 L 40 90 L 42 10 L 100 10 L 105 80 L 150 80 L 155 20 L 300 20 L 305 95 L 400 95 L 405 15 L 600 15 L 605 85 L 800 85 L 805 10 L 1000 10" 
          />
          <TelemetryChart 
            label="Brake" value="145" unit="BAR" color="currentColor" 
            points="M0 95 L 100 95 L 105 40 L 110 95 L 200 95 L 210 20 L 220 95 L 500 95 L 510 30 L 520 95 L 800 95 L 810 10 L 820 95 L 1000 95" 
          />
        </div>

        {/* Bottom Status Bar */}
        <footer className="h-14 border-t border-border bg-black/30 flex items-center px-10 gap-8 overflow-hidden">
          <div className="flex gap-4 shrink-0">
            <span className="readout text-[10px] text-white/30 uppercase">Tyre Temp</span>
            <div className="flex gap-3 text-[10px] font-bold">
              <span>FL 102°C</span> <span>FR 104°C</span> <span>RL 98°C</span> <span>RR 99°C</span>
            </div>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex gap-3 text-[10px] font-bold shrink-0">
            <span className="text-white/30 uppercase">Fuel Remaining</span> <span>28.5 KG</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex gap-3 text-[10px] font-bold shrink-0">
            <span className="text-white/30 uppercase">ERS Deploy</span> <span>85%</span>
          </div>
          <div className="ml-auto flex gap-6 text-[10px] font-bold">
            <span className="text-accent">DRS AVAILABLE</span>
            <span className="text-white/30">WEATHER DRY</span>
          </div>
        </footer>
      </div>

      {/* Right Strategy HUD */}
      <aside className="w-[420px] h-full border-l border-border bg-surface/40 backdrop-blur-2xl p-10 flex flex-col">
        <div className="mb-10">
          <h2 className="monumental text-3xl mb-1">Strategy Insights</h2>
          <p className="readout text-[10px] text-white/30 uppercase tracking-widest">Monumental SF Pro Display</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <p className="readout text-[10px] text-white/30 uppercase mb-2">Race Status</p>
            <p className="readout text-sm font-bold">LAP 43/71 - P1 (NOR)</p>
          </div>
          <div className="text-right">
            <p className="readout text-[10px] text-white/30 uppercase mb-2">Interval</p>
            <p className="readout text-sm font-bold">+1.8S</p>
          </div>
        </div>

        {/* Critical Alert Box */}
        <div className="border border-accent border-dashed p-6 bg-accent/5 mb-10">
          <div className="flex items-center gap-2 mb-3 text-accent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="readout text-[11px] font-black uppercase tracking-widest">Critical Alert</span>
          </div>
          <p className="readout text-xs font-bold leading-relaxed uppercase">
            Box this lap. Tyre decay critical. Undercut risk high.
          </p>
        </div>

        {/* AI Reasoning List */}
        <div className="flex-1">
          <h4 className="readout text-[11px] text-white/30 uppercase mb-6 tracking-widest">AI Reasoning</h4>
          <ul className="space-y-4 readout text-[11px] font-medium leading-relaxed">
            <li className="flex gap-3">
              <span className="text-accent">•</span>
              <span>Medium compound degradation exceeds 12% threshold.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent">•</span>
              <span>Competitor SAI pitting imminent.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent">•</span>
              <span>Projected pit window: Laps 43-45.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-accent">•</span>
              <span>Expected re-join position: P4 (clean air).</span>
            </li>
          </ul>
        </div>

        {/* Primary Box Call Button */}
        <button className="w-full bg-accent py-5 readout text-[13px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all active:scale-[0.98]">
          Confirm Box Call
        </button>
      </aside>
    </main>
  );
}
