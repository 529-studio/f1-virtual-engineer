"use client";

import { FormEvent, useMemo, useState } from "react";

import { analyzeTelemetry, AnalyzeResponse } from "@/services/api";

const DRIVER_OPTIONS = [
  { code: "HAM", label: "Lewis Hamilton" },
  { code: "VER", label: "Max Verstappen" },
  { code: "NOR", label: "Lando Norris" },
];

const DEFAULT_SESSION = {
  event: "Japanese Grand Prix",
  year: 2023,
  session_type: "R",
};

interface TelemetryQueryPanelProps {
  variant?: "preview" | "dashboard";
}

export function TelemetryQueryPanel({
  variant = "preview",
}: TelemetryQueryPanelProps) {
  const [query, setQuery] = useState("Show HAM speed at Japanese GP 2023 race");
  const [driver, setDriver] = useState("HAM");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const statusTag = useMemo(() => {
    if (isLoading) {
      return "LOADING";
    }
    if (errorMessage) {
      return "ERROR";
    }
    if (result) {
      return "READY";
    }
    return "IDLE";
  }, [errorMessage, isLoading, result]);

  const driverLabel =
    DRIVER_OPTIONS.find((option) => option.code === driver)?.label ?? driver;

  const isDashboard = variant === "dashboard";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await analyzeTelemetry({
        query,
        driver,
        session_info: DEFAULT_SESSION,
      });
      setResult(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown request error.";
      setErrorMessage(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={
        isDashboard
          ? "rounded-[2rem] border border-white/10 bg-slate-950/85 p-6 shadow-[0_32px_64px_rgba(2,6,23,0.5)] backdrop-blur-xl"
          : "bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-red-900/50 transition-colors"
      }
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-red-300">
            Mission control query
          </p>
          <h2 className="mt-2 text-xl font-bold uppercase tracking-[-0.04em] text-white sm:text-2xl">
            Run telemetry and strategy analysis
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Ask the race engineer a focused telemetry question, keep the driver and session context visible, and inspect the response through readable result cards.
          </p>
        </div>
        <span className="h-fit rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-300">
          Status: {statusTag}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <ContextCard label="Selected driver" value={driver} detail={driverLabel} />
        <ContextCard label="Event" value="Japanese GP" detail={String(DEFAULT_SESSION.year)} />
        <ContextCard label="Session" value="Race" detail={DEFAULT_SESSION.session_type} />
        <ContextCard label="Mode" value="Telemetry" detail="Explainable AI" />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Driver
            </span>
            <select
              value={driver}
              onChange={(event) => setDriver(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-red-500/50"
            >
              {DRIVER_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label} ({option.code})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Query
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-red-500/50"
              placeholder="Ask a telemetry question..."
              required
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Current session context is fixed to Japanese Grand Prix 2023 race for this MVP slice.
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 text-xs font-bold uppercase tracking-[0.25em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Running analysis..." : "Run telemetry analysis"}
          </button>
        </div>
      </form>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-500">
                Response console
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Strategy output, telemetry summary, and failure states all surface here.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300">
              Live panel
            </span>
          </div>

          <div className="mt-5 min-h-72 rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/60 p-4">
            {isLoading && (
              <div className="space-y-4">
                <p className="text-sm font-mono text-slate-300">
                  Running query against backend agent...
                </p>
                <div className="space-y-3">
                  <LoadingBar width="75%" />
                  <LoadingBar width="52%" />
                  <LoadingBar width="66%" />
                </div>
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="rounded-[1.5rem] border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-300">
                  Request error
                </p>
                <p className="mt-3 text-sm text-slate-100">{errorMessage}</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Action: verify the backend is running and make sure <code>NEXT_PUBLIC_API_BASE_URL</code> points to the API server.
                </p>
              </div>
            )}

            {!isLoading && !errorMessage && result && (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                    Agent response
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-100">{result.agent_response}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    title="Speed avg"
                    value={formatChannel(result.telemetry_data?.speed)}
                  />
                  <MetricCard
                    title="Gear avg"
                    value={formatChannel(result.telemetry_data?.gear)}
                  />
                  <MetricCard
                    title="RPM avg"
                    value={formatChannel(result.telemetry_data?.rpm, 0)}
                  />
                  <MetricCard
                    title="Sample points"
                    value={
                      result.telemetry_data?.sample_points
                        ? String(result.telemetry_data.sample_points)
                        : "N/A"
                    }
                  />
                  <MetricCard
                    title="Fallback"
                    value={result.telemetry_data?.fallback ? "Yes" : "No"}
                  />
                  <MetricCard
                    title="Intent driver"
                    value={result.intent?.driver ?? driver}
                  />
                </div>
              </div>
            )}

            {!isLoading && !errorMessage && !result && (
              <div className="flex min-h-60 flex-col justify-between rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Waiting for query
                  </p>
                  <h3 className="mt-3 text-xl font-bold text-white">
                    Submit a telemetry prompt to open the dashboard loop.
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                    Start with a specific question like pace, speed, or tyre degradation for the current driver/session context.
                  </p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <HintCard label="Example" value="Compare HAM race pace trend" />
                  <HintCard label="Example" value="Show NOR speed summary" />
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <PanelCard
            eyebrow="Selected context"
            title="Make driver and session assumptions visible."
            body="This MVP slice keeps the race context explicit so users always know what the system is analyzing."
          >
            <dl className="mt-5 space-y-3 text-sm text-slate-300">
              <ContextRow label="Driver" value={`${driverLabel} (${driver})`} />
              <ContextRow label="Event" value={DEFAULT_SESSION.event} />
              <ContextRow label="Year" value={String(DEFAULT_SESSION.year)} />
              <ContextRow label="Session" value="Race (R)" />
            </dl>
          </PanelCard>

          <PanelCard
            eyebrow="Operator checklist"
            title="What a good mission-control MVP must do"
            body="A dashboard is only useful if it handles the whole loop, including the ugly states."
          >
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <ChecklistItem text="Loading state is visible and not mistaken for failure." />
              <ChecklistItem text="Error copy gives an actionable next step." />
              <ChecklistItem text="Results are summarized as cards, not raw payload." />
              <ChecklistItem text="Context stays visible even before the first response." />
            </ul>
          </PanelCard>

          <PanelCard
            eyebrow="Suggested next step"
            title="After this slice"
            body="Once this page is stable, the next upgrade is richer session selection and tighter visual alignment with future strategy cards."
          />
        </aside>
      </div>
    </div>
  );
}

function formatChannel(
  channel?: { avg: number; unit: string },
  fractionDigits = 1,
) {
  if (!channel) {
    return "N/A";
  }

  return `${channel.avg.toFixed(fractionDigits)} ${channel.unit}`;
}

function ContextCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{detail}</p>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">{title}</p>
      <p className="mt-3 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function PanelCard({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-red-300">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-bold tracking-[-0.03em] text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-400">{body}</p>
      {children}
    </article>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-400" />
      <span>{text}</span>
    </li>
  );
}

function HintCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function LoadingBar({ width }: { width: string }) {
  return <div className="h-3 rounded-full bg-white/8" style={{ width }} />;
}
