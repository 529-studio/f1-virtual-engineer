import asyncio
import unittest
from unittest.mock import patch

from core.live_poller import LivePoller, get_live_poller


class LivePollerTests(unittest.IsolatedAsyncioTestCase):
    async def test_live_poller_singleton_and_lifecycle(self):
        poller1 = get_live_poller()
        poller2 = get_live_poller()
        self.assertIs(poller1, poller2)

        custom_poller = LivePoller(poll_interval_seconds=0.05, replay_mode=True)
        self.assertFalse(custom_poller.is_running)

        await custom_poller.start()
        self.assertTrue(custom_poller.is_running)
        # Second start is idempotent
        await custom_poller.start()
        self.assertTrue(custom_poller.is_running)

        # Wait for at least one tick
        await asyncio.sleep(0.12)
        snapshot = await custom_poller.get_latest_snapshot()
        self.assertIsNotNone(snapshot)
        self.assertEqual(snapshot["session_key"], 11412)
        self.assertGreaterEqual(len(snapshot["drivers"]), 10)

        await custom_poller.stop()
        self.assertFalse(custom_poller.is_running)
        # Second stop is idempotent
        await custom_poller.stop()
        self.assertFalse(custom_poller.is_running)

    async def test_live_poller_budget_ceiling(self):
        poller = LivePoller(poll_interval_seconds=0.05, replay_mode=True)
        await poller.start()
        await asyncio.sleep(0.1)

        # 10 concurrent reads must consume from cache and not increase upstream calls per read
        snapshots = [await poller.get_latest_snapshot() for _ in range(10)]
        initial_upstream_count = poller.upstream_call_count
        self.assertLessEqual(initial_upstream_count, 4)

        # Multiple reads don't increment upstream count
        for s in snapshots:
            self.assertIsNotNone(s)
            self.assertEqual(s["session_key"], 11412)

        self.assertEqual(poller.upstream_call_count, initial_upstream_count)
        await poller.stop()

    async def test_live_poller_subscriber_queue(self):
        poller = LivePoller(poll_interval_seconds=0.05, replay_mode=True)
        q = poller.subscribe()

        await poller.start()
        tick = await asyncio.wait_for(q.get(), timeout=1.0)
        self.assertEqual(tick["session_key"], 11412)
        self.assertIn("drivers", tick)

        poller.unsubscribe(q)
        self.assertNotIn(q, poller._subscribers)
        await poller.stop()

    async def test_live_poller_stale_fallback_on_error(self):
        poller = LivePoller(poll_interval_seconds=0.05, replay_mode=True)
        # Seed an initial valid snapshot
        poller._latest_snapshot = {
            "session_key": 11412,
            "polled_at": "2026-11-08T17:42:00Z",
            "delay_seconds": 3.0,
            "stale": False,
            "source": "replay",
            "safety_car_status": "NONE",
            "leader_lap": 35,
            "drivers": [],
        }

        # Force error on next tick
        def failing_normalizer(*args, **kwargs):
            raise ConnectionError("Upstream dropped")

        with patch("tools.openf1_helper.normalize_live_snapshot", side_effect=failing_normalizer):
            await poller._poll_tick()
            snapshot = await poller.get_latest_snapshot()
            self.assertIsNotNone(snapshot)
            self.assertTrue(snapshot["stale"])

    async def test_fallback_warning_logged_once_per_state(self):
        """An unchanged fallback reason must not emit one line per tick."""
        poller = LivePoller(poll_interval_seconds=0.05, replay_mode=True)
        fallback = {
            "fallback": True,
            "fallback_reason": "Replay fixture not found at /app/backend/data/fixtures/x.json",
            "data": None,
        }

        with patch("tools.openf1_helper.normalize_live_snapshot", return_value=fallback):
            with self.assertLogs("core.live_poller", level="DEBUG") as logs:
                for _ in range(5):
                    await poller._poll_tick()

        warnings = [
            record.getMessage()
            for record in logs.records
            if record.getMessage().startswith("Live poll returned fallback")
        ]
        self.assertEqual(len(warnings), 1, warnings)
        self.assertIn("Replay fixture not found", warnings[0])

    async def test_fallback_warning_logged_again_on_reason_change(self):
        poller = LivePoller(poll_interval_seconds=0.05, replay_mode=True)

        def missing_fixture(*args, **kwargs):
            return {"fallback": True, "fallback_reason": "reason A", "data": None}

        def upstream_down(*args, **kwargs):
            return {"fallback": True, "fallback_reason": "reason B", "data": None}

        with patch("tools.openf1_helper.normalize_live_snapshot", side_effect=missing_fixture):
            with self.assertLogs("core.live_poller", level="WARNING") as first:
                await poller._poll_tick()
                await poller._poll_tick()

        with patch("tools.openf1_helper.normalize_live_snapshot", side_effect=upstream_down):
            with self.assertLogs("core.live_poller", level="WARNING") as second:
                await poller._poll_tick()

        self.assertEqual(len(first.records), 1)
        self.assertIn("reason A", first.records[0].getMessage())
        self.assertEqual(len(second.records), 1)
        self.assertIn("reason B", second.records[0].getMessage())

    async def test_recovery_logged_once_when_poll_succeeds_again(self):
        poller = LivePoller(poll_interval_seconds=0.05, replay_mode=True)
        fallback = {"fallback": True, "fallback_reason": "reason A", "data": None}
        recovered = {"fallback": False, "fallback_reason": None, "data": {"session_key": 11412}}

        with patch("tools.openf1_helper.normalize_live_snapshot", return_value=fallback):
            with self.assertLogs("core.live_poller", level="WARNING"):
                await poller._poll_tick()

        with patch("tools.openf1_helper.normalize_live_snapshot", return_value=recovered):
            with self.assertLogs("core.live_poller", level="INFO") as logs:
                await poller._poll_tick()
                await poller._poll_tick()

        recovered_lines = [
            record.getMessage()
            for record in logs.records
            if record.getMessage().startswith("Live poll recovered")
        ]
        self.assertEqual(len(recovered_lines), 1, recovered_lines)
        self.assertIsNone(poller._fallback_reason)

