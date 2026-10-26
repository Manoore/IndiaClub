"""Event checkout: registration periods, per-attendee eligibility, sponsor perks, promo codes,
membership purchase or renewal, donations and processing-fee contributions.

One engine prices both the live quote and the purchase, so what the buyer sees is what they pay.

Rules (ICGD pricing requirements):
- Periods (Early Bird, Regular, At the Door...) are enforced by the server in America/New_York time.
- Member pricing comes from verified records: the signed-in buyer ("self") and their approved family
  members if the membership covers family. Guests always pay the non-member price.
- Membership status is checked at purchase time; a membership bought in the same checkout counts.
- Sponsor perks apply only to people named on an active sponsorship, once per event.
- Promo codes discount ticket charges only (never donations, dues or fees); one code per order.
- Confirmed orders keep the prices they were sold at.
"""
from collections import Counter
from datetime import datetime, date, time
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from admin_access import admin_guard
from audit import audit
from auth import decode_token
from database import db
from family_tickets import age_band, age_on, new_ticket_code
from membership_rules import FREE_PLAN, LIFETIME_PLAN, family_enabled, member_ticket_limit, paid_member
from membership_service import log_history, parse_dt, plan_purchase, promo_snapshot, record_promotion_use
from models import gen_id
from sponsorships import valid_sponsor

TZ = ZoneInfo("America/New_York")
INACTIVE_ORDER = ["refunded", "failed", "cancelled"]
MAX_TICKETS = 30
MAX_DONATION = 50000
DEFAULT_DONATION_PRESETS = [10, 25, 50, 100]
FEE_MODES = ("absorb", "voluntary")
PERK_KINDS = ("none", "free", "member", "percent", "fixed")
PAYMENT_METHODS = ("paypal", "check", "cash", "zelle", "other", "stripe")

public_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])


# ===================== Time =====================
def now_et() -> datetime:
    """Current wall-clock time in Dayton, as a naive datetime (how admins enter period dates)."""
    return datetime.now(TZ).replace(tzinfo=None)


def parse_local(v) -> Optional[datetime]:
    """Period/promo dates are entered as Eastern local times ("YYYY-MM-DDTHH:MM" or a date)."""
    if not v:
        return None
    if isinstance(v, datetime):
        return v.astimezone(TZ).replace(tzinfo=None) if v.tzinfo else v
    if isinstance(v, date):
        return datetime.combine(v, time.min)
    s = str(v).strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(s)
    except ValueError:
        return None
    return d.astimezone(TZ).replace(tzinfo=None) if d.tzinfo else d


def _legacy_dt(v) -> Optional[datetime]:
    """Older ticket fields (early bird end, sale window) are compared in UTC, as before."""
    if not v:
        return None
    if isinstance(v, datetime):
        return v.replace(tzinfo=None)
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _money(x) -> float:
    return round(float(x or 0) + 1e-9, 2)


# ===================== Registration periods =====================
def sorted_periods(event: dict) -> list:
    ps = [p for p in (event.get("price_periods") or []) if p.get("id")]
    return sorted(ps, key=lambda p: parse_local(p.get("start")) or datetime.min)


def validate_event_pricing(event: dict) -> None:
    """Raise ValueError with a plain message if periods overlap or settings are invalid."""
    periods = sorted_periods(event)
    names = set()
    for p in periods:
        if not (p.get("name") or "").strip():
            raise ValueError("Every registration period needs a name")
        if p["name"].strip().lower() in names:
            raise ValueError(f"Two registration periods are both called '{p['name']}'")
        names.add(p["name"].strip().lower())
        s, e = parse_local(p.get("start")), parse_local(p.get("end"))
        if s and e and s >= e:
            raise ValueError(f"'{p['name']}' must end after it starts")
    for a, b in zip(periods, periods[1:]):
        a_end, b_start = parse_local(a.get("end")), parse_local(b.get("start"))
        if a_end is None or b_start is None or b_start < a_end:
            raise ValueError(f"'{a['name']}' and '{b['name']}' overlap. Each period must end before the next one starts.")
    for t in event.get("ticket_types") or []:
        for pid, pp in (t.get("period_prices") or {}).items():
            for k in ("non_member", "member"):
                v = (pp or {}).get(k)
                if v is not None and float(v) < 0:
                    raise ValueError(f"Prices can't be negative ({t.get('name')})")
    if (event.get("fee_mode") or "absorb") not in FEE_MODES:
        raise ValueError("Processing fee option must be 'absorb' or 'voluntary'")
    for p in event.get("promo_codes") or []:
        if (p.get("kind") or "percent") not in ("percent", "amount"):
            raise ValueError(f"Promo code {p.get('code')}: discount must be a percentage or a dollar amount")
        if (p.get("kind") or "percent") == "percent" and float(p.get("value") or 0) > 100:
            raise ValueError(f"Promo code {p.get('code')}: a percentage can't be more than 100")
    for slug, o in (event.get("sponsor_perks") or {}).items():
        if (o or {}).get("mode", "default") not in ("default", "off", "price"):
            raise ValueError(f"Sponsor perk setting for {slug} is invalid")


def event_ended(event: dict, now: datetime) -> bool:
    """Over once its end time passes; with only a start date, at the end of that day (Eastern)."""
    end = parse_local(event.get("end_date"))
    if end:
        return now > end
    start = parse_local(event.get("start_date"))
    return bool(start) and now > datetime.combine(start.date(), time.max)


