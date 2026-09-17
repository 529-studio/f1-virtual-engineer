"use client";

import { motion } from "framer-motion";
import type { PitExitResponse, RivalSlot } from "@/services/api";
import { HintTooltip } from "@/components/ui/HintTooltip";

interface PitExitCardProps {
  projection: PitExitResponse | null | undefined;
  isLoading?: boolean;
  event?: string;
  driver?: string;
  lap?: number;
}

const CONFIDENCE_STYLE: Record<string, { label: string; border: string; bg: string; text: string }> = {
  HIGH: {
    label: "High confidence",
    border: "var(--status-ok)",
    bg: "var(--status-ok-dim)",
    text: "var(--status-ok)",
  },
  MEDIUM: {
    label: "Medium confidence",
    border: "var(--status-warn)",
    bg: "var(--status-warn-dim)",
    text: "var(--status-warn)",
  },
  LOW: {
    label: "Low confidence",
    border: "var(--status-error)",
    bg: "var(--status-error-dim)",
    text: "var(--status-error)",
  },
};

function formatDelta(delta: number): { text: string; color: string; sign: string } {
  if (delta > 0) {
    return {
      text: `gains ${delta} place${delta > 1 ? "s" : ""} (+${delta})`,
      color: "var(--status-ok)",
      sign: `+${delta}`,
    };
  }
  if (delta < 0) {
    const abs = Math.abs(delta);
    return {
      text: `drops ${abs} place${abs > 1 ? "s" : ""} (${delta})`,
      color: "var(--status-error)",
      sign: `${delta}`,
    };
  }
  return {
    text: "holds position (0)",
    color: "var(--status-warn)",
    sign: "0",
  };
}

function renderRivalSlot(label: "ahead" | "behind", slot: RivalSlot | null) {
  if (!slot) {
    return (
      <div className="flex items-center justify-between border-b border-border/40 py-1.5 text-[0.65rem]">
        <span className="readout text-foreground-faint uppercase">{label}</span>
        <span className="readout text-foreground-faint">— clear track</span>
      </div>
    );
  }

  const gapSign = slot.gap_s >= 0 ? `+${slot.gap_s.toFixed(1)}s` : `${slot.gap_s.toFixed(1)}s`;
  const badges: string[] = [];
  if (slot.is_lapped) badges.push("lapped");
  if (slot.has_pitted) badges.push("pitted");
  if (slot.pace_confidence === "low") badges.push("est pace");

  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1.5 text-[0.65rem]">
      <div className="flex items-center gap-1.5">
        <span className="readout text-foreground-faint uppercase tracking-wider">{label}</span>
        <span className="readout font-bold text-foreground">{slot.driver_code}</span>
        {badges.map((b) => (
          <span
            key={b}
            className="readout rounded border border-border px-1 py-0.2 text-[0.5rem] uppercase text-foreground-faint"
          >
            {b}
          </span>
        ))}
      </div>
      <span className="readout font-mono font-medium text-foreground-dim">{gapSign}</span>
    </div>
  );
}

