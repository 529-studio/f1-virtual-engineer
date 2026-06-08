"use client";

import { motion } from "framer-motion";
import type { AnalyzeHistoryItem, AnalyzeResponse, SavedQueryItem, StrategyData, TelemetryHistoryItem } from "@/services/api";
import { TeamIcon } from "@/components/icons/TeamIcons";
import { useSupabase } from "@/components/auth/SupabaseProvider";
import { useRationaleUpgrade } from "@/hooks/useRationaleUpgrade";
import { RecentAnalyses } from "./RecentAnalyses";
import { RecentTelemetry } from "./RecentTelemetry";
import { RadioLog } from "./RadioLog";
import { ReferencesPanel } from "./ReferencesPanel";
import { SavedQueriesPanel } from "./SavedQueriesPanel";
import { ScenarioComparison } from "./ScenarioComparison";
import { StewardsViewPanel } from "./StewardsViewPanel";
import { TyreCard } from "./TyreCard";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { HintTooltip } from "@/components/ui/HintTooltip";
import { WhyThisCallPanel } from "./WhyThisCallPanel";
import { TEAMS, type SessionId, type TeamId } from "./constants";

export function StrategyHUD({
  result, strat, isLoading, hasData, session, theme, rateLimitMessage,
  retryState = "idle", onRetryClick,
  year, eventName, driver, targetDriver,
  historyRefreshSignal, onSelectHistory,
  telemetryHistoryRefreshSignal, onSelectTelemetryHistory,
  radioHistoryRefreshSignal,
  savedQueries, onSavedQueriesChange, onSelectSaved,
}: {
  result: AnalyzeResponse | null;
  strat: StrategyData | null | undefined;
  isLoading: boolean;
  hasData: boolean;
  session: SessionId;
  theme: TeamId;
  rateLimitMessage?: string | null;
  retryState?: "idle" | "retrying" | "failed";
  onRetryClick?: () => void;
  year: number;
  eventName: string;
  driver: string;
  targetDriver?: string | null;
  historyRefreshSignal?: number;
  onSelectHistory?: (item: AnalyzeHistoryItem) => void;
  telemetryHistoryRefreshSignal?: number;
  onSelectTelemetryHistory?: (item: TelemetryHistoryItem) => void;
  radioHistoryRefreshSignal?: number;
  savedQueries: SavedQueryItem[];
  onSavedQueriesChange: (items: SavedQueryItem[]) => void;
  onSelectSaved?: (item: SavedQueryItem) => void;
}) {
  const activeTeam = TEAMS.find((t) => t.id === theme) ?? TEAMS[0];

  // Async rationale upgrade (#139 PR4): when /analyze returns
  // rationale_source='template' plus an analyze_history_id, the worker
  // is back-filling the LLM rationale onto that row. Poll /analyze/history
  // until the row flips to 'llm' and swap the displayed text.
  const supa = useSupabase();
  const accessToken = supa.session?.access_token ?? null;
  const upgrade = useRationaleUpgrade({
    rowId: result?.analyze_history_id ?? null,
    initialSource: result?.rationale_source ?? null,
    accessToken,
  });
  const displayedAgentResponse =
    upgrade.status === "upgraded" && upgrade.rationaleText
      ? upgrade.rationaleText
      : (result?.agent_response ?? "Analysis complete.");

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-surface">

      <div className="shrink-0 border-b border-border px-5 pt-5 pb-4">
        <div className="mb-1 flex items-center gap-2">
          <p className="label">Strategy HUD</p>
          <TeamIcon id={activeTeam.id} size={14} />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="readout text-[length:var(--text-readout)] text-foreground-dim">
            {session} {"//"} {hasData && strat?.target_lap ? `PIT LAP ${strat.target_lap}` : "NO DATA"}
          </span>
          <span className="readout text-[length:var(--text-readout)] text-foreground-dim flex items-center gap-1">
            <HintTooltip label="Confidence Band">
              How reliable this strategy call is. High = strong FastF1 signal.
              Low = limited data, treat as estimate.
            </HintTooltip>
            {hasData && strat?.confidence_band ? strat.confidence_band.toUpperCase() : "—"}
          </span>
        </div>
      </div>

      {(() => {
        const status: "ok" | "warn" | "error" | "info" = rateLimitMessage
          ? "warn"
          : hasData && strat?.undercut_risk === "high"
            ? "error"
            : isLoading
              ? "info"
              : hasData
                ? "ok"
                : "info";
        const statusColor = `var(--status-${status})`;
        const statusBg = `var(--status-${status}-dim)`;
        const label = rateLimitMessage
          ? "⚠ RATE LIMITED"
          : hasData && strat?.undercut_risk === "high"
            ? "⚠ STRATEGY ALERT"
            : isLoading
              ? "ANALYZING"
              : hasData
                ? "ANALYSIS COMPLETE"
                : "SYSTEM STATUS";
        return (
          <div
            className="status-bar mx-4 mt-4 shrink-0 border p-4"
            data-status={status}
            style={{ borderColor: statusColor, background: statusBg }}
          >
            <p className="label mb-2" style={{ color: statusColor }}>{label}</p>
            <p className="readout text-[0.7rem] font-semibold uppercase leading-snug text-foreground">
              {rateLimitMessage
                ? rateLimitMessage
                : isLoading
                  ? "Fetching telemetry…"
                  : hasData
                    ? displayedAgentResponse
                    : "Select year, grand prix, session and driver above."}
            </p>
            {upgrade.status === "pending" && (
              <p
                className="readout mt-2 inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[var(--track-wide)]"
                style={{ color: "var(--status-info)" }}
                aria-live="polite"
              >
                <motion.span
                  className="inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                >
                  ↻
                </motion.span>
                Upgrading rationale…
              </p>
            )}
            {upgrade.status === "upgraded" && (
              <p
                className="readout mt-2 text-[0.6rem] uppercase tracking-[var(--track-wide)]"
                style={{ color: "var(--status-ok)" }}
              >
                ✓ Rationale upgraded
              </p>
            )}
            {retryState === "retrying" && (
              <p
                className="readout mt-2 inline-flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[var(--track-wide)]"
                style={{ color: "var(--status-warn)" }}
                aria-live="polite"
              >
                <motion.span
                  className="inline-block"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                >
                  ↻
                </motion.span>
                Network blip — retrying…
              </p>
            )}
            {retryState === "failed" && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p
                  className="readout text-[0.6rem] uppercase tracking-[var(--track-wide)]"
                  style={{ color: "var(--status-error)" }}
                  aria-live="polite"
                >
                  Network unstable — try again
                </p>
                {onRetryClick && (
                  <button
                    type="button"
                    onClick={onRetryClick}
                    className="readout border px-2 py-0.5 text-[0.55rem] uppercase tracking-[var(--track-wide)] transition-colors hover:bg-[var(--status-error-dim)]"
                    style={{ borderColor: "var(--status-error)", color: "var(--status-error)" }}
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4">
        {/* Issue #256: Pit Window is the headline. When the user picked
            an analysis intent and we have a recommendation, surface the
            lap range *before* tyre/why-this-call so the panel reads
            top-down: "here's the call → here's the why → here's the
            tyre context". */}
        {hasData && strat?.recommended_pit_window_laps?.length === 2 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="status-bar mt-4 border p-3"
            data-status={strat.fallback ? "warn" : "ok"}
            style={{
              borderColor: strat.fallback ? "var(--status-warn)" : "var(--status-ok)",
              background: strat.fallback ? "var(--status-warn-dim)" : "var(--status-ok-dim)",
            }}
          >
            <p className="label mb-1" style={{ color: strat.fallback ? "var(--status-warn)" : "var(--status-ok)" }}>
              <JargonTooltip term="pit window">Pit Window</JargonTooltip> {strat.fallback ? "· FALLBACK" : ""}
            </p>
            <p className="readout text-base font-bold text-accent">
              LAP {strat.recommended_pit_window_laps[0]} – {strat.recommended_pit_window_laps[1]}
            </p>
            {strat.current_gap_seconds != null && (
              <p
                className="readout mt-1 text-[0.6rem] uppercase tracking-[var(--track-wide)] text-foreground-dim"
                title={
                  strat.gap_source === "fastf1"
                    ? `Sampled lap ${strat.gap_sampled_at_lap ?? "—"} from FastF1`
                    : strat.gap_source === "fallback"
                      ? "Live gap unavailable — using 1.2s assumption"
                      : "Explicit override"
                }
              >
                {strat.competitor_ahead
                  ? `vs ${strat.competitor_ahead}${
                      strat.competitor_position_relative === "behind" ? " ↓" : ""
                    } · `
                  : "Gap · "}
                <span className="text-foreground">{strat.current_gap_seconds.toFixed(1)}s</span>
                {" → "}
                <JargonTooltip term="undercut risk">undercut</JargonTooltip>
                {" "}
                <span
                  className="font-bold"
                  style={{
                    color:
                      strat.undercut_risk === "high"
                        ? "var(--status-error)"
                        : strat.undercut_risk === "medium"
                          ? "var(--status-warn)"
                          : "var(--status-ok)",
                  }}
                >
                  {strat.undercut_risk}
                </span>
                {strat.gap_source === "fallback" && (
                  <span style={{ color: "var(--status-warn)" }}> · est.</span>
                )}
              </p>
            )}
            {strat.pit_loss_seconds != null && (
              <p
                className="readout mt-1 text-[0.55rem] uppercase tracking-[var(--track-wide)] text-foreground-faint"
                title="Approximate seconds lost on a pit stop at this circuit."
              >
                Pit loss · {strat.pit_loss_seconds.toFixed(1)}s
                {strat.undercut_break_even_laps != null && (
                  <>
                    {" · undercut viable in "}
                    <span className="font-bold text-accent">
                      ~{strat.undercut_break_even_laps}L
                    </span>
                  </>
                )}
                {strat.expected_gain_seconds != null && (
                  <>
                    {" · gain "}
                    <span
                      className="font-bold"
                      style={{ color: "var(--status-ok)" }}
                      title="Net seconds ahead of rival once they react and pit ~3 laps later"
                    >
                      ~{strat.expected_gain_seconds.toFixed(1)}s
                    </span>
                  </>
                )}
              </p>
            )}
            {strat.fallback && (
              <p className="readout mt-1 text-[0.55rem]" style={{ color: "var(--status-warn)" }}>
                {strat.fallback_reason ?? "Estimate — live data unavailable"}
              </p>
            )}
          </motion.div>
        )}

        {/* Issue #256: cold-state CTA. Selectors are picked but the user
            hasn't pressed Analyze. Without this the panel below would
            either be empty (no Pit Window yet) or, worse, narrate a tyre
            warning from an auto-fetched TyreCard — reading as a
            recommendation the system isn't actually making yet. */}
        {!hasData && !isLoading && driver && eventName && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="status-bar mt-4 border border-dashed p-3"
            data-status="info"
            style={{ borderColor: "var(--border)", background: "transparent" }}
          >
            <p className="label mb-2 text-foreground-dim">Awaiting analysis</p>
            <ol className="readout space-y-1 text-[0.6rem] leading-snug text-foreground-dim">
              <li><span className="text-accent font-bold">1.</span> Pick a <span className="text-foreground">Grand Prix</span> above</li>
              <li><span className="text-accent font-bold">2.</span> Pick a <span className="text-foreground">session</span> — R = Race, Q = Qualifying</li>
              <li><span className="text-accent font-bold">3.</span> Pick a <span className="text-foreground">driver</span></li>
              <li><span className="text-accent font-bold">4.</span> Press <span className="font-bold text-accent">Analyze</span></li>
            </ol>
          </motion.div>
        )}

        <WhyThisCallPanel result={result} strat={strat} hasData={hasData} />

        {/* Issue #256: TyreCard renders only after Analyze. The card used
            to auto-fetch on year/event/session/driver and read like a
            standing recommendation — even on finished races it would say
            "Stint ending within 2 laps of cliff" for a stint that no
            longer exists. Gating on hasData ties it to the analysis
            context the user actually requested. */}
        {hasData && (
          <TyreCard year={year} event={eventName} session={session} driver={driver} />
        )}

        <ReferencesPanel items={result?.citations} />

        {session === "R" && hasData && (result?.controversy_analysis?.length ?? 0) > 0 && (
          <StewardsViewPanel findings={result!.controversy_analysis!} />
        )}

        {hasData && result?.intent?.intent_type === "strategy" && driver && eventName && (
          <ScenarioComparison
            year={year}
            event={eventName}
            sessionType={session}
            driver={driver}
            targetDriver={targetDriver ?? null}
          />
        )}

        <RecentAnalyses refreshSignal={historyRefreshSignal} onSelect={onSelectHistory} />
        <RecentTelemetry
          refreshSignal={telemetryHistoryRefreshSignal}
          onSelect={onSelectTelemetryHistory}
        />
        <RadioLog refreshSignal={radioHistoryRefreshSignal} />
        <SavedQueriesPanel
          items={savedQueries}
          onItemsChange={onSavedQueriesChange}
          onSelect={onSelectSaved}
        />
      </div>
    </aside>
  );
}
