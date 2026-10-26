"""Hybrid FIA knowledge retriever: curated notes + verbatim regulation chunks.

Two sources are indexed side by side:

1. Curated markdown notes under ``backend/rag/corpus/`` — owner-written
   summaries of strategy concepts (undercut, tyre cliff, SC pit window) and
   regulation primers. Frontmatter: ``id``, ``title``, ``source``,
   ``section``, ``topics``.
2. Clause-level VERBATIM chunks produced by ``tools/fia_reg_parser.py`` from
   the official FIA PDFs (``backend/data/fia_regs/*.jsonl`` — gitignored).
   Each chunk carries ``article``/``clause``/``season``/``issue_date`` and
   the untouched regulation text.

Ranking is BM25 plus two deterministic boosts:
- an exact-match boost when the query names a clause ("what does 55.14
  say", "Article B5.15") so article-number questions resolve to the exact
  regulation instead of token soup;
- a season-preference multiplier so citations match the season the user is
  analysing (``lookup(..., season=2024)``), falling back to other seasons
  only when the preferred one has no coverage.

BM25 indexing happens once per (corpus, regs) path pair; ``lookup`` stays an
in-memory ranking call, so the endpoint remains sub-millisecond.
"""

from __future__ import annotations

import json
import logging
import re
import string
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from rank_bm25 import BM25Okapi

_logger = logging.getLogger(__name__)

CORPUS_DIR = Path(__file__).resolve().parent.parent / "rag" / "corpus"
REGS_DIR = Path(__file__).resolve().parent.parent / "data" / "fia_regs"

_FRONTMATTER_RE = re.compile(r"^---\n(?P<meta>.*?)\n---\n(?P<body>.*)$", re.DOTALL)
_TOKEN_RE = re.compile(r"[a-z0-9]+")

# Exact clause references in queries. A bare decimal ("1.5 km") only counts
# when an explicit article word precedes it or the 2026-style section letter
# is present (B5.15.2) — those forms never occur as measurements.
_QUERY_CLAUSE_RE = re.compile(
    r"(?P<artword>art(?:icle)?s?\.?\s+)?"
    r"\b(?P<letter>[A-F])?(?P<art>\d{1,3})\.(?P<sub>\d{1,2})"
    r"(?:\.(?P<sub2>\d{1,2}))?(?P<tail>[a-z])?\b",
    re.IGNORECASE,
)
_QUERY_ARTICLE_WORD_RE = re.compile(r"\bart(?:icle)?s?\b", re.IGNORECASE)

CLAUSE_EXACT_BOOST = 100.0
ARTICLE_WORD_BOOST = 40.0
SEASON_MATCH_MULTIPLIER = 1.5
SEASON_MISMATCH_MULTIPLIER = 0.6


@dataclass(frozen=True)
class IndexEntry:
    """Unified index record for curated notes and verbatim regulation chunks."""

    id: str
    title: str
    source: str
    section: str
    topics: tuple[str, ...]
    body: str
    kind: str  # "note" | "regulation"
    article: str | None = None
    clause: str | None = None
    season: int | None = None
    issue: str | None = None
    issue_date: str | None = None
    source_url: str | None = None


def _parse_frontmatter(raw: str) -> dict[str, Any]:
    """Parse a tiny subset of YAML: `key: value` and `key: [a, b]` lists."""
    out: dict[str, Any] = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            items = [v.strip().strip("\"'") for v in value[1:-1].split(",") if v.strip()]
            out[key] = items
        else:
            out[key] = value.strip("\"'")
    return out


