import os
from fastapi import Header, Query, HTTPException
from jose import jwt, JWTError

JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
ALGORITHM  = "HS256"


def _decode(token: str) -> str | None:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM], audience="authenticated")
        return payload.get("sub")
    except JWTError:
        return None


def get_user_id(authorization: str = Header(None)) -> str:
    """Strict auth — raises 401 if token is missing or invalid."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    user_id = _decode(authorization.removeprefix("Bearer "))
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


def get_user_id_optional(authorization: str = Header(None)) -> str | None:
    """Optional auth — returns None instead of raising if no token is present."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return _decode(authorization.removeprefix("Bearer "))


def get_user_id_from_token_param(token: str = Query(None)) -> str:
    """For SSE endpoints — EventSource can't set headers, so token arrives as a query param."""
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    user_id = _decode(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id