def current_period(event: dict, now: datetime):
    """(period, state): state is open | not_started | closed | none (event has no periods)."""
    periods = sorted_periods(event)
    if not periods:
        return None, "none"
    for p in periods:
        s, e = parse_local(p.get("start")), parse_local(p.get("end"))
        if (s is None or now >= s) and (e is None or now < e):
            return p, "open"
    first_start = parse_local(periods[0].get("start"))
    if first_start and now < first_start:
        return periods[0], "not_started"
    return periods[-1], "closed"


def period_prices(t: dict, period: Optional[dict], now_utc: datetime) -> tuple:
    """(non_member, member) price for a ticket type right now."""
    if period:
        pp = (t.get("period_prices") or {}).get(period["id"]) or {}
        nm = pp.get("non_member")
        nm = float(t.get("price") or 0) if nm is None else float(nm)
        mem = pp.get("member")
        return nm, (nm if mem is None else float(mem))
    # Events set up before registration periods existed: early bird beats member price
    eb_end, eb = _legacy_dt(t.get("early_bird_end_date")), t.get("early_bird_price")
    if eb is not None and eb_end and now_utc <= eb_end:
        return float(eb), float(eb)
    nm = float(t.get("price") or 0)
    mem = t.get("member_price")
    return nm, (nm if mem is None else float(mem))


# ===================== Sponsor perks =====================
def sponsor_perk(event: dict, plan: Optional[dict]):
    """(kind, value) for a sponsorship level at this event, or None when no perk applies."""
    if not plan:
        return None
    o = (event.get("sponsor_perks") or {}).get(plan.get("slug")) or {}
    mode = o.get("mode") or "default"
    if mode == "off":
        return None
    if mode == "price":
        return ("fixed", float(o.get("price") or 0))
    kind = plan.get("perk_kind") or "none"
    if kind == "none":
        return None
    return (kind, float(plan.get("perk_value") or 0))


def perk_price(perk, non_member: float, member: float) -> float:
    kind, value = perk
    if kind == "free":
        return 0.0
    if kind == "member":
        return member
    if kind == "percent":
        return _money(non_member * max(0.0, 100 - value) / 100)
    if kind == "fixed":
        return min(non_member, max(0.0, value))
    return non_member


def perk_label(perk, level: str) -> str:
    kind, value = perk
    return {
        "free": f"{level} sponsor — free entry",
        "member": f"{level} sponsor — member price",
        "percent": f"{level} sponsor — {value:g}% off",
        "fixed": f"{level} sponsor price",
    }.get(kind, f"{level} sponsor")


# ===================== Request model =====================
class CheckoutAttendee(BaseModel):
    ticket_type_id: str
    kind: Optional[str] = None  # self | family | guest | sponsor
    name: Optional[str] = None
    family_member_id: Optional[str] = None
    sponsor_person_id: Optional[str] = None


class MembershipChoice(BaseModel):
    plan: str
    tier: Optional[str] = None


class DonationChoice(BaseModel):
    amount: float = 0
    anonymous: bool = False  # opt out of public donor recognition


class CheckoutRequest(BaseModel):
    event_id: Optional[str] = None
    items: List[dict] = []  # quick mode: [{ticket_type_id, quantity}] → buyer + guests
    attendees: Optional[List[CheckoutAttendee]] = None
    buyer_name: str = ""
    buyer_email: Optional[EmailStr] = None
    buyer_phone: Optional[str] = None
    payment_method: str = "paypal"
    promo_code: Optional[str] = None
    sponsor_code: Optional[str] = None
    membership: Optional[MembershipChoice] = None
    donation: Optional[DonationChoice] = None
    cover_fees: bool = False
    notes: Optional[str] = ""


# ===================== Engine =====================
async def _member_from(authorization: Optional[str]) -> Optional[dict]:
    if authorization and authorization.startswith("Bearer "):
        mid = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member")
        if mid:
            return await db.members.find_one({"id": mid})
    return None


def _current(mem: dict, now_utc: datetime) -> dict:
    """The membership as it stands right now: past its end date counts as expired, even before
    the nightly expiry job has updated the record."""
    end = parse_dt(mem.get("end_date"))
    if mem.get("status") == "active" and not mem.get("lifetime") and end and end < now_utc:
        return {**mem, "status": "expired"}
    return mem


def _tier_of(plan: dict, slug: Optional[str]) -> Optional[dict]:
    for t in plan.get("tiers") or []:
        if t.get("slug") == slug:
            return t
    return None


async def _membership_line(member: Optional[dict], choice: MembershipChoice) -> dict:
    if not member:
        raise HTTPException(401, "Sign in (or create an account) to add a membership to this order")
    plan = await db.membership_plans.find_one({"slug": choice.plan})
    if not plan or plan.get("hidden") or choice.plan in (LIFETIME_PLAN, FREE_PLAN):
        raise HTTPException(400, "That membership can't be bought online")
    tiers = plan.get("tiers") or []
    tier = None
    if tiers:
        tier = _tier_of(plan, choice.tier)
        if not tier:
            raise HTTPException(400, "Choose a membership type")
        if tier.get("slug") == "student":
            raise HTTPException(400, "Youth memberships need school details. Please join from the Membership page.")
    cur = _current(member.get("membership") or {}, datetime.utcnow())
    if cur.get("lifetime"):
        raise HTTPException(400, "Lifetime members never need to renew")
    if cur.get("status") == "active" and cur.get("plan") not in (None, "", FREE_PLAN) and cur.get("plan") != choice.plan:
        raise HTTPException(400, "You already have a different active membership. Use Change membership type on your dashboard.")
    kind = "renewal" if cur.get("plan") == choice.plan else "new"
    price = float((tier or plan).get("price") or 0)
    name = plan.get("name") if not tier else f"{tier.get('name')} membership"
    return {"plan": plan["slug"], "tier": tier.get("slug") if tier else None, "name": name,
            "price": _money(price), "kind": kind, "applied": False}


