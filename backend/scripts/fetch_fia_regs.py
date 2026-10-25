#!/usr/bin/env python3
"""Download official FIA F1 Sporting Regulations PDFs into backend/data/fia_pdfs/.

Files are stored under their exact FIA filenames so re-running is idempotent —
already-present files are skipped. URLs were verified against
https://www.fia.com/regulation/category/110 (2026-10-25); when FIA publishes a
new issue, append the new entry here (or replace the old one) and re-run.

Usage (repo root):
    .venv/bin/python backend/scripts/fetch_fia_regs.py
"""

from __future__ import annotations

import logging
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import certifi

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEST_DIR = REPO_ROOT / "backend" / "data" / "fia_pdfs"

# Standard browser identity — plain urllib UA gets blocked by the FIA WAF
# (529 pillar: resilient-networking-and-waf).
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

DOCUMENTS: list[dict[str, str]] = [
    {
        "filename": "fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf",
        "url": "https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_b_sporting_-_iss_09_-_2026-10-01.pdf",
    },
    {
        "filename": "fia_2026_f1_regulations_-_section_a_general_provisions_-_iss_03_-_2026-06-25.pdf",
        "url": "https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_a_general_provisions_-_iss_03_-_2026-06-25.pdf",
    },
    {
        "filename": "fia_2025_formula_1_sporting_regulations_-_issue_5_-_2025-04-30.pdf",
        "url": "https://www.fia.com/system/files/documents/fia_2025_formula_1_sporting_regulations_-_issue_5_-_2025-04-30.pdf",
    },
    {
        "filename": "fia_2024_formula_1_sporting_regulations_-_issue_7_-_2024-07-31.pdf",
        "url": "https://www.fia.com/sites/default/files/fia_2024_formula_1_sporting_regulations_-_issue_7_-_2024-07-31.pdf",
    },
]

RETRIES = 3
RETRY_BACKOFF_S = 5


def _download(url: str, dest: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    # macOS python.org builds have no system keychain trust — pin certifi's CA
    # bundle instead of disabling verification.
    context = ssl.create_default_context(cafile=certifi.where())
    last_error: Exception | None = None
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=60, context=context) as response:
                dest.write_bytes(response.read())
            return
        except (urllib.error.URLError, TimeoutError, OSError) as exc:  # noqa: PERF203
            last_error = exc
            logging.warning("attempt %d/%d failed for %s: %s", attempt, RETRIES, url, exc)
            time.sleep(RETRY_BACKOFF_S * attempt)
    raise RuntimeError(f"failed to download {url}: {last_error}")


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    for doc in DOCUMENTS:
        dest = DEST_DIR / doc["filename"]
        if dest.exists() and dest.stat().st_size > 10_000:
            logging.info("skip (exists): %s", doc["filename"])
            continue
        logging.info("downloading: %s", doc["filename"])
        _download(doc["url"], dest)
        size_kb = dest.stat().st_size // 1024
        logging.info("  -> %d KB", size_kb)
    logging.info("done: %d file(s) in %s", len(DOCUMENTS), DEST_DIR)
    return 0


if __name__ == "__main__":
    sys.exit(main())
