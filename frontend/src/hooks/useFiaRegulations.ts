"use client";

import { useCallback, useState } from "react";
import { fetchFiaNote, lookupFiaRegulations } from "@/services/knowledge";
import type {
  KnowledgeCitation,
  KnowledgeNote,
  RegulationTopicFilter,
} from "@/types/knowledge";

export type KnowledgeStatus = "idle" | "loading" | "success" | "empty" | "error";

export function useFiaRegulations(defaultSeason?: number) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<RegulationTopicFilter>("ALL");
  const [citations, setCitations] = useState<KnowledgeCitation[]>([]);
  const [status, setStatus] = useState<KnowledgeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [noteCache, setNoteCache] = useState<Record<string, KnowledgeNote>>({});
  const [noteLoadingId, setNoteLoadingId] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const search = useCallback(
    async (overrideQuery?: string, overrideCategory?: RegulationTopicFilter) => {
      const q = (overrideQuery ?? query).trim();
      const cat = overrideCategory ?? category;
      if (q.length < 2) return;

      setQuery(q);
      setCategory(cat);
      setStatus("loading");
      setError(null);
      setExpandedNoteId(null);

      try {
        const res = await lookupFiaRegulations({
          query: q,
          k: 5,
          category: cat === "ALL" ? null : cat,
          season: defaultSeason ?? null,
        });
        const items = res.citations || [];
        setCitations(items);
        setStatus(items.length === 0 ? "empty" : "success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search FIA regulations.");
        setStatus("error");
      }
    },
    [query, category, defaultSeason]
  );

  const toggleExpandNote = useCallback(
    async (noteId: string) => {
      if (expandedNoteId === noteId) {
        setExpandedNoteId(null);
        return;
      }
      setExpandedNoteId(noteId);
      setNoteError(null);

      if (noteCache[noteId]) return;

      setNoteLoadingId(noteId);
      try {
        const res = await fetchFiaNote(noteId);
        if (res.note) {
          const loaded = res.note;
          setNoteCache((prev) => ({ ...prev, [noteId]: loaded }));
        } else {
          setNoteError(res.error ?? "Full article unavailable.");
        }
      } catch (err) {
        setNoteError(err instanceof Error ? err.message : "Failed to load full regulation text.");
      } finally {
        setNoteLoadingId(null);
      }
    },
    [expandedNoteId, noteCache]
  );

  const retry = useCallback(() => {
    void search();
  }, [search]);

  return {
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
  };
}