async def _sponsor_people_used(event_id: str, sponsorship_id: str) -> set:
    used = set()
    async for o in db.ticket_orders.find({"event_id": event_id, "sponsorship_id": sponsorship_id,
                                          "payment_status": {"$nin": INACTIVE_ORDER}}):
        for t in o.get("tickets") or []:
            if t.get("sponsor_person_id"):
                used.add(t["sponsor_person_id"])
    return used


async def _tickets_sold(event_id: str) -> int:
    n = 0
    async for o in db.ticket_orders.find({"event_id": event_id, "payment_status": {"$nin": INACTIVE_ORDER}}):
        n += len(o.get("tickets") or []) or sum(int(i.get("quantity") or 0) for i in o.get("items") or [])
    return n


def _promo_ends(p: dict) -> Optional[datetime]:
    e = parse_local(p.get("ends"))
    if e and len(str(p.get("ends"))) <= 10:  # a date means "through the end of that day"
        e = datetime.combine(e.date(), time.max)
    return e


async def _promo(event: dict, code: str, buyer_email: Optional[str], buyer_key: str, member_key: bool,
                 subtotal: float, now: datetime) -> tuple:
    """(promo, discount) or raises ValueError with the reason the code can't be used."""
    norm = code.strip().upper()
    p = next((x for x in event.get("promo_codes") or [] if (x.get("code") or "").strip().upper() == norm), None)
    if not p:
        raise ValueError(f"Promo code '{code}' isn't valid for this event")
    if p.get("enabled") is False:
        raise ValueError("This promo code is no longer active")
    start, end = parse_local(p.get("starts")), _promo_ends(p)
    if start and now < start:
        raise ValueError("This promo code isn't active yet")
    if end and now > end:
        raise ValueError("This promo code has expired")
    max_uses = int(p.get("max_uses") or 0)
    if max_uses and int(p.get("used") or 0) >= max_uses:
        raise ValueError("This promo code has reached its usage limit")
    per_customer = int(p.get("per_customer") or 0)
    if per_customer and buyer_email:
        used = await db.ticket_orders.count_documents({
            "event_id": event["id"], "promo_code": norm, "buyer_email": buyer_email.lower(),
            "payment_status": {"$nin": INACTIVE_ORDER}})
        if used >= per_customer:
            raise ValueError("You've already used this promo code the maximum number of times")
    cats = [c for c in (p.get("categories") or []) if c]
    if cats and not (buyer_key in cats or (member_key and "member" in cats)):
        raise ValueError("This promo code isn't available for your membership type")
    min_purchase = float(p.get("min_purchase") or 0)
    if min_purchase and subtotal < min_purchase:
        raise ValueError(f"This promo code needs at least ${min_purchase:,.2f} in tickets")
    value = float(p.get("value") or 0)
    if (p.get("kind") or "percent") == "percent":
        discount = _money(subtotal * min(value, 100) / 100)
    else:
        discount = min(_money(value), subtotal)
    return p, max(0.0, discount)


