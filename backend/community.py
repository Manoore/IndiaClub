"""Business directory and showcase pages for Business members.

Only members with an active Business membership can list a business. An admin approves the first listing;
after that the owner's edits go live straight away and are recorded in the change history. A listing is
hidden 30 days after the owner's membership lapses and comes back on renewal. Listings an admin creates
(no owner) are always shown.
"""
import base64
import re
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator

from admin_access import admin_guard
from audit import audit
from auth import require_member
from database import db
from models import Business, gen_id
from spam import spam_guard

public_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])

BUSINESS_CATEGORIES = [
    "Restaurants & Catering", "Grocery", "Health & Wellness", "Real Estate", "Financial & Tax",
    "Legal", "Education & Tutoring", "Beauty & Fashion", "Events & Decor", "Technology", "Other",
]
GRACE_DAYS = 30
MAX_PHOTOS = 6
IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}  # no SVG: it can carry scripts
MAX_IMAGE_BYTES = 2 * 1024 * 1024
# What the owner can edit; everything else (status, featured, order, owner) is admin-only
OWNER_FIELDS = ("name", "category", "tagline", "description", "about", "services", "phone", "email", "website",
                "address", "hours", "member_offer", "facebook", "instagram", "linkedin", "youtube",
                "logo_url", "cover_url", "photos")
PUBLIC_FIELDS = ("id", "slug", "featured", "created_at", "updated_at") + OWNER_FIELDS


def _url(v: Optional[str]) -> str:
    """Accept www.example.com as well as https://…; refuse anything that isn't a web link."""
    v = (v or "").strip()
    if not v:
        return ""
    if v.startswith("/api/files/"):
        return v
    if not re.match(r"^https?://", v, re.I):
        if re.match(r"^[a-z][a-z0-9+.-]*:(?!\d)", v, re.I):  # mailto:, javascript:, data: … but not host:port
            raise ValueError("Enter a web address starting with https://")
        v = "https://" + v
    if not re.match(r"^https?://[^\s/$.?#][^\s]*$", v, re.I):
        raise ValueError("Enter a valid web address")
    return v


class BusinessIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str = "Other"
    tagline: Optional[str] = Field(default="", max_length=160)
    description: Optional[str] = Field(default="", max_length=600)  # short summary for the directory card
    about: Optional[str] = Field(default="", max_length=6000)
    services: List[str] = Field(default_factory=list, max_length=20)
    phone: Optional[str] = Field(default="", max_length=40)
    email: Optional[str] = Field(default="", max_length=150)
    website: Optional[str] = ""
    address: Optional[str] = Field(default="", max_length=300)
    hours: Optional[str] = Field(default="", max_length=500)
    member_offer: Optional[str] = Field(default="", max_length=300)
    facebook: Optional[str] = ""
    instagram: Optional[str] = ""
    linkedin: Optional[str] = ""
    youtube: Optional[str] = ""
    logo_url: Optional[str] = ""
    cover_url: Optional[str] = ""
    photos: List[str] = Field(default_factory=list)

    @field_validator("website", "facebook", "instagram", "linkedin", "youtube", "logo_url", "cover_url")
    @classmethod
    def _links(cls, v):
        return _url(v)

    @field_validator("services")
    @classmethod
    def _services(cls, v):
        return [s.strip()[:80] for s in v if s and s.strip()]

    @field_validator("photos")
    @classmethod
    def _photos(cls, v):
        v = [_url(p) for p in v if p]
        if len(v) > MAX_PHOTOS:
            raise ValueError(f"Up to {MAX_PHOTOS} photos")
        return v


def _clean(d):
    if isinstance(d, list):
        return [_clean(x) for x in d]
    d = dict(d)
    d.pop("_id", None)
    return d


def _public(b: dict) -> dict:
    return {k: b.get(k) for k in PUBLIC_FIELDS}


