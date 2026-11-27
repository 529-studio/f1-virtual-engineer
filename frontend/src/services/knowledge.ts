import type {
  KnowledgeLookupRequest,
  KnowledgeLookupResponse,
  KnowledgeNoteResponse,
} from "@/types/knowledge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export async function lookupFiaRegulations(
  req: KnowledgeLookupRequest
): Promise<KnowledgeLookupResponse> {
  const res = await fetch(`${API_BASE}/knowledge/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: req.query,
      k: req.k ?? 5,
      ...(req.category && req.category !== "ALL" ? { category: req.category } : {}),
      ...(req.article ? { article: req.article } : {}),
      ...(req.season ? { season: req.season } : {}),
    }),
  });

  if (res.status === 429) {
    throw new Error("Rate limit exceeded — please wait a few seconds and retry.");
  }
  if (!res.ok) {
    throw new Error(`Regulation lookup failed (${res.status})`);
  }
  return res.json();
}

export async function fetchFiaNote(noteId: string): Promise<KnowledgeNoteResponse> {
  const res = await fetch(`${API_BASE}/knowledge/note/${encodeURIComponent(noteId)}`);
  if (res.status === 429) {
    throw new Error("Rate limit exceeded — please wait a few seconds and retry.");
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch regulation note (${res.status})`);
  }
  return res.json();
}
