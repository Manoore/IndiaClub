from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response
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
    MemberSubscribeRequest, MemberPasswordChange, MemberRejectRequest, MemberPerk
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
        "status": "pending",
        "school_name": body.school_name,
        "degree_program": body.degree_program,
        "donation_amount": body.donation_amount or 0,
        "payment_method": body.payment_method,
        "family_count": body.family_count or 1,
        "submitted_at": datetime.utcnow(),
        "start_date": None,
        "end_date": None,
        "approved_at": None,
        "approved_by": None,
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
async def list_events():
    return await _list("events", sort_field="created_at", asc=False)


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
}
COLL_NAMES = {
    "events": "events", "news": "news", "exec-team": "exec_team", "gallery": "gallery",
    "sponsors": "sponsors", "donors": "donors", "classifieds": "classifieds",
    "past-presidents": "past_presidents", "awardees": "awardees", "tax-returns": "tax_returns",
    "programs": "programs", "membership-plans": "membership_plans", "perks": "perks",
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
