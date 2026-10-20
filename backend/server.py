from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response, Header
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import asyncio
import base64
import logging
import os

load_dotenv(Path(__file__).parent / ".env")

from database import db
from auth import verify_password, hash_password, create_token, require_admin, require_member
from models import (
    LoginRequest, ChangePasswordRequest, Event, News, ExecMember, GalleryImage, Sponsor, Donor,
    Classified, Subscriber, ContactMessage, Donation, MembershipApplication, SponsorshipInquiry,
    EventRegistration, PastPresident, Awardee, TaxReturn, Program, MembershipPlan, gen_id,
    Member, MemberRegisterRequest, MemberLoginRequest, MemberProfileUpdate,
    MemberSubscribeRequest, MemberPasswordChange, MemberRejectRequest, MemberPerk,
    GoogleSignInRequest, SiteSettings, SiteSettingsUpdate, TicketPurchaseRequest, TicketOrder,
    HeroSlide, FeatureHighlight, Testimonial, SiteStat,
    EventCategory, DIFIAward, ConstitutionSection, SponsorshipPlan, Business,
)
from seed import seed_if_empty
from collections import Counter
from family_tickets import (
    member_router as family_member_router, public_router as tickets_public_router,
    admin_router as family_admin_router, age_on, age_band, new_ticket_code,
)
from admin_access import admin_guard, current_admin, ROLES, role_areas, router as admin_users_router
from membership_rules import compute_term, active_promo, year_end, LIFETIME_PLAN
from sponsorships import (
    public_router as sponsorships_public_router, admin_router as sponsorships_admin_router,
    seed_sponsorship_plans, valid_sponsor, expire_sponsorships,
)
from reports import router as reports_router
from community import public_router as community_public_router, admin_router as community_admin_router
from spam import spam_guard


app = FastAPI(title="India Club of Greater Dayton API")
api = APIRouter(prefix="/api")
admin = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])


# ===================== Auth =====================
@api.get("/")
async def root():
    return {"message": "ICGD API is running", "version": "1.0"}


@api.post("/admin/login")
async def login(body: LoginRequest):
    user = await db.admin_users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    return {"token": create_token(user["username"]), "username": user["username"]}


@api.get("/admin/me")
async def me(user: dict = Depends(current_admin)):
    role = user.get("role") or "webmaster"
    return {"username": user["username"], "name": user.get("name") or "", "role": role,
            "role_label": ROLES.get(role, {}).get("label", role), "areas": role_areas(role)}


