import asyncio
from typing import Annotated

from fastapi import APIRouter, Path, Request
from fastapi.responses import JSONResponse

import app.main as _main
from app.schemas.knowledge import (
    KnowledgeLookupRequest,
    KnowledgeLookupResponse,
    KnowledgeNoteResponse,
)
from core.limiter import limiter
from tools.knowledge_retriever import (
    get_note as knowledge_get_note,
    lookup as knowledge_lookup,
)

router = APIRouter(tags=["knowledge"])


@router.post(
    "/knowledge/lookup",
    response_model=KnowledgeLookupResponse,
    summary="Retrieve FIA regulation citations for a natural-language query",
    description=(
        "Runs a BM25 lookup over the curated FIA regulation corpus and returns "
        "the top-k matching entries with title, source, section, topics, snippet, "
        "and score — ready for downstream citation rendering."
    ),
)
@limiter.limit("10/10seconds")
async def knowledge_lookup_endpoint(
    request: Request,
    body: KnowledgeLookupRequest,
):
    citations = await asyncio.to_thread(_main.knowledge_lookup, body.query, body.k)
    return {
        "status": "success",
        "query": body.query,
        "citations": citations,
    }


@router.get(
    "/knowledge/note/{note_id}",
    response_model=KnowledgeNoteResponse,
    summary="Fetch a single corpus note by id (full body)",
    description=(
        "Returns the full untruncated body of a knowledge corpus entry. Used by the "
        "citation chip popover in Mission Control after a chip is clicked. Returns "
        "404 with a structured envelope when the id does not match any corpus entry."
    ),
)
@limiter.limit("30/10seconds")
async def knowledge_note_endpoint(
    request: Request,
    note_id: Annotated[str, Path()],
):
    note = await asyncio.to_thread(_main.knowledge_get_note, note_id)
    if note is None:
        return JSONResponse(
            status_code=404,
            content={
                "status": "error",
                "note": None,
                "error": f"Knowledge note '{note_id}' not found.",
            },
        )
    return {"status": "success", "note": note}
