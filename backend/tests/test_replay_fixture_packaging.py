"""Guard the recorded replay fixture all the way into the runtime container.

The backend serves `LIVE_DATA_SOURCE=replay` from
`app/schemas/live.py::get_default_fixture_path()`. Two packaging layers can
drop that file without any test noticing:

* the root `.dockerignore`, which decides what enters the build context, and
* the compose volume mounted over `/app/backend/data`, which shadows image
  content at runtime.

These tests pin both layers so a future cleanup cannot reintroduce the
"Replay fixture not found at /app/backend/data/fixtures/..." fallback storm
seen in the 2026-11-19 log audit.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

import yaml

from app.schemas.live import get_default_fixture_path

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTAINER_DATA_DIR = "/app/backend/data"


def _fixture_path_relative_to_repo() -> str:
    """Return the fixture path relative to the Docker build context root."""
    return get_default_fixture_path().resolve().relative_to(REPO_ROOT).as_posix()


def _compile_dockerignore_pattern(pattern: str) -> re.Pattern[str]:
    """Translate one `.dockerignore` pattern into a path regex.

    Supports the subset Docker documents: `*` (no path separator), `**`
    (any depth), `?`, a trailing `/` for directories, and `!` negation
    (stripped by the caller).
    """
    is_dir = pattern.endswith("/")
    body = pattern.rstrip("/")
    translated = ""
    index = 0
    while index < len(body):
        char = body[index]
        if body.startswith("**", index):
            translated += ".*"
            index += 2
            continue
        if char == "*":
            translated += "[^/]*"
        elif char == "?":
            translated += "[^/]"
        else:
            translated += re.escape(char)
        index += 1
    suffix = r"(/.*)?" if is_dir else ""
    return re.compile(rf"^{translated}{suffix}$")


def _is_excluded_by_dockerignore(rel_path: str, patterns: list[str]) -> bool:
    """Return True when the last matching `.dockerignore` pattern excludes path.

    Excluding a directory excludes everything below it, so a pattern that
    matches any ancestor of `rel_path` also applies — unless a later
    pattern re-includes it.
    """
    parts = rel_path.split("/")
    ancestors = ["/".join(parts[:index]) for index in range(1, len(parts))]
    excluded = False
    for raw in patterns:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        negated = line.startswith("!")
        body = line[1:].strip() if negated else line
        if not body:
            continue
        pattern = _compile_dockerignore_pattern(body.lstrip("/"))
        if pattern.match(rel_path) or any(pattern.match(parent) for parent in ancestors):
            excluded = not negated
    return excluded


def _dockerignore_patterns() -> list[str]:
    return (REPO_ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()


def test_default_fixture_path_resolves_to_a_file():
    path = get_default_fixture_path()
    assert path.is_file(), f"replay fixture missing at {path}"


def test_fixture_is_tracked_by_git():
    rel = _fixture_path_relative_to_repo()
    result = subprocess.run(
        ["git", "ls-files", "--error-unmatch", rel],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"{rel} is not tracked by git; the image build would silently omit it. "
        f"git said: {result.stderr.strip()}"
    )


def test_dockerignore_keeps_fixture_in_the_build_context():
    rel = _fixture_path_relative_to_repo()
    patterns = _dockerignore_patterns()
    assert not _is_excluded_by_dockerignore(rel, patterns), (
        f"{rel} is excluded by .dockerignore, so COPY backend /app/backend "
        f"cannot ship it; get_default_fixture_path() would miss at runtime"
    )


def test_dockerignore_still_drops_the_fastf1_cache():
    """The fixture exception must not drag the mutable cache into the image."""
    patterns = _dockerignore_patterns()
    for cache_path in (
        "backend/data/fastf1_http_cache.sqlite",
        "backend/data/2023/x.txt",
        "backend/data/cache/prebake/schedule/entry.json.gz",
    ):
        assert _is_excluded_by_dockerignore(cache_path, patterns), cache_path


def test_compose_volume_does_not_shadow_the_fixture():
    compose = yaml.safe_load((REPO_ROOT / "docker-compose.staging.yml").read_text(encoding="utf-8"))
    backend = compose["services"]["backend"]

    targets = []
    for mount in backend.get("volumes", []) or []:
        _, target = mount.split(":", 1)
        target = target.split(":", 1)[0].rstrip("/")
        targets.append(target)

    rel = Path(_fixture_path_relative_to_repo()).relative_to("backend").as_posix()
    fixture_in_container = f"{CONTAINER_DATA_DIR}/{rel}"

    for target in targets:
        assert fixture_in_container != target
        assert not fixture_in_container.startswith(f"{target}/"), (
            f"volume {target} masks {fixture_in_container} at runtime"
        )

    env = backend.get("environment", []) or []
    cache_env = [item for item in env if str(item).startswith("FASTF1_CACHE_DIR=")]
    assert len(cache_env) == 1, "compose must set FASTF1_CACHE_DIR exactly once"
    cache_dir = cache_env[0].split("=", 1)[1]
    assert cache_dir in targets, (
        "FASTF1_CACHE_DIR must point at the mounted cache volume; "
        f"got {cache_dir} with mounts {targets}"
    )