def business_eligible(member: Optional[dict]) -> bool:
    """Active Business membership (the Business plan, or the Business tier of the annual plan)."""
    m = (member or {}).get("membership") or {}
    return m.get("status") == "active" and (m.get("plan") == "business" or m.get("tier") == "business")


def _owner_current(member: Optional[dict], now: datetime) -> bool:
    """Still shown: active, or lapsed less than GRACE_DAYS ago, and it was a Business membership."""
    m = (member or {}).get("membership") or {}
    if not (m.get("plan") == "business" or m.get("tier") == "business"):
        return False
    if m.get("lifetime") or m.get("status") == "active":
        return True
    end = m.get("end_date")
    return bool(m.get("status") == "expired" and isinstance(end, datetime) and now - end <= timedelta(days=GRACE_DAYS))


async def _visible(items: List[dict]) -> List[dict]:
    owner_ids = list({b["member_id"] for b in items if b.get("member_id")})
    owners = {m["id"]: m async for m in db.members.find({"id": {"$in": owner_ids}}, {"id": 1, "membership": 1})}
    now = datetime.utcnow()
    return [b for b in items if not b.get("member_id") or _owner_current(owners.get(b["member_id"]), now)]


async def _unique_slug(name: str, own_id: Optional[str] = None) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:60] or "business"
    slug, n = base, 2
    while await db.businesses.find_one({"slug": slug, "id": {"$ne": own_id}}, {"_id": 1}):
        slug, n = f"{base}-{n}", n + 1
    return slug


async def ensure_slugs():
    """Give older listings a page address (runs at startup)."""
    async for b in db.businesses.find({"$or": [{"slug": None}, {"slug": ""}, {"slug": {"$exists": False}}]}):
        await db.businesses.update_one({"id": b["id"]}, {"$set": {"slug": await _unique_slug(b.get("name") or "", b["id"])}})


# ---------- public ----------
@public_router.get("/businesses")
async def list_businesses(category: Optional[str] = None):
    f = {"status": "approved"}
    if category and category != "All":
        f["category"] = category
    items = await db.businesses.find(f).sort([("featured", -1), ("order", 1), ("name", 1)]).to_list(1000)
    return [_public(b) for b in await _visible(items)]


@public_router.get("/businesses/categories")
async def business_categories():
    return BUSINESS_CATEGORIES


@public_router.get("/businesses/by-slug/{slug}")
async def get_business(slug: str):
    b = await db.businesses.find_one({"slug": slug, "status": "approved"})
    if not b or not await _visible([b]):
        raise HTTPException(404, "Business not found")
    out = _public(b)
    if b.get("member_id"):  # "ICGD Business Member since 2019" badge
        owner = await db.members.find_one({"id": b["member_id"]}, {"joined_at": 1, "created_at": 1})
        since = (owner or {}).get("joined_at") or (owner or {}).get("created_at")
        out["member_since"] = since.year if isinstance(since, datetime) else None
    return out


# ---------- the owner ----------
async def _member(member_id: str) -> dict:
    m = await db.members.find_one({"id": member_id})
    if not m:
        raise HTTPException(401, "Please sign in again")
    return m


@public_router.get("/members/me/business")
async def my_business(member_id: str = Depends(require_member)):
    m = await _member(member_id)
    items = await db.businesses.find({"member_id": member_id}).sort("created_at", -1).to_list(5)
    shown = {b["id"] for b in await _visible(items)}
    return {
        "eligible": business_eligible(m),
        "businesses": [{**_clean(b), "visible": b["status"] == "approved" and b["id"] in shown} for b in items],
        "categories": BUSINESS_CATEGORIES,
    }


@public_router.get("/members/me/businesses")  # older dashboard/classifieds page
async def my_businesses(member_id: str = Depends(require_member)):
    return _clean(await db.businesses.find({"member_id": member_id}).sort("created_at", -1).to_list(50))


