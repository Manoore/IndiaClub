"""Card payments through Stripe Checkout (the Stripe-hosted payment page).

Anything the site sells can be paid by card: ticket orders (with any membership, donation and fee
contribution in them), memberships and renewals, membership upgrades, sponsorships and donations.

How a payment is confirmed (any one of these is enough, and each is safe to repeat):
1. The buyer returns from Stripe and the site asks Stripe whether the session was paid.
2. Stripe's webhook reports checkout.session.completed (signed with STRIPE_WEBHOOK_SECRET).
3. A background check every 15 minutes, or an admin's "Check with Stripe", asks Stripe directly.

Card numbers never reach this server. Configuration: STRIPE_SECRET_KEY (required),
STRIPE_WEBHOOK_SECRET (recommended), SITE_URL (fallback return address).
"""
import asyncio
import hashlib
import hmac
import json
import logging
import os
import re
import time
from datetime import datetime, timedelta
from typing import Optional

import requests
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from admin_access import admin_guard
from audit import audit
from auth import decode_token
from checkout import apply_order_payment
from database import db
from membership_service import apply_payment_status, log_history
from sponsorships import apply_sponsorship_payment

log = logging.getLogger("payments")

STRIPE_API = os.environ.get("STRIPE_API_BASE", "https://api.stripe.com/v1")  # overridable for local tests
KINDS = ("order", "membership", "upgrade", "sponsorship", "donation")
OPEN_STATUSES = ("pending", "awaiting_check", "failed", None, "")
SESSION_MINUTES = 60  # an unpaid checkout page expires after this; held tickets are then released
DEFAULT_SITE = "https://india-club-self.vercel.app"
# Return addresses Stripe may send buyers back to (same sites the API accepts requests from)
SITE_PATTERN = re.compile(r"^(https://india-club-self(-[a-z0-9-]+)?\.vercel\.app|https://(www\.)?indiaclubdayton\.org"
                          r"|http://(localhost|127\.0\.0\.1)(:\d+)?)$")

public_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])


# ===================== Stripe API =====================
def configured() -> bool:
    return bool(os.environ.get("STRIPE_SECRET_KEY"))


def _form(data, prefix: str = "") -> list:
    """Stripe takes form encoding with nested keys: line_items[0][price_data][currency]=usd."""
    out = []
    if isinstance(data, dict):
        for k, v in data.items():
            out += _form(v, f"{prefix}[{k}]" if prefix else str(k))
    elif isinstance(data, (list, tuple)):
        for i, v in enumerate(data):
            out += _form(v, f"{prefix}[{i}]")
    elif data is not None:
        out.append((prefix, "true" if data is True else "false" if data is False else str(data)))
    return out


def _call(method: str, path: str, data: Optional[dict] = None, params: Optional[list] = None,
          idempotency_key: Optional[str] = None) -> dict:
    key = os.environ.get("STRIPE_SECRET_KEY")
    if not key:
        raise HTTPException(503, "Card payments aren't set up yet. Please choose another payment method.")
    headers = {"Idempotency-Key": idempotency_key} if idempotency_key else {}
    try:
        r = requests.request(method, f"{STRIPE_API}{path}", auth=(key, ""), data=_form(data or {}) or None,
                             params=params, headers=headers, timeout=25)
    except requests.RequestException as e:
        log.error(f"[stripe] {method} {path} failed: {e}")
        raise HTTPException(502, "Couldn't reach the card payment service. Please try again.")
    body = r.json() if r.content else {}
    if r.status_code >= 400:
        msg = (body.get("error") or {}).get("message") or f"HTTP {r.status_code}"
        log.error(f"[stripe] {method} {path} → {r.status_code}: {msg}")
        raise HTTPException(502, f"Card payment service error: {msg}")
    return body


async def stripe(method: str, path: str, **kw) -> dict:
    return await asyncio.to_thread(_call, method, path, **kw)


def _cents(amount) -> int:
    return int(round(float(amount or 0) * 100))


