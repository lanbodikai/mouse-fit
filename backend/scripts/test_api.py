import json
import os
import sys

import requests

BASE_URL = os.getenv("MOUSEFIT_API_BASE", "http://localhost:8000")


def call(path, payload=None):
    url = f"{BASE_URL}{path}"
    if payload is None:
        resp = requests.get(url, timeout=30)
    else:
        resp = requests.post(url, json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()


def main() -> int:
    print("/api/health")
    print(json.dumps(call("/api/health"), indent=2))

    print("\n/api/rag/query")
    rag_payload = {"session_id": "test", "query": "lightweight claw grip mouse", "top_k": 3}
    print(json.dumps(call("/api/rag/query", rag_payload), indent=2))

    print("\n/api/ml/predict")
    ml_payload = {"session_id": "test", "payload": {"grip": "claw", "confidence": 0.5}}
    print(json.dumps(call("/api/ml/predict", ml_payload), indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
