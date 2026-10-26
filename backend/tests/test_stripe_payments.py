"""Card payments through Stripe Checkout, end to end against a local fake Stripe.

Needs the backend started with STRIPE_API_BASE pointing at a fake Stripe that also exposes
/_fake/complete/{id}, /_fake/expire/{id}, /_fake/sessions and /_fake/refunds (FAKE_STRIPE_URL).
Skipped when that isn't available.
"""
import hashlib
import hmac
import json
import os
import time
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
FAKE = os.environ.get("FAKE_STRIPE_URL", "http://127.0.0.1:8002")
WHSEC = os.environ.get("STRIPE_WEBHOOK_SECRET_TEST", "whsec_test_local")
ET = ZoneInfo("America/New_York")

try:
    requests.get(f"{FAKE}/_fake/sessions", timeout=2).raise_for_status()
    HAVE_FAKE = True
except Exception:
    HAVE_FAKE = False
pytestmark = pytest.mark.skipif(not HAVE_FAKE, reason="fake Stripe not running")


def _et(days=0):
    return (datetime.now(ET) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M")


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "admin123"})
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _event(admin_h, **extra):
    body = {"title": "Card Test Event", "slug": f"card-test-{uuid.uuid4().hex[:8]}", "category": "Diwali", "date": "Nov 14",
            "start_date": (datetime.utcnow() + timedelta(days=30)).isoformat(), "registration_open": True,
            "price_periods": [{"id": "eb", "name": "Early Bird", "start": _et(-5), "end": _et(10)}],
            "ticket_types": [{"id": "gen", "name": "General", "price": 25, "quantity_total": 10, "quantity_sold": 0,
                              "period_prices": {"eb": {"non_member": 25, "member": 10}}}],
            "promo_codes": [{"code": "FIVE", "kind": "amount", "value": 5}], **extra}
    r = requests.post(f"{API}/admin/events", headers=admin_h, json=body)
    assert r.status_code == 200, r.text
    return r.json()


def _buy(ev, headers=None, **kw):
    body = {"buyer_name": "Card Buyer", "buyer_email": f"card_{uuid.uuid4().hex[:6]}@example.com", "payment_method": "stripe",
            "attendees": kw.pop("attendees", [{"ticket_type_id": "gen", "kind": "guest", "name": "Guest"}]), **kw}
    r = requests.post(f"{API}/events/{ev['id']}/purchase-tickets", headers=headers or {}, json=body)
    assert r.status_code == 200, r.text
    return r.json()


def _checkout(kind, ref, headers=None):
    r = requests.post(f"{API}/payments/stripe/checkout", headers=headers or {}, json={"kind": kind, "ref": ref})
    assert r.status_code == 200, r.text
    return r.json()["session_id"]


def _session(sid):
    return next(s for s in requests.get(f"{FAKE}/_fake/sessions").json() if s["id"] == sid)


def _pay(sid):
    requests.post(f"{FAKE}/_fake/complete/{sid}")


def _confirm(sid):
    r = requests.get(f"{API}/payments/stripe/confirm", params={"session_id": sid})
    assert r.status_code == 200, r.text
    return r.json()