# ===================== What is being paid for =====================
async def _membership_fee(mem: dict) -> float:
    plan = await db.membership_plans.find_one({"slug": mem.get("plan")}) or {}
    for t in plan.get("tiers") or []:
        if t.get("slug") == mem.get("tier"):
            return float(t.get("price") or 0)
    return float(plan.get("price") or 0)


async def load_payable(kind: str, ref: str) -> dict:
    """Everything needed to charge for (and later find) one payable thing.
    Returns {kind, ref, doc, amount, status, email, name, lines, label, stripe}."""
    if kind not in KINDS:
        raise HTTPException(400, "Unknown payment type")
    if kind == "order":
        o = await db.ticket_orders.find_one({"id": ref})
        if not o:
            raise HTTPException(404, "Order not found")
        lines = []
        tickets = _money(float(o.get("subtotal") or 0) - float(o.get("discount") or 0))
        n = len(o.get("tickets") or []) or sum(int(i.get("quantity") or 0) for i in o.get("items") or [])
        if tickets > 0:
            disc = f" (after {o.get('promo_code')} discount)" if float(o.get("discount") or 0) > 0 else ""
            lines.append((f"{n} ticket{'s' if n != 1 else ''} — {o.get('event_title', 'Event')}{disc}", tickets))
        mp = o.get("membership_purchase")
        if mp and float(mp.get("price") or 0) > 0:
            lines.append((f"{mp.get('name', 'Membership')} ({'renewal' if mp.get('kind') == 'renewal' else 'new'})", float(mp["price"])))
        if o.get("donation") and float(o["donation"].get("amount") or 0) > 0:
            lines.append(("Donation to India Club of Greater Dayton", float(o["donation"]["amount"])))
        if float(o.get("fee_contribution") or 0) > 0:
            lines.append(("Card processing cost contribution", float(o["fee_contribution"])))
        return {"kind": kind, "ref": ref, "doc": o, "amount": _money(o.get("total")), "status": o.get("payment_status"),
                "email": o.get("buyer_email"), "name": o.get("buyer_name"), "lines": lines,
                "label": o.get("event_title", "Event tickets"), "stripe": o.get("stripe") or {}}
    if kind in ("membership", "upgrade"):
        mid, _, uid = ref.partition(":")
        m = await db.members.find_one({"id": mid})
        if not m:
            raise HTTPException(404, "Member not found")
        mem = m.get("membership") or {}
        name = f"{m.get('first_name', '')} {m.get('last_name', '')}".strip()
        if kind == "membership":
            if mem.get("lifetime") or mem.get("plan") in (None, "", "free"):
                raise HTTPException(400, "There's nothing to pay for this membership")
            fee = await _membership_fee(mem)
            donation = float(mem.get("donation_amount") or 0)
            label = f"{(mem.get('tier') or mem.get('plan') or '').title()} membership"
            lines = [(f"India Club {label}", fee)] + ([("Donation to India Club of Greater Dayton", donation)] if donation > 0 else [])
            status = mem.get("payment_status") or ("paid" if mem.get("payment_received") else "pending")
            return {"kind": kind, "ref": mid, "doc": m, "amount": _money(fee + donation), "status": status,
                    "email": m.get("email"), "name": name, "lines": lines, "label": label, "stripe": mem.get("stripe") or {}}
        up = next((u for u in mem.get("upgrades") or [] if u.get("id") == uid), None)
        if not up:
            raise HTTPException(404, "Upgrade not found")
        label = f"Membership upgrade: {(up.get('from_tier') or '').title()} to {(up.get('to_tier') or '').title()}"
        return {"kind": kind, "ref": ref, "doc": m, "upgrade": up, "amount": _money(up.get("amount")),
                "status": up.get("payment_status"), "email": m.get("email"), "name": name,
                "lines": [(label, float(up.get("amount") or 0))], "label": label, "stripe": up.get("stripe") or {}}
    if kind == "sponsorship":
        s = await db.sponsorships.find_one({"id": ref})
        if not s:
            raise HTTPException(404, "Sponsorship not found")
        label = f"{s.get('tier', '')} sponsorship — {s.get('company', '')}"
        return {"kind": kind, "ref": ref, "doc": s, "amount": _money(s.get("amount")), "status": s.get("payment_status"),
                "email": s.get("email"), "name": s.get("contact_name"), "lines": [(label, float(s.get("amount") or 0))],
                "label": label, "stripe": s.get("stripe") or {}}
    d = await db.donations.find_one({"id": ref})
    if not d or d.get("order_id"):
        raise HTTPException(404, "Donation not found")
    return {"kind": kind, "ref": ref, "doc": d, "amount": _money(d.get("amount")), "status": d.get("payment_status"),
            "email": d.get("email"), "name": d.get("name"), "lines": [("Donation to India Club of Greater Dayton", float(d.get("amount") or 0))],
            "label": "Donation", "stripe": d.get("stripe") or {}}