async def _create(member_id: str, body: BusinessIn) -> dict:
    m = await _member(member_id)
    if not business_eligible(m):
        raise HTTPException(403, "Business listings are for members with an active Business membership.")
    if body.category not in BUSINESS_CATEGORIES:
        raise HTTPException(400, "Choose a category from the list")
    if await db.businesses.count_documents({"member_id": member_id}) >= 1:
        raise HTTPException(400, "You already have a business listing. Edit it from My Business.")
    b = Business(**body.model_dump(), member_id=member_id, status="pending")
    d = b.model_dump()
    d["slug"] = await _unique_slug(body.name)
    if not d.get("email"):
        d["email"] = m.get("email")
    await db.businesses.insert_one(d)
    await audit(f"member:{m.get('email')}", "business", d["id"], "create", note=d["name"])
    return _clean(d)


@public_router.post("/members/me/business", dependencies=[Depends(spam_guard)])
async def create_my_business(body: BusinessIn, member_id: str = Depends(require_member)):
    return await _create(member_id, body)


@public_router.post("/businesses", dependencies=[Depends(spam_guard)])  # older form
async def submit_business(body: BusinessIn, member_id: str = Depends(require_member)):
    d = await _create(member_id, body)
    return {"ok": True, "id": d["id"]}


@public_router.put("/members/me/business/{bid}")
async def update_my_business(bid: str, body: BusinessIn, member_id: str = Depends(require_member)):
    m = await _member(member_id)
    before = await db.businesses.find_one({"id": bid, "member_id": member_id})
    if not before:
        raise HTTPException(404, "Listing not found")
    if not business_eligible(m):
        raise HTTPException(403, "Renew your Business membership to edit your listing.")
    if body.category not in BUSINESS_CATEGORIES:
        raise HTTPException(400, "Choose a category from the list")
    upd = {k: v for k, v in body.model_dump().items() if k in OWNER_FIELDS}
    upd["updated_at"] = datetime.utcnow()
    if upd["name"] != before.get("name"):
        upd["slug"] = await _unique_slug(upd["name"], bid)
    if before.get("status") == "rejected":
        upd["status"] = "pending"  # fixed and sent back for review
    # Approved listings stay live; the change is logged so an admin can see and undo it
    await db.businesses.update_one({"id": bid}, {"$set": upd})
    after = await db.businesses.find_one({"id": bid})
    await audit(f"member:{m.get('email')}", "business", bid, "update",
                before={k: before.get(k) for k in OWNER_FIELDS}, after={k: after.get(k) for k in OWNER_FIELDS})
    return _clean(after)


@public_router.post("/members/me/business/upload", dependencies=[Depends(spam_guard)])
async def upload_business_image(file: UploadFile = File(...), member_id: str = Depends(require_member)):
    m = await _member(member_id)
    if not business_eligible(m):
        raise HTTPException(403, "Business listings are for members with an active Business membership.")
    if (file.content_type or "") not in IMAGE_TYPES:
        raise HTTPException(400, "Use a PNG, JPG, WebP or GIF image")
    raw = await file.read()
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(400, "Image too large (2 MB max). Try a smaller or compressed photo.")
    fid = gen_id()
    await db.files.insert_one({
        "id": fid, "filename": file.filename or "image", "mime_type": file.content_type,
        "data_base64": base64.b64encode(raw).decode("utf-8"), "source": "business", "member_id": member_id,
        "uploaded_at": datetime.utcnow(),
    })
    return {"id": fid, "url": f"/api/files/{fid}"}


# ---------- admin ----------
@admin_router.post("/businesses/{bid}/approve")
async def approve_business(bid: str):
    await db.businesses.update_one({"id": bid}, {"$set": {"status": "approved", "reviewed_at": datetime.utcnow()}})
    return {"ok": True}


@admin_router.post("/businesses/{bid}/reject")
async def reject_business(bid: str):
    await db.businesses.update_one({"id": bid}, {"$set": {"status": "rejected", "reviewed_at": datetime.utcnow()}})
    return {"ok": True}