async def build_checkout(event: dict, body: CheckoutRequest, member: Optional[dict], strict: bool,
                         admin_override: bool = False) -> dict:
    """Price an order. strict=True (purchase) raises on any problem; the quote reports soft issues.
    admin_override lets staff issue tickets outside the sale dates (complimentary tickets)."""
    types = event.get("ticket_types") or []
    if not types:
        raise HTTPException(400, "This event does not have tickets configured")
    types_by_id = {t["id"]: t for t in types}
    now, now_utc = now_et(), datetime.utcnow()
    if event_ended(event, now) and not admin_override:
        raise HTTPException(400, "This event has ended")
    period, state = current_period(event, now)
    if state == "not_started" and not admin_override:
        raise HTTPException(400, f"Registration opens {parse_local(period.get('start')):%b %d at %I:%M %p} (Eastern)")
    if state == "closed" and not admin_override:
        raise HTTPException(400, "Registration for this event has closed")

    mem = _current((member or {}).get("membership") or {}, now_utc)
    is_member, covers_family = paid_member(mem), family_enabled(mem)
    ticket_allowance = member_ticket_limit(mem)
    membership_line = None
    if body.membership:
        membership_line = await _membership_line(member, body.membership)
        provisional = {"status": "active", "plan": membership_line["plan"], "tier": membership_line["tier"]}
        is_member = is_member or paid_member(provisional)
        covers_family = covers_family or family_enabled(provisional)
        ticket_allowance = max(ticket_allowance, member_ticket_limit(provisional))
        buyer_plan, buyer_tier = membership_line["plan"], membership_line["tier"]
    else:
        buyer_plan, buyer_tier = mem.get("plan"), mem.get("tier")

    sponsor = sponsor_plan = None
    if body.sponsor_code:
        sponsor = await valid_sponsor(body.sponsor_code)
        if not sponsor:
            raise HTTPException(400, "Sponsor code is not valid or the sponsorship has expired")
        sponsor_plan = await db.sponsorship_plans.find_one({"slug": sponsor.get("plan")})

    # ---- Who is attending ----
    event_dt = _legacy_dt(event.get("start_date")) or now_utc
    member_name = f"{(member or {}).get('first_name', '')} {(member or {}).get('last_name', '')}".strip()
    raw = []
    if body.attendees:
        raw = [a.model_dump() for a in body.attendees]
    else:
        for item in body.items:
            for _ in range(max(0, int(item.get("quantity") or 0))):
                n = len(raw)
                raw.append({"ticket_type_id": item.get("ticket_type_id"), "kind": "self" if n == 0 else "guest",
                            "name": body.buyer_name if n == 0 else f"{body.buyer_name} – Guest {n}"})
    if not raw:
        raise HTTPException(400, "Please select at least one ticket")
    if len(raw) > MAX_TICKETS:
        raise HTTPException(400, f"Maximum {MAX_TICKETS} tickets per order")

    fam_ids = [a["family_member_id"] for a in raw if a.get("family_member_id")]
    fams = {}
    if fam_ids:
        if not member:
            raise HTTPException(401, "Sign in to book tickets for family members")
        if not covers_family:
            raise HTTPException(403, "Booking for family members needs a membership that covers your family")
        fams = {f["id"]: f for f in await db.family_members.find(
            {"id": {"$in": fam_ids}, "member_id": member["id"]}).to_list(100)}
    sponsor_people = {p["id"]: p for p in (sponsor or {}).get("named_people") or []}
    used_people = await _sponsor_people_used(event["id"], sponsor["id"]) if sponsor else set()
    # What this member already holds for the event: each person gets one ticket, and member-priced
    # tickets count against the membership's allowance across all their orders
    held_self, held_family, member_tickets_used = False, set(), 0
    if member:
        async for o in db.ticket_orders.find({"event_id": event["id"], "member_id": member["id"],
                                              "payment_status": {"$nin": INACTIVE_ORDER}}):
            for t in o.get("tickets") or []:
                if t.get("kind") == "self":
                    held_self = True
                if t.get("family_member_id"):
                    held_family.add(t["family_member_id"])
                if t.get("category") == "member":
                    member_tickets_used += 1

    lines, seen_fam, seen_people, self_count = [], set(), set(), 0
    for a in raw:
        kind = a.get("kind")
        if not kind:  # older clients: infer from what was sent
            if a.get("family_member_id"):
                kind = "family"
            elif member and self_count == 0 and (a.get("name") or "").strip().lower() == member_name.lower():
                kind = "self"
            else:
                kind = "guest"
        line = {"ticket_type_id": a.get("ticket_type_id"), "kind": kind, "family_member_id": None,
                "sponsor_person_id": None, "age": None}
        if kind == "self":
            self_count += 1
            if self_count > 1:
                raise HTTPException(400, "You can only add yourself once")
            if held_self:
                raise HTTPException(400, "You already have a ticket for this event")
            line["name"] = (a.get("name") or member_name or body.buyer_name or "Ticket holder").strip()
        elif kind == "family":
            fid = a.get("family_member_id")
            if fid in seen_fam:
                raise HTTPException(400, "A family member can only be added once per order")
            seen_fam.add(fid)
            f = fams.get(fid)
            if not f:
                raise HTTPException(400, "Family member not found in your family group")
            if f.get("status") != "approved":
                raise HTTPException(400, f"{f['name']} is not verified yet — an admin must approve them first")
            if fid in held_family:
                raise HTTPException(400, f"{f['name']} already has a ticket for this event")
            line.update(name=f["name"], family_member_id=fid, age=age_on(f.get("date_of_birth"), event_dt))
        elif kind == "sponsor":
            pid = a.get("sponsor_person_id")
            person = sponsor_people.get(pid)
            if not sponsor or not person:
                raise HTTPException(400, "Choose a person named on the sponsorship")
            if pid in seen_people or pid in used_people:
                raise HTTPException(400, f"{person['name']} already has a sponsor ticket for this event")
            seen_people.add(pid)
            line.update(name=person["name"], sponsor_person_id=pid)
        elif kind == "guest":
            line["name"] = (a.get("name") or "").strip()
            if not line["name"]:
                raise HTTPException(400, "Each attendee needs a name")
        else:
            raise HTTPException(400, f"Unknown attendee type '{kind}'")
        line["name"] = line["name"][:120]
        lines.append(line)

    # ---- Availability ----
    counts = Counter(l["ticket_type_id"] for l in lines)
    for tid, qty in counts.items():
        t = types_by_id.get(tid)
        if not t:
            raise HTTPException(400, f"Unknown ticket type {tid}")
        if t.get("members_only") and not is_member and not admin_override:
            raise HTTPException(403, f"Ticket '{t['name']}' is for active members only")
        ss, se = _legacy_dt(t.get("sale_start")), _legacy_dt(t.get("sale_end"))
        if ss and now_utc < ss and not admin_override:
            raise HTTPException(400, f"Ticket '{t['name']}' is not on sale yet")
        if se and now_utc > se and not admin_override:
            raise HTTPException(400, f"Ticket '{t['name']}' sales have ended")
        total_q, sold_q = int(t.get("quantity_total") or 0), int(t.get("quantity_sold") or 0)
        if total_q and sold_q + qty > total_q:
            raise HTTPException(400, f"Only {max(0, total_q - sold_q)} '{t['name']}' tickets remain")
    capacity = int(event.get("capacity") or 0)
    if capacity:
        sold = await _tickets_sold(event["id"])
        if sold + len(lines) > capacity:
            left = max(0, capacity - sold)
            raise HTTPException(400, "This event is sold out" if not left else f"Only {left} spots remain for this event")

    # ---- Price each attendee ----
    perk = sponsor_perk(event, sponsor_plan) if sponsor else None
    legacy_sponsor = sponsor is not None and period is None
    tickets_subtotal, member_savings = 0.0, 0.0
    allowance_left = max(0, ticket_allowance - member_tickets_used)
    for l in lines:
        t = types_by_id[l["ticket_type_id"]]
        nm, mp = period_prices(t, period, now_utc)
        eligible = (l["kind"] == "self" and is_member) or (l["kind"] == "family" and covers_family)
        over_limit = eligible and allowance_left <= 0
        if over_limit:
            eligible = False
        elif eligible:
            allowance_left -= 1
        price = mp if eligible else nm
        category = "member" if eligible else "non_member"
        reason = "Member price" if eligible else "Non-member price"
        if over_limit:
            reason = f"Member ticket limit reached ({ticket_allowance} per event)"
        if l["kind"] == "family":
            reason = "Family member — member price" if eligible else reason
        if l["kind"] == "sponsor":
            if perk:
                price, category, reason = perk_price(perk, nm, mp), "sponsor", perk_label(perk, sponsor.get("tier") or "Sponsor")
            else:
                reason = "Sponsor perks don't apply to this event"
        elif legacy_sponsor and t.get("sponsor_price") is not None:
            price, category, reason = float(t["sponsor_price"]), "sponsor", "Sponsor price"
        band = age_band(l["age"])
        label = t["name"]
        if band == "infant":
            price, label, reason = 0.0, f"{t['name']} (Under 3)", "Under 3 — free"
        elif band == "child" and t.get("child_price") is not None:
            if float(t["child_price"]) < price:
                price, reason = float(t["child_price"]), "Child price (3–11)"
            label = f"{t['name']} (Child)"
        if l["kind"] in ("self", "family") and not eligible and mp < nm:
            member_savings += nm - mp
        l.update(price=_money(price), category=category, reason=reason, label=label,
                 ticket_type_name=t["name"], non_member_price=_money(nm), member_price=_money(mp))
        tickets_subtotal += price
    tickets_subtotal = _money(tickets_subtotal)

    # ---- Promo code (tickets only) ----
    discount, promo_code, promo_error = 0.0, None, None
    if body.promo_code and body.promo_code.strip():
        buyer_key = (buyer_tier or buyer_plan) if is_member else "non_member"
        try:
            p, discount = await _promo(event, body.promo_code, body.buyer_email, buyer_key, is_member, tickets_subtotal, now)
            promo_code = p["code"].strip().upper()
        except ValueError as e:
            if strict:
                raise HTTPException(400, str(e))
            promo_error = str(e)

    # ---- Donation ----
    donation = None
    if body.donation and float(body.donation.amount or 0) > 0:
        if event.get("donations_enabled") is False:
            raise HTTPException(400, "Donations aren't being collected for this event")
        amount = _money(body.donation.amount)
        if amount > MAX_DONATION:
            raise HTTPException(400, f"For donations over ${MAX_DONATION:,} please contact the treasurer")
        donation = {"amount": amount, "anonymous": bool(body.donation.anonymous)}

    # ---- Processing-fee contribution (voluntary; ICGD absorbs fees by default) ----
    membership_amount = membership_line["price"] if membership_line else 0.0
    donation_amount = donation["amount"] if donation else 0.0
    base = _money(tickets_subtotal - discount + membership_amount + donation_amount)
    fee_mode = event.get("fee_mode") or "absorb"
    fee_pct, fee_fixed = float(event.get("fee_percent") or 0), float(event.get("fee_fixed") or 0)
    suggested_fee = _money(base * fee_pct / 100 + fee_fixed) if base > 0 else 0.0
    fee = suggested_fee if (fee_mode == "voluntary" and body.cover_fees) else 0.0

    total = _money(base + fee)

    # ---- Membership offers and warnings ----
    notices, offer = [], None
    if not body.membership:
        end = parse_dt(mem.get("end_date"))
        if member and mem.get("status") == "active" and not mem.get("lifetime") and end and end < event_dt \
                and mem.get("plan") not in (None, "", FREE_PLAN):
            notices.append(f"Your membership expires {end:%b %d, %Y}, before this event. Renew now to stay a member.")
            offer = {"reason": "expires_before_event", "plan": mem.get("plan"), "tier": mem.get("tier")}
        elif member and mem.get("status") == "expired" and mem.get("plan") not in (None, "", FREE_PLAN):
            notices.append("Your membership has expired. Renew in this order to get member prices.")
            offer = {"reason": "expired", "plan": mem.get("plan"), "tier": mem.get("tier")}
        elif not is_member and member_savings > 0:
            offer = {"reason": "join", "plan": None, "tier": None}
    if offer is not None:
        offer["member_savings"] = _money(member_savings)

    return {
        "event_id": event["id"],
        "period": {"id": period["id"], "name": period.get("name"), "ends": period.get("end")} if period else None,
        "lines": lines,
        "tickets_subtotal": tickets_subtotal,
        "promo_code": promo_code, "promo_error": promo_error, "discount": _money(discount),
        "membership": membership_line,
        "donation": donation,
        "fee_mode": fee_mode, "suggested_fee": suggested_fee, "fee_contribution": fee,
        "total": total,
        "notices": notices, "membership_offer": offer,
        "is_member": is_member,
        "member_tickets": {"limit": ticket_allowance, "used": member_tickets_used,
                           "this_order": sum(1 for l in lines if l.get("category") == "member")} if member else None,
        "sponsor": {"id": sponsor["id"], "company": sponsor.get("company"), "tier": sponsor.get("tier"),
                    "code": sponsor.get("sponsor_code")} if sponsor else None,
    }


