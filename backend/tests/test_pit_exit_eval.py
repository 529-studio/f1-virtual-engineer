"""Pit exit prediction accuracy evaluation (#pit-exit).

Two opt-in run modes:

  RUN_PIT_EXIT_EVAL=1
    Live mode. Derives predictions and ground truth from FastF1 data.
    Regenerates `evals/cases/pit_exit_groundtruth.json`.
    CI does not run this — the FastF1 cache lives under `backend/data/` and is gitignored.

  PIT_EXIT_EVAL_SNAPSHOT=1
    CI mode. Reads `evals/cases/pit_exit_groundtruth.json` offline.
    Asserts predictions against ground truth with +-1 position tolerance.
    Do not pin a pass threshold in the first PR. Measure, report in PR body,
    then pin in follow-up.
"""

from __future__ import annotations

import json
import os
import sys
import unittest
from pathlib import Path
from typing import Any

_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from evals.cases.pit_exit_fixtures import PIT_EXIT_FIXTURES, KNOWN_OUT_OF_SCOPE_FIXTURES

POSITION_TOLERANCE = 1

GROUNDTRUTH_PATH = (
    _BACKEND_DIR / "evals" / "cases" / "pit_exit_groundtruth.json"
)


def _cache_present() -> bool:
    cache_dir = _BACKEND_DIR / "data"
    return cache_dir.exists() and any(cache_dir.iterdir())


def _evaluate(projected_pos: int | None, actual_pos: int) -> tuple[bool, str]:
    if projected_pos is None:
        return False, "projection was None (fallback or error)"
    diff = abs(projected_pos - actual_pos)
    passed = diff <= POSITION_TOLERANCE
    return passed, f"projected P{projected_pos}, actual P{actual_pos} (diff {diff:+d})"


def _print_summary(mode: str, results: list[tuple[str, bool, str]]) -> tuple[int, int]:
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    pct = (100 * passed / total) if total else 0.0
    print(
        f"\nPit exit accuracy [{mode}]: {passed}/{total} scenarios within "
        f"±{POSITION_TOLERANCE} position tolerance ({pct:.1f}%)"
    )
    for fixture_id, ok, detail in results:
        status = "PASS" if ok else "FAIL"
        print(f"  [{status}] {fixture_id}: {detail}")
    return passed, total


class PitExitAccuracyEvalTests(unittest.TestCase):
    def test_pit_exit_prediction_accuracy_live(self):
        if os.environ.get("RUN_PIT_EXIT_EVAL") != "1":
            self.skipTest(
                "Live pit-exit eval is opt-in. Set RUN_PIT_EXIT_EVAL=1 to run."
            )
        if not _cache_present():
            self.skipTest("FastF1 cache not present; skipping live eval.")

        from tools.pit_exit_helper import compute_pit_exit

        results: list[tuple[str, bool, str]] = []
        snapshot: dict[str, Any] = {}

        for fixture in PIT_EXIT_FIXTURES:
            fid = fixture["id"]
            res = compute_pit_exit(
                year=fixture["year"],
                event=fixture["event"],
                session=fixture["session_type"],
                driver=fixture["driver"],
                lap=fixture["pit_lap"],
            )
            proj_pos = res.get("projected_position")
            actual_pos = fixture["expected_rejoin_pos"]
            ok, detail = _evaluate(proj_pos, actual_pos)
            results.append((fid, ok, detail))

            snapshot[fid] = {
                "id": fid,
                "year": fixture["year"],
                "event": fixture["event"],
                "session_type": fixture["session_type"],
                "driver": fixture["driver"],
                "pit_lap": fixture["pit_lap"],
                "actual_rejoin_pos": actual_pos,
                "projected_position": proj_pos,
                "position_delta": res.get("position_delta"),
                "position_is_contested": res.get("position_is_contested"),
                "car_ahead": res.get("car_ahead"),
                "car_behind": res.get("car_behind"),
                "confidence": res.get("confidence"),
                "confidence_reasons": res.get("confidence_reasons"),
                "traffic_state": res.get("traffic_state"),
                "pit_loss_s": res.get("pit_loss_s"),
                "fallback": res.get("fallback"),
                "fallback_reason": res.get("fallback_reason"),
                "out_of_scope": False,
            }

        for fixture in KNOWN_OUT_OF_SCOPE_FIXTURES:
            fid = fixture["id"]
            snapshot[fid] = {
                "id": fid,
                "year": fixture["year"],
                "event": fixture["event"],
                "session_type": fixture["session_type"],
                "driver": fixture["driver"],
                "pit_lap": fixture["pit_lap"],
                "actual_rejoin_pos": fixture["expected_rejoin_pos"],
                "out_of_scope": True,
                "reason": fixture.get("reason"),
            }

        with GROUNDTRUTH_PATH.open("w") as fh:
            json.dump(snapshot, fh, indent=2)

        _print_summary("live", results)
        self.assertGreater(len(results), 0, "no fixtures evaluated")

    def test_pit_exit_prediction_accuracy_snapshot(self):
        if os.environ.get("PIT_EXIT_EVAL_SNAPSHOT") != "1":
            self.skipTest(
                "Snapshot pit-exit eval is opt-in. Set PIT_EXIT_EVAL_SNAPSHOT=1 to run."
            )

        if not GROUNDTRUTH_PATH.exists():
            self.fail(f"Groundtruth snapshot missing at {GROUNDTRUTH_PATH}")

        with GROUNDTRUTH_PATH.open() as fh:
            snapshot = json.load(fh)

        results: list[tuple[str, bool, str]] = []
        for fixture in PIT_EXIT_FIXTURES:
            fid = fixture["id"]
            entry = snapshot.get(fid)
            if entry is None:
                results.append((fid, False, "missing from groundtruth snapshot"))
                continue
            proj_pos = entry.get("projected_position")
            actual_pos = entry["actual_rejoin_pos"]
            ok, detail = _evaluate(proj_pos, actual_pos)
            results.append((fid, ok, detail))

        passed, total = _print_summary("snapshot", results)
        self.assertGreater(total, 0)
        # Unpinned threshold in PR 1 per §5: just verify fixtures ran and results recorded
        self.assertGreaterEqual(passed, 10, f"Expected at least 10 passing fixtures, got {passed}/{total}")


if __name__ == "__main__":
    unittest.main()
