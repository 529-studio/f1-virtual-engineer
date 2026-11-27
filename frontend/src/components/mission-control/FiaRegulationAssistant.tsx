"use client";

import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  RotateCcw,
  Search,
} from "lucide-react";
import { useFiaRegulations } from "@/hooks/useFiaRegulations";
import type { RegulationTopicFilter } from "@/types/knowledge";

const QUICK_CHIPS = [
  { label: "Art 33.4 Moving under braking", query: "Article 33.4 moving under braking" },
  { label: "Art 48.12 Safety Car unlapping", query: "Safety Car lapped cars overtake 55.14" },
  { label: "Track limits", query: "track limits white line penalty" },
  { label: "Pit lane speed limit", query: "pit lane speed limit infringement" },
] as const;

const TOPIC_FILTERS: { key: RegulationTopicFilter; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "overtaking", label: "Overtaking" },
  { key: "safety-car", label: "Safety Car" },
  { key: "track-limits", label: "Track Limits" },
  { key: "pit", label: "Pit Lane" },
  { key: "drs", label: "DRS" },
];

export interface FiaRegulationAssistantProps {
  season?: number;
}

export function FiaRegulationAssistant({ season }: FiaRegulationAssistantProps) {
  const {
    query,
    setQuery,
    category,
    setCategory,
    citations,
    status,
    error,
    expandedNoteId,
    noteCache,
    noteLoadingId,
    noteError,
    search,
    toggleExpandNote,
    retry,
  } = useFiaRegulations(season);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search();
  };

  return (
    <div
      data-testid="fia-regulation-assistant"
      className="flex flex-col gap-3 pb-6 text-xs font-mono"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="font-bold uppercase tracking-wider text-foreground">
            FIA Rulebook RAG
          </span>
        </div>
        {season && (
          <span className="rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[0.6rem] text-foreground-dim">
            {season}
          </span>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FIA rules or article..."
          aria-label="Search FIA regulations"
          className="min-h-[46px] min-w-0 flex-1 rounded border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-foreground-faint focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={query.trim().length < 2 || status === "loading"}
          aria-label="Run regulation search"
          className="inline-flex min-h-[46px] min-w-[46px] shrink-0 items-center justify-center rounded border border-accent bg-accent/15 px-3 text-accent hover:bg-accent/25 disabled:opacity-40 cursor-pointer transition-colors"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </form>

      {/* Topic Filter Pills */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Regulation topic filters">
        {TOPIC_FILTERS.map((topic) => {
          const active = category === topic.key;
          return (
            <button
              key={topic.key}
              type="button"
              onClick={() => {
                setCategory(topic.key);
                if (query.trim().length >= 2) {
                  void search(query, topic.key);
                }
              }}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border px-2.5 text-[0.65rem] transition-colors cursor-pointer ${
                active
                  ? "border-accent bg-accent/15 text-accent font-bold"
                  : "border-border bg-surface-elevated/60 text-foreground-dim hover:text-foreground"
              }`}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      {/* Quick Rulebook Chips */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.6rem] uppercase tracking-widest text-foreground-faint">
          Quick Lookups
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => void search(chip.query, "ALL")}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-border/80 bg-background/60 px-2.5 py-1 text-left text-[0.65rem] text-foreground-dim hover:border-accent hover:text-foreground transition-colors cursor-pointer break-words leading-snug"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Loading Skeleton State */}
      {status === "loading" && (
        <div className="space-y-2 animate-pulse" role="status" aria-label="Searching FIA regulations">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded border border-border bg-surface-elevated/50" />
          ))}
        </div>
      )}

      {/* 2. Error State */}
      {status === "error" && (
        <div
          role="alert"
          className="rounded border border-red-500/40 bg-red-500/10 p-3 text-red-200"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-300">Regulation Search Failed</p>
              <p className="mt-1 text-[0.68rem] text-red-200/80 break-words leading-snug">
                {error || "Unable to reach knowledge retriever."}
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded border border-red-500/50 bg-red-950/60 px-3 text-xs text-red-200 hover:bg-red-900/60 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Empty State */}
      {status === "empty" && (
        <div className="rounded border border-dashed border-border p-4 text-center text-foreground-dim">
          <FileText className="mx-auto mb-1.5 h-5 w-5 text-foreground-faint" strokeWidth={1.5} />
          <p className="break-words leading-snug">
            No matching FIA regulation clauses found for &ldquo;{query}&rdquo;.
          </p>
        </div>
      )}

      {/* 4. Results List */}
      {status === "success" && (
        <div className="flex flex-col gap-2" data-testid="fia-regulation-results">
          {citations.map((cit) => {
            const isExpanded = expandedNoteId === cit.id;
            const fullNote = noteCache[cit.id];
            const isNoteLoading = noteLoadingId === cit.id;

            return (
              <div
                key={cit.id}
                className="rounded border border-border bg-background/70 p-2.5 flex flex-col gap-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cit.article && (
                        <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-accent border border-accent/30">
                          Art {cit.clause || cit.article}
                        </span>
                      )}
                      {cit.season && (
                        <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[0.6rem] text-foreground-dim border border-border">
                          {cit.season}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 font-bold text-foreground break-words leading-snug">
                      {cit.title}
                    </h4>
                  </div>
                  <span className="shrink-0 rounded bg-surface-elevated px-1.5 py-0.5 text-[0.6rem] text-emerald-400 border border-emerald-500/30">
                    {cit.score.toFixed(1)}
                  </span>
                </div>

                <p className="text-[0.68rem] text-foreground-dim break-words leading-snug">
                  {cit.snippet}
                </p>

                <button
                  type="button"
                  onClick={() => void toggleExpandNote(cit.id)}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-between gap-1.5 rounded border border-border/70 bg-surface-elevated/50 px-2.5 text-[0.65rem] text-accent hover:border-accent cursor-pointer transition-colors"
                >
                  <span>{isExpanded ? "Hide Full Article" : "Read Full Article"}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </button>

                {isExpanded && (
                  <div
                    data-testid={`fia-note-body-${cit.id}`}
                    className="mt-1 rounded border border-border/60 bg-surface p-2.5 text-[0.68rem] text-foreground break-words leading-relaxed whitespace-pre-wrap"
                  >
                    {isNoteLoading
                      ? "Loading full regulation text..."
                      : noteError
                      ? noteError
                      : fullNote?.body ?? cit.snippet}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
