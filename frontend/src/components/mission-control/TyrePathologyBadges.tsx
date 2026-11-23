"use client";

import React from "react";
import {
  Flame,
  ShieldAlert,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import type { TyreWheelThermalData } from "@/types/tyre-thermal";

interface TyrePathologyBadgesProps {
  wheelData: TyreWheelThermalData;
  criticalAlerts?: string[];
}

export function TyrePathologyBadges({
  wheelData,
  criticalAlerts = [],
}: TyrePathologyBadgesProps) {
  const {
    thermal_status,
    pressure_status,
    blistering_risk,
    graining_risk,
    thermal_cliff_risk,
    camber_bias_c,
  } = wheelData;

  const relevantAlerts = criticalAlerts.filter((a) =>
    a.startsWith(`${wheelData.position}:`)
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5" role="region" aria-label="Tyre Status Indicators">
        {/* Thermal Operating Status */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium border ${
            thermal_status === "OPTIMAL"
              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
              : thermal_status === "COLD"
              ? "bg-sky-950/60 text-sky-400 border-sky-800/80"
              : thermal_status === "WARM"
              ? "bg-amber-950/60 text-amber-400 border-amber-800/80"
              : "bg-red-950/70 text-red-400 border-red-800 animate-pulse"
          }`}
        >
          {thermal_status === "OPTIMAL" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
          ) : thermal_status === "COLD" ? (
            <Activity className="w-3.5 h-3.5 text-sky-400" strokeWidth={1.75} />
          ) : (
            <Flame className="w-3.5 h-3.5 text-red-400" strokeWidth={1.75} />
          )}
          {thermal_status}
        </span>

        {/* Inflation Pressure Status */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium border ${
            pressure_status === "OPTIMAL"
              ? "bg-neutral-900/80 text-neutral-300 border-neutral-700"
              : pressure_status === "OVER_INFLATED"
              ? "bg-amber-950/60 text-amber-300 border-amber-700"
              : "bg-sky-950/60 text-sky-300 border-sky-700"
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.75} />
          {pressure_status.replace("_", " ")}
        </span>

        {/* Blistering Warning */}
        {blistering_risk && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-red-950/80 text-red-300 border border-red-600 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" strokeWidth={1.75} />
            BLISTERING RISK
          </span>
        )}

        {/* Graining Warning */}
        {graining_risk && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-sky-950/80 text-sky-300 border border-sky-600">
            <AlertTriangle className="w-3.5 h-3.5 text-sky-400" strokeWidth={1.75} />
            GRAINING RISK
          </span>
        )}

        {/* Thermal Cliff Warning */}
        {thermal_cliff_risk && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-600">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
            THERMAL CLIFF
          </span>
        )}

        {/* Camber Overheat Warning */}
        {camber_bias_c > 15.0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium bg-neutral-900/90 text-orange-400 border border-orange-700/80">
            <Flame className="w-3.5 h-3.5 text-orange-400" strokeWidth={1.75} />
            CAMBER BIAS (+{camber_bias_c}°C)
          </span>
        )}
      </div>

      {/* Critical Alert Messages */}
      {relevantAlerts.length > 0 && (
        <div className="mt-1 space-y-1">
          {relevantAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 text-xs font-mono text-red-400 bg-red-950/40 px-2 py-1 rounded border border-red-900/60"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" strokeWidth={1.75} />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
