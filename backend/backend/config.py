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

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = os.getenv("GROQ_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_DEFAULT_MODEL = os.getenv("GROQ_DEFAULT_MODEL", "llama-3.1-8b-instant")
