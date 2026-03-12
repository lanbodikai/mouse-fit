"""Central configuration for MouseFit backend paths and external services."""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"

DATASET_DIR = BASE_DIR / "data"
RAG_DIR = BACKEND_DIR / "rag"
RAG_SOURCES_DIR = RAG_DIR / "sources"
RAG_EMBEDDINGS_PATH = RAG_DIR / "embeddings.json"
RAG_CHROMA_PATH = RAG_DIR / "chroma"
RAG_COLLECTION = "mousefit_docs"

EMBED_MODEL_NAME = os.getenv("MOUSEFIT_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = os.getenv("GROQ_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_DEFAULT_MODEL = os.getenv("GROQ_DEFAULT_MODEL", "llama-3.1-8b-instant")

ENABLE_AUTH = os.getenv("ENABLE_AUTH", "0").strip().lower() in {"1", "true", "yes", "on"}
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_JWKS_URL = (
    os.getenv("SUPABASE_JWKS_URL", "").strip()
    or (f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else "")
)
SUPABASE_JWT_ISSUER = (
    os.getenv("SUPABASE_JWT_ISSUER", "").strip()
    or (f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else "")
)
SUPABASE_JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated").strip()

USE_SERVER_REPORT_PIPELINE = os.getenv("USE_SERVER_REPORT_PIPELINE", "1").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

SENTRY_DSN = os.getenv("SENTRY_DSN", "").strip()
