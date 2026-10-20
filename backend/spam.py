"""Lightweight spam protection for public forms: a honeypot field plus per-IP rate limiting."""
import os
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

HONEYPOT_FIELD = "website_hp"  # hidden input real visitors never fill in
WINDOW_SECONDS = 600
MAX_SUBMISSIONS = int(os.environ.get("SPAM_MAX_PER_WINDOW", "30"))  # per IP, per form, per window

_hits = defaultdict(deque)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def spam_guard(request: Request):
    """Route dependency for public POST forms."""
    if request.headers.get("content-type", "").startswith("application/json"):
        try:
            body = await request.json()
        except Exception:
            body = None
        if isinstance(body, dict) and str(body.get(HONEYPOT_FIELD) or "").strip():
            raise HTTPException(400, "Submission rejected")
    key = (_client_ip(request), request.url.path)
    now = time.monotonic()
    q = _hits[key]
    while q and now - q[0] > WINDOW_SECONDS:
        q.popleft()
    if len(q) >= MAX_SUBMISSIONS:
        raise HTTPException(429, "Too many submissions — please try again in a few minutes")
    q.append(now)


def reset():
    _hits.clear()
