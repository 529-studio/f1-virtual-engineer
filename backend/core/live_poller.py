from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict, Optional, Set

from core import redis_cache
from tools import openf1_helper

logger = logging.getLogger(__name__)


class LivePoller:
    """Singleton background poller for live F1 session telemetry snapshots."""

    def __init__(
        self,
        poll_interval_seconds: float = 8.0,
        replay_mode: bool = False,
        session_key: Optional[int] = None,
    ) -> None:
        self.poll_interval_seconds = poll_interval_seconds
        self.replay_mode = replay_mode
        self.session_key = session_key

        self._task: Optional[asyncio.Task] = None
        self._is_running: bool = False
        self._lock = asyncio.Lock()
        self._latest_snapshot: Optional[Dict[str, Any]] = None
        self._subscribers: Set[asyncio.Queue] = set()
        self.upstream_call_count: int = 0

    @property
    def is_running(self) -> bool:
        return self._is_running

    async def start(self) -> None:
        """Idempotently start the poller loop task."""
        async with self._lock:
            if self._is_running and self._task and not self._task.done():
                return
            self._is_running = True
            self._task = asyncio.create_task(self._loop(), name="live-poller-loop")
            logger.info(
                "LivePoller started (interval=%.2fs, replay=%s)",
                self.poll_interval_seconds,
                self.replay_mode,
            )

    async def stop(self) -> None:
        """Idempotently stop and cancel the poller task."""
        async with self._lock:
            if not self._is_running:
                return
            self._is_running = False
            if self._task:
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
                self._task = None
            logger.info("LivePoller stopped")

    def subscribe(self) -> asyncio.Queue:
        """Register a subscriber queue for live tick events."""
        q: asyncio.Queue = asyncio.Queue(maxsize=10)
        self._subscribers.add(q)
        # If we have an existing snapshot, feed it immediately so client doesn't wait
        if self._latest_snapshot:
            try:
                q.put_nowait(self._latest_snapshot)
            except asyncio.QueueFull:
                pass
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        """Unregister a subscriber queue."""
        self._subscribers.discard(q)

    def _broadcast(self, tick: Dict[str, Any]) -> None:
        """Deliver snapshot to all registered queues without blocking."""
        dead_queues = []
        for q in self._subscribers:
            try:
                if q.full():
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                q.put_nowait(tick)
            except Exception:
                dead_queues.append(q)
        for q in dead_queues:
            self._subscribers.discard(q)

    async def _poll_tick(self) -> None:
        """Execute one polling iteration."""
        self.upstream_call_count += 1
        try:
            res = await asyncio.to_thread(
                openf1_helper.normalize_live_snapshot,
                self.session_key,
            )
            if res.get("fallback") or not res.get("data"):
                logger.warning("Live poll returned fallback: %s", res.get("fallback_reason"))
                if self._latest_snapshot:
                    stale_copy = dict(self._latest_snapshot)
                    stale_copy["stale"] = True
                    stale_copy["polled_at"] = datetime.now(timezone.utc).isoformat()
                    self._latest_snapshot = stale_copy
                    self._broadcast(stale_copy)
                return

            tick_data = res["data"]
            self._latest_snapshot = tick_data

            # Cache to Redis L2 (TTL 30s)
            try:
                redis_cache.set("live", "snapshot", tick_data, ttl_seconds=30)
            except Exception as exc:
                logger.debug("Redis cache write error: %s", exc)

            self._broadcast(tick_data)

        except Exception as exc:
            logger.warning("LivePoller tick error: %s", exc)
            if self._latest_snapshot:
                stale_copy = dict(self._latest_snapshot)
                stale_copy["stale"] = True
                stale_copy["polled_at"] = datetime.now(timezone.utc).isoformat()
                self._latest_snapshot = stale_copy
                self._broadcast(stale_copy)

    async def _loop(self) -> None:
        """Main periodic polling loop."""
        while self._is_running:
            try:
                await self._poll_tick()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Unexpected error in poller loop: %s", exc)
            try:
                await asyncio.sleep(self.poll_interval_seconds)
            except asyncio.CancelledError:
                break

    async def get_latest_snapshot(self) -> Optional[Dict[str, Any]]:
        """Return cached snapshot from memory or Redis L2 without making upstream requests."""
        if self._latest_snapshot:
            return self._latest_snapshot

        # Check Redis L2
        try:
            cached = redis_cache.get("live", "snapshot")
            if cached and isinstance(cached, dict):
                self._latest_snapshot = cached
                return cached
        except Exception as exc:
            logger.debug("Redis cache read error: %s", exc)

        return None


# Module-level singleton instance
_live_poller_instance: Optional[LivePoller] = None


def get_live_poller() -> LivePoller:
    """Retrieve or create the application-wide singleton LivePoller."""
    global _live_poller_instance
    if _live_poller_instance is None:
        source = os.getenv("LIVE_DATA_SOURCE", "replay").lower().strip()
        replay = source == "replay"
        _live_poller_instance = LivePoller(
            poll_interval_seconds=8.0,
            replay_mode=replay,
        )
    return _live_poller_instance
