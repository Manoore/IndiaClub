"""Shared test setup.

Buying tickets now needs a member sign-in (a free account is enough). Older tests buy as a
"visitor" to check non-member prices; for those calls we sign in as a free account, which
still pays non-member prices. Tests that send their own Authorization header are untouched,
and test_ticket_signin.py checks that a real visitor without an account is turned away.
"""
import os
import uuid

import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
API = f"{BASE_URL}/api"
_SIGNED_IN_PATHS = ("/purchase-tickets", "/register")
_token = {}


def free_account_headers() -> dict:
    if "t" not in _token:
        email = f"test-buyer-{uuid.uuid4().hex[:10]}@example.com"
        body = {"email": email, "password": "Buyer-Pass-123", "first_name": "Test", "last_name": "Buyer", "phone": "9370000000"}
        r = _original_post(f"{API}/members/register", json=body)
        assert r.status_code in (200, 201), r.text
        _token["t"] = r.json().get("token") or _original_post(f"{API}/members/login", json={"email": email, "password": body["password"]}).json()["token"]
    return {"Authorization": f"Bearer {_token['t']}"}


_original_post = requests.post


def _post(url, *args, **kwargs):
    path = str(url).split("?")[0]
    is_event_signup = "/api/events/" in path and path.endswith(_SIGNED_IN_PATHS)
    if is_event_signup and not kwargs.get("no_auto_signin"):
        headers = dict(kwargs.get("headers") or {})
        if not any(k.lower() == "authorization" for k in headers):
            headers.update(free_account_headers())
            kwargs["headers"] = headers
    kwargs.pop("no_auto_signin", None)
    return _original_post(url, *args, **kwargs)


@pytest.fixture(autouse=True, scope="session")
def _sign_in_ticket_buyers():
    requests.post = _post
    yield
    requests.post = _original_post