def _money(x) -> float:
    return round(float(x or 0) + 1e-9, 2)


async def _save_stripe(p: dict, info: dict):
    """Remember the Stripe session/payment on the record it pays for."""
    kind, ref = p["kind"], p["ref"]
    if kind == "order":
        await db.ticket_orders.update_one({"id": ref}, {"$set": {"stripe": info}})
    elif kind == "membership":
        await db.members.update_one({"id": ref}, {"$set": {"membership.stripe": info}})
    elif kind == "upgrade":
        mid, _, uid = ref.partition(":")
        m = await db.members.find_one({"id": mid})
        ups = ((m or {}).get("membership") or {}).get("upgrades") or []
        for u in ups:
            if u.get("id") == uid:
                u["stripe"] = info
        await db.members.update_one({"id": mid}, {"$set": {"membership.upgrades": ups}})
    elif kind == "sponsorship":
        await db.sponsorships.update_one({"id": ref}, {"$set": {"stripe": info}})
    else:
        await db.donations.update_one({"id": ref}, {"$set": {"stripe": info}})


# ===================== Applying a payment result =====================
async def apply_result(kind: str, ref: str, status: str, actor: str = "stripe") -> None:
    """Set the payment status from Stripe. Paid unlocks the purchase exactly once."""
    p = await load_payable(kind, ref)
    if p["status"] == status:
        return
    if kind == "order":
        o = p["doc"]
        await db.ticket_orders.update_one({"id": ref}, {"$set": {"payment_method": "stripe"}})
        await apply_order_payment(o, status, actor)
        if status == "cancelled":
            await release_order(o)
    elif kind == "membership":
        await db.members.update_one({"id": ref}, {"$set": {"membership.payment_method": "stripe"}})
        await apply_payment_status(p["doc"], status, actor)
    elif kind == "upgrade":
        mid, _, uid = ref.partition(":")
        m = p["doc"]
        ups = (m.get("membership") or {}).get("upgrades") or []
        for u in ups:
            if u.get("id") == uid:
                u.update(payment_status=status, payment_method="stripe")
                if status == "paid":
                    u["paid_at"] = datetime.utcnow()
        await db.members.update_one({"id": mid}, {"$set": {"membership.upgrades": ups, "updated_at": datetime.utcnow()}})
        await log_history(mid, "upgrade_payment", actor, payment_status=status, previous_payment_status=p["status"],
                          from_tier=p["upgrade"].get("from_tier"), to_tier=p["upgrade"].get("to_tier"), amount=p["amount"])
    elif kind == "sponsorship":
        await db.sponsorships.update_one({"id": ref}, {"$set": {"payment_method": "stripe"}})
        await apply_sponsorship_payment(p["doc"], status, actor)
    else:
        await db.donations.update_one({"id": ref}, {"$set": {"payment_status": status, "payment_method": "stripe"}})


