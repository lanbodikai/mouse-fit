from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict


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
