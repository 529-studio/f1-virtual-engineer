"use client";

import { AuthButton } from "@/components/auth/AuthButton";
import { TeamSwitcher } from "@/components/landing/TeamSwitcher";
import type { WeatherSummaryResponse } from "@/services/api";
import { WeatherPill } from "./WeatherPill";

export function MissionHeader({
  displayDriver, displayEvent, displayLap, weather,
}: {
  displayDriver: string;
  displayEvent: string;
  displayLap: string | null;
  weather: WeatherSummaryResponse | null;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-5">
      <span className="label shrink-0 text-[length:var(--text-readout)]">Mission Control</span>
      <div className="h-3 w-px shrink-0 bg-border-strong" />
      <span className="readout shrink-0 text-[length:var(--text-readout)] text-foreground-dim">
        {displayDriver} {"//"} {displayEvent}{displayLap ? ` // ${displayLap}` : ""}
      </span>
      <WeatherPill weather={weather} />
      <div className="flex-1" />

      <AuthButton />

      <div className="h-3 w-px shrink-0 bg-border-strong" />

      <TeamSwitcher />
    </header>
  );
}