# ===================== Public endpoints =====================
async def _load_event(event_id: str) -> dict:
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(404, "Event not found")
    return event


def _public_line(l: dict) -> dict:
    return {k: l.get(k) for k in ("ticket_type_id", "ticket_type_name", "label", "kind", "name", "family_member_id",
                                  "sponsor_person_id", "category", "reason", "price", "non_member_price", "member_price")}


@public_router.post("/events/{event_id}/quote")
async def checkout_quote(event_id: str, body: CheckoutRequest, authorization: Optional[str] = Header(None)):
    """Itemized price for the current selection — nothing is saved."""
    event = await _load_event(event_id)
    member = await _member_from(authorization)
    q = await build_checkout(event, body, member, strict=False)
    q["lines"] = [_public_line(l) for l in q["lines"]]
    return q


@public_router.get("/events/{event_id}/checkout-options")
async def checkout_options(event_id: str):
    """What the checkout should offer: current period, donation prompt, fee option."""
    event = await _load_event(event_id)
    period, state = current_period(event, now_et())
    s = await db.site_settings.find_one({"id": "main"}) or {}
    presets = [p for p in (s.get("donation_presets") or DEFAULT_DONATION_PRESETS) if float(p) > 0]
    return {
        "period": {"id": period["id"], "name": period.get("name"), "start": period.get("start"), "end": period.get("end")} if period else None,
        "period_state": state,
        "periods": [{"id": p["id"], "name": p.get("name"), "start": p.get("start"), "end": p.get("end")} for p in sorted_periods(event)],
        "donations_enabled": event.get("donations_enabled") is not False,
        "donation_presets": presets,
        "donation_title": s.get("donation_title") or "Support India Club",
        "donation_text": s.get("donation_text") or ("Your additional contribution helps ICGD continue bringing our community "
                                                    "together through cultural, educational, and community programs."),
        "fee_mode": event.get("fee_mode") or "absorb",
        "fee_percent": float(event.get("fee_percent") or 0), "fee_fixed": float(event.get("fee_fixed") or 0),
        "timezone": "America/New_York",
    }


