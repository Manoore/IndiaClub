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
    # Render's proxy appends the real client IP; earlier entries can be forged by the caller
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[-1].strip()
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


# ===================== Sign-in throttling =====================
LOGIN_WINDOW_SECONDS = 900
LOGIN_MAX_FAILS = int(os.environ.get("LOGIN_MAX_FAILS", "10"))  # per IP + account
LOGIN_MAX_FAILS_PER_IP = int(os.environ.get("LOGIN_MAX_FAILS_PER_IP", "50"))

_login_fails = defaultdict(deque)


def _login_keys(request: Request, account: str):
    ip = _client_ip(request)
    return [(("acct", ip, (account or "").strip().lower()), LOGIN_MAX_FAILS), (("ip", ip), LOGIN_MAX_FAILS_PER_IP)]


def check_login_allowed(request: Request, account: str):
    now = time.monotonic()
    for key, limit in _login_keys(request, account):
        q = _login_fails[key]
        while q and now - q[0] > LOGIN_WINDOW_SECONDS:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(429, "Too many failed sign-in attempts. Please wait 15 minutes and try again.")


def record_login_failure(request: Request, account: str):
    now = time.monotonic()
    for key, _ in _login_keys(request, account):
        _login_fails[key].append(now)


def clear_login_failures(request: Request, account: str):
    _login_fails.pop(_login_keys(request, account)[0][0], None)
