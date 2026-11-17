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
