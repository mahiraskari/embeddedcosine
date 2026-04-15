import os
import re
import time
import requests
from fastapi import Header, Query, HTTPException
from jose import jwt, JWTError

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
JWKS_URL     = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Supabase signs JWTs with ES256 — never accept anything else.
# Reading alg from the token header is an algorithm-confusion vulnerability.
ALLOWED_ALGORITHMS = ["ES256"]

# Cache the public keys with a TTL so key rotations are picked up.
_jwks_cache: list = []
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600  # refresh at most once per hour

# Supabase user IDs are UUIDs — reject anything that doesn't match
_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def _get_jwks() -> list:
    global _jwks_cache, _jwks_fetched_at
    if time.time() - _jwks_fetched_at < _JWKS_TTL and _jwks_cache:
        return _jwks_cache
    try:
        resp = requests.get(JWKS_URL, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json().get("keys", [])
        _jwks_fetched_at = time.time()
    except Exception as e:
        print(f"[auth] Failed to fetch JWKS: {e}")
        if not _jwks_cache:
            _jwks_cache = []
    return _jwks_cache


def _decode(token: str) -> str | None:
    try:
        header = jwt.get_unverified_header(token)
        kid    = header.get("kid")

        keys = _get_jwks()
        key = next((k for k in keys if k.get("kid") == kid), None)
        if not key:
            print(f"[auth] No key found for kid={kid}")
            return None

        # Hardcode allowed algorithms — never trust the token's own alg claim
        payload = jwt.decode(token, key, algorithms=ALLOWED_ALGORITHMS, audience="authenticated")
        user_id = payload.get("sub")
        if not user_id or not _UUID_RE.match(user_id):
            print("[auth] Invalid sub claim")
            return None
        return user_id
    except JWTError as e:
        print(f"[auth] JWTError: {e}")
        return None
    except Exception as e:
        print(f"[auth] Unexpected error: {e}")
        return None


def get_user_id(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    user_id = _decode(authorization.removeprefix("Bearer "))
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


def get_user_id_optional(authorization: str = Header(None)) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return _decode(authorization.removeprefix("Bearer "))


def get_user_id_from_token_param(token: str = Query(None)) -> str:
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    user_id = _decode(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id
