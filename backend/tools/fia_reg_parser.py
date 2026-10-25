"""Parse official FIA F1 regulations PDFs into article-anchored verbatim chunks.

Input:  ``backend/data/fia_pdfs/*.pdf`` (downloaded by ``scripts/fetch_fia_regs.py``).
Output: ``backend/data/fia_regs/<stem>.jsonl`` — one clause-level chunk per line.

Supported layouts
-----------------
2024/2025 Sporting Regulations ("legacy" layout):
    38) FREE PRACTICE                          <- article heading  ``N) TITLE``
    38.1 ...                                   <- clause            ``N.M ...``

2026 Regulations Section A-F ("sectioned" layout):
    ARTICLE B4: LAP TIME CLASSIFIED SESSIONS   <- article heading
    B4.1 ...                                   <- clause ``XN.M[.K][a] ...``

Both layouts share two parsing hazards that this module handles explicitly:
- Repeated per-page header/footer junk (the section letter, bare page numbers,
  the repeated ``SECTION B: ...`` banner).
- Table-of-contents pages whose lines look exactly like headings/clauses but
  end with a trailing page number. Any heading- or clause-shaped line ending
  in ``\\s\\d{1,3}$`` is treated as TOC noise and dropped.
"""

from __future__ import annotations

import json
import logging
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PDF_DIR = REPO_ROOT / "backend" / "data" / "fia_pdfs"
OUT_DIR = REPO_ROOT / "backend" / "data" / "fia_regs"

_logger = logging.getLogger(__name__)

# ── Structure regexes ────────────────────────────────────────────────────────

# Legacy heading: "38) FREE PRACTICE" (title case mixed, no trailing page number).
_LEGACY_HEADING_RE = re.compile(r"^(\d{1,3})\)\s+(\S.*)$")
# Sectioned heading: "ARTICLE B4: LAP TIME CLASSIFIED SESSIONS (LTCS)".
_SECTIONED_HEADING_RE = re.compile(r"^ARTICLE\s+([A-F]\d{1,3}):\s+(\S.*)$")
# Any trailing page reference marks a TOC line, never body content.
_TOC_TRAILING_PAGE_RE = re.compile(r"\s\d{1,3}$")
# Page-banner junk: a lone section letter or a bare page number on its own line.
_JUNK_LINE_RE = re.compile(r"^(?:[A-F]|\d{1,3})$")
# Repeated page banner, e.g. "SECTION B: SPORTING REGULATIONS".
_BANNER_RE = re.compile(r"^SECTION [A-F]: .+$")

# Clause start. Legacy "33.3 The FIA ..."; sectioned "B4.1 General ...",
# "B5.15.2 Resumption", "B5.15.2a) ...". The first body word must start with a
# capital letter, digit or opening parenthesis so measurements like "1.5 km"
# never match.
_CLAUSE_RE = re.compile(
    r"^(?:(?P<sec>[A-F])(?P<art>\d{1,3})|(?P<lart>\d{1,3}))"
    r"\.(?P<sub>\d{1,2})(?:\.(?P<sub2>\d{1,2}))?(?P<letter>[a-z])?\)?\s+"
    r"(?=[A-Z0-9(])"
)

# Appendix headings, e.g. "APPENDIX B4: PODIUM CEREMONY". Regular appendices
# are real regulation content; the trailing "APPROVED CHANGES ..." appendix
# duplicates body articles with "…/…" ellipsis gaps and is cut entirely.
_APPENDIX_HEADING_RE = re.compile(r"^APPENDIX\s+([A-F]\d+):\s+(\S.*)$")
_CHANGES_APPENDIX_RE = re.compile(r"APPROVED CHANGES", re.IGNORECASE)
# Inside appendices only: internal items are numbered "9. PRESS ROOM" (dot
# style). Body numbering is always "N.M ..." with digits after the dot, so
# gating this on in_appendix avoids colliding with decimal lists in the body.
_APPENDIX_ITEM_RE = re.compile(r"^(\d{1,3})\.\s+([A-Z].+)$")