@public_router.post("/events/{event_id}/purchase-tickets")
async def purchase_tickets(event_id: str, body: CheckoutRequest, authorization: Optional[str] = Header(None)):
    event = await _load_event(event_id)
    if not body.buyer_name.strip() or not body.buyer_email:
        raise HTTPException(400, "Your name and email are required")
    if body.payment_method not in PAYMENT_METHODS:
        raise HTTPException(400, "Invalid payment method")
    member = await _member_from(authorization)
    q = await build_checkout(event, body, member, strict=True)
    return await _create_order(event, body, member, q, payment_method=body.payment_method, actor="buyer")


async def _create_order(event: dict, body: CheckoutRequest, member: Optional[dict], q: dict,
                        payment_method: str, actor: str, status: Optional[str] = None, extra: Optional[dict] = None) -> dict:
    now = datetime.utcnow()
    if status is None:
        status = "paid" if q["total"] == 0 else ("awaiting_check" if payment_method == "check" else "pending")
    tickets, agg = [], {}
    for l in q["lines"]:
        key = (l["ticket_type_id"], l["price"], l["label"])
        agg.setdefault(key, {"ticket_type_id": l["ticket_type_id"], "ticket_type_name": l["label"],
                             "unit_price": l["price"], "quantity": 0})["quantity"] += 1
        tickets.append({
            "code": new_ticket_code(), "ticket_type_id": l["ticket_type_id"], "ticket_type_name": l["ticket_type_name"],
            "attendee_name": l["name"], "kind": l["kind"], "category": l["category"], "reason": l["reason"],
            "family_member_id": l["family_member_id"], "sponsor_person_id": l["sponsor_person_id"],
            "age_band": age_band(l["age"]), "price": l["price"], "checked_in_at": None,
        })
    order = {
        "id": gen_id(), "event_id": event["id"], "event_title": event.get("title", ""),
        "member_id": member["id"] if member else None,
        "buyer_name": body.buyer_name.strip(), "buyer_email": str(body.buyer_email).lower(), "buyer_phone": body.buyer_phone,
        "items": list(agg.values()), "tickets": tickets,
        "period": q["period"],
        "subtotal": q["tickets_subtotal"], "discount": q["discount"], "promo_code": q["promo_code"],
        "membership_purchase": q["membership"],
        "donation": q["donation"],
        "fee_contribution": q["fee_contribution"],
        "total": q["total"],
        "payment_method": "none" if q["total"] == 0 else payment_method,
        "payment_status": status,
        "notes": body.notes or "",
        "sponsorship_id": (q["sponsor"] or {}).get("id"),
        "sponsor_code": (q["sponsor"] or {}).get("code"),
        "sponsor_company": (q["sponsor"] or {}).get("company"),
        "created_at": now, "updated_at": now,
        **(extra or {}),
    }
    await db.ticket_orders.insert_one(order)

    # Sold counters and promo usage
    updated = []
    for t in event.get("ticket_types") or []:
        nt = dict(t)
        nt["quantity_sold"] = int(t.get("quantity_sold") or 0) + sum(
            i["quantity"] for i in order["items"] if i["ticket_type_id"] == t["id"])
        updated.append(nt)
    update = {"ticket_types": updated}
    if order["promo_code"]:
        update["promo_codes"] = [
            {**p, "used": int(p.get("used") or 0) + 1} if (p.get("code") or "").strip().upper() == order["promo_code"] else p
            for p in event.get("promo_codes") or []]
    await db.events.update_one({"id": event["id"]}, {"$set": update})

    if order["donation"]:
        await db.donations.insert_one({
            "id": gen_id(), "name": order["buyer_name"], "email": order["buyer_email"],
            "amount": order["donation"]["amount"], "anonymous": order["donation"]["anonymous"],
            "message": f"Donation with {event.get('title', 'event')} tickets",
            "order_id": order["id"], "event_id": event["id"], "event_title": event.get("title", ""),
            "member_id": order["member_id"], "source": "event_checkout",
            "payment_status": status, "created_at": now,
        })
    if status == "paid":
        await apply_order_payment(order, "paid", actor)
    order = await db.ticket_orders.find_one({"id": order["id"]})
    order.pop("_id", None)
    return order


