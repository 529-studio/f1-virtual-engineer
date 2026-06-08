"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ControversyFinding } from "@/services/api";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { HintTooltip } from "@/components/ui/HintTooltip";

const EVENT_TYPE_LABEL: Record<string, string> = {
  safety_car_restart: "SC Restart",
  vsc_strategy:       "VSC Window",
  track_limits:       "Track Limits",
  collision:          "Collision",
};

const VERDICT_STATUS: Record<string, "ok" | "warn" | "error" | "info"> = {
  "team favoured":    "ok",
  "steward favoured": "error",
  "contested":        "warn",
};

function VerdictBadge({ verdict }: { verdict: string }) {
  const status = VERDICT_STATUS[verdict.toLowerCase()] ?? "info";
  return (
    <span
      className="readout px-1.5 py-0.5 text-[0.45rem] uppercase tracking-[var(--track-wide)]"
      style={{
        border: `1px solid var(--status-${status})`,
        background: `var(--status-${status}-dim)`,
        color: `var(--status-${status})`,
      }}
    >
      {verdict}
    </span>
  );
}

function FindingCard({ finding, index }: { finding: ControversyFinding; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = EVENT_TYPE_LABEL[finding.event_type] ?? finding.event_type.replace(/_/g, " ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="border border-border bg-surface"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="readout text-[0.55rem] font-bold uppercase tracking-[var(--track-wide)] text-accent">
              L{finding.lap}
            </span>
            <span className="readout text-[0.5rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
              {typeLabel}
            </span>
            {finding.drivers.length > 0 && (
              <span className="readout text-[0.5rem] uppercase tracking-[var(--track-wide)] text-foreground-dim">
                · {finding.drivers.slice(0, 3).join(" / ")}
              </span>
            )}
          </div>
          <p className="readout text-[0.6rem] leading-[1.4] text-foreground-dim line-clamp-2">
            {finding.question}
          </p>
        </div>
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none"
          className={`mt-1 shrink-0 opacity-50 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3 pb-3 pt-2.5 space-y-2.5">
              {/* Team argument */}
              <div>
                <p className="readout mb-1 flex items-center gap-1.5 text-[0.48rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  Team
                </p>
                <p className="readout text-[0.6rem] leading-[1.5] text-foreground-dim">
                  {finding.team_argument}
                </p>
              </div>

              {/* Steward argument */}
              <div>
                <p className="readout mb-1 flex items-center gap-1.5 text-[0.48rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "rgba(0,210,190,0.85)" }} />
                  Steward
                </p>
                <p className="readout text-[0.6rem] leading-[1.5] text-foreground-dim">
                  {finding.steward_argument}
                </p>
              </div>

              {/* Footer: regulation + verdict */}
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <p className="readout text-[0.48rem] uppercase tracking-[var(--track-wide)] text-foreground-faint truncate">
                  {finding.regulation_cited}
                </p>
                <JargonTooltip term="verdict likelihood">
                  <VerdictBadge verdict={finding.verdict_likelihood} />
                </JargonTooltip>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function StewardsViewPanel({ findings }: { findings: ControversyFinding[] }) {
  if (!findings || findings.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="label">Steward&apos;s View</p>
          <HintTooltip label="Steward's View">
            RAG-powered analysis: rule-based detection of SC restarts, VSC windows, and
            track-limit events. Gemini searches the FIA Sporting Regulations corpus and
            argues both the team and steward case for each incident.
          </HintTooltip>
        </div>
        <span className="readout border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[0.45rem] uppercase tracking-[var(--track-wide)] text-amber-400">
          {findings.length} finding{findings.length > 1 ? "s" : ""}
        </span>
      </div>
      <p className="readout mb-3 text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-faint">
        RAG · FIA Sporting Regs · Dual perspective
      </p>
      <div className="space-y-px">
        {findings.map((f, i) => (
          <FindingCard key={`${f.event_type}-${f.lap}`} finding={f} index={i} />
        ))}
      </div>
    </div>
  );
}