async def release_order(o: dict):
    """An abandoned card checkout gives its tickets back."""
    event = await db.events.find_one({"id": o["event_id"]})
    if not event:
        return
    types = []
    for t in event.get("ticket_types") or []:
        n = sum(i["quantity"] for i in o.get("items") or [] if i["ticket_type_id"] == t["id"])
        types.append({**t, "quantity_sold": max(0, int(t.get("quantity_sold") or 0) - n)})
    update = {"ticket_types": types}
    if o.get("promo_code"):
        update["promo_codes"] = [{**pc, "used": max(0, int(pc.get("used") or 0) - 1)}
                                 if (pc.get("code") or "").strip().upper() == o["promo_code"] else pc
                                 for pc in event.get("promo_codes") or []]
    await db.events.update_one({"id": event["id"]}, {"$set": update})


async def sync_session(kind: str, ref: str, session: dict, actor: str = "stripe") -> str:
    """Apply what a Stripe Checkout Session says. Returns the record's payment status afterwards."""
    meta = session.get("metadata") or {}
    if meta.get("kind") != kind or meta.get("ref") != ref:
        raise HTTPException(400, "This payment doesn't belong to that purchase")
    p = await load_payable(kind, ref)
    info = {**p["stripe"], "session_id": session.get("id"), "session_status": session.get("status"),
            "payment_status": session.get("payment_status"), "amount_cents": session.get("amount_total"),
            "payment_intent": session.get("payment_intent") if isinstance(session.get("payment_intent"), str)
            else (session.get("payment_intent") or {}).get("id"), "checked_at": datetime.utcnow()}
    await _save_stripe(p, info)
    if session.get("payment_status") in ("paid", "no_payment_required") and session.get("status") == "complete":
        if session.get("amount_total") is not None and int(session["amount_total"]) != _cents(p["amount"]):
            log.error(f"[stripe] amount mismatch for {kind}:{ref}: paid {session['amount_total']} expected {_cents(p['amount'])}")
            await audit("stripe", kind, ref, "payment_amount_mismatch",
                        note=f"Paid {session['amount_total'] / 100:.2f}, expected {p['amount']:.2f}. Check in Stripe.")
        await apply_result(kind, ref, "paid", actor)
        return "paid"
    if session.get("status") == "expired" and p["status"] in OPEN_STATUSES:
        if kind == "order" and p["status"] in ("pending", None, ""):
            await apply_result(kind, ref, "cancelled", actor)
            return "cancelled"
    return p["status"] or "pending"


def _site(origin: Optional[str]) -> str:
    if origin and SITE_PATTERN.match(origin.rstrip("/")):
        return origin.rstrip("/")
    return (os.environ.get("SITE_URL") or DEFAULT_SITE).rstrip("/")


# ===================== Public endpoints =====================
class CheckoutStart(BaseModel):
    kind: str
    ref: str


@public_router.get("/payments/config")
async def payments_config():
    return {"card": configured()}


