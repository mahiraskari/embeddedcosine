import os
import requests
from fastapi import Header, Query, HTTPException
from jose import jwt, JWTError

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
JWKS_URL     = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# Cache the public keys so we don't fetch them on every request
_jwks_cache = None


def _get_jwks() -> list:
    global _jwks_cache
    if _jwks_cache is None:
        try:
            resp = requests.get(JWKS_URL, timeout=5)
            _jwks_cache = resp.json().get("keys", [])
        except Exception as e:
            print(f"[auth] Failed to fetch JWKS: {e}")
            _jwks_cache = []
    return _jwks_cache


def _decode(token: str) -> str | None:
    try:
        header = jwt.get_unverified_header(token)
        kid    = header.get("kid")
        alg    = header.get("alg", "ES256")

        keys = _get_jwks()
        # Prefer the key matching the token's kid, fall back to first key
        key = next((k for k in keys if k.get("kid") == kid), keys[0] if keys else None)
        if not key:
            print("[auth] No public key available")
            return None

        payload = jwt.decode(token, key, algorithms=[alg], audience="authenticated")
        return payload.get("sub")
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
