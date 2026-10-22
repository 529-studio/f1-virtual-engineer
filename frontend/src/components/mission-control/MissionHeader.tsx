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
    <header className="flex h-14 shrink-0 items-center gap-2 sm:gap-3 border-b border-border bg-surface px-3 sm:px-5 overflow-x-hidden">
      <span className="label shrink-0 text-[0.65rem] sm:text-[length:var(--text-readout)]">Mission Control</span>
      <div className="hidden sm:block h-3 w-px shrink-0 bg-border-strong" />
      <span className="readout min-w-0 truncate text-[0.62rem] sm:text-[length:var(--text-readout)] text-foreground-dim max-w-[130px] sm:max-w-[200px] md:max-w-none">
        {displayDriver} {"//"} {displayEvent}{displayLap ? ` // ${displayLap}` : ""}
      </span>
      <WeatherPill weather={weather} />
      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-2">
        <AuthButton />
        <div className="h-3 w-px shrink-0 bg-border-strong" />
        <TeamSwitcher />
      </div>
    </header>
  );
}