def _load_corpus(corpus_dir: Path) -> list[IndexEntry]:
    entries: list[IndexEntry] = []
    if not corpus_dir.exists():
        _logger.warning("knowledge corpus directory missing: %s", corpus_dir)
        return entries
    for path in sorted(corpus_dir.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        match = _FRONTMATTER_RE.match(text)
        if not match:
            _logger.warning("corpus file missing frontmatter, skipping: %s", path.name)
            continue
        meta = _parse_frontmatter(match.group("meta"))
        entries.append(
            IndexEntry(
                id=str(meta.get("id") or path.stem),
                title=str(meta.get("title") or path.stem),
                source=str(meta.get("source") or ""),
                section=str(meta.get("section") or ""),
                topics=tuple(meta.get("topics") or ()),
                body=match.group("body").strip(),
                kind="note",
            )
        )
    return entries


def _load_reg_chunks(regs_dir: Path) -> list[IndexEntry]:
    """Load clause-level verbatim chunks written by tools/fia_reg_parser."""
    entries: list[IndexEntry] = []
    if not regs_dir.exists():
        return entries
    for path in sorted(regs_dir.glob("*.jsonl")):
        with path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    raw = json.loads(line)
                except json.JSONDecodeError:
                    _logger.warning("bad JSONL line in %s — skipping", path.name)
                    continue
                clause = str(raw.get("clause") or "")
                heading = str(raw.get("heading") or "")
                section = str(raw.get("section") or "")
                season = raw.get("season")
                issue = str(raw.get("issue") or "")
                entries.append(
                    IndexEntry(
                        id=str(raw.get("id") or f"{raw.get('doc')}:{clause}"),
                        title=f"Art {clause} — {heading}" if clause else heading or "Regulation",
                        source=(
                            f"FIA F1 {section} Regulations {season}"
                            + (f", Issue {issue}" if issue else "")
                        ),
                        section=f"{section} · Art {raw.get('article')}",
                        topics=(
                            "fia-regulation",
                            f"article-{raw.get('article')}",
                            section.lower().replace(" ", "-"),
                        ),
                        body=str(raw.get("text") or ""),
                        kind="regulation",
                        article=str(raw.get("article") or "") or None,
                        clause=clause or None,
                        season=int(season) if season is not None else None,
                        issue=issue or None,
                        issue_date=str(raw.get("issue_date") or "") or None,
                        source_url=str(raw.get("source_url") or "") or None,
                    )
                )
    if entries:
        _logger.info("knowledge index includes %d verbatim regulation chunks", len(entries))
    return entries


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def _indexable_tokens(entry: IndexEntry) -> list[str]:
    """Field-weighted tokens: title x3, topics x2, then section + body.

    Without the weights, rare incidental tokens ("ham", "japan") in
    unrelated notes could outscore the note whose TITLE is the query's core
    concept ("Undercut — pit early..."), especially once 1300+ verbatim
    regulation chunks changed the corpus-wide IDF/length statistics.
    """
    tokens: list[str] = []
    tokens += _tokenize(entry.title) * 3
    tokens += _tokenize(" ".join(entry.topics)) * 2
    tokens += _tokenize(entry.section)
    extra = ""
    if entry.kind == "regulation":
        # clause/article digits as tokens so "55 14" partially matches too
        extra = f"{entry.clause or ''} {entry.article or ''}"
    tokens += _tokenize(f"{extra} {entry.body}")
    return tokens


@lru_cache(maxsize=1)
def _index(
    corpus_path: str = str(CORPUS_DIR),
    regs_path: str = str(REGS_DIR),
) -> tuple[BM25Okapi, tuple[IndexEntry, ...]]:
    entries = _load_corpus(Path(corpus_path)) + _load_reg_chunks(Path(regs_path))
    if not entries:
        # BM25Okapi requires at least one document; return a sentinel empty index.
        return BM25Okapi([["_"]]), ()
    docs = [_indexable_tokens(e) for e in entries]
    return BM25Okapi(docs), tuple(entries)


def _extract_clause_refs(query: str) -> tuple[set[str], set[str]]:
    """Return (clause_ids, article_ids) explicitly referenced by the query.

    "what does article 55.14 say" -> {"55.14"} / {"55"}
    "B5.15.2 resumption procedure" -> {"B5.15.2"} / {"B5"}
    "gap was 1.5 seconds"          -> set()      / set()   (no article word,
                                                          no section letter)
    """
    clauses: set[str] = set()
    articles: set[str] = set()
    for m in _QUERY_CLAUSE_RE.finditer(query):
        letter = (m.group("letter") or "").upper()
        art = m.group("art")
        explicit = bool(m.group("artword")) or bool(letter)
        if not explicit:
            continue
        art_label = f"{letter}{art}" if letter else art
        clause = f"{art_label}.{m.group('sub')}"
        if m.group("sub2"):
            clause += f".{m.group('sub2')}"
        if m.group("tail"):
            clause += m.group("tail").lower()
        clauses.add(clause)
        articles.add(art_label)
    if _QUERY_ARTICLE_WORD_RE.search(query):
        # bare "Article B5" / "article 55" references (no clause digits)
        for m in re.finditer(
            r"\bart(?:icle)?s?\.?\s+([A-F]?)(\d{1,3})\b", query, re.IGNORECASE
        ):
            label = f"{m.group(1).upper()}{m.group(2)}"
            articles.add(label)
    return clauses, articles


def _snippet(body: str, limit: int = 260) -> str:
    body = body.strip()
    if len(body) <= limit:
        return body
    cut = body.rfind(" ", 0, limit)
    return f"{body[: cut if cut > 0 else limit].rstrip(string.punctuation + ' ')}…"


def _to_citation(entry: IndexEntry, score: float) -> dict[str, Any]:
    citation: dict[str, Any] = {
        "id": entry.id,
        "title": entry.title,
        "source": entry.source,
        "section": entry.section,
        "topics": list(entry.topics),
        "snippet": _snippet(entry.body),
        "score": round(score, 4),
    }
    if entry.kind == "regulation":
        citation.update(
            {
                "article": entry.article,
                "clause": entry.clause,
                "season": entry.season,
                "issue_date": entry.issue_date,
                "source_url": entry.source_url,
                "verbatim": True,
            }
        )
    return citation


def lookup(
    query: str,
    k: int = 3,
    *,
    season: int | None = None,
) -> list[dict[str, Any]]:
    """Return the top-`k` citations for a natural-language query.

    ``season`` prefers regulation chunks from that championship year (e.g.
    the year of the race being analysed); other seasons are only mildly
    penalised so retrieval degrades gracefully when the preferred season
    has no coverage.
    """
    k = max(1, min(k, 10))
    bm25, entries = _index()
    if not entries:
        return []
    retrieval_query = query
    if season is not None:
        # Year tokens are season metadata, not content — "2023" in the query
        # drags car-generation notes ("SF-23 to SF-24") into strategy
        # questions. The season preference multiplier already carries the
        # year's signal.
        retrieval_query = re.sub(r"\b20\d{2}\b", " ", retrieval_query)
    tokens = _tokenize(retrieval_query)
    if not tokens:
        return []
    scores = bm25.get_scores(tokens)
    clause_refs, article_refs = _extract_clause_refs(query)

    ranked: list[tuple[float, IndexEntry]] = []
    for score, entry in zip(scores, entries):
        adjusted = float(score)
        if entry.kind == "regulation" and entry.clause and entry.clause in clause_refs:
            adjusted += CLAUSE_EXACT_BOOST
        elif entry.kind == "regulation" and entry.article and entry.article in article_refs:
            adjusted += ARTICLE_WORD_BOOST
        if season is not None and entry.kind == "regulation" and entry.season is not None:
            adjusted *= (
                SEASON_MATCH_MULTIPLIER
                if entry.season == season
                else SEASON_MISMATCH_MULTIPLIER
            )
        if adjusted > 0.0:
            ranked.append((adjusted, entry))

    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return [_to_citation(entry, score) for score, entry in ranked[:k]]


def reset_index_cache() -> None:
    """Test helper — force the BM25 index to reload on next lookup."""
    _index.cache_clear()


def get_note(note_id: str) -> dict[str, Any] | None:
    """Return a single entry by id with the full body, or None if missing.

    Used by ``GET /knowledge/note/{id}`` so the frontend can show the whole
    note in a popover after a citation chip is clicked. Handles curated note
    ids ("strategy-undercut") and verbatim chunk ids ("sr-2024:55.14").
    """
    if not note_id:
        return None
    _, entries = _index()
    for entry in entries:
        if entry.id == note_id:
            note: dict[str, Any] = {
                "id": entry.id,
                "title": entry.title,
                "source": entry.source,
                "section": entry.section,
                "topics": list(entry.topics),
                "body": entry.body,
            }
            if entry.kind == "regulation":
                note.update(
                    {
                        "article": entry.article,
                        "clause": entry.clause,
                        "season": entry.season,
                        "issue_date": entry.issue_date,
                        "source_url": entry.source_url,
                        "verbatim": True,
                    }
                )
            return note
    return None