# ===================== Payment confirmed → finish the order =====================
async def apply_membership_purchase(member_id: str, mp: dict, actor: str, order_id: str):
    m = await db.members.find_one({"id": member_id})
    if not m:
        return
    prev = m.get("membership") or {}
    now = datetime.utcnow()
    purchase = await plan_purchase(prev, mp["plan"], mp.get("tier"), now)
    term = purchase["term"]
    renewing = mp.get("kind") == "renewal"
    membership = {
        **(prev if renewing else {}),
        "plan": mp["plan"], "tier": mp.get("tier"), "status": "active",
        "payment_method": "event-checkout", "payment_status": "paid", "payment_received": True,
        "submitted_at": now, "start_date": parse_dt(prev.get("start_date")) if renewing and prev.get("start_date") else now,
        "end_date": term["end_date"], "lifetime": False,
        "term_kind": purchase["kind"], "term_rule": term["rule"], "promotion": term["promotion"],
        "eligible_promotion": promo_snapshot(purchase["promotion"]), "purchase_base_end": purchase["base_end"],
        "paid_at": now, "approved_at": now, "approved_by": "auto", "scheduled_tier": None,
        "renewed_at": now if renewing else prev.get("renewed_at"),
        "order_id": order_id,
    }
    update = {"membership": membership, "updated_at": now}
    if not m.get("joined_at"):
        update["joined_at"] = now
    await db.members.update_one({"id": member_id}, {"$set": update})
    await record_promotion_use(term)
    await log_history(member_id, "renew" if renewing else "join", actor, previous_end=parse_dt(prev.get("end_date")),
                      new_end=term["end_date"], plan=mp["plan"], tier=mp.get("tier"), rule=term["rule"],
                      promotion=term["promotion"], order_id=order_id)


async def apply_order_payment(order: dict, status: str, actor: str) -> None:
    """Set an order's payment status and finish whatever a confirmed payment unlocks.
    Safe to call repeatedly: the membership is applied once, however many times this runs."""
    now = datetime.utcnow()
    await db.ticket_orders.update_one({"id": order["id"]}, {"$set": {"payment_status": status, "updated_at": now}})
    await db.donations.update_many({"order_id": order["id"]}, {"$set": {"payment_status": status}})
    mp = order.get("membership_purchase")
    if status == "paid" and mp and order.get("member_id"):
        claimed = await db.ticket_orders.update_one(
            {"id": order["id"], "membership_purchase.applied": False},
            {"$set": {"membership_purchase.applied": True, "membership_purchase.applied_at": now}})
        if claimed.modified_count == 1:
            await apply_membership_purchase(order["member_id"], mp, actor, order["id"])


# ===================== Admin =====================
def _actor(request: Request) -> str:
    return getattr(request.state, "admin_user", {}).get("username", "admin")