def _signed(event: dict):
    payload = json.dumps(event).encode()
    ts = int(time.time())
    sig = hmac.new(WHSEC.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
    return payload, {"Stripe-Signature": f"t={ts},v1={sig}", "Content-Type": "application/json"}


def _webhook(etype, obj):
    payload, headers = _signed({"id": f"evt_{uuid.uuid4().hex[:12]}", "type": etype, "data": {"object": obj}})
    return requests.post(f"{API}/payments/stripe/webhook", data=payload, headers=headers)


def _member(admin_h, tier="individual"):
    reg = requests.post(f"{API}/members/register", json={"email": f"cm_{uuid.uuid4().hex[:8]}@example.com", "password": "test12345",
                                                         "first_name": "Card", "last_name": "Member", "phone": "9375550100"}).json()
    return {"Authorization": f"Bearer {reg['token']}"}, reg["member"]["id"]


class TestOrders:
    def test_card_order_paid_on_return(self, admin_h):
        ev = _event(admin_h)
        o = _buy(ev, donation={"amount": 10}, promo_code="FIVE")
        assert o["payment_status"] == "pending" and o["total"] == 30
        sid = _checkout("order", o["id"])
        s = _session(sid)
        assert s["amount_total"] == 3000 and s["metadata"] == {"kind": "order", "ref": o["id"]}
        assert any("Donation" in n for n in s["lines"]) and any("FIVE" in n for n in s["lines"])
        assert _confirm(sid)["status"] == "pending"  # not paid yet
        _pay(sid)
        out = _confirm(sid)
        assert out["status"] == "paid" and out["tickets"] == 1
        orders = requests.get(f"{API}/admin/ticket-orders", headers=admin_h, params={"event_id": ev["id"]}).json()
        paid = next(x for x in orders if x["id"] == o["id"])
        assert paid["payment_status"] == "paid" and paid["payment_method"] == "stripe"
        assert _confirm(sid)["status"] == "paid"  # repeat is harmless
        r = requests.post(f"{API}/payments/stripe/checkout", json={"kind": "order", "ref": o["id"]})
        assert r.status_code == 400 and "already been paid" in r.json()["detail"]

    def test_open_page_is_reused(self, admin_h):
        o = _buy(_event(admin_h))
        assert _checkout("order", o["id"]) == _checkout("order", o["id"])

    def test_abandoned_checkout_releases_tickets(self, admin_h):
        ev = _event(admin_h)
        o = _buy(ev, promo_code="FIVE")
        sid = _checkout("order", o["id"])
        sold = lambda: requests.get(f"{API}/events/{ev['id']}").json()["ticket_types"][0]["quantity_sold"]  # noqa: E731
        assert sold() == 1
        requests.post(f"{FAKE}/_fake/expire/{sid}")
        assert _confirm(sid)["status"] == "cancelled"
        assert sold() == 0
        assert requests.get(f"{API}/events/{ev['id']}").json()["promo_codes"][0]["used"] == 0

    def test_membership_in_order_applied_once_via_webhook(self, admin_h):
        h, mid = _member(admin_h, tier=None)
        ev = _event(admin_h)
        o = _buy(ev, h, attendees=[{"ticket_type_id": "gen", "kind": "self"}], membership={"plan": "regular", "tier": "individual"})
        sid = _checkout("order", o["id"])
        _pay(sid)
        assert _webhook("checkout.session.completed", _session(sid)).status_code == 200
        assert _confirm(sid)["status"] == "paid"
        assert _webhook("checkout.session.completed", _session(sid)).status_code == 200
        me = requests.get(f"{API}/members/me", headers=h).json()
        assert me["membership"]["status"] == "active" and me["membership"]["plan"] == "regular"
        hist = requests.get(f"{API}/admin/members/{mid}/history", headers=admin_h).json()
        assert sum(1 for x in hist if x.get("order_id") == o["id"]) == 1


class TestWebhook:
    def test_bad_signature_rejected(self):
        r = requests.post(f"{API}/payments/stripe/webhook", data=b"{}", headers={"Stripe-Signature": "t=1,v1=bad"})
        assert r.status_code == 400

    def test_old_signature_rejected(self):
        payload = b'{"id":"evt_x","type":"ping","data":{"object":{}}}'
        ts = int(time.time()) - 3600
        sig = hmac.new(WHSEC.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
        r = requests.post(f"{API}/payments/stripe/webhook", data=payload, headers={"Stripe-Signature": f"t={ts},v1={sig}"})
        assert r.status_code == 400

    def test_sponsorship_activated_by_webhook(self, admin_h):
        s = requests.post(f"{API}/sponsorships", json={"company": f"Card Co {uuid.uuid4().hex[:4]}", "contact_name": "C",
                                                       "email": "cardco@example.com", "phone": "9375550100", "plan": "bronze",
                                                       "payment_method": "stripe"}).json()
        assert s["payment_status"] == "pending"
        sid = _checkout("sponsorship", s["id"])
        assert _session(sid)["amount_total"] == 25000
        _pay(sid)
        _webhook("checkout.session.completed", _session(sid))
        rows = requests.get(f"{API}/admin/sponsorships", headers=admin_h).json()
        row = next(x for x in rows if x["id"] == s["id"])
        assert row["status"] == "active" and row["sponsor_code"].startswith("SPN-")


class TestMembershipAndDonations:
    def test_membership_card_payment_needs_the_member(self, admin_h):
        h, mid = _member(admin_h)
        r = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "individual", "payment_method": "stripe",
                                                                           "address": "1 Main", "city": "Dayton", "state": "OH", "zip": "45402", "phone": "9375550100"})
        assert r.status_code == 200, r.text
        assert requests.post(f"{API}/payments/stripe/checkout", json={"kind": "membership", "ref": mid}).status_code == 401
        sid = _checkout("membership", mid, h)
        _pay(sid)
        assert _confirm(sid)["status"] == "paid"
        mem = requests.get(f"{API}/members/me", headers=h).json()["membership"]
        assert mem["payment_status"] == "paid" and mem["payment_method"] == "stripe" and mem.get("paid_at")

    def test_upgrade_card_payment(self, admin_h):
        h, mid = _member(admin_h)
        requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "individual", "payment_method": "check",
                                                                       "address": "1 Main", "city": "Dayton", "state": "OH", "zip": "45402", "phone": "9375550100"})
        requests.post(f"{API}/admin/members/{mid}/mark-paid", headers=admin_h, params={"status": "paid"})
        m = requests.post(f"{API}/members/me/change-tier", headers=h, json={"tier": "family", "payment_method": "stripe"}).json()
        up = m["membership"]["upgrades"][-1]
        sid = _checkout("upgrade", f"{mid}:{up['id']}", h)
        _pay(sid)
        assert _confirm(sid)["status"] == "paid"
        up2 = requests.get(f"{API}/members/me", headers=h).json()["membership"]["upgrades"][-1]
        assert up2["payment_status"] == "paid"

    def test_donation_by_card_and_status_not_trusted(self, admin_h):
        r = requests.post(f"{API}/donations", json={"name": "Donor", "email": "donor@example.com", "amount": 51,
                                                    "payment_method": "stripe", "payment_status": "paid"})
        did = r.json()["id"]
        rows = requests.get(f"{API}/admin/donations", headers=admin_h).json()
        assert next(d for d in rows if d["id"] == did)["payment_status"] == "pending"
        sid = _checkout("donation", did)
        _pay(sid)
        assert _confirm(sid)["status"] == "paid"


