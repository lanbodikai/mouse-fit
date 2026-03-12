from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from importlib import util
from pathlib import Path

os.environ.setdefault("MOUSEFIT_SKIP_STARTUP", "1")

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
spec = util.spec_from_file_location("mousefit_api_main", BACKEND_DIR / "main.py")
assert spec and spec.loader
api_main = util.module_from_spec(spec)
sys.modules[spec.name] = api_main
spec.loader.exec_module(api_main)
from backend.auth import AuthError


class _DummyConn:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        raise AssertionError("cursor() should not be called in this test path")


class _LatestCursor:
    def __init__(self) -> None:
        self._row = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params):
        if "user_id = %s" in query:
            # Simulate no user-specific row.
            self._row = None
            return
        # Fallback guest row.
        self._row = {
            "session_id": params[0],
            "user_id": None,
            "length_mm": 190.0,
            "width_mm": 95.0,
            "length_cm": 19.0,
            "width_cm": 9.5,
            "created_at": datetime.now(timezone.utc),
        }

    def fetchone(self):
        return self._row


class _LatestConn:
    def cursor(self):
        return _LatestCursor()


class _ProfileCursor:
    def __init__(self, conn: "_ProfileConn") -> None:
        self._conn = conn
        self._row = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params):
        if "INSERT INTO profiles" in query:
            user_id, email, display_name, metadata_json, update_display_name = params
            profile = self._conn.profile
            profile["id"] = user_id
            if email is not None:
                profile["email"] = email
            if update_display_name:
                profile["display_name"] = display_name
            if metadata_json:
                patch = json.loads(metadata_json)
                metadata = dict(profile.get("metadata") or {})
                metadata.update(patch)
                profile["metadata"] = metadata
            profile["updated_at"] = datetime.now(timezone.utc)
            self._row = None
            return

        if "SELECT id, email, display_name, metadata, created_at, updated_at" in query:
            self._row = dict(self._conn.profile)
            return

        raise AssertionError(f"Unexpected query in test double: {query}")

    def fetchone(self):
        return self._row


class _ProfileConn:
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self.profile = {
            "id": "user-1",
            "email": "user@example.com",
            "display_name": "MouseFit User",
            "metadata": {"theme": "dark"},
            "created_at": now,
            "updated_at": now,
        }

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def cursor(self):
        return _ProfileCursor(self)

    def commit(self):
        return None