@public_router.post("/payments/stripe/checkout")
async def start_checkout(body: CheckoutStart, request: Request, authorization: Optional[str] = Header(None)):
    """Create a Stripe-hosted payment page for something the buyer already reserved."""
    if body.kind in ("membership", "upgrade"):
        mid = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member") \
            if authorization and authorization.startswith("Bearer ") else None
        if not mid or body.ref.partition(":")[0] != mid:
            raise HTTPException(401, "Sign in to pay for your membership")
    p = await load_payable(body.kind, body.ref)
    if p["status"] == "paid":
        raise HTTPException(400, "This has already been paid")
    if p["status"] in ("refunded", "cancelled"):
        raise HTTPException(400, "This purchase was cancelled. Please start a new one.")
    if p["amount"] <= 0:
        raise HTTPException(400, "There's nothing to pay")
    # Reuse a still-open payment page instead of creating a second one
    prev = p["stripe"]
    if prev.get("session_id") and prev.get("url") and prev.get("expires_at", 0) > time.time() + 60:
        return {"url": prev["url"], "session_id": prev["session_id"]}
    site = _site(request.headers.get("origin"))
    expires = int(time.time()) + SESSION_MINUTES * 60
    params = {
        "mode": "payment",
        "client_reference_id": f"{p['kind']}:{p['ref']}",
        "customer_email": p["email"] or None,
        "line_items": [{"quantity": 1, "price_data": {"currency": "usd", "unit_amount": _cents(amt),
                                                      "product_data": {"name": name[:250]}}}
                       for name, amt in p["lines"] if _cents(amt) > 0],
        "metadata": {"kind": p["kind"], "ref": p["ref"]},
        "payment_intent_data": {"metadata": {"kind": p["kind"], "ref": p["ref"]},
                                "description": f"India Club of Greater Dayton — {p['label']}"[:1000]},
        "submit_type": "donate" if p["kind"] == "donation" else "pay",
        "expires_at": expires,
        "success_url": f"{site}/payment/return?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{site}/payment/return?cancelled=1&kind={p['kind']}&ref={p['ref']}",
    }
    if sum(_cents(a) for _, a in p["lines"]) != _cents(p["amount"]):
        # Lines must add up exactly; fall back to one line for the total
        params["line_items"] = [{"quantity": 1, "price_data": {"currency": "usd", "unit_amount": _cents(p["amount"]),
                                                               "product_data": {"name": p["label"][:250]}}}]
    session = await stripe("POST", "/checkout/sessions", data=params,
                           idempotency_key=f"checkout-{p['kind']}-{p['ref']}-{expires // 300}")
    await _save_stripe(p, {"session_id": session["id"], "url": session.get("url"), "expires_at": expires,
                           "amount_cents": _cents(p["amount"]), "created_at": datetime.utcnow(), "session_status": "open"})
    if p["kind"] == "order" and p["status"] == "awaiting_check":
        await db.ticket_orders.update_one({"id": p["ref"]}, {"$set": {"payment_status": "pending"}})
    return {"url": session.get("url"), "session_id": session["id"]}


@public_router.get("/payments/stripe/confirm")
async def confirm_checkout(session_id: str):
    """Called when the buyer returns from Stripe: ask Stripe what happened and apply it."""
    if not re.fullmatch(r"cs_[A-Za-z0-9_]+", session_id or ""):
        raise HTTPException(400, "Invalid payment reference")
    session = await stripe("GET", f"/checkout/sessions/{session_id}")
    meta = session.get("metadata") or {}
    kind, ref = meta.get("kind"), meta.get("ref")
    if kind not in KINDS or not ref:
        raise HTTPException(400, "This payment isn't from the India Club website")
    status = await sync_session(kind, ref, session, actor="stripe")
    out = {"kind": kind, "ref": ref, "status": status, "amount": (session.get("amount_total") or 0) / 100}
    if kind == "order":
        o = await db.ticket_orders.find_one({"id": ref})
        out.update(order_id=ref, buyer_email=o.get("buyer_email"), event_title=o.get("event_title"),
                   tickets=len(o.get("tickets") or []))
    return out


# ===================== Webhook =====================
def verify_signature(payload: bytes, header: str, secret: str, tolerance: int = 300) -> bool:
    try:
        parts = dict(kv.split("=", 1) for kv in header.split(",") if "=" in kv)
        ts = int(parts.get("t", "0"))
        sigs = [v for k, v in (kv.split("=", 1) for kv in header.split(",") if "=" in kv) if k == "v1"]
    except ValueError:
        return False
    if not sigs or abs(time.time() - ts) > tolerance:
        return False
    expected = hmac.new(secret.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, s) for s in sigs)


async def _find_by_payment_intent(pi: str):
    for kind, coll, path in (("order", "ticket_orders", "stripe.payment_intent"), ("sponsorship", "sponsorships", "stripe.payment_intent"),
                             ("donation", "donations", "stripe.payment_intent")):
        d = await db[coll].find_one({path: pi})
        if d:
            return kind, d["id"]
    m = await db.members.find_one({"membership.stripe.payment_intent": pi})
    if m:
        return "membership", m["id"]
    m = await db.members.find_one({"membership.upgrades.stripe.payment_intent": pi})
    if m:
        up = next(u for u in m["membership"]["upgrades"] if (u.get("stripe") or {}).get("payment_intent") == pi)
        return "upgrade", f"{m['id']}:{up['id']}"
    return None, None


