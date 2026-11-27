export interface KnowledgeLookupRequest {
  query: string;
  k?: number;
  category?: string | null;
  article?: string | null;
  season?: number | null;
}

export interface KnowledgeCitation {
  id: string;
  title: string;
  source: string;
  section: string;
  topics: string[];
  snippet: string;
  score: number;
  article?: string | null;
  clause?: string | null;
  season?: number | null;
  issue_date?: string | null;
  source_url?: string | null;
  verbatim?: boolean;
}

export interface KnowledgeLookupResponse {
  status: "success" | "error";
  query: string;
  citations: KnowledgeCitation[];
  error?: string | null;
}

export interface KnowledgeNote {
  id: string;
  title: string;
  source: string;
  section: string;
  topics: string[];
  body: string;
  article?: string | null;
  clause?: string | null;
  season?: number | null;
  issue_date?: string | null;
  source_url?: string | null;
  verbatim?: boolean;
}

export interface KnowledgeNoteResponse {
  status: "success" | "error";
  note: KnowledgeNote | null;
  error?: string | null;
}

export type RegulationTopicFilter =
  | "ALL"
  | "overtaking"
  | "safety-car"
  | "track-limits"
  | "pit"
  | "drs";
