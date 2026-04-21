"use client";

import { FormEvent, useMemo, useState } from "react";

import { analyzeTelemetry, AnalyzeResponse } from "@/services/api";

const DRIVER_OPTIONS = [
  { code: "HAM", label: "Lewis Hamilton" },
  { code: "VER", label: "Max Verstappen" },
  { code: "NOR", label: "Lando Norris" },
];

export function TelemetryQueryPanel() {
  const [query, setQuery] = useState(
    "Show HAM speed at Japanese GP 2023 race",
  );
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await analyzeTelemetry({
        query,
        driver,
        session_info: {
          event: "Japanese Grand Prix",
          year: 2023,
          session_type: "R",
        },
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
    <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-red-900/50 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Live Telemetry Query
        </h2>
        <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
          STATUS: {statusTag}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={driver}
            onChange={(event) => setDriver(event.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded px-3 py-2 focus:ring-1 ring-red-600 outline-none"
          >
            {DRIVER_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label} ({option.code})
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="md:col-span-2 bg-slate-800 border border-slate-700 text-sm rounded px-3 py-2 focus:ring-1 ring-red-600 outline-none"
            placeholder="Ask a telemetry question..."
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-red-700 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded"
        >
          {isLoading ? "Running analysis..." : "Run telemetry analysis"}
        </button>
      </form>

      <div className="mt-6 min-h-48 bg-slate-950/50 rounded p-4 border border-dashed border-slate-800">
        {isLoading && (
          <p className="text-slate-400 font-mono text-sm">
            Running query against backend agent...
          </p>
        )}

        {!isLoading && errorMessage && (
          <div className="p-3 bg-red-950/30 border border-red-900/40 rounded">
            <p className="text-xs font-bold text-red-400 uppercase mb-1">
              Request Error
            </p>
            <p className="text-sm text-slate-200">{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && result && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/60 border border-slate-700 rounded">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                Agent Response
              </p>
              <p className="text-sm text-slate-100">{result.agent_response}</p>
            </div>
            {result.telemetry_data?.speed && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <MetricCard
                  title="Speed Avg"
                  value={`${result.telemetry_data.speed.avg.toFixed(1)} ${result.telemetry_data.speed.unit}`}
                />
                <MetricCard
                  title="Gear Avg"
                  value={`${result.telemetry_data.gear?.avg.toFixed(1) ?? "N/A"} ${result.telemetry_data.gear?.unit ?? ""}`}
                />
                <MetricCard
                  title="RPM Avg"
                  value={`${result.telemetry_data.rpm?.avg.toFixed(0) ?? "N/A"} ${result.telemetry_data.rpm?.unit ?? ""}`}
                />
              </div>
            )}
          </div>
        )}

        {!isLoading && !errorMessage && !result && (
          <p className="text-slate-600 font-mono text-sm uppercase">
            Submit a telemetry prompt to view results.
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-3 bg-slate-800/40 border border-slate-700 rounded">
      <p className="text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-slate-100 font-semibold">{value}</p>
    </div>
  );
}
