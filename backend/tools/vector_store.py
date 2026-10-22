"""ChromaDB-backed semantic retriever for FIA regulation corpus.

Uses Gemini ``text-embedding-004`` for embeddings. The collection is
persisted to ``backend/rag/vectorstore/`` and rebuilt automatically when
the corpus file count changes.

Falls back gracefully to an empty result list when:
- The Gemini API key is absent
- ChromaDB fails to initialise (missing optional dep)
- Any network error during embedding
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

_logger = logging.getLogger(__name__)

CORPUS_DIR = Path(__file__).resolve().parent.parent / "rag" / "corpus"
VECTORSTORE_DIR = Path(__file__).resolve().parent.parent / "rag" / "vectorstore"
COLLECTION_NAME = "f1_regulations"
DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"
LEGACY_EMBEDDING_MODEL = "text-embedding-004"


def _resolve_embedding_model() -> str:
    return os.environ.get("GEMINI_EMBEDDING_MODEL", "").strip() or DEFAULT_EMBEDDING_MODEL


# Re-use the same frontmatter parser from knowledge_retriever to avoid duplication.
from tools.knowledge_retriever import _load_corpus, _snippet  # noqa: E402


# ── Gemini embedding function ──────────────────────────────────────────────────

class _GeminiEF:
    """Minimal ChromaDB-compatible embedding function backed by Gemini."""

    def name(self) -> str:
        return f"gemini-{_resolve_embedding_model()}"

    def __call__(self, input: list[str]) -> list[list[float]]:  # noqa: A002
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set — cannot embed")

        model_name = _resolve_embedding_model()
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            result = client.models.embed_content(
                model=model_name,
                contents=input,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
            )
            return [e.values for e in result.embeddings]
        except ImportError:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            legacy_model = LEGACY_EMBEDDING_MODEL if model_name == DEFAULT_EMBEDDING_MODEL else model_name
            result = genai.embed_content(
                model=legacy_model,
                content=input if len(input) > 1 else input[0],
                task_type="retrieval_document",
            )
            embeddings = result["embedding"]
            # Single input returns a flat list; multiple returns list-of-lists.
            if isinstance(embeddings[0], float):
                return [embeddings]
            return embeddings


# ── Collection init ────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _collection(corpus_path: str = str(CORPUS_DIR)) -> Any | None:
    """Return a ready ChromaDB collection, or None on any init failure."""
    try:
        import chromadb  # noqa: PLC0415
    except ImportError:
        _logger.warning("chromadb not installed — semantic lookup disabled")
        return None

    ef = _GeminiEF()
    VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)

    try:
        client = chromadb.PersistentClient(path=str(VECTORSTORE_DIR))
        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=ef,  # type: ignore[arg-type]
            metadata={"hnsw:space": "cosine"},
        )
    except Exception:
        _logger.warning("ChromaDB init failed", exc_info=True)
        return None

    entries = _load_corpus(Path(corpus_path))
    if not entries:
        return collection

    # Rebuild if corpus has grown since last index.
    stored_count = collection.count()
    if stored_count == len(entries):
        return collection

    _logger.info(
        "Rebuilding regulation vector index: %d stored vs %d corpus entries",
        stored_count, len(entries),
    )
    try:
        # Full rebuild: delete existing docs then re-index.
        if stored_count > 0:
            existing = collection.get(include=[])
            collection.delete(ids=existing["ids"])

        ids = [e.id for e in entries]
        documents = [f"{e.title}. {' '.join(e.topics)}. {e.body}" for e in entries]
        metadatas = [
            {
                "title": e.title,
                "source": e.source,
                "section": e.section,
                "topics": ", ".join(e.topics),
                "snippet": _snippet(e.body),
            }
            for e in entries
        ]
        try:
            collection.add(ids=ids, documents=documents, metadatas=metadatas)
        except Exception:
            _logger.info("Retrying vector index build with fresh collection", exc_info=True)
            client.delete_collection(COLLECTION_NAME)
            collection = client.create_collection(
                name=COLLECTION_NAME,
                embedding_function=ef,  # type: ignore[arg-type]
                metadata={"hnsw:space": "cosine"},
            )
            collection.add(ids=ids, documents=documents, metadatas=metadatas)

        _logger.info("Vector index built: %d entries", len(entries))
    except Exception:
        _logger.warning("Vector index build failed", exc_info=True)

    return collection


# ── Public API ─────────────────────────────────────────────────────────────────

def semantic_lookup(query: str, k: int = 3) -> list[dict[str, Any]]:
    """Semantic search over the regulation corpus.

    Returns the same schema as ``knowledge_retriever.lookup()`` so callers
    can use either interchangeably.
    """
    k = max(1, min(k, 10))
    coll = _collection()
    if coll is None:
        return []

    try:
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            return []

        model_name = _resolve_embedding_model()
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            res = client.models.embed_content(
                model=model_name,
                contents=query,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
            )
            q_embedding = res.embeddings[0].values
        except ImportError:
            import google.generativeai as genai  # noqa: PLC0415

            genai.configure(api_key=api_key)
            legacy_model = LEGACY_EMBEDDING_MODEL if model_name == DEFAULT_EMBEDDING_MODEL else model_name
            q_embedding = genai.embed_content(
                model=legacy_model,
                content=query,
                task_type="retrieval_query",
            )["embedding"]

        results = coll.query(
            query_embeddings=[q_embedding],
            n_results=min(k, coll.count()),
            include=["metadatas", "distances"],
        )
    except Exception:
        _logger.warning("semantic_lookup failed", exc_info=True)
        return []

    out: list[dict[str, Any]] = []
    ids = results.get("ids", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for doc_id, meta, dist in zip(ids, metadatas, distances):
        # ChromaDB cosine distance: 0 = identical, 2 = opposite. Convert to similarity.
        score = round(1.0 - float(dist) / 2.0, 4)
        m = meta or {}
        out.append(
            {
                "id": doc_id,
                "title": m.get("title", ""),
                "source": m.get("source", ""),
                "section": m.get("section", ""),
                "topics": [t.strip() for t in m.get("topics", "").split(",") if t.strip()],
                "snippet": m.get("snippet", ""),
                "score": score,
            }
        )
    return out


def reset_collection_cache() -> None:
    """Test helper — force the collection to reinitialise on next call."""
    _collection.cache_clear()