@api.post("/admin/change-password")
async def change_password(body: ChangePasswordRequest, username: str = Depends(require_admin)):
    user = await db.admin_users.find_one({"username": username})
    if not user or not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(401, "Current password incorrect")
    await db.admin_users.update_one({"username": username}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


# ===================== Members =====================
def _public_member(m: dict) -> dict:
    d = dict(m)
    d.pop("_id", None)
    d.pop("password_hash", None)
    return d


async def _settings() -> dict:
    return await db.site_settings.find_one({"id": "main"}) or {}


@api.post("/members/register", dependencies=[Depends(spam_guard)])
async def member_register(body: MemberRegisterRequest):
    email = body.email.lower()
    existing = await db.members.find_one({"email": email})
    if existing:
        raise HTTPException(409, "Email already registered")
    m = Member(
        email=email,
        password_hash=hash_password(body.password),
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        phone=body.phone,
    )
    d = m.model_dump()
    await db.members.insert_one(d)
    return {"token": create_token(m.id, typ="member"), "member": _public_member(d)}


@api.post("/members/login")
async def member_login(body: MemberLoginRequest):
    email = body.email.lower()
    m = await db.members.find_one({"email": email})
    if not m or not verify_password(body.password, m["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return {"token": create_token(m["id"], typ="member"), "member": _public_member(m)}


@api.post("/members/google-signin")
async def member_google_signin(body: GoogleSignInRequest):
    """Verify a Google ID token and either log in an existing member or create a new one."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as g_requests
        client_id = os.environ.get("GOOGLE_CLIENT_ID")
        if not client_id:
            raise HTTPException(500, "Google sign-in is not configured on the server")
        info = id_token.verify_oauth2_token(body.credential, g_requests.Request(), client_id)
    except ValueError:
        raise HTTPException(401, "Invalid Google credential")

    email = (info.get("email") or "").lower()
    if not email:
        raise HTTPException(400, "Google account did not return an email")

    m = await db.members.find_one({"email": email})
    if not m:
        first_name = info.get("given_name") or (info.get("name") or "Friend").split(" ")[0]
        last_name = info.get("family_name") or ""
        new_member = Member(
            email=email,
            password_hash="",  # Google-only — no local password yet
            first_name=first_name,
            last_name=last_name,
        )
        doc = new_member.model_dump()
        doc["google_id"] = info.get("sub")
        doc["picture"] = info.get("picture")
        await db.members.insert_one(doc)
        m = doc
    else:
        # Link Google to existing account
        await db.members.update_one(
            {"id": m["id"]},
            {"$set": {
                "google_id": info.get("sub"),
                "picture": info.get("picture"),
                "updated_at": datetime.utcnow(),
            }},
        )
        m = await db.members.find_one({"id": m["id"]})

    return {"token": create_token(m["id"], typ="member"), "member": _public_member(m)}


@api.get("/members/me")
async def member_me(member_id: str = Depends(require_member)):
    m = await db.members.find_one({"id": member_id})
    if not m:
        raise HTTPException(404, "Member not found")
    return _public_member(m)


@api.put("/members/me")
async def update_member(body: MemberProfileUpdate, member_id: str = Depends(require_member)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    await db.members.update_one({"id": member_id}, {"$set": update})
    m = await db.members.find_one({"id": member_id})
    return _public_member(m)


@api.post("/members/me/change-password")
async def member_change_password(body: MemberPasswordChange, member_id: str = Depends(require_member)):
    m = await db.members.find_one({"id": member_id})
    if not m or not verify_password(body.current_password, m["password_hash"]):
        raise HTTPException(401, "Current password incorrect")
    await db.members.update_one(
        {"id": member_id},
        {"$set": {"password_hash": hash_password(body.new_password), "updated_at": datetime.utcnow()}},
    )
    return {"ok": True}


@api.post("/members/me/subscribe")
async def member_subscribe(body: MemberSubscribeRequest, member_id: str = Depends(require_member)):
    m = await db.members.find_one({"id": member_id})
    if not m:
        raise HTTPException(404, "Member not found")

    # Validate plan exists
    plan_doc = await db.membership_plans.find_one({"slug": body.plan})
    if not plan_doc:
        raise HTTPException(400, f"Unknown plan: {body.plan}")
    if plan_doc.get("hidden") or body.plan == LIFETIME_PLAN:
        raise HTTPException(400, "This membership type is no longer available")

    # Validate tier (if plan has tiers, tier must be one of them)
    plan_tiers = plan_doc.get("tiers") or []
    if plan_tiers:
        if not body.tier:
            raise HTTPException(400, "Tier is required for this plan")
        valid_tier_slugs = [t.get("slug") for t in plan_tiers]
        if body.tier not in valid_tier_slugs:
            raise HTTPException(400, f"Invalid tier '{body.tier}' for plan '{body.plan}'")

    # Student tier requires school info
    if body.tier == "student" and (not body.school_name or not body.degree_program):
        raise HTTPException(400, "School name and degree program are required for student tier")

    # Validate payment method
    if body.payment_method not in ("paypal", "check", "other"):
        raise HTTPException(400, "Invalid payment method")

    profile_update = {}
    for field in ("address", "address2", "city", "state", "zip", "country", "phone", "gender"):
        v = getattr(body, field, None)
        if v is not None and v != "":
            profile_update[field] = v

    now = datetime.utcnow()
    term = compute_term(body.plan, body.tier, now, await _settings())
    membership = {
        "plan": body.plan,
        "tier": body.tier,
        "status": "active",  # auto-approved on subscription
        "school_name": body.school_name,
        "degree_program": body.degree_program,
        "donation_amount": body.donation_amount or 0,
        "payment_method": body.payment_method,
        "family_count": body.family_count or 1,
        "submitted_at": now,
        "start_date": now,
        "end_date": term["end_date"],
        "lifetime": False,
        "promo_label": term["promo"],
        "approved_at": now,
        "approved_by": "auto",
        "payment_received": False,  # admin marks True once they confirm payment
        "payment_status": "awaiting_check" if body.payment_method == "check" else "pending",
        "rejection_reason": None,
    }

    update = {**profile_update, "membership": membership, "updated_at": datetime.utcnow()}
    await db.members.update_one({"id": member_id}, {"$set": update})
    m = await db.members.find_one({"id": member_id})
    return _public_member(m)


@api.post("/members/me/renew")
async def member_renew(member_id: str = Depends(require_member)):
    """Renew an active or expired membership through Dec 31 (continuing from the
    current end date if it's still in the future; promotions apply to lapsed renewals)."""
    m = await db.members.find_one({"id": member_id})
    if not m:
        raise HTTPException(404, "Member not found")
    mem = m.get("membership") or {}
    if not mem.get("plan"):
        raise HTTPException(400, "No membership to renew — subscribe to a plan first")
    if mem.get("lifetime"):
        raise HTTPException(400, "Lifetime memberships never need renewal")
    now = datetime.utcnow()
    cur_end = mem.get("end_date")
    if isinstance(cur_end, str):
        try:
            cur_end = datetime.fromisoformat(cur_end.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            cur_end = None
    term = compute_term(mem.get("plan"), mem.get("tier"), now, await _settings(), current_end=cur_end)
    await db.members.update_one({"id": member_id}, {"$set": {
        "membership.status": "active",
        "membership.end_date": term["end_date"],
        "membership.promo_label": term["promo"],
        "membership.renewed_at": now,
        "membership.payment_received": False,  # admin marks True once payment received
        "membership.payment_status": "awaiting_check" if mem.get("payment_method") == "check" else "pending",
        "updated_at": now,
    }})
    await db.membership_history.insert_one({
        "id": gen_id(), "member_id": member_id, "action": "renew", "previous_end": cur_end,
        "new_end": term["end_date"], "created_at": now,
    })
    m = await db.members.find_one({"id": member_id})
    return _public_member(m)


@api.get("/membership/quote")
async def membership_quote(plan: str, tier: Optional[str] = None):
    """Valid-through date and any active promotion, shown before a member signs up."""
    now = datetime.utcnow()
    settings = await _settings()
    term = compute_term(plan, tier, now, settings)
    promo = active_promo(settings, now)
    return {
        "valid_through": term["end_date"], "lifetime": term["lifetime"], "promo_label": term["promo"],
        "promo_ends": promo["end"].isoformat() if promo and promo["end"] else None,
    }


@api.post("/events/{event_id}/validate-promo")
async def validate_promo_code(event_id: str, body: dict):
    """Return the discount info for a promo code so the UI can preview before purchase."""
    code = (body.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(400, "Promo code required")
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(404, "Event not found")
    for p in (event.get("promo_codes") or []):
        if (p.get("code") or "").strip().upper() != code:
            continue
        max_uses = int(p.get("max_uses") or 0)
        used = int(p.get("used") or 0)
        if max_uses and used >= max_uses:
            raise HTTPException(400, "Promo code usage limit reached")
        return {
            "code": code,
            "kind": (p.get("kind") or "percent").lower(),
            "value": float(p.get("value") or 0),
            "remaining": (max_uses - used) if max_uses else None,
        }
    raise HTTPException(404, f"Promo code '{body.get('code')}' not found for this event")


# ===================== Files =====================
@api.post("/files/upload")
async def upload_file(file: UploadFile = File(...), _: str = Depends(require_admin)):
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large (5MB max)")
    fid = gen_id()
    await db.files.insert_one({
        "id": fid, "filename": file.filename or "file",
        "mime_type": file.content_type or "application/octet-stream",
        "data_base64": base64.b64encode(raw).decode("utf-8"),
    })
    return {"id": fid, "url": f"/api/files/{fid}"}


@api.get("/files/{fid}")
async def get_file(fid: str):
    doc = await db.files.find_one({"id": fid})
    if not doc:
        raise HTTPException(404, "Not found")
    return Response(content=base64.b64decode(doc["data_base64"]), media_type=doc["mime_type"])


# Helper for stripping mongo _id
def _strip(d):
    if d is None:
        return None
    if isinstance(d, list):
        return [_strip(x) for x in d]
    if "_id" in d:
        d.pop("_id", None)
    return d


# ===================== Public CRUD-like reads =====================
async def _list(coll, sort_field="created_at", asc=False, filter_=None):
    cursor = db[coll].find(filter_ or {}).sort(sort_field, 1 if asc else -1)
    items = await cursor.to_list(1000)
    return _strip(items)


@api.get("/events")
async def list_events(featured: Optional[bool] = None, limit: Optional[int] = None):
    f = {}
    if featured is not None:
        f["featured"] = bool(featured)
    cursor = db.events.find(f).sort("created_at", -1)
    if limit and limit > 0:
        cursor = cursor.limit(int(limit))
    return _strip(await cursor.to_list(2000))


@api.get("/events/{id}")
async def get_event(id: str):
    e = await db.events.find_one({"id": id})
    if not e:
        raise HTTPException(404, "Not found")
    return _strip(e)


@api.post("/events/{id}/register", dependencies=[Depends(spam_guard)])
async def register_event(id: str, body: EventRegistration):
    e = await db.events.find_one({"id": id})
    if not e:
        raise HTTPException(404, "Event not found")
    body.event_id = id
    await db.event_registrations.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.get("/news")
async def list_news():
    return _strip(await db.news.find({"published": True}).sort("published_at", -1).to_list(200))


@api.get("/exec-team")
async def list_exec():
    return _strip(await db.exec_team.find({"active": True}).sort("order", 1).to_list(100))


@api.get("/gallery")
async def list_gallery():
    return _strip(await db.gallery.find().sort("created_at", -1).to_list(500))


@api.get("/sponsors")
async def list_sponsors():
    return _strip(await db.sponsors.find({"active": True}).sort("order", 1).to_list(200))


@api.get("/donors")
async def list_donors():
    return _strip(await db.donors.find().sort("year", -1).to_list(200))


@api.get("/classifieds")
async def list_classifieds(category: Optional[str] = None, location: Optional[str] = None,
                           authorization: Optional[str] = Header(None)):
    f = {"status": "approved"}
    if category and category != "All":
        f["category"] = category
    if location and location != "All":
        f["location"] = location
    items = _strip(await db.classifieds.find(f).sort("created_at", -1).to_list(500))
    if (await _settings()).get("classifieds_members_only"):
        from auth import decode_token
        token = authorization.split(" ", 1)[1].strip() if authorization and authorization.startswith("Bearer ") else ""
        if not (token and decode_token(token, expected_typ="member")):
            for c in items:
                c["contact"] = None
                c["contact_hidden"] = True
    return items


@api.post("/classifieds", dependencies=[Depends(spam_guard)])
async def submit_classified(body: Classified, authorization: Optional[str] = Header(None)):
    from auth import decode_token
    mid = None
    if authorization and authorization.startswith("Bearer "):
        mid = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member")
    if (await _settings()).get("classifieds_members_only") and not mid:
        raise HTTPException(401, "Please sign in as a member to post a classified")
    body.member_id = mid
    body.status = "pending"
    await db.classifieds.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/subscribers", dependencies=[Depends(spam_guard)])
async def subscribe(body: Subscriber):
    existing = await db.subscribers.find_one({"email": body.email})
    if existing:
        return {"ok": True, "already": True}
    await db.subscribers.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/contact", dependencies=[Depends(spam_guard)])
async def contact(body: ContactMessage):
    await db.contact_messages.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/donations", dependencies=[Depends(spam_guard)])
async def donate(body: Donation):
    await db.donations.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/membership-applications", dependencies=[Depends(spam_guard)])
async def membership_apply(body: MembershipApplication):
    await db.membership_applications.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/sponsorship-inquiries", dependencies=[Depends(spam_guard)])
async def sponsor_inquiry(body: SponsorshipInquiry):
    await db.sponsorship_inquiries.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.get("/past-presidents")
async def list_pp():
    return _strip(await db.past_presidents.find().sort("order", 1).to_list(100))


@api.get("/awardees")
async def list_awardees(type: Optional[str] = None):
    f = {"type": type} if type else {}
    return _strip(await db.awardees.find(f).sort("year", -1).to_list(100))


@api.get("/tax-returns")
async def list_tax():
    return _strip(await db.tax_returns.find().sort("year", -1).to_list(100))


@api.get("/programs")
async def list_programs():
    return _strip(await db.programs.find().sort("order", 1).to_list(100))


@api.get("/programs/{slug}")
async def get_program(slug: str):
    p = await db.programs.find_one({"slug": slug})
    if not p:
        raise HTTPException(404, "Not found")
    return _strip(p)


@api.get("/membership-plans")
async def list_plans():
    return _strip(await db.membership_plans.find({"hidden": {"$ne": True}}).sort("order", 1).to_list(100))


@api.get("/perks")
async def list_perks():
    return _strip(await db.perks.find({"active": True}).sort("order", 1).to_list(200))


@api.get("/hero-slides")
async def list_hero_slides():
    return _strip(await db.hero_slides.find({"active": True}).sort("order", 1).to_list(50))


@api.get("/feature-highlights")
async def list_feature_highlights():
    return _strip(await db.feature_highlights.find({"active": True}).sort("order", 1).to_list(50))


@api.get("/testimonials")
async def list_testimonials():
    return _strip(await db.testimonials.find({"active": True}).sort("order", 1).to_list(100))


@api.get("/site-stats")
async def list_site_stats():
    return _strip(await db.site_stats.find({"active": True}).sort("order", 1).to_list(20))


@api.get("/event-categories")
async def list_event_categories():
    return _strip(await db.event_categories.find({"active": True}).sort("order", 1).to_list(50))


@api.get("/event-categories/{slug}")
async def get_event_category(slug: str):
    d = await db.event_categories.find_one({"slug": slug})
    if not d:
        raise HTTPException(404, "Not found")
    return _strip(d)


@api.get("/difi-awards")
async def list_difi_awards():
    return _strip(await db.difi_awards.find({"active": True}).sort("year", -1).to_list(100))


@api.get("/constitution")
async def list_constitution():
    return _strip(await db.constitution_sections.find({"active": True}).sort("order", 1).to_list(50))


@api.get("/site-settings")
async def get_site_settings():
    s = await db.site_settings.find_one({"id": "main"})
    if not s:
        default = SiteSettings().model_dump()
        await db.site_settings.insert_one(default)
        s = default
    s.pop("_id", None)
    return s


# -------- Event Ticket Purchase (public, optionally as member) --------
def _parse_dt(d):
    if not d:
        return None
    if isinstance(d, datetime):
        return d
    try:
        return datetime.fromisoformat(str(d).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return None


def _effective_ticket_price(t: dict, is_active_member: bool, now: datetime, is_sponsor: bool = False) -> float:
    """Pick the right price for a ticket given sponsor/member status + early-bird window.
    Precedence: sponsor price (valid sponsor code) → early-bird (if active) → member price → regular price.
    """
    if is_sponsor and t.get("sponsor_price") is not None:
        return float(t["sponsor_price"])
    eb_end = _parse_dt(t.get("early_bird_end_date"))
    eb_price = t.get("early_bird_price")
    if eb_price is not None and eb_end and now <= eb_end:
        return float(eb_price)
    mem_price = t.get("member_price")
    if is_active_member and mem_price is not None:
        return float(mem_price)
    return float(t.get("price") or 0)


@api.post("/events/{event_id}/purchase-tickets")
async def purchase_tickets(event_id: str, body: TicketPurchaseRequest, authorization: Optional[str] = Header(None)):
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(404, "Event not found")
    types = event.get("ticket_types") or []
    if not types:
        raise HTTPException(400, "This event does not have tickets configured")

    # Optional member token (member-only types require this)
    member = None
    if authorization and authorization.startswith("Bearer "):
        from auth import decode_token
        mid = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member")
        if mid:
            member = await db.members.find_one({"id": mid})
    is_active_member = bool(member and (member.get("membership") or {}).get("status") == "active")
    sponsor = None
    if body.sponsor_code:
        sponsor = await valid_sponsor(body.sponsor_code)
        if not sponsor:
            raise HTTPException(400, "Sponsor code is not valid or the sponsorship has expired")

    types_by_id = {t["id"]: t for t in types}
    now = datetime.utcnow()
    event_dt = _parse_dt(event.get("start_date")) or now
    lines = []  # one entry per attendee/ticket
    if body.attendees:
        fam_ids = [a.get("family_member_id") for a in body.attendees if a.get("family_member_id")]
        fams = {}
        if fam_ids:
            if not member:
                raise HTTPException(401, "Sign in to book tickets for family members")
            fams = {f["id"]: f for f in await db.family_members.find({"id": {"$in": fam_ids}, "member_id": member["id"]}).to_list(100)}
        seen = set()
        for a in body.attendees:
            fid = a.get("family_member_id")
            age = None
            if fid:
                if fid in seen:
                    raise HTTPException(400, "A family member can only be added once per order")
                seen.add(fid)
                f = fams.get(fid)
                if not f:
                    raise HTTPException(400, "Family member not found in your family group")
                if f.get("status") != "approved":
                    raise HTTPException(400, f"{f['name']} is not verified yet — an admin must approve them first")
                name = f["name"]
                age = age_on(f.get("date_of_birth"), event_dt)
            else:
                name = (a.get("name") or "").strip()
                if not name:
                    raise HTTPException(400, "Each attendee needs a name")
            lines.append({"ticket_type_id": a.get("ticket_type_id"), "attendee_name": name[:120], "family_member_id": fid, "age": age})
    else:
        for item in body.items:
            qty = int(item.get("quantity") or 0)
            for _ in range(max(0, qty)):
                n = len(lines)
                lines.append({
                    "ticket_type_id": item.get("ticket_type_id"),
                    "attendee_name": body.buyer_name if n == 0 else f"{body.buyer_name} – Guest {n}",
                    "family_member_id": None, "age": None,
                })

    if not lines:
        raise HTTPException(400, "Please select at least one ticket")
    if len(lines) > 30:
        raise HTTPException(400, "Maximum 30 tickets per order")

    counts = Counter(l["ticket_type_id"] for l in lines)
    for tid, qty in counts.items():
        t = types_by_id.get(tid)
        if not t:
            raise HTTPException(400, f"Unknown ticket type {tid}")
        if t.get("members_only") and not is_active_member:
            raise HTTPException(403, f"Ticket '{t['name']}' is for active members only")
        ss = _parse_dt(t.get("sale_start"))
        se = _parse_dt(t.get("sale_end"))
        if ss and now < ss:
            raise HTTPException(400, f"Ticket '{t['name']}' is not on sale yet")
        if se and now > se:
            raise HTTPException(400, f"Ticket '{t['name']}' sales have ended")
        total_q = int(t.get("quantity_total") or 0)
        sold_q = int(t.get("quantity_sold") or 0)
        if total_q and sold_q + qty > total_q:
            raise HTTPException(400, f"Only {total_q - sold_q} '{t['name']}' tickets remain")

    agg = {}
    tickets = []
    subtotal = 0.0
    for l in lines:
        t = types_by_id[l["ticket_type_id"]]
        band = age_band(l["age"])
        price = _effective_ticket_price(t, is_active_member, now, is_sponsor=bool(sponsor))
        label = t["name"]
        if band == "infant":
            price, label = 0.0, f"{t['name']} (Under 3)"
        elif band == "child" and t.get("child_price") is not None:
            price, label = min(price, float(t["child_price"])), f"{t['name']} (Child)"
        key = (t["id"], price, label)
        if key not in agg:
            agg[key] = {"ticket_type_id": t["id"], "ticket_type_name": label, "unit_price": price, "quantity": 0}
        agg[key]["quantity"] += 1
        subtotal += price
        tickets.append({
            "code": new_ticket_code(),
            "ticket_type_id": t["id"],
            "ticket_type_name": t["name"],
            "attendee_name": l["attendee_name"],
            "family_member_id": l["family_member_id"],
            "age_band": band,
            "price": price,
            "checked_in_at": None,
        })
    order_items = list(agg.values())

    # Promo code application
    discount = 0.0
    promo_applied = None
    if body.promo_code:
        code_norm = body.promo_code.strip().upper()
        promos = event.get("promo_codes") or []
        for p in promos:
            if (p.get("code") or "").strip().upper() != code_norm:
                continue
            max_uses = int(p.get("max_uses") or 0)
            used = int(p.get("used") or 0)
            if max_uses and used >= max_uses:
                raise HTTPException(400, "Promo code usage limit reached")
            kind = (p.get("kind") or "percent").lower()
            value = float(p.get("value") or 0)
            if kind == "percent":
                discount = subtotal * (value / 100.0)
            else:
                discount = min(value, subtotal)
            promo_applied = code_norm
            break
        if promo_applied is None:
            raise HTTPException(400, f"Invalid promo code '{body.promo_code}'")

    total = max(0.0, subtotal - discount)

    order = TicketOrder(
        event_id=event_id,
        event_title=event.get("title", ""),
        member_id=member.get("id") if member else None,
        buyer_name=body.buyer_name,
        buyer_email=body.buyer_email,
        buyer_phone=body.buyer_phone,
        items=[],
        subtotal=subtotal,
        total=total,
        payment_method=body.payment_method,
        payment_status="awaiting_check" if body.payment_method == "check" else "pending",
        notes=body.notes or "",
    ).model_dump()
    order["items"] = order_items
    order["tickets"] = tickets
    if promo_applied:
        order["promo_code"] = promo_applied
        order["discount"] = round(discount, 2)
    if sponsor:
        order["sponsor_code"] = sponsor["sponsor_code"]
        order["sponsor_company"] = sponsor.get("company")
    await db.ticket_orders.insert_one(order)

    # Increment sold counters on the event
    updated_types = []
    for t in types:
        sold_inc = sum(i["quantity"] for i in order_items if i["ticket_type_id"] == t["id"])
        nt = dict(t)
        nt["quantity_sold"] = int(t.get("quantity_sold") or 0) + sold_inc
        updated_types.append(nt)
    update_doc = {"ticket_types": updated_types}
    if promo_applied:
        new_promos = []
        for p in (event.get("promo_codes") or []):
            np = dict(p)
            if (np.get("code") or "").strip().upper() == promo_applied:
                np["used"] = int(np.get("used") or 0) + 1
            new_promos.append(np)
        update_doc["promo_codes"] = new_promos
    await db.events.update_one({"id": event_id}, {"$set": update_doc})

    order.pop("_id", None)
    return order


# ===================== Admin CRUD =====================
COLLECTIONS = {
    "events": Event,
    "news": News,
    "exec-team": ExecMember,
    "gallery": GalleryImage,
    "sponsors": Sponsor,
    "donors": Donor,
    "classifieds": Classified,
    "past-presidents": PastPresident,
    "awardees": Awardee,
    "tax-returns": TaxReturn,
    "programs": Program,
    "membership-plans": MembershipPlan,
    "perks": MemberPerk,
    "hero-slides": HeroSlide,
    "feature-highlights": FeatureHighlight,
    "testimonials": Testimonial,
    "site-stats": SiteStat,
    "event-categories": EventCategory,
    "difi-awards": DIFIAward,
    "constitution": ConstitutionSection,
    "sponsorship-plans": SponsorshipPlan,
    "businesses": Business,
}
COLL_NAMES = {
    "events": "events", "news": "news", "exec-team": "exec_team", "gallery": "gallery",
    "sponsors": "sponsors", "donors": "donors", "classifieds": "classifieds",
    "past-presidents": "past_presidents", "awardees": "awardees", "tax-returns": "tax_returns",
    "programs": "programs", "membership-plans": "membership_plans", "perks": "perks",
    "hero-slides": "hero_slides", "feature-highlights": "feature_highlights",
    "testimonials": "testimonials", "site-stats": "site_stats",
    "event-categories": "event_categories", "difi-awards": "difi_awards",
    "constitution": "constitution_sections",
    "sponsorship-plans": "sponsorship_plans", "businesses": "businesses",
}

# Generic admin CRUD endpoints
def register_admin_crud(name: str, model_cls, coll: str):
    @admin.get(f"/{name}", name=f"admin_list_{name}")
    async def list_all():
        return _strip(await db[coll].find().sort("created_at", -1).to_list(1000))

    @admin.get(f"/{name}/{{id}}", name=f"admin_get_{name}")
    async def get_one(id: str):
        d = await db[coll].find_one({"id": id})
        if not d:
            raise HTTPException(404, "Not found")
        return _strip(d)

    @admin.post(f"/{name}", name=f"admin_create_{name}")
    async def create(body: dict):
        # Validate via model class
        obj = model_cls(**{k: v for k, v in body.items() if v is not None})
        d = obj.model_dump()
        await db[coll].insert_one(d)
        return _strip(d)

    @admin.put(f"/{name}/{{id}}", name=f"admin_update_{name}")
    async def update(id: str, body: dict):
        body.pop("_id", None)
        body.pop("id", None)
        await db[coll].update_one({"id": id}, {"$set": body})
        d = await db[coll].find_one({"id": id})
        return _strip(d)

    @admin.delete(f"/{name}/{{id}}", name=f"admin_delete_{name}")
    async def delete(id: str):
        r = await db[coll].delete_one({"id": id})
        return {"ok": True, "deleted": r.deleted_count}


for name, cls in COLLECTIONS.items():
    register_admin_crud(name, cls, COLL_NAMES[name])


# Admin read-only inbox-style endpoints
INBOX_COLLECTIONS = {
    "membership-applications": "membership_applications",
    "subscribers": "subscribers",
    "contact-messages": "contact_messages",
    "donations": "donations",
    "sponsorship-inquiries": "sponsorship_inquiries",
    "event-registrations": "event_registrations",
}


def register_inbox(name: str, coll: str):
    @admin.get(f"/{name}", name=f"admin_inbox_{name}")
    async def list_inbox():
        return _strip(await db[coll].find().sort("created_at", -1).to_list(2000))

    @admin.delete(f"/{name}/{{id}}", name=f"admin_del_inbox_{name}")
    async def delete_one(id: str):
        r = await db[coll].delete_one({"id": id})
        return {"ok": True, "deleted": r.deleted_count}


for name, coll in INBOX_COLLECTIONS.items():
    register_inbox(name, coll)


# Classifieds approval
@admin.post("/classifieds/{id}/approve")
async def approve_classified(id: str):
    await db.classifieds.update_one({"id": id}, {"$set": {"status": "approved"}})
    return {"ok": True}


@admin.post("/classifieds/{id}/reject")
async def reject_classified(id: str):
    await db.classifieds.update_one({"id": id}, {"$set": {"status": "rejected"}})
    return {"ok": True}


# ===================== Admin Members =====================
@admin.get("/members")
async def admin_list_members(status: Optional[str] = None):
    f = {}
    if status and status != "all":
        f["membership.status"] = status
    items = await db.members.find(f).sort("created_at", -1).to_list(2000)
    return [_public_member(m) for m in items]


@admin.get("/members/{id}")
async def admin_get_member(id: str):
    m = await db.members.find_one({"id": id})
    if not m:
        raise HTTPException(404, "Not found")
    return _public_member(m)


@admin.post("/members/{id}/approve")
async def admin_approve_member(id: str, username: str = Depends(require_admin)):
    m = await db.members.find_one({"id": id})
    if not m:
        raise HTTPException(404, "Not found")
    now = datetime.utcnow()
    mem = m.get("membership") or {}
    term = compute_term(mem.get("plan"), mem.get("tier"), now, await _settings())
    await db.members.update_one({"id": id}, {"$set": {
        "membership.status": "active",
        "membership.start_date": now,
        "membership.end_date": term["end_date"],
        "membership.lifetime": term["lifetime"],
        "membership.approved_at": now,
        "membership.approved_by": username,
        "membership.rejection_reason": None,
        "updated_at": now,
    }})
    return {"ok": True}


@admin.post("/members/{id}/reject")
async def admin_reject_member(id: str, body: MemberRejectRequest):
    await db.members.update_one({"id": id}, {"$set": {
        "membership.status": "rejected",
        "membership.rejection_reason": body.reason or "",
        "updated_at": datetime.utcnow(),
    }})
    return {"ok": True}


PAYMENT_STATUSES = ("pending", "awaiting_check", "paid", "failed", "refunded")


@admin.post("/members/{id}/mark-paid")
async def admin_mark_paid(id: str, paid: bool = True, status: Optional[str] = None):
    status = status or ("paid" if paid else "pending")
    if status not in PAYMENT_STATUSES:
        raise HTTPException(400, "Invalid status")
    await db.members.update_one({"id": id}, {"$set": {
        "membership.payment_received": status == "paid",
        "membership.payment_status": status,
        "updated_at": datetime.utcnow(),
    }})
    return {"ok": True}


@admin.post("/members/{id}/lifetime")
async def admin_set_lifetime(id: str, lifetime: bool = True):
    """Grant (or remove) a legacy lifetime membership. Lifetime members never expire."""
    m = await db.members.find_one({"id": id})
    if not m:
        raise HTTPException(404, "Not found")
    now = datetime.utcnow()
    if lifetime:
        update = {"membership.plan": LIFETIME_PLAN, "membership.tier": None, "membership.lifetime": True,
                  "membership.status": "active", "membership.end_date": None,
                  "membership.start_date": (m.get("membership") or {}).get("start_date") or now,
                  "membership.payment_received": True, "membership.payment_status": "paid"}
    else:
        update = {"membership.lifetime": False, "membership.plan": "regular", "membership.tier": "individual",
                  "membership.end_date": year_end(now.year)}
    await db.members.update_one({"id": id}, {"$set": {**update, "updated_at": now}})
    return _public_member(await db.members.find_one({"id": id}))


@admin.get("/site-settings")
async def admin_get_site_settings():
    s = await db.site_settings.find_one({"id": "main"})
    if not s:
        default = SiteSettings().model_dump()
        await db.site_settings.insert_one(default)
        s = default
    s.pop("_id", None)
    return s


@admin.put("/site-settings")
async def admin_update_site_settings(body: SiteSettingsUpdate):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    await db.site_settings.update_one({"id": "main"}, {"$set": update}, upsert=True)
    s = await db.site_settings.find_one({"id": "main"})
    s.pop("_id", None)
    return s


@admin.get("/ticket-orders")
async def admin_list_ticket_orders(event_id: Optional[str] = None, status: Optional[str] = None):
    f = {}
    if event_id: f["event_id"] = event_id
    if status: f["payment_status"] = status
    return _strip(await db.ticket_orders.find(f).sort("created_at", -1).to_list(2000))


@admin.post("/ticket-orders/{order_id}/mark-paid")
async def admin_mark_order_paid(order_id: str, status: str = "paid"):
    if status not in PAYMENT_STATUSES:
        raise HTTPException(400, "Invalid status")
    await db.ticket_orders.update_one({"id": order_id}, {"$set": {"payment_status": status}})
    return {"ok": True}


@admin.delete("/ticket-orders/{order_id}")
async def admin_delete_ticket_order(order_id: str):
    # Decrement sold counters when deleting
    order = await db.ticket_orders.find_one({"id": order_id})
    if order:
        event = await db.events.find_one({"id": order["event_id"]})
        if event and event.get("ticket_types"):
            updated = []
            for t in event["ticket_types"]:
                nt = dict(t)
                refund_qty = sum(i["quantity"] for i in order.get("items", []) if i["ticket_type_id"] == t["id"])
                nt["quantity_sold"] = max(0, int(t.get("quantity_sold") or 0) - refund_qty)
                updated.append(nt)
            await db.events.update_one({"id": order["event_id"]}, {"$set": {"ticket_types": updated}})
    await db.ticket_orders.delete_one({"id": order_id})
    return {"ok": True}


@admin.delete("/members/{id}")
async def admin_delete_member(id: str):
    r = await db.members.delete_one({"id": id})
    return {"ok": True, "deleted": r.deleted_count}


# Legacy membership-applications approval (for anonymous submissions)
@admin.post("/membership-applications/{id}/approve")
async def approve_membership_app(id: str):
    await db.membership_applications.update_one({"id": id}, {"$set": {"status": "approved"}})
    return {"ok": True}


@admin.post("/membership-applications/{id}/reject")
async def reject_membership_app(id: str):
    await db.membership_applications.update_one({"id": id}, {"$set": {"status": "rejected"}})
    return {"ok": True}


# Dashboard stats
@admin.get("/stats")
async def stats():
    return {
        "members": await db.members.count_documents({}),
        "members_active": await db.members.count_documents({"membership.status": "active"}),
        "members_pending": await db.members.count_documents({"membership.status": "pending"}),
        "applications": await db.membership_applications.count_documents({}),
        "subscribers": await db.subscribers.count_documents({}),
        "donations": await db.donations.count_documents({}),
        "contact": await db.contact_messages.count_documents({}),
        "events": await db.events.count_documents({}),
        "news": await db.news.count_documents({}),
        "gallery": await db.gallery.count_documents({}),
        "sponsors": await db.sponsors.count_documents({}),
        "classifieds_pending": await db.classifieds.count_documents({"status": "pending"}),
        "registrations": await db.event_registrations.count_documents({}),
        "sponsorship_inquiries": await db.sponsorship_inquiries.count_documents({}),
        "family_pending": await db.family_members.count_documents({"status": "pending"}),
        "sponsorships_pending": await db.sponsorships.count_documents({"status": "pending"}),
        "sponsorships_active": await db.sponsorships.count_documents({"status": "active"}),
        "businesses_pending": await db.businesses.count_documents({"status": "pending"}),
    }


# ===================== App wiring =====================
app.include_router(family_member_router)
app.include_router(tickets_public_router)
app.include_router(family_admin_router)
app.include_router(admin_users_router)
app.include_router(sponsorships_public_router)
app.include_router(sponsorships_admin_router)
app.include_router(reports_router)
app.include_router(community_public_router)
app.include_router(community_admin_router)
app.include_router(api)
app.include_router(admin)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


async def run_expiry_checks() -> dict:
    """Expire memberships and sponsorships whose end date has passed (lifetime never expires)."""
    now = datetime.utcnow()
    r = await db.members.update_many(
        {"membership.status": "active", "membership.lifetime": {"$ne": True},
         "membership.end_date": {"$lt": now}},
        {"$set": {"membership.status": "expired", "updated_at": now}},
    )
    s = await expire_sponsorships(now)
    if r.modified_count or s:
        logging.info(f"[expiry] expired {r.modified_count} memberships, {s} sponsorships")
    return {"members": r.modified_count, "sponsorships": s}


async def _expiry_loop():
    while True:
        try:
            await run_expiry_checks()
        except Exception as e:
            logging.warning(f"[expiry] check failed: {e}")
        await asyncio.sleep(6 * 3600)


async def run_migrations():
    """Idempotent data updates for requirement changes."""
    for p in await db.membership_plans.find({"tiers.slug": "student"}).to_list(50):
        tiers = [dict(t, name="Youth") if t.get("slug") == "student" and t.get("name") == "Student" else t
                 for t in p["tiers"]]
        await db.membership_plans.update_one({"id": p["id"]}, {"$set": {"tiers": tiers}})
    if not await db.membership_plans.find_one({"slug": LIFETIME_PLAN}):
        await db.membership_plans.insert_one(MembershipPlan(
            slug=LIFETIME_PLAN, name="Lifetime (legacy)", price=0, period="legacy",
            description="Existing lifetime memberships. No longer sold; granted by an admin only.",
            hidden=True, order=99,
        ).model_dump())
    await seed_sponsorship_plans()


_bg_tasks = []


@app.on_event("startup")
async def on_startup():
    await seed_if_empty()
    try:
        await run_migrations()
    except Exception as e:
        logging.warning(f"[startup] migrations skipped: {e}")
    if os.environ.get("DISABLE_BACKGROUND_JOBS") != "1":
        _bg_tasks.append(asyncio.create_task(_expiry_loop()))
    logging.info("ICGD API started + seed verified")


@app.on_event("shutdown")
async def on_shutdown():
    for t in _bg_tasks:
        t.cancel()