@admin_router.post("/events/pricing-preview")
async def pricing_preview(event: dict):
    """Price table for an event's settings (saved or not): every period × ticket type × buyer type."""
    try:
        validate_event_pricing(event)
    except ValueError as e:
        raise HTTPException(400, str(e))
    plans = await db.sponsorship_plans.find({"active": True}).sort("order", 1).to_list(20)
    periods = sorted_periods(event) or [None]
    now_utc = datetime.utcnow()
    current, _ = current_period(event, now_et())
    rows = []
    for p in periods:
        for t in event.get("ticket_types") or []:
            nm, mp = period_prices(t, p, now_utc)
            sponsors = {}
            for sp in plans:
                perk = sponsor_perk(event, sp)
                sponsors[sp["name"]] = perk_price(perk, nm, mp) if perk else None
            rows.append({
                "period": p.get("name") if p else "All dates", "period_id": p.get("id") if p else None,
                "start": p.get("start") if p else None, "end": p.get("end") if p else None,
                "current": bool(p and current and p["id"] == current["id"]),
                "ticket_type": t.get("name"), "non_member": nm, "member": mp,
                "child": float(t["child_price"]) if t.get("child_price") is not None else None,
                "sponsors": sponsors,
            })
    return {"rows": rows, "sponsor_levels": [sp["name"] for sp in plans],
            "fee_mode": event.get("fee_mode") or "absorb", "donations_enabled": event.get("donations_enabled") is not False}


@admin_router.post("/events/{event_id}/duplicate")
async def duplicate_event(event_id: str, request: Request):
    event = await _load_event(event_id)
    copy = {k: v for k, v in event.items() if k != "_id"}
    base_slug = f"{event.get('slug') or 'event'}-copy"
    slug, n = base_slug, 2
    while await db.events.find_one({"slug": slug}):
        slug, n = f"{base_slug}-{n}", n + 1
    copy.update(id=gen_id(), slug=slug, title=f"{event.get('title', 'Event')} (copy)", registration_open=False,
                featured=False, created_at=datetime.utcnow())
    copy["ticket_types"] = [{**t, "quantity_sold": 0} for t in event.get("ticket_types") or []]
    copy["promo_codes"] = [{**p, "used": 0} for p in event.get("promo_codes") or []]
    await db.events.insert_one(copy)
    await audit(_actor(request), "event", copy["id"], "duplicate", note=f"Copied from {event.get('title')}")
    copy.pop("_id", None)
    return copy


class CompRequest(BaseModel):
    attendees: List[CheckoutAttendee] = Field(min_length=1)
    buyer_name: str
    buyer_email: EmailStr
    reason: str = Field(min_length=3, max_length=300)


@admin_router.post("/events/{event_id}/comp-tickets")
async def comp_tickets(event_id: str, body: CompRequest, request: Request):
    """Complimentary registrations: real tickets (QR, check-in, capacity) at $0, with a reason on record."""
    event = await _load_event(event_id)
    req = CheckoutRequest(attendees=[CheckoutAttendee(**{**a.model_dump(), "kind": "guest"}) for a in body.attendees],
                          buyer_name=body.buyer_name, buyer_email=body.buyer_email, payment_method="other")
    q = await build_checkout(event, req, None, strict=True, admin_override=True)
    for l in q["lines"]:
        l.update(price=0.0, category="complimentary", reason=f"Complimentary — {body.reason}")
    q.update(tickets_subtotal=0.0, discount=0.0, promo_code=None, donation=None, fee_contribution=0.0, total=0.0)
    order = await _create_order(event, req, None, q, payment_method="comp", actor=_actor(request), status="paid",
                                extra={"complimentary": True, "comp_reason": body.reason, "comp_by": _actor(request)})
    await audit(_actor(request), "ticket_order", order["id"], "comp", note=f"{len(order['tickets'])} complimentary ticket(s): {body.reason}")
    return order


class PriceAdjustment(BaseModel):
    ticket_code: str
    price: float = Field(ge=0)
    reason: str = Field(min_length=3, max_length=300)


@admin_router.post("/ticket-orders/{order_id}/adjust")
async def adjust_ticket_price(order_id: str, body: PriceAdjustment, request: Request):
    order = await db.ticket_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    tickets = order.get("tickets") or []
    t = next((x for x in tickets if x.get("code") == body.ticket_code), None)
    if not t:
        raise HTTPException(404, "Ticket not found in this order")
    old = float(t.get("price") or 0)
    new = _money(body.price)
    t.update(price=new, adjusted_from=old, adjust_reason=body.reason)
    subtotal = _money(sum(float(x.get("price") or 0) for x in tickets))
    discount = min(float(order.get("discount") or 0), subtotal)
    extras = float((order.get("membership_purchase") or {}).get("price") or 0) + \
        float((order.get("donation") or {}).get("amount") or 0) + float(order.get("fee_contribution") or 0)
    total = _money(subtotal - discount + extras)
    await db.ticket_orders.update_one({"id": order_id}, {"$set": {
        "tickets": tickets, "subtotal": subtotal, "discount": discount, "total": total, "updated_at": datetime.utcnow()}})
    await audit(_actor(request), "ticket_order", order_id, "price_adjustment",
                before={"ticket": body.ticket_code, "price": old, "total": order.get("total")},
                after={"ticket": body.ticket_code, "price": new, "total": total}, note=body.reason)
    out = await db.ticket_orders.find_one({"id": order_id})
    out.pop("_id", None)
    return out


@admin_router.get("/audit-log")
async def audit_log(entity: Optional[str] = None, entity_id: Optional[str] = None, limit: int = 300):
    f = {}
    if entity:
        f["entity"] = entity
    if entity_id:
        f["entity_id"] = entity_id
    rows = await db.audit_log.find(f).sort("at", -1).to_list(min(max(limit, 1), 2000))
    for r in rows:
        r.pop("_id", None)
    return rows
