"""Membership terms in practice: promotions admins manage themselves, expiry quotes shown before
payment, recalculation when payment is confirmed, manual overrides, and a full audit history."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from admin_access import admin_guard
from auth import decode_token
from database import db
from membership_rules import (
    APPLIES_TO, LIFETIME_PLAN, compute_term, end_of_day, family_enabled, find_promotion, promotion_state, to_date,
)
from models import gen_id

public_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])


def _clean(d):
    if isinstance(d, list):
        return [_clean(x) for x in d]
    d = dict(d)
    d.pop("_id", None)
    return d


async def _member_out(mid: str) -> dict:
    m = _clean(await db.members.find_one({"id": mid}, {"password_hash": 0}))
    m["family_enabled"] = family_enabled(m.get("membership"))
    return m


def parse_dt(v) -> Optional[datetime]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


async def log_history(member_id: str, action: str, actor: str, **fields):
    """Append-only audit trail: expiration changes, payments, promotion usage, overrides."""
    await db.membership_history.insert_one({
        "id": gen_id(), "member_id": member_id, "action": action, "actor": actor,
        "created_at": datetime.utcnow(), **fields,
    })


async def all_promotions() -> list:
    return await db.membership_promotions.find().to_list(200)


def promo_snapshot(p: Optional[dict]) -> Optional[dict]:
    if not p:
        return None
    return {"id": p["id"], "name": p.get("name"), "expiration_date": str(to_date(p.get("expiration_date")))}


def purchase_kind(mem: dict) -> str:
    # Moving up from the free plan counts as joining (new-member promotions apply)
    return "renewal" if (mem or {}).get("plan") not in (None, "", "free") else "new"


def current_valid_end(mem: dict, now: datetime) -> Optional[datetime]:
    """Expiration that must be preserved (rule 3): only matters while still in the future."""
    end = parse_dt((mem or {}).get("end_date"))
    return end if end and end > now else None


async def plan_purchase(mem: dict, plan: str, tier: Optional[str], now: datetime) -> dict:
    """Term for a signup/renewal right now, plus what to remember for payment recalculation."""
    kind = purchase_kind(mem)
    promo = find_promotion(await all_promotions(), now, kind)
    base_end = current_valid_end(mem, now)
    term = compute_term(plan, tier, now, kind=kind, current_end=base_end, promotion=promo)
    return {"kind": kind, "promotion": promo, "base_end": base_end, "term": term}


async def record_promotion_use(term: dict):
    if term.get("promotion"):
        await db.membership_promotions.update_one({"id": term["promotion"]["id"]}, {"$inc": {"usage_count": 1}})


# ===================== Quote (shown before payment) =====================
@public_router.get("/membership/quote")
async def membership_quote(plan: str, tier: Optional[str] = None, authorization: Optional[str] = Header(None)):
    now = datetime.utcnow()
    mem = {}
    if authorization and authorization.startswith("Bearer "):
        mid = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member")
        if mid:
            m = await db.members.find_one({"id": mid})
            mem = (m or {}).get("membership") or {}
    if mem.get("lifetime"):
        return {"valid_through": None, "lifetime": True, "kind": "renewal", "promotion": None, "rule": "lifetime"}
    p = await plan_purchase(mem, plan, tier, now)
    t = p["term"]
    return {
        "valid_through": t["end_date"], "standard_end": t.get("standard_end"), "lifetime": t["lifetime"],
        "kind": p["kind"], "rule": t["rule"], "promotion": t["promotion"],
        "promotion_ends": str(to_date(p["promotion"]["end_date"])) if t["promotion"] and p["promotion"].get("end_date") else None,
        "current_end": p["base_end"],
    }


# ===================== Payment confirmed → recalculate =====================
async def apply_payment_status(member: dict, status: str, actor: str) -> dict:
    """Record a payment status change; on the first 'paid' for a purchase, restart the 12 months
    (or apply the promotion locked in at purchase) from the payment date — never shortening."""
    mem = member.get("membership") or {}
    now = datetime.utcnow()
    update = {"membership.payment_received": status == "paid", "membership.payment_status": status, "updated_at": now}
    prev_end = parse_dt(mem.get("end_date"))
    new_end = prev_end
    if status == "paid" and not mem.get("paid_at") and not mem.get("lifetime") and mem.get("plan"):
        keep = max([d for d in (parse_dt(mem.get("purchase_base_end")), prev_end) if d], default=None)
        term = compute_term(mem.get("plan"), mem.get("tier"), now, kind=mem.get("term_kind") or "new",
                            current_end=keep, promotion=mem.get("eligible_promotion"))
        new_end = term["end_date"]
        update.update({"membership.paid_at": now, "membership.end_date": new_end, "membership.term_rule": term["rule"]})
        if term["promotion"]:
            update["membership.promotion"] = term["promotion"]
    await db.members.update_one({"id": member["id"]}, {"$set": update})
    await log_history(member["id"], "payment", actor, payment_status=status,
                      previous_payment_status=mem.get("payment_status"),
                      previous_end=prev_end, new_end=new_end)
    return await db.members.find_one({"id": member["id"]})


# ===================== Member: change membership type =====================
class TierChange(BaseModel):
    tier: str
    payment_method: str = "check"  # stripe (card) | check | paypal | other (used for upgrade charges)


def _tier_price(plan: dict, slug: Optional[str]) -> Optional[float]:
    t = next((t for t in plan.get("tiers") or [] if t.get("slug") == slug), None)
    return float(t["price"]) if t and t.get("price") is not None else None


async def _load_change(member_id: str, target: str):
    m = await db.members.find_one({"id": member_id})
    if not m:
        raise HTTPException(404, "Member not found")
    mem = m.get("membership") or {}
    if mem.get("status") != "active" or mem.get("lifetime"):
        raise HTTPException(400, "Only active annual memberships can change type")
    plan = await db.membership_plans.find_one({"slug": mem.get("plan")})
    if not plan or not plan.get("tiers"):
        raise HTTPException(400, "Your plan has no other membership types to switch to")
    if target not in [t.get("slug") for t in plan["tiers"]]:
        raise HTTPException(400, "That membership type isn't part of your plan")
    return m, mem, plan


@public_router.get("/members/me/change-tier/quote")
async def change_tier_quote(tier: str, authorization: Optional[str] = Header(None)):
    """What switching to `tier` would mean, shown before the member confirms."""
    mid = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member") if authorization and authorization.startswith("Bearer ") else None
    if not mid:
        raise HTTPException(401, "Missing token")
    m, mem, plan = await _load_change(mid, tier)
    old_p, new_p = _tier_price(plan, mem.get("tier")), _tier_price(plan, tier)
    if tier == mem.get("tier"):
        kind = "cancel_downgrade" if mem.get("scheduled_tier") else "same"
    elif new_p is not None and old_p is not None and new_p > old_p:
        kind = "upgrade"
    elif new_p is not None and old_p is not None and new_p == old_p:
        kind = "switch"
    else:
        kind = "downgrade"
    return {"kind": kind, "from_tier": mem.get("tier"), "to_tier": tier, "amount": round(max(0.0, (new_p or 0) - (old_p or 0)), 2),
            "valid_through": mem.get("end_date"), "new_price": new_p, "current_price": old_p}


@public_router.post("/members/me/change-tier")
async def change_tier(body: TierChange, authorization: Optional[str] = Header(None)):
    """Upgrade now for the price difference (expiration unchanged), or schedule a downgrade for the next renewal."""
    mid = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member") if authorization and authorization.startswith("Bearer ") else None
    if not mid:
        raise HTTPException(401, "Missing token")
    if body.payment_method not in ("stripe", "paypal", "check", "other"):
        raise HTTPException(400, "Invalid payment method")
    m, mem, plan = await _load_change(mid, body.tier)
    now = datetime.utcnow()
    cur, target = mem.get("tier"), body.tier
    if target == cur:
        if mem.get("scheduled_tier"):
            await db.members.update_one({"id": mid}, {"$unset": {"membership.scheduled_tier": ""}, "$set": {"updated_at": now}})
            await log_history(mid, "downgrade_cancelled", "member", from_tier=cur, to_tier=mem.get("scheduled_tier"))
            return await _member_out(mid)
        raise HTTPException(400, "You already have this membership type")
    old_p, new_p = _tier_price(plan, cur), _tier_price(plan, target)
    if old_p is not None and new_p is not None and new_p < old_p:
        await db.members.update_one({"id": mid}, {"$set": {"membership.scheduled_tier": target, "updated_at": now}})
        await log_history(mid, "downgrade_scheduled", "member", from_tier=cur, to_tier=target,
                          reason="Takes effect at next renewal")
    else:
        amount = round(max(0.0, (new_p or 0) - (old_p or 0)), 2)
        upgrade = {
            "id": gen_id(), "from_tier": cur, "to_tier": target, "amount": amount,
            "payment_method": body.payment_method,
            "payment_status": "paid" if amount == 0 else ("awaiting_check" if body.payment_method == "check" else "pending"),
            "created_at": now,
        }
        await db.members.update_one({"id": mid}, {
            "$set": {"membership.tier": target, "updated_at": now},
            "$unset": {"membership.scheduled_tier": ""},
            "$push": {"membership.upgrades": upgrade},
        })
        await log_history(mid, "upgrade", "member", from_tier=cur, to_tier=target, amount=amount,
                          previous_end=parse_dt(mem.get("end_date")), new_end=parse_dt(mem.get("end_date")))
    return await _member_out(mid)


class UpgradePayment(BaseModel):
    status: str


@admin_router.post("/members/{mid}/upgrades/{uid}/payment")
async def upgrade_payment(mid: str, uid: str, body: UpgradePayment, request: Request):
    if body.status not in ("pending", "awaiting_check", "paid", "failed", "refunded"):
        raise HTTPException(400, "Invalid payment status")
    m = await db.members.find_one({"id": mid})
    upgrades = ((m or {}).get("membership") or {}).get("upgrades") or []
    up = next((u for u in upgrades if u.get("id") == uid), None)
    if not up:
        raise HTTPException(404, "Upgrade not found")
    prev = up.get("payment_status")
    up["payment_status"] = body.status
    if body.status == "paid":
        up["paid_at"] = datetime.utcnow()
    await db.members.update_one({"id": mid}, {"$set": {"membership.upgrades": upgrades, "updated_at": datetime.utcnow()}})
    await log_history(mid, "upgrade_payment", request.state.admin_user["username"], payment_status=body.status,
                      previous_payment_status=prev, from_tier=up.get("from_tier"), to_tier=up.get("to_tier"),
                      amount=up.get("amount"))
    return {"ok": True}


# ===================== Admin: promotions =====================
class PromotionIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    expiration_date: str  # fixed membership expiration granted, YYYY-MM-DD
    applies_to: str = "both"  # new | renewal | both
    active: bool = True
    notes: Optional[str] = ""


def _validate(body: PromotionIn):
    s, e, x = to_date(body.start_date), to_date(body.end_date), to_date(body.expiration_date)
    if not (s and e and x):
        raise HTTPException(400, "Start, end and expiration dates are required (YYYY-MM-DD)")
    if e < s:
        raise HTTPException(400, "Promotion end must be on or after its start")
    if x <= e:
        raise HTTPException(400, "Membership expiration must be after the promotion ends")
    if body.applies_to not in APPLIES_TO:
        raise HTTPException(400, "applies_to must be new, renewal or both")
    return {"name": body.name.strip(), "start_date": str(s), "end_date": str(e), "expiration_date": str(x),
            "applies_to": body.applies_to, "active": body.active, "notes": body.notes or ""}


def _with_state(p: dict) -> dict:
    return {**_clean(p), "state": promotion_state(p, datetime.utcnow().date()), "usage_count": p.get("usage_count", 0)}


@admin_router.get("/membership-promotions")
async def list_promotions():
    items = await db.membership_promotions.find().sort("start_date", -1).to_list(200)
    return [_with_state(p) for p in items]


@admin_router.post("/membership-promotions")
async def create_promotion(body: PromotionIn, request: Request):
    doc = {**_validate(body), "id": gen_id(), "usage_count": 0, "created_at": datetime.utcnow(),
           "created_by": request.state.admin_user["username"]}
    await db.membership_promotions.insert_one(doc)
    return _with_state(doc)


@admin_router.put("/membership-promotions/{pid}")
async def update_promotion(pid: str, body: PromotionIn, request: Request):
    if not await db.membership_promotions.find_one({"id": pid}):
        raise HTTPException(404, "Not found")
    await db.membership_promotions.update_one({"id": pid}, {"$set": {
        **_validate(body), "updated_at": datetime.utcnow(), "updated_by": request.state.admin_user["username"]}})
    return _with_state(await db.membership_promotions.find_one({"id": pid}))


@admin_router.delete("/membership-promotions/{pid}")
async def delete_promotion(pid: str):
    p = await db.membership_promotions.find_one({"id": pid})
    if not p:
        raise HTTPException(404, "Not found")
    if p.get("usage_count"):
        raise HTTPException(400, "This promotion has been used — switch it off instead so the audit trail stays intact")
    await db.membership_promotions.delete_one({"id": pid})
    return {"ok": True}


# ===================== Admin: override + history =====================
class ExpirationOverride(BaseModel):
    end_date: str  # YYYY-MM-DD
    reason: str = Field(min_length=3, max_length=500)


@admin_router.post("/members/{mid}/expiration")
async def override_expiration(mid: str, body: ExpirationOverride, request: Request):
    m = await db.members.find_one({"id": mid})
    if not m:
        raise HTTPException(404, "Not found")
    mem = m.get("membership") or {}
    if not mem.get("plan"):
        raise HTTPException(400, "This member has no membership to change")
    d = to_date(body.end_date)
    if not d:
        raise HTTPException(400, "Invalid date")
    new_end = end_of_day(d)
    now = datetime.utcnow()
    update = {"membership.end_date": new_end, "membership.lifetime": False, "membership.term_rule": "override",
              "updated_at": now}
    if new_end > now and mem.get("status") in ("expired", "active"):
        update["membership.status"] = "active"
    elif new_end <= now and mem.get("status") == "active":
        update["membership.status"] = "expired"
    await db.members.update_one({"id": mid}, {"$set": update})
    await log_history(mid, "override", request.state.admin_user["username"], previous_end=parse_dt(mem.get("end_date")),
                      new_end=new_end, reason=body.reason.strip())
    m = await db.members.find_one({"id": mid})
    m.pop("_id", None)
    m.pop("password_hash", None)
    return m


@admin_router.get("/members/{mid}/history")
async def member_history(mid: str):
    return _clean(await db.membership_history.find({"member_id": mid}).sort("created_at", -1).to_list(500))


# ===================== Migration from the single settings-based promotion =====================
async def migrate_settings_promotion():
    s = await db.site_settings.find_one({"id": "main"}) or {}
    if s.get("membership_promo_enabled") and await db.membership_promotions.count_documents({}) == 0:
        start = to_date(s.get("membership_promo_start")) or datetime.utcnow().date()
        end = to_date(s.get("membership_promo_end")) or start.replace(month=12, day=31)
        await db.membership_promotions.insert_one({
            "id": gen_id(), "name": s.get("membership_promo_label") or "Membership Promotion",
            "start_date": str(start), "end_date": str(end), "expiration_date": f"{end.year + 1}-12-31",
            "applies_to": "both", "active": True, "notes": "Migrated from Site Content settings",
            "usage_count": 0, "created_at": datetime.utcnow(), "created_by": "migration",
        })
    await db.site_settings.update_one({"id": "main"}, {"$unset": {
        "membership_promo_enabled": "", "membership_promo_label": "", "membership_promo_start": "", "membership_promo_end": ""}})
    # Keep each member's original join date separately so renewals and re-signups never overwrite it
    for m in await db.members.find({"joined_at": {"$exists": False}, "membership.plan": {"$nin": [None, ""]}}).to_list(20000):
        mem = m.get("membership") or {}
        await db.members.update_one({"id": m["id"]}, {"$set": {
            "joined_at": parse_dt(mem.get("start_date")) or parse_dt(mem.get("submitted_at")) or m.get("created_at")}})


__all__ = ["public_router", "admin_router", "plan_purchase", "record_promotion_use", "apply_payment_status",
           "log_history", "migrate_settings_promotion", "promo_snapshot", "parse_dt", "LIFETIME_PLAN"]