def test_health_has_request_id_header_and_body():
    client = TestClient(api_main.app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert "request_id" in data
    assert response.headers.get("x-request-id")


def test_deprecated_agent_chat_returns_410():
    client = TestClient(api_main.app)
    response = client.post("/api/agent/chat", json={"hello": "world"})
    assert response.status_code == 410
    data = response.json()
    assert data["code"] == "endpoint_deprecated"
    assert "Use /api/chat" in data["message"]


def test_deprecated_rag_routes_return_410_envelope():
    client = TestClient(api_main.app)
    cases = [
        ("/api/rag/query", {"session_id": "test-session", "query": "claw grip"}),
        ("/api/candidates", {"profile": {"grip": "claw"}, "k": 20}),
        ("/api/rerank", {"profile": {"grip": "claw"}, "candidates": []}),
        ("/api/report", {"profile": {"grip": "claw"}, "candidates": []}),
    ]
    for path, payload in cases:
        response = client.post(path, json=payload)
        assert response.status_code == 410
        data = response.json()
        assert data["code"] == "endpoint_deprecated"
        assert "survey matcher + /api/chat rerank" in data["message"]
        assert data["request_id"]


def test_chat_invalid_request_uses_error_envelope():
    client = TestClient(api_main.app)
    response = client.post("/api/chat", json={})
    assert response.status_code == 400
    data = response.json()
    assert data["code"] == "invalid_request"
    assert "messages[] is required" in data["message"]
    assert data["request_id"]


def test_invalid_token_does_not_break_public_routes(monkeypatch):
    def _always_fail(_: str):
        raise AuthError("auth_invalid_token", "Invalid token", status_code=401)

    monkeypatch.setattr(api_main.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(api_main, "verify_bearer_token", _always_fail, raising=True)

    client = TestClient(api_main.app)
    response = client.get("/api/health", headers={"Authorization": "Bearer bad-token"})
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["request_id"]


def test_invalid_token_still_fails_protected_routes(monkeypatch):
    def _always_fail(_: str):
        raise AuthError("auth_invalid_token", "Invalid token", status_code=401)

    monkeypatch.setattr(api_main.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(api_main, "verify_bearer_token", _always_fail, raising=True)

    client = TestClient(api_main.app)
    response = client.get("/api/profile/me", headers={"Authorization": "Bearer bad-token"})
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == "auth_invalid_token"
    assert data["request_id"]


def test_report_generate_no_measurement_returns_not_found_envelope(monkeypatch):
    monkeypatch.setattr(api_main, "get_conn", lambda: _DummyConn(), raising=True)
    monkeypatch.setattr(api_main, "latest_measurement", lambda *_: None, raising=True)

    client = TestClient(api_main.app)
    response = client.post("/api/report/generate", params={"session_id": "s1"})
    assert response.status_code == 404
    data = response.json()
    assert data["code"] == "not_found"


def test_latest_measurement_falls_back_to_guest_row():
    row = api_main.latest_measurement(_LatestConn(), "session-1", "user-1")
    assert row is not None
    assert row.session_id == "session-1"
    assert row.user_id is None


def test_profile_me_requires_auth():
    client = TestClient(api_main.app)
    response = client.get("/api/profile/me")
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == "auth_required"
    assert data["request_id"]


def test_profile_me_upserts_and_returns_profile(monkeypatch):
    from backend.auth import AuthContext

    monkeypatch.setattr(api_main.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(
        api_main,
        "verify_bearer_token",
        lambda _token: AuthContext(user_id="user-1", claims={"email": "user@example.com"}),
        raising=True,
    )
    monkeypatch.setattr(api_main, "get_conn", lambda: _ProfileConn(), raising=True)

    client = TestClient(api_main.app)
    response = client.get("/api/profile/me", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user-1"
    assert data["email"] == "user@example.com"
    assert data["theme"] == "dark"
    assert data["request_id"]


def test_me_returns_survey_status(monkeypatch):
    from backend.auth import AuthContext

    monkeypatch.setattr(api_main.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(
        api_main,
        "verify_bearer_token",
        lambda _token: AuthContext(user_id="user-1", claims={"email": "user@example.com"}),
        raising=True,
    )
    conn = _ProfileConn()
    conn.profile["metadata"] = {
        "theme": "dark",
        "has_completed_survey": True,
        "survey_dismissed_until": "2026-03-06T12:00:00+00:00",
    }
    monkeypatch.setattr(api_main, "get_conn", lambda: conn, raising=True)

    client = TestClient(api_main.app)
    response = client.get("/api/me", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user-1"
    assert data["hasCompletedSurvey"] is True
    assert data["surveyDismissedUntil"] == "2026-03-06T12:00:00+00:00"
    assert data["theme"] == "dark"


def test_complete_survey_sets_completion_flag(monkeypatch):
    from backend.auth import AuthContext

    monkeypatch.setattr(api_main.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(
        api_main,
        "verify_bearer_token",
        lambda _token: AuthContext(user_id="user-1", claims={"email": "user@example.com"}),
        raising=True,
    )
    conn = _ProfileConn()
    monkeypatch.setattr(api_main, "get_conn", lambda: conn, raising=True)

    client = TestClient(api_main.app)
    response = client.post("/api/survey/complete", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    data = response.json()
    assert data["hasCompletedSurvey"] is True
    assert data["surveyDismissedUntil"] is None
    assert conn.profile["metadata"]["has_completed_survey"] is True
    assert conn.profile["metadata"]["survey_dismissed_until"] is None


def test_dismiss_survey_sets_24h_snooze(monkeypatch):
    from backend.auth import AuthContext

    monkeypatch.setattr(api_main.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(
        api_main,
        "verify_bearer_token",
        lambda _token: AuthContext(user_id="user-1", claims={"email": "user@example.com"}),
        raising=True,
    )
    conn = _ProfileConn()
    monkeypatch.setattr(api_main, "get_conn", lambda: conn, raising=True)

    client = TestClient(api_main.app)
    response = client.post("/api/survey/dismiss", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    data = response.json()
    assert data["hasCompletedSurvey"] is False
    assert isinstance(data["surveyDismissedUntil"], str)
    assert conn.profile["metadata"]["survey_dismissed_until"] == data["surveyDismissedUntil"]


def test_profile_me_update_saves_display_name_and_theme(monkeypatch):
    from backend.auth import AuthContext

    monkeypatch.setattr(api_main.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(
        api_main,
        "verify_bearer_token",
        lambda _token: AuthContext(user_id="user-1", claims={"email": "user@example.com"}),
        raising=True,
    )
    monkeypatch.setattr(api_main, "get_conn", lambda: _ProfileConn(), raising=True)

    client = TestClient(api_main.app)
    response = client.post(
        "/api/profile/me",
        headers={"Authorization": "Bearer valid-token"},
        json={"display_name": "Lanbo", "theme": "light"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Lanbo"
    assert data["theme"] == "light"


def test_profile_me_update_invalid_theme_uses_validation_envelope(monkeypatch):
    from backend.auth import AuthContext

    monkeypatch.setattr(api_main.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(
        api_main,
        "verify_bearer_token",
        lambda _token: AuthContext(user_id="user-1", claims={"email": "user@example.com"}),
        raising=True,
    )

    client = TestClient(api_main.app)
    response = client.post(
        "/api/profile/me",
        headers={"Authorization": "Bearer valid-token"},
        json={"theme": "sepia"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "validation_error"
    assert data["request_id"]
