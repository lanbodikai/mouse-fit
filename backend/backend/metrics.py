from __future__ import annotations

import threading
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import DefaultDict, Dict, Tuple


@dataclass
class RequestMetric:
    count: int = 0
    total_ms: float = 0.0
    max_ms: float = 0.0


class InMemoryMetrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._requests_total = 0
        self._started_at = time.time()
        self._by_route: DefaultDict[Tuple[str, str, int], RequestMetric] = defaultdict(RequestMetric)

    def record(self, method: str, path: str, status: int, elapsed_ms: float) -> None:
        key = (method.upper(), path, int(status))
        with self._lock:
            self._requests_total += 1
            metric = self._by_route[key]
            metric.count += 1
            metric.total_ms += elapsed_ms
            if elapsed_ms > metric.max_ms:
                metric.max_ms = elapsed_ms

    def snapshot(self) -> Dict[str, object]:
        with self._lock:
            routes = []
            for (method, path, status), value in sorted(self._by_route.items()):
                avg_ms = value.total_ms / value.count if value.count else 0.0
                routes.append(
                    {
                        "method": method,
                        "path": path,
                        "status": status,
                        "count": value.count,
                        "avg_ms": round(avg_ms, 2),
                        "max_ms": round(value.max_ms, 2),
                    }
                )
            uptime_sec = round(time.time() - self._started_at, 2)
            return {
                "uptime_sec": uptime_sec,
                "requests_total": self._requests_total,
                "routes": routes,
            }


METRICS = InMemoryMetrics()
