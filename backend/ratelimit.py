"""
Small in-memory rate limiter (no extra dependencies).

Each limit allows `max_calls` per `window` seconds per client IP. Used as a FastAPI dependency:

    @router.post("", dependencies=[Depends(limit("search", 60, 60))])

Behind a reverse proxy (Render, Railway, nginx...) set TRUST_PROXY=1 so the real client IP is
read from X-Forwarded-For; otherwise every request would look like it came from the proxy.
The counters live in this process only, which is fine for a single server.
"""
import os
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

TRUST_PROXY = os.environ.get("TRUST_PROXY", "0") == "1"

_hits: dict[tuple[str, str], deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    if TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def limit(name: str, max_calls: int, window: int):
    def dependency(request: Request) -> None:
        key = (name, _client_ip(request))
        now = time.monotonic()
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= max_calls:
            retry = int(window - (now - q[0])) + 1
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please wait a moment and try again.",
                headers={"Retry-After": str(retry)},
            )
        q.append(now)
        # keep memory bounded if many different IPs show up
        if len(_hits) > 50_000:
            _hits.clear()
    return dependency
