from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict

from backend import config

try:
    import redis
except Exception:  # pragma: no cover - optional for local/test environments
    redis = None  # type: ignore[assignment]


@dataclass(frozen=True)
class RateLimitSpec:
    max_requests: int
    window_seconds: int


class InMemoryRateLimiter:
    """
    Simple in-memory sliding-window rate limiter.
    Suitable for single-process deployments and local/staging environments.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)

    def allow(self, key: str, spec: RateLimitSpec) -> bool:
        now = time.time()
        min_allowed = now - spec.window_seconds
        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] < min_allowed:
                bucket.popleft()
            if len(bucket) >= spec.max_requests:
                return False
            bucket.append(now)
            return True


RATE_LIMITER = InMemoryRateLimiter()


class RedisRateLimiter:
    """Shared fixed-window limiter for multi-worker and multi-container deployments."""

    def __init__(self, url: str) -> None:
        if redis is None:
            raise RuntimeError("redis package is not installed")
        self._client = redis.Redis.from_url(url, decode_responses=True)

    def allow(self, key: str, spec: RateLimitSpec) -> bool:
        bucket = int(time.time()) // spec.window_seconds
        redis_key = f"mousefit:rate:{key}:{bucket}"
        pipe = self._client.pipeline(transaction=True)
        pipe.incr(redis_key)
        pipe.expire(redis_key, spec.window_seconds + 1)
        count, _ = pipe.execute()
        return int(count) <= spec.max_requests


if config.REDIS_URL and redis is not None:
    try:
        shared_limiter = RedisRateLimiter(config.REDIS_URL)
        shared_limiter._client.ping()
        RATE_LIMITER = shared_limiter  # type: ignore[assignment]
    except Exception:
        # Keep local development usable if Redis is not running yet.
        pass
