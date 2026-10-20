"""Community business directory: members submit listings, admins approve them."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from admin_access import admin_guard
from auth import require_member
from database import db
from models import Business
from spam import spam_guard

public_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])

BUSINESS_CATEGORIES = [
    "Restaurants & Catering", "Grocery", "Health & Wellness", "Real Estate", "Financial & Tax",
    "Legal", "Education & Tutoring", "Beauty & Fashion", "Events & Decor", "Technology", "Other",
]


class BusinessIn(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str = "Other"
    description: Optional[str] = Field(default="", max_length=1500)
    phone: Optional[str] = ""
    email: Optional[str] = ""
    website: Optional[str] = ""
    address: Optional[str] = ""
    logo_url: Optional[str] = ""


def _clean(d):
    if isinstance(d, list):
        return [_clean(x) for x in d]
    d = dict(d)
    d.pop("_id", None)
    return d


@public_router.get("/businesses")
async def list_businesses(category: Optional[str] = None):
    f = {"status": "approved"}
    if category and category != "All":
        f["category"] = category
    items = await db.businesses.find(f).sort([("order", 1), ("name", 1)]).to_list(1000)
    return _clean(items)


@public_router.get("/businesses/categories")
async def business_categories():
    return BUSINESS_CATEGORIES


@public_router.post("/businesses", dependencies=[Depends(spam_guard)])
async def submit_business(body: BusinessIn, member_id: str = Depends(require_member)):
    if body.category not in BUSINESS_CATEGORIES:
        raise HTTPException(400, "Unknown category")
    b = Business(**body.model_dump(), member_id=member_id, status="pending")
    await db.businesses.insert_one(b.model_dump())
    return {"ok": True, "id": b.id}


@public_router.get("/members/me/businesses")
async def my_businesses(member_id: str = Depends(require_member)):
    return _clean(await db.businesses.find({"member_id": member_id}).sort("created_at", -1).to_list(50))


@admin_router.post("/businesses/{bid}/approve")
async def approve_business(bid: str):
    await db.businesses.update_one({"id": bid}, {"$set": {"status": "approved", "reviewed_at": datetime.utcnow()}})
    return {"ok": True}


@admin_router.post("/businesses/{bid}/reject")
async def reject_business(bid: str):
    await db.businesses.update_one({"id": bid}, {"$set": {"status": "rejected", "reviewed_at": datetime.utcnow()}})
    return {"ok": True}