@dataclass(frozen=True)
class DocMeta:
    season: int
    section: str  # "Sporting" (legacy) or "A — General Provisions" style label
    issue: str
    issue_date: str
    doc_id: str  # e.g. "sr-2024" / "regs-2026-b"


_FILENAME_RES = [
    # fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf
    re.compile(
        r"^fia_(?P<season>\d{4})_f1_regulations_-_section_(?P<letter>[a-f])_(?P<name>[a-z_]+)"
        r"_-_iss_(?P<iss>\d+)_-_(?P<date>\d{4}-\d{2}-\d{2})\.pdf$"
    ),
    # fia_2025_formula_1_sporting_regulations_-_issue_5_-_2025-04-30.pdf
    re.compile(
        r"^fia_(?P<season>\d{4})_formula_1_sporting_regulations_-_issue_(?P<iss>\d+)"
        r"_-_(?P<date>\d{4}-\d{2}-\d{2})\.pdf$"
    ),
]


def parse_filename(filename: str) -> DocMeta:
    """Derive season/section/issue metadata from the official FIA filename."""
    for pattern in _FILENAME_RES:
        m = pattern.match(filename)
        if not m:
            continue
        season = int(m.group("season"))
        issue = m.group("iss")
        date = m.group("date")
        if "letter" in m.groupdict():
            letter = m.group("letter").upper()
            name = m.group("name").replace("_", " ").title()
            return DocMeta(
                season=season,
                section=f"{letter} — {name}",
                issue=issue,
                issue_date=date,
                doc_id=f"regs-{season}-{letter.lower()}",
            )
        return DocMeta(
            season=season,
            section="Sporting",
            issue=issue,
            issue_date=date,
            doc_id=f"sr-{season}",
        )
    raise ValueError(f"unrecognised FIA filename: {filename}")


def _clean_lines(raw_text: str) -> list[str]:
    """Drop page banners, junk header/footer lines, and TOC lines."""
    lines: list[str] = []
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        if _JUNK_LINE_RE.match(line) or _BANNER_RE.match(line):
            continue
        lines.append(line)
    return lines


def _is_heading(line: str) -> bool:
    return bool(
        _SECTIONED_HEADING_RE.match(line) or _LEGACY_HEADING_RE.match(line)
    )


def _find_body_start(lines: list[str]) -> int | None:
    """Index of the first real article heading.

    Contents pages list headings with a trailing page number (``ARTICLE B4:
    ... 33``); real body headings never end in a bare number. Everything
    before the first such heading is front matter (cover, conventions, TOC)
    and is dropped wholesale.
    """
    for i, line in enumerate(lines):
        if _is_heading(line) and not _TOC_TRAILING_PAGE_RE.search(line):
            return i
    return None


