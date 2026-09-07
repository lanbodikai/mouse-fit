from __future__ import annotations

import logging
import os

from backend.db.pool import close_pool, init_pool
from backend.db.schema import init_db
from backend.db.seed import seed_mice_from_json_if_empty

LOGGER = logging.getLogger("mousefit.api")


def on_startup() -> None:
    if os.getenv("MOUSEFIT_SKIP_STARTUP", "0").strip().lower() in {"1", "true", "yes", "on"}:
        return
    init_pool()
    auto_schema_init = os.getenv("MOUSEFIT_AUTO_SCHEMA_INIT", "0").strip().lower() in {"1", "true", "yes", "on"}
    if auto_schema_init:
        init_db()
    seed_mice_from_json_if_empty()
    warm = os.getenv("MOUSEFIT_WARMUP_RAG", "1").strip().lower() in {"1", "true", "yes", "on"}
    if warm:
        try:
            from backend.rag.retriever import warmup

            warmup()
        except Exception:
            LOGGER.exception("rag_warmup_failed")


def on_shutdown() -> None:
    close_pool()
