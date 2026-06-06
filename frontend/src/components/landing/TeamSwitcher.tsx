"use client";

import { useEffect, useRef, useState } from "react";
import { useMissionStore } from "@/lib/store";
import { TeamIcon } from "@/components/icons/TeamIcons";

const TEAMS = [
  { id: "ferrari",     color: "#DC0000" },
  { id: "redbull",     color: "#1E2A78" },
  { id: "mercedes",    color: "#00D2BE" },
  { id: "mclaren",     color: "#FF8700" },
  { id: "alpine",      color: "#1F5EFF" },
  { id: "astonmartin", color: "#006F62" },
  { id: "williams",    color: "#005AFF" },
  { id: "haas",        color: "#B6BABD" },
  { id: "rb",          color: "#6692FF" },
  { id: "audi",        color: "#C8C8C8" },
  { id: "cadillac",    color: "#D4AF37" },
] as const;

type TeamId = (typeof TEAMS)[number]["id"];

export function TeamSwitcher() {
  const { theme, setTheme } = useMissionStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeTeam = TEAMS.find((t) => t.id === theme) ?? TEAMS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Trigger: active team icon only */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Switch team theme"
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-sm px-1.5 py-1 transition-colors hover:bg-surface"
        style={{ outline: open ? `1.5px solid ${activeTeam.color}` : "none", outlineOffset: "2px" }}
      >
        <TeamIcon id={activeTeam.id} size={22} />
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none"
          className="text-foreground-faint transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Popover: all 11 teams in a grid */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 border border-border bg-overlay p-3 shadow-xl backdrop-blur-xl"
          style={{ minWidth: "176px" }}
        >
          <p className="readout mb-2.5 text-[0.55rem] uppercase tracking-[var(--track-widest)] text-foreground-faint">
            Team theme
          </p>
          <div className="grid grid-cols-4 gap-2">
            {TEAMS.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id as TeamId); setOpen(false); }}
                  title={t.id}
                  className="flex items-center justify-center rounded-sm p-1.5 transition-all duration-[var(--dur-fast)] hover:bg-surface"
                  style={{
                    opacity:       active ? 1 : 0.45,
                    filter:        active ? "none" : "grayscale(0.8)",
                    outline:       active ? `1.5px solid ${t.color}` : "none",
                    outlineOffset: "2px",
                  }}
                >
                  <TeamIcon id={t.id} size={22} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