export function PitExitCard({ projection, isLoading, event, driver, lap }: PitExitCardProps) {
  if (isLoading && !projection) {
    return (
      <section className="status-bar border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-32 animate-pulse bg-surface-elevated" />
          <div className="h-3 w-20 animate-pulse bg-surface-elevated" />
        </div>
        <div className="h-8 w-48 animate-pulse bg-surface-elevated mb-2" />
        <div className="h-4 w-64 animate-pulse bg-surface-elevated mb-4" />
        <div className="h-12 w-full animate-pulse bg-surface-elevated mb-3" />
        <div className="h-3 w-40 animate-pulse bg-surface-elevated" />
      </section>
    );
  }

  if (!projection) {
    return null;
  }

  // Fail-closed state: display honest fallback reason rather than a spinner or blank box
  if (projection.fallback) {
    return (
      <section className="status-bar border border-border bg-surface p-4" data-status="warn">
        <div className="flex items-center justify-between">
          <p className="label text-foreground-dim">Pit Exit Projection</p>
          <span className="readout border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wider text-amber-400">
            Unavailable
          </span>
        </div>
        <div className="mt-3">
          <p className="text-sm font-semibold text-foreground">
            No projection for Lap {lap ?? projection.as_of_lap}
          </p>
          <p className="mt-1 text-xs text-foreground-dim">
            {projection.fallback_reason ?? "Insufficient pace samples or session ended."}
          </p>
        </div>
        <div className="mt-3 border-t border-border pt-2 text-[0.6rem] text-foreground-faint">
          AS OF L{projection.as_of_lap} · {event ?? "Circuit"}
        </div>
      </section>
    );
  }

  const {
    as_of_lap,
    current_position,
    projected_position,
    position_delta,
    position_is_contested,
    car_ahead,
    car_behind,
    traffic_state,
    pit_loss_s,
    confidence,
    confidence_reasons,
    assumptions,
  } = projection;

  const confStyle = CONFIDENCE_STYLE[confidence] ?? CONFIDENCE_STYLE.MEDIUM;
  const deltaInfo = formatDelta(position_delta);

  // Derive plain-language sentence outcome
  let outcomeSentence: string;
  if (car_ahead && car_ahead.gap_s <= 1.0) {
    outcomeSentence = `out behind ${car_ahead.driver_code} +${car_ahead.gap_s.toFixed(1)}s · in DRS range`;
  } else if (car_ahead && car_ahead.gap_s <= 2.5) {
    outcomeSentence = `out behind ${car_ahead.driver_code} +${car_ahead.gap_s.toFixed(1)}s · in traffic`;
  } else if (car_ahead) {
    outcomeSentence = `out behind ${car_ahead.driver_code} +${car_ahead.gap_s.toFixed(1)}s · in clean air`;
  } else if (projected_position === 1) {
    outcomeSentence = car_behind
      ? `clean air in lead · ${Math.abs(car_behind.gap_s).toFixed(1)}s buffer to ${car_behind.driver_code}`
      : "clean air in lead with no traffic ahead";
  } else {
    outcomeSentence = "rejoining into clean air";
  }

  // Headline position text
  const positionHeadline = position_is_contested
    ? `P${projected_position} or P${projected_position + 1}`
    : `P${projected_position}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="status-bar border border-border bg-surface p-4"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="label">Pit Exit Projection</p>
          <HintTooltip label="Pit Exit Projection">
            Deterministic prediction: if {driver ?? "driver"} pits at the end of Lap {as_of_lap},
            calculates projected rejoin position and nearest rivals using real sector times and track pit loss.
          </HintTooltip>
        </div>

        <div className="flex items-center gap-2">
          {position_is_contested && (
            <span
              className="readout border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider text-amber-400"
              title="Projected exit is within contested margin (<0.8s) of an adjacent rival"
            >
              Contested
            </span>
          )}

          <span
            className="readout border px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider"
            style={{
              borderColor: confStyle.border,
              background: confStyle.bg,
              color: confStyle.text,
            }}
            title={confidence_reasons?.join("; ") || confStyle.label}
          >
            {confStyle.label}
          </span>
        </div>
      </div>

      {/* Main answer headline */}
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="label text-sm uppercase text-foreground-dim">Pit now →</span>
            <span className="readout font-mono text-2xl font-black tracking-tight text-foreground">
              {positionHeadline}
            </span>
          </div>
          <p className="mt-1 text-xs text-foreground font-normal">
            {outcomeSentence}
          </p>
        </div>

        <div className="text-right">
          <span className="label text-[0.6rem] uppercase text-foreground-faint block">Position change</span>
          <span
            className="readout font-mono text-xs font-bold"
            style={{ color: deltaInfo.color }}
          >
            {deltaInfo.text}
          </span>
          <span className="readout block text-[0.55rem] text-foreground-faint mt-0.5 font-mono">
            P{current_position} → P{projected_position}
          </span>
        </div>
      </div>

      {/* Rivals ahead / behind slots */}
      <div className="mt-3 rounded border border-border/60 bg-surface-elevated/40 px-3 py-1">
        {renderRivalSlot("ahead", car_ahead)}
        {renderRivalSlot("behind", car_behind)}
      </div>

      {/* Inline assumptions & metadata footnote */}
      <div className="mt-3 border-t border-border pt-2 text-[0.6rem] leading-relaxed text-foreground-faint">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono">
          <span>
            AS OF L{as_of_lap} · pit loss {pit_loss_s.toFixed(1)}s{event ? ` @ ${event}` : ""}
          </span>
          <span className="text-foreground-dim uppercase">
            traffic: {traffic_state.replace(/_/g, " ").toLowerCase()}
          </span>
        </div>
        <p className="mt-0.5 text-[0.55rem] text-foreground-faint">
          Assumes {assumptions && assumptions.length > 0 ? assumptions.join(", ") : "rivals hold pace, no safety car"}.
        </p>
      </div>
    </motion.section>
  );
}
