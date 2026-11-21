"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download, FileSpreadsheet, HardDrive, Loader2 } from "lucide-react";
import type { ExportParams } from "@/types/telemetry-advanced";
import type { ExportStatus } from "@/hooks/useAdvancedTelemetry";

interface ExportButtonProps {
  onExport: (params: ExportParams) => Promise<boolean>;
  exportStatus: ExportStatus;
  exportError: string | null;
  year: number;
  event: string;
  session: string;
  driver: string;
  lapNumber?: number | string;
  className?: string;
}

export function ExportButton({
  onExport,
  exportStatus,
  exportError,
  year,
  event,
  session,
  driver,
  lapNumber,
  className = "",
}: ExportButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleDownload = async (format: "csv" | "parquet") => {
    setMenuOpen(false);
    const resolvedLap = lapNumber ? Number(lapNumber) : undefined;
    await onExport({
      year,
      event,
      session_type: session,
      driver,
      lap_number: isNaN(resolvedLap as number) ? undefined : resolvedLap,
      format,
    });
  };

  const isDownloading = exportStatus === "downloading";
  const isSuccess = exportStatus === "success";

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        disabled={isDownloading || !driver}
        className={`flex h-11 min-h-[44px] items-center gap-2 rounded border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
          isSuccess
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            : exportStatus === "error"
            ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
            : "border-border bg-surface-elevated text-foreground hover:border-accent hover:text-accent"
        } disabled:cursor-not-allowed disabled:opacity-40`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Export Telemetry Data"
        title="Export raw lap telemetry as CSV or Apache Parquet"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        ) : isSuccess ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <Download className="h-4 w-4 text-accent" />
        )}

        <span className="hidden sm:inline">
          {isDownloading ? "Exporting…" : isSuccess ? "Downloaded" : "Export"}
        </span>

        <ChevronDown
          className={`h-3 w-3 transition-transform ${menuOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-40 mt-1.5 w-48 rounded border border-border bg-surface-elevated p-1 shadow-xl backdrop-blur-md"
        >
          <div className="px-3 py-1.5 border-b border-border/60 text-[0.62rem] font-mono text-foreground-faint">
            RAW TELEMETRY EXPORT
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleDownload("csv")}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded px-3 py-2 text-left font-mono text-xs text-foreground hover:bg-surface hover:text-accent transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="font-bold">CSV Document</div>
              <div className="text-[0.62rem] text-foreground-faint">
                Spreadsheet compatible
              </div>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleDownload("parquet")}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded px-3 py-2 text-left font-mono text-xs text-foreground hover:bg-surface hover:text-accent transition-colors cursor-pointer"
          >
            <HardDrive className="h-4 w-4 text-cyan-400" />
            <div>
              <div className="font-bold">Apache Parquet</div>
              <div className="text-[0.62rem] text-foreground-faint">
                Binary data science format
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Transient Error Toast / Tooltip */}
      {exportStatus === "error" && exportError && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded border border-rose-500/50 bg-surface-elevated p-2 text-[0.65rem] font-mono text-rose-400 shadow-lg z-30">
          {exportError}
        </div>
      )}
    </div>
  );
}
