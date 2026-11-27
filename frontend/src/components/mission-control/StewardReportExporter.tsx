"use client";

import { useState } from "react";
import { Check, Copy, Download, FileText, Printer } from "lucide-react";
import {
  buildStewardDossier,
  buildStewardPrintableHtml,
  triggerMarkdownDownload,
  triggerPrintReport,
} from "@/services/stewardReport";
import type {
  RaceControlMessageItem,
  StewardInvestigationResponse,
} from "@/types/race-control";
import type { StewardReportScope } from "@/types/stewardReport";

export interface StewardReportExporterProps {
  year: number;
  event: string;
  session: string;
  incidents: RaceControlMessageItem[];
  selectedIncident: RaceControlMessageItem | null;
  investigation: StewardInvestigationResponse | null;
}

export function StewardReportExporter({
  year,
  event,
  session,
  incidents,
  selectedIncident,
  investigation,
}: StewardReportExporterProps) {
  const [scope, setScope] = useState<StewardReportScope>(
    selectedIncident ? "selected" : "session"
  );
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const effectiveScope: StewardReportScope =
    scope === "selected" && !selectedIncident ? "session" : scope;

  const isEmpty = !incidents || incidents.length === 0;

  const getDossierInput = () => ({
    year,
    event,
    session,
    scope: effectiveScope,
    incidents,
    selectedIncident,
    investigation,
  });

  const handleDownloadMarkdown = () => {
    if (isEmpty) return;
    const dossier = buildStewardDossier(getDossierInput());
    triggerMarkdownDownload(dossier.filename, dossier.markdown);
    setFeedback(`Downloaded ${dossier.filename}`);
  };

  const handleCopyMarkdown = async () => {
    if (isEmpty) return;
    const dossier = buildStewardDossier(getDossierInput());
    try {
      await navigator.clipboard.writeText(dossier.markdown);
      setCopied(true);
      setFeedback("Markdown dossier copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback("Clipboard unavailable — use Download .md instead");
    }
  };

  const handlePrintPdf = () => {
    if (isEmpty) return;
    const html = buildStewardPrintableHtml(getDossierInput());
    const opened = triggerPrintReport(html);
    if (!opened) {
      setFeedback("Pop-up blocked — allow pop-ups to print PDF");
    }
  };

  return (
    <div
      data-testid="steward-report-exporter"
      className="flex flex-col gap-2.5 rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-400" strokeWidth={1.75} />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-100">
            Steward Dossier Exporter
          </span>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Export scope">
          <button
            type="button"
            disabled={!selectedIncident}
            onClick={() => setScope("selected")}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-3 text-xs font-mono transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              effectiveScope === "selected"
                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-semibold"
                : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Selected Incident
          </button>
          <button
            type="button"
            onClick={() => setScope("session")}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-3 text-xs font-mono transition-colors cursor-pointer ${
              effectiveScope === "session"
                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300 font-semibold"
                : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Full Session ({incidents.length})
          </button>
        </div>
      </div>

      {/* Export Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isEmpty}
          onClick={handleDownloadMarkdown}
          className="inline-flex min-h-[46px] min-w-[46px] items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 text-xs font-mono font-semibold text-neutral-100 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-40"
        >
          <Download className="h-4 w-4 text-cyan-400" strokeWidth={1.75} />
          <span>Download .md</span>
        </button>

        <button
          type="button"
          disabled={isEmpty}
          onClick={handleCopyMarkdown}
          className="inline-flex min-h-[46px] min-w-[46px] items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 text-xs font-mono font-semibold text-neutral-100 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-40"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
          ) : (
            <Copy className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
          )}
          <span>{copied ? "Copied" : "Copy Markdown"}</span>
        </button>

        <button
          type="button"
          disabled={isEmpty}
          onClick={handlePrintPdf}
          className="inline-flex min-h-[46px] min-w-[46px] items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-950 px-3.5 text-xs font-mono font-semibold text-neutral-100 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-40"
        >
          <Printer className="h-4 w-4 text-neutral-400" strokeWidth={1.75} />
          <span>Print / PDF</span>
        </button>

        {feedback && (
          <span
            role="status"
            className="text-xs font-mono text-emerald-400 break-words leading-snug"
          >
            {feedback}
          </span>
        )}
      </div>
    </div>
  );
}
