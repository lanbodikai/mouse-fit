from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, Optional

import jwt
from jwt import InvalidTokenError, PyJWKClient

from backend import config


class AuthError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 401):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass
class AuthContext:
    user_id: str
    claims: Dict[str, Any]

    @property
    def email(self) -> Optional[str]:
        value = self.claims.get("email")
        if isinstance(value, str) and value.strip():
            return value.strip()
        return None


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    if not config.SUPABASE_JWKS_URL:
        raise AuthError(
            "auth_not_configured",
            "SUPABASE_JWKS_URL (or SUPABASE_URL) is required when ENABLE_AUTH is enabled.",
            status_code=500,
        )
    return PyJWKClient(config.SUPABASE_JWKS_URL)


def parse_bearer_token(header_value: str | None) -> Optional[str]:
    if not header_value:
        return None
    parts = header_value.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1].strip()
    return token or None


def verify_bearer_token(token: str) -> AuthContext:
    if not config.ENABLE_AUTH:
        raise AuthError("auth_disabled", "Authentication is disabled on this server.", status_code=403)

    if not token:
        raise AuthError("auth_missing_token", "Missing bearer token.", status_code=401)

    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        options = {"verify_aud": bool(config.SUPABASE_JWT_AUDIENCE)}
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=config.SUPABASE_JWT_AUDIENCE if config.SUPABASE_JWT_AUDIENCE else None,
            issuer=config.SUPABASE_JWT_ISSUER if config.SUPABASE_JWT_ISSUER else None,
            options=options,
        )
    except InvalidTokenError as exc:
        raise AuthError("auth_invalid_token", f"Invalid token: {exc}", status_code=401) from exc
    except Exception as exc:
        raise AuthError("auth_verification_failed", f"Token verification failed: {exc}", status_code=401) from exc

    user_id = claims.get("sub")
    if not isinstance(user_id, str) or not user_id.strip():
        raise AuthError("auth_invalid_claims", "Token is missing a valid subject (sub).", status_code=401)

    return AuthContext(user_id=user_id.strip(), claims=claims)