class TestAdminTools:
    def test_check_with_stripe(self, admin_h):
        o = _buy(_event(admin_h))
        sid = _checkout("order", o["id"])
        _pay(sid)
        r = requests.post(f"{API}/admin/payments/sync", headers=admin_h, json={"kind": "order", "ref": o["id"]})
        assert r.status_code == 200 and r.json()["status"] == "paid"

    def test_refund_tickets_but_not_donation(self, admin_h):
        o = _buy(_event(admin_h), donation={"amount": 20})
        sid = _checkout("order", o["id"])
        _pay(sid)
        _confirm(sid)
        r = requests.post(f"{API}/admin/payments/refund", headers=admin_h,
                          json={"kind": "order", "ref": o["id"], "part": "tickets", "reason": "Can't attend"})
        assert r.status_code == 200, r.text
        assert r.json() == {"refunded": 25.0, "remaining": 20.0}
        assert requests.get(f"{FAKE}/_fake/refunds").json()[-1]["amount"] == 2500
        orders = requests.get(f"{API}/admin/ticket-orders", headers=admin_h).json()
        assert next(x for x in orders if x["id"] == o["id"])["payment_status"] == "paid"
        dons = [d for d in requests.get(f"{API}/admin/donations", headers=admin_h).json() if d.get("order_id") == o["id"]]
        assert dons[0]["payment_status"] == "paid"
        r = requests.post(f"{API}/admin/payments/refund", headers=admin_h,
                          json={"kind": "order", "ref": o["id"], "part": "full", "reason": "Donation back too"})
        assert r.json()["remaining"] == 0
        orders = requests.get(f"{API}/admin/ticket-orders", headers=admin_h).json()
        assert next(x for x in orders if x["id"] == o["id"])["payment_status"] == "refunded"
        r = requests.post(f"{API}/admin/payments/refund", headers=admin_h,
                          json={"kind": "order", "ref": o["id"], "part": "full", "reason": "again"})
        assert r.status_code == 400
