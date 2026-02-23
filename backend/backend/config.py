"""Central configuration for MouseFit backend paths and external services."""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"

DATASET_DIR = BACKEND_DIR / "ml" / "dataset"
MODEL_DIR = BACKEND_DIR / "ml" / "model"
RAG_DIR = BACKEND_DIR / "rag"
RAG_SOURCES_DIR = RAG_DIR / "sources"
RAG_EMBEDDINGS_PATH = RAG_DIR / "embeddings.json"
RAG_CHROMA_PATH = RAG_DIR / "chroma"
RAG_COLLECTION = "mousefit_docs"

EMBED_MODEL_NAME = os.getenv("MOUSEFIT_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# Groq (OpenAI-compatible).
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = os.getenv("GROQ_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_DEFAULT_MODEL = os.getenv("GROQ_DEFAULT_MODEL", "llama-3.3-70b-versatile")

# Google Gemini via OpenAI-compatible endpoint.
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_URL = os.getenv("GOOGLE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
GOOGLE_DEFAULT_MODEL = os.getenv("GOOGLE_DEFAULT_MODEL", "gemini-2.5-pro")

XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_URL = os.getenv("XAI_URL", "https://api.x.ai/v1/chat/completions")
XAI_DEFAULT_MODEL = os.getenv("XAI_DEFAULT_MODEL", "grok-3-mini-latest")

MODEL_ONNX_PATH = Path(os.getenv("MOUSEFIT_ONNX_PATH", MODEL_DIR / "models" / "best.onnx"))
MODEL_PT_PATH = Path(os.getenv("MOUSEFIT_PT_PATH", MODEL_DIR / "models" / "best.pt"))
MODEL_TF_PATH = Path(os.getenv("MOUSEFIT_TF_PATH", MODEL_DIR / "models" / "best.pb"))
