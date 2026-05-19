from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response, Header
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta
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
    HeroSlide, FeatureHighlight, Testimonial, SiteStat
)
from seed import seed_if_empty


app = FastAPI(title="India Club of Greater Dayton API")
api = APIRouter(prefix="/api")
admin = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


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
async def me(username: str = Depends(require_admin)):
    return {"username": username}


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


@api.post("/members/register")
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

    membership = {
        "plan": body.plan,
        "tier": body.tier,
        "status": "active",  # auto-approved on subscription
        "school_name": body.school_name,
        "degree_program": body.degree_program,
        "donation_amount": body.donation_amount or 0,
        "payment_method": body.payment_method,
        "family_count": body.family_count or 1,
        "submitted_at": datetime.utcnow(),
        "start_date": datetime.utcnow(),
        "end_date": datetime.utcnow() + timedelta(days=365),
        "approved_at": datetime.utcnow(),
        "approved_by": "auto",
        "payment_received": False,  # admin marks True once they confirm payment
        "rejection_reason": None,
    }

    update = {**profile_update, "membership": membership, "updated_at": datetime.utcnow()}
    await db.members.update_one({"id": member_id}, {"$set": update})
    m = await db.members.find_one({"id": member_id})
    return _public_member(m)


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


@api.post("/events/{id}/register")
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
async def list_classifieds(category: Optional[str] = None, location: Optional[str] = None):
    f = {"status": "approved"}
    if category and category != "All":
        f["category"] = category
    if location and location != "All":
        f["location"] = location
    return _strip(await db.classifieds.find(f).sort("created_at", -1).to_list(500))


@api.post("/classifieds")
async def submit_classified(body: Classified):
    body.status = "pending"
    await db.classifieds.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/subscribers")
async def subscribe(body: Subscriber):
    existing = await db.subscribers.find_one({"email": body.email})
    if existing:
        return {"ok": True, "already": True}
    await db.subscribers.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/contact")
async def contact(body: ContactMessage):
    await db.contact_messages.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/donations")
async def donate(body: Donation):
    await db.donations.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/membership-applications")
async def membership_apply(body: MembershipApplication):
    await db.membership_applications.insert_one(body.model_dump())
    return {"ok": True, "id": body.id}


@api.post("/sponsorship-inquiries")
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
    return _strip(await db.membership_plans.find().sort("order", 1).to_list(100))


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

    types_by_id = {t["id"]: t for t in types}
    now = datetime.utcnow()
    order_items = []
    subtotal = 0.0

    for item in body.items:
        tid = item.get("ticket_type_id")
        qty = int(item.get("quantity") or 0)
        if qty <= 0:
            continue
        t = types_by_id.get(tid)
        if not t:
            raise HTTPException(400, f"Unknown ticket type {tid}")
        # Member-only check
        if t.get("members_only") and (not member or (member.get("membership") or {}).get("status") != "active"):
            raise HTTPException(403, f"Ticket '{t['name']}' is for active members only")
        # Sale window
        def _parse(d):
            if not d: return None
            if isinstance(d, datetime): return d
            try: return datetime.fromisoformat(str(d).replace("Z", "+00:00")).replace(tzinfo=None)
            except: return None
        ss = _parse(t.get("sale_start")); se = _parse(t.get("sale_end"))
        if ss and now < ss:
            raise HTTPException(400, f"Ticket '{t['name']}' is not on sale yet")
        if se and now > se:
            raise HTTPException(400, f"Ticket '{t['name']}' sales have ended")
        # Quantity
        total_q = int(t.get("quantity_total") or 0)
        sold_q = int(t.get("quantity_sold") or 0)
        if total_q and sold_q + qty > total_q:
            available = total_q - sold_q
            raise HTTPException(400, f"Only {available} '{t['name']}' tickets remain")

        price = float(t.get("price") or 0)
        order_items.append({
            "ticket_type_id": tid,
            "ticket_type_name": t["name"],
            "unit_price": price,
            "quantity": qty,
        })
        subtotal += price * qty

    if not order_items:
        raise HTTPException(400, "Please select at least one ticket")

    order = TicketOrder(
        event_id=event_id,
        event_title=event.get("title", ""),
        member_id=member.get("id") if member else None,
        buyer_name=body.buyer_name,
        buyer_email=body.buyer_email,
        buyer_phone=body.buyer_phone,
        items=[],
        subtotal=subtotal,
        total=subtotal,
        payment_method=body.payment_method,
        payment_status="pending",
        notes=body.notes or "",
    ).model_dump()
    order["items"] = order_items
    await db.ticket_orders.insert_one(order)

    # Increment sold counters on the event
    updated_types = []
    for t in types:
        sold_inc = sum(i["quantity"] for i in order_items if i["ticket_type_id"] == t["id"])
        nt = dict(t)
        nt["quantity_sold"] = int(t.get("quantity_sold") or 0) + sold_inc
        updated_types.append(nt)
    await db.events.update_one({"id": event_id}, {"$set": {"ticket_types": updated_types}})

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
}
COLL_NAMES = {
    "events": "events", "news": "news", "exec-team": "exec_team", "gallery": "gallery",
    "sponsors": "sponsors", "donors": "donors", "classifieds": "classifieds",
    "past-presidents": "past_presidents", "awardees": "awardees", "tax-returns": "tax_returns",
    "programs": "programs", "membership-plans": "membership_plans", "perks": "perks",
    "hero-slides": "hero_slides", "feature-highlights": "feature_highlights",
    "testimonials": "testimonials", "site-stats": "site_stats",
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
    end = now + timedelta(days=365)
    await db.members.update_one({"id": id}, {"$set": {
        "membership.status": "active",
        "membership.start_date": now,
        "membership.end_date": end,
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


@admin.post("/members/{id}/mark-paid")
async def admin_mark_paid(id: str, paid: bool = True):
    await db.members.update_one({"id": id}, {"$set": {
        "membership.payment_received": bool(paid),
        "updated_at": datetime.utcnow(),
    }})
    return {"ok": True}


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
    if status not in ("pending", "paid", "refunded"):
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
    }


# ===================== App wiring =====================
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


@app.on_event("startup")
async def on_startup():
    await seed_if_empty()
    logging.info("ICGD API started + seed verified")


@app.on_event("shutdown")
async def on_shutdown():
    pass


logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
async def on_startup():
    await seed_if_empty()
    logging.info("ICGD API started + seed verified")


@app.on_event("shutdown")
async def on_shutdown():
    pass