async def record_refund(kind: str, ref: str, refunded_cents: int, actor: str, note: str = ""):
    """Keep the refunded total in sync with Stripe; fully refunded marks the purchase refunded."""
    p = await load_payable(kind, ref)
    info = {**p["stripe"], "refunded_cents": refunded_cents}
    await _save_stripe(p, info)
    if refunded_cents >= _cents(p["amount"]) and p["status"] != "refunded":
        await apply_result(kind, ref, "refunded", actor)
    if note:
        await audit(actor, kind, ref, "refund", note=note)


@public_router.post("/payments/stripe/webhook")
async def stripe_webhook(request: Request):
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    payload = await request.body()
    if not secret:
        raise HTTPException(503, "Webhook secret not configured")
    if not verify_signature(payload, request.headers.get("stripe-signature", ""), secret):
        raise HTTPException(400, "Invalid signature")
    event = json.loads(payload)
    # Stripe may deliver the same event more than once
    if await db.stripe_events.find_one({"id": event.get("id")}):
        return {"received": True, "duplicate": True}
    obj = (event.get("data") or {}).get("object") or {}
    etype = event.get("type", "")
    try:
        if etype.startswith("checkout.session."):
            meta = obj.get("metadata") or {}
            if meta.get("kind") in KINDS and meta.get("ref"):
                if etype == "checkout.session.async_payment_failed":
                    await apply_result(meta["kind"], meta["ref"], "failed")
                else:
                    await sync_session(meta["kind"], meta["ref"], obj)
        elif etype == "charge.refunded":
            kind, ref = await _find_by_payment_intent(obj.get("payment_intent"))
            if kind:
                await record_refund(kind, ref, int(obj.get("amount_refunded") or 0), "stripe")
        elif etype == "charge.dispute.created":
            kind, ref = await _find_by_payment_intent(obj.get("payment_intent"))
            if kind:
                await audit("stripe", kind, ref, "dispute",
                            note=f"Card dispute opened for ${(obj.get('amount') or 0) / 100:.2f} ({obj.get('reason')}). Respond in Stripe.")
    except HTTPException as e:
        log.warning(f"[stripe] webhook {etype} {event.get('id')}: {e.detail}")
    await db.stripe_events.insert_one({"id": event.get("id"), "type": etype, "at": datetime.utcnow()})
    return {"received": True}


# ===================== Background check =====================
async def reconcile_pending(max_age_days: int = 3) -> int:
    """Ask Stripe about card checkouts that never came back, so no paid purchase stays 'pending'."""
    if not configured():
        return 0
    since = datetime.utcnow() - timedelta(days=max_age_days)
    targets = []
    for kind, coll in (("order", "ticket_orders"), ("sponsorship", "sponsorships"), ("donation", "donations")):
        async for d in db[coll].find({"stripe.session_id": {"$exists": True}, "stripe.created_at": {"$gte": since},
                                      "payment_status": {"$in": ["pending", "awaiting_check", "failed"]}}):
            targets.append((kind, d["id"], d["stripe"]["session_id"]))
    async for m in db.members.find({"membership.stripe.session_id": {"$exists": True},
                                    "membership.stripe.created_at": {"$gte": since},
                                    "membership.payment_status": {"$in": ["pending", "awaiting_check", "failed"]}}):
        targets.append(("membership", m["id"], m["membership"]["stripe"]["session_id"]))
    async for m in db.members.find({"membership.upgrades.stripe.session_id": {"$exists": True}}):
        for u in m["membership"].get("upgrades") or []:
            s = u.get("stripe") or {}
            if s.get("session_id") and u.get("payment_status") in ("pending", "awaiting_check", "failed"):
                targets.append(("upgrade", f"{m['id']}:{u['id']}", s["session_id"]))
    fixed = 0
    for kind, ref, sid in targets:
        try:
            before = (await load_payable(kind, ref))["status"]
            after = await sync_session(kind, ref, await stripe("GET", f"/checkout/sessions/{sid}"))
            fixed += int(after != before)
        except Exception as e:  # keep going; one bad record shouldn't stop the rest
            log.warning(f"[stripe] reconcile {kind}:{ref} failed: {e}")
    if fixed:
        log.info(f"[stripe] reconciled {fixed} payment(s)")
    return fixed


