"use client";

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
  { id: "sauber",      color: "#7CFF4F" },
  { id: "cadillac",    color: "#D4AF37" },
] as const;

type TeamId = (typeof TEAMS)[number]["id"];

export function TeamSwitcher() {
  const { theme, setTheme } = useMissionStore();

  return (
    <div className="flex items-center gap-1.5">
      {TEAMS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id as TeamId)}
          title={t.id}
          className="transition-all rounded-sm shrink-0"
          style={{
            opacity:   theme === t.id ? 1 : 0.3,
            transform: theme === t.id ? "scale(1.4)" : "scale(1)",
            outline:   theme === t.id ? `1.5px solid ${t.color}` : "none",
            outlineOffset: "2px",
          }}
        >
          <TeamIcon id={t.id} size={11} />
        </button>
      ))}
    </div>
  );
}
