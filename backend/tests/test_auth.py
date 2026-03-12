from __future__ import annotations

import sys
from importlib import util
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

spec = util.spec_from_file_location("mousefit_backend_auth", BACKEND_DIR / "backend" / "auth.py")
assert spec and spec.loader
auth_module = util.module_from_spec(spec)
sys.modules[spec.name] = auth_module
spec.loader.exec_module(auth_module)


class _DummyJwkClient:
    def get_signing_key_from_jwt(self, _token: str):
        return type("DummySigningKey", (), {"key": "dummy-public-key"})()


def test_verify_bearer_token_uses_es256_when_token_header_requests_it(monkeypatch):
    monkeypatch.setattr(auth_module.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(auth_module, "_jwks_client", lambda: _DummyJwkClient(), raising=True)
    monkeypatch.setattr(auth_module.jwt, "get_unverified_header", lambda _token: {"alg": "ES256"}, raising=True)

    captured: dict[str, object] = {}

    def _fake_decode(token, key, algorithms, audience, issuer, options):
        captured["token"] = token
        captured["key"] = key
        captured["algorithms"] = algorithms
        captured["audience"] = audience
        captured["issuer"] = issuer
        captured["options"] = options
        return {"sub": "user-123", "email": "user@example.com"}

    monkeypatch.setattr(auth_module.jwt, "decode", _fake_decode, raising=True)

    ctx = auth_module.verify_bearer_token("token-value")
    assert ctx.user_id == "user-123"
    assert ctx.email == "user@example.com"
    assert captured["algorithms"] == ["ES256"]


def test_verify_bearer_token_rejects_unsupported_algorithm(monkeypatch):
    monkeypatch.setattr(auth_module.config, "ENABLE_AUTH", True, raising=False)
    monkeypatch.setattr(auth_module.jwt, "get_unverified_header", lambda _token: {"alg": "HS256"}, raising=True)

    with pytest.raises(auth_module.AuthError) as exc_info:
        auth_module.verify_bearer_token("token-value")

    assert exc_info.value.code == "auth_invalid_token"
    assert "unsupported signing algorithm" in exc_info.value.message