async def reconcile_loop():
    while True:
        await asyncio.sleep(15 * 60)
        try:
            await reconcile_pending()
        except Exception as e:
            log.warning(f"[stripe] reconcile loop: {e}")


# ===================== Admin =====================
def _actor(request: Request) -> str:
    return getattr(request.state, "admin_user", {}).get("username", "admin")


class PaymentRef(BaseModel):
    kind: str
    ref: str


@admin_router.post("/payments/sync")
async def admin_sync(body: PaymentRef, request: Request):
    """'Check with Stripe' on one purchase."""
    p = await load_payable(body.kind, body.ref)
    sid = p["stripe"].get("session_id")
    if not sid:
        raise HTTPException(400, "This wasn't paid by card, so there's nothing to check with Stripe")
    status = await sync_session(body.kind, body.ref, await stripe("GET", f"/checkout/sessions/{sid}"), actor=_actor(request))
    return {"status": status}


class RefundRequest(BaseModel):
    kind: str
    ref: str
    part: str = "full"  # full | tickets | donation | custom
    amount: Optional[float] = None  # for custom
    reason: str = Field(min_length=3, max_length=300)


@admin_router.post("/payments/refund")
async def admin_refund(body: RefundRequest, request: Request):
    """Refund a card payment in full or in part (for example the tickets but not the donation)."""
    p = await load_payable(body.kind, body.ref)
    pi = p["stripe"].get("payment_intent")
    if p["status"] not in ("paid", "refunded") or not pi:
        raise HTTPException(400, "Only card payments that went through can be refunded here")
    already = int(p["stripe"].get("refunded_cents") or 0)
    left = _cents(p["amount"]) - already
    doc = p["doc"]
    if body.part == "full":
        cents = left
    elif body.part == "tickets" and body.kind == "order":
        cents = _cents(float(doc.get("subtotal") or 0) - float(doc.get("discount") or 0))
    elif body.part == "donation" and body.kind == "order" and doc.get("donation"):
        cents = _cents(doc["donation"].get("amount"))
    elif body.part == "custom" and body.amount:
        cents = _cents(body.amount)
    else:
        raise HTTPException(400, "Choose what to refund")
    if cents <= 0 or cents > left:
        raise HTTPException(400, f"You can refund up to ${left / 100:.2f}")
    refund = await stripe("POST", "/refunds", data={"payment_intent": pi, "amount": cents, "reason": "requested_by_customer",
                                                    "metadata": {"kind": body.kind, "ref": body.ref, "part": body.part}},
                          idempotency_key=f"refund-{body.kind}-{body.ref}-{already}-{cents}")
    refunds = list(p["stripe"].get("refunds") or []) + [{"id": refund.get("id"), "cents": cents, "part": body.part,
                                                         "reason": body.reason, "by": _actor(request), "at": datetime.utcnow()}]
    await _save_stripe(p, {**p["stripe"], "refunds": refunds})
    if body.kind == "order" and body.part in ("donation", "full") and doc.get("donation"):
        await db.donations.update_many({"order_id": body.ref}, {"$set": {"payment_status": "refunded"}})
    await record_refund(body.kind, body.ref, already + cents, _actor(request),
                        note=f"Refunded ${cents / 100:.2f} ({body.part}): {body.reason}")
    return {"refunded": cents / 100, "remaining": (left - cents) / 100}