def extract_chunks(
    raw_text: str,
    meta: DocMeta,
    *,
    source_filename: str = "",
) -> list[dict[str, Any]]:
    """Split cleaned PDF text into clause-level verbatim chunks."""
    chunks: list[dict[str, Any]] = []
    article_heading: str | None = None
    article_no: str | None = None
    in_appendix: str | None = None
    current: dict[str, Any] | None = None

    def _flush() -> None:
        nonlocal current
        if current is not None and current["text"].strip():
            current["text"] = current["text"].strip()
            chunks.append(current)
        current = None

    lines = _clean_lines(raw_text)
    body_start = _find_body_start(lines)
    if body_start is None:
        _logger.warning("no body heading found — treating whole document as body")
        body_start = 0

    for line in lines[body_start:]:
        appendix_m = _APPENDIX_HEADING_RE.match(line)
        if appendix_m and _CHANGES_APPENDIX_RE.search(line):
            # Trailing "approved changes" appendix restates body articles with
            # "…/…" elisions — duplicating them would poison retrieval.
            _logger.info("cutting changes appendix at: %s", line[:70])
            break

        heading_m = (
            _SECTIONED_HEADING_RE.match(line)
            or appendix_m
            or _LEGACY_HEADING_RE.match(line)
            or (_APPENDIX_ITEM_RE.match(line) if in_appendix else None)
        )
        if heading_m:
            _flush()
            if appendix_m:
                # Appendix headings carry their own label; internal legacy
                # numbering afterwards is namespaced to avoid colliding with
                # real articles ("9. PRESS ROOM" inside APPENDIX B4).
                article_no = f"APP-{heading_m.group(1)}"
                in_appendix = article_no
                article_heading = heading_m.group(2).strip()
            else:
                raw_no = heading_m.group(1)
                article_no = f"{in_appendix}-{raw_no}" if in_appendix else raw_no
                article_heading = heading_m.group(2).strip()
            if in_appendix:
                # Appendix prose has no clause numbering — the heading itself
                # opens a paragraph chunk so following text is not dropped.
                current = _new_chunk(
                    meta, article_no, article_no, article_heading, "", source_filename
                )
            continue

        clause_m = _CLAUSE_RE.match(line)
        if clause_m:
            _flush()
            if clause_m.group("sec"):
                clause_id = (
                    f"{clause_m.group('sec')}{clause_m.group('art')}.{clause_m.group('sub')}"
                )
                if clause_m.group("sub2"):
                    clause_id += f".{clause_m.group('sub2')}"
                if clause_m.group("letter"):
                    clause_id += clause_m.group("letter")
                art = f"{clause_m.group('sec')}{clause_m.group('art')}"
            else:
                clause_id = f"{clause_m.group('lart')}.{clause_m.group('sub')}"
                if clause_m.group("sub2"):
                    clause_id += f".{clause_m.group('sub2')}"
                if clause_m.group("letter"):
                    clause_id += clause_m.group("letter")
                art = clause_m.group("lart")
            current = _new_chunk(
                meta, clause_id, art, article_heading or "", line, source_filename
            )
            continue

        if current is not None:
            # Continuation of the current clause (wrapped sentences, lettered
            # sub-items) — preserved verbatim.
            current["text"] += "\n" + line

    _flush()
    return chunks


def _pdf_url(filename: str) -> str:
    return f"https://www.fia.com/system/files/documents/{filename}"


def _new_chunk(
    meta: DocMeta,
    clause_id: str,
    article: str,
    heading: str,
    text: str,
    source_filename: str,
) -> dict[str, Any]:
    return {
        "id": f"{meta.doc_id}:{clause_id}",
        "doc": meta.doc_id,
        "season": meta.season,
        "section": meta.section,
        "issue": meta.issue,
        "issue_date": meta.issue_date,
        "article": article,
        "heading": heading or "",
        "clause": clause_id,
        "source_url": _pdf_url(source_filename) if source_filename else "",
        "text": text,
    }


def parse_pdf(pdf_path: Path) -> list[dict[str, Any]]:
    """Extract text with pdfplumber and split into clause chunks."""
    import pdfplumber  # imported lazily so unit tests need no PDF tooling

    meta = parse_filename(pdf_path.name)
    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pages.append(page.extract_text() or "")
    return extract_chunks("\n".join(pages), meta, source_filename=pdf_path.name)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if not PDF_DIR.exists():
        logging.error("no %s — run scripts/fetch_fia_regs.py first", PDF_DIR)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        logging.error("no PDFs in %s", PDF_DIR)
        return 1
    total = 0
    for pdf_path in pdfs:
        chunks = parse_pdf(pdf_path)
        out_path = OUT_DIR / f"{pdf_path.stem}.jsonl"
        with out_path.open("w", encoding="utf-8") as fh:
            for chunk in chunks:
                fh.write(json.dumps(chunk, ensure_ascii=False) + "\n")
        articles = {c["article"] for c in chunks}
        logging.info(
            "%s: %d clauses across %d articles -> %s",
            pdf_path.name, len(chunks), len(articles), out_path.name,
        )
        total += len(chunks)
    logging.info("done: %d chunks in %s", total, OUT_DIR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
