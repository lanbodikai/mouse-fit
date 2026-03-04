import json
import os
import sys

import requests

BASE_URL = os.getenv("MOUSEFIT_API_BASE", "http://localhost:8000")


def call(path, payload=None, expect_status=200):
    url = f"{BASE_URL}{path}"
    if payload is None:
        resp = requests.get(url, timeout=30)
    else:
        resp = requests.post(url, json=payload, timeout=60)
    if resp.status_code != expect_status:
        raise RuntimeError(f"{path} expected {expect_status}, got {resp.status_code}: {resp.text}")
    return {"status": resp.status_code, "body": resp.json()}


def main() -> int:
    print("/api/health")
    print(json.dumps(call("/api/health"), indent=2))

    print("\n/api/rag/query (deprecated)")
    rag_payload = {"session_id": "test", "query": "lightweight claw grip mouse", "top_k": 3}
    print(json.dumps(call("/api/rag/query", rag_payload, expect_status=410), indent=2))

    print("\n/api/chat")
    chat_payload = {"messages": [{"role": "user", "content": "Recommend 3 claw grip mice under $120."}]}
    print(json.dumps(call("/api/chat", chat_payload), indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
