"""Annual sponsorships: plans, public signup (pay by check or other), treasurer activation,
expiry, renewals, sponsor codes for ticket pricing, and PDF invoices."""
import base64
import io
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from admin_access import admin_guard
from database import db
from membership_rules import year_end
from models import gen_id
from spam import spam_guard

public_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])

PAYMENT_STATUSES = ("pending", "awaiting_check", "paid", "failed", "refunded")
# SVG can carry scripts, so public uploads are limited to bitmap formats
LOGO_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}

# Levels and benefits as published on indiaclubdayton.org (admins can edit them)
DEFAULT_PLANS = [
    {"slug": "platinum", "name": "Platinum", "price": 1500, "order": 1,
     "benefits": ["Banner ad on the stage backdrop at Diwali & Republic Day events", "All-year ad on our website",
                  "All-year ad on all event flyers and Samachar", "Ad on the ICGD Facebook page during all events",
                  "20% discount on Namaskar ads", "Business card display at all ICGD events",
                  "Free admission to standard ICGD events (RSVP required)"]},
    {"slug": "gold", "name": "Gold", "price": 1000, "order": 2,
     "benefits": ["Banner ad outside the auditorium at Diwali & Republic Day events", "Six-month ad on our website",
                  "Six-month ad on all event flyers and Samachar", "Ad on the ICGD Facebook page during any 3 events",
                  "15% discount on Namaskar ads", "Business card display at any 3 ICGD events"]},
    {"slug": "silver", "name": "Silver", "price": 750, "order": 3,
     "benefits": ["Banner ad outside the auditorium at Diwali & Republic Day events", "Three-month ad on our website",
                  "Three-month ad on all event flyers and Samachar", "Ad on the ICGD Facebook page during any 2 events",
                  "10% discount on Namaskar ads", "Business card display at any 2 ICGD events"]},
    {"slug": "bronze", "name": "Bronze", "price": 250, "order": 4,
     "benefits": ["Banner ad at one of our outdoor events", "One-month ad on our website",
                  "One-month ad on all event flyers and Samachar", "Ad on the ICGD Facebook page during 1 event",
                  "5% discount on Namaskar ads", "Business card display at 1 ICGD event"]},
]
# Placeholder prices shipped before the levels were matched to the club's site
OLD_DEFAULT_PRICES = {"platinum": 5000, "gold": 2500, "silver": 1000, "bronze": 500}


def _clean(d):
    if isinstance(d, list):
        return [_clean(x) for x in d]
    d = dict(d)
    d.pop("_id", None)
    return d


def new_sponsor_code() -> str:
    return "SPN-" + secrets.token_hex(3).upper()


async def seed_sponsorship_plans():
    if await db.sponsorship_plans.count_documents({}) == 0:
        now = datetime.utcnow()
        await db.sponsorship_plans.insert_many([{**p, "id": gen_id(), "active": True, "created_at": now} for p in DEFAULT_PLANS])
    # Requirements use Platinum as the top tier (previously "Diamond")
    await db.sponsors.update_many({"tier": "Diamond"}, {"$set": {"tier": "Platinum"}})
    # Replace the old placeholder levels with the club's published ones, unless an admin already edited them
    for p in DEFAULT_PLANS:
        await db.sponsorship_plans.update_one(
            {"slug": p["slug"], "price": OLD_DEFAULT_PRICES[p["slug"]]},
            {"$set": {"price": p["price"], "benefits": p["benefits"]}},
        )


async def valid_sponsor(code: Optional[str]) -> Optional[dict]:
    """Active sponsorship for a sponsor code, used to unlock sponsor ticket pricing."""
    code = (code or "").strip().upper()
    if not code:
        return None
    s = await db.sponsorships.find_one({"sponsor_code": code, "status": "active"})
    if not s or (s.get("end_date") and s["end_date"] < datetime.utcnow()):
        return None
    return s


async def expire_sponsorships(now: datetime) -> int:
    r = await db.sponsorships.update_many(
        {"status": "active", "end_date": {"$lt": now}}, {"$set": {"status": "expired", "updated_at": now}})
    await db.sponsors.update_many(
        {"sponsorship_id": {"$ne": None}, "expires_at": {"$lt": now}, "active": True}, {"$set": {"active": False}})
    return r.modified_count


# ===================== Public =====================
class SponsorshipIn(BaseModel):
    company: str = Field(min_length=1, max_length=150)
    contact_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    website: Optional[str] = ""
    plan: str
    logo_url: Optional[str] = ""
    message: Optional[str] = ""
    payment_method: str = "check"  # check | other  (online payments arrive with Stripe/PayPal)
    renewal: bool = False


@public_router.get("/sponsorship-plans")
async def public_plans():
    return _clean(await db.sponsorship_plans.find({"active": True}).sort("order", 1).to_list(20))


@public_router.get("/sponsorships/validate-code", dependencies=[Depends(spam_guard)])
async def validate_code(code: str):
    """Lets the checkout preview sponsor pricing before purchase."""
    s = await valid_sponsor(code)
    if not s:
        raise HTTPException(404, "Sponsor code is not valid or the sponsorship has expired")
    return {"code": s["sponsor_code"], "company": s.get("company"), "tier": s.get("tier")}


@public_router.post("/sponsorships/logo", dependencies=[Depends(spam_guard)])
async def upload_logo(file: UploadFile = File(...)):
    if (file.content_type or "") not in LOGO_TYPES:
        raise HTTPException(400, "Logo must be a PNG, JPG, WebP or GIF image")
    raw = await file.read()
    if len(raw) > 2 * 1024 * 1024:
        raise HTTPException(400, "Logo too large (2MB max)")
    fid = gen_id()
    await db.files.insert_one({
        "id": fid, "filename": file.filename or "logo", "mime_type": file.content_type,
        "data_base64": base64.b64encode(raw).decode("utf-8"), "source": "sponsor-signup",
    })
    return {"id": fid, "url": f"/api/files/{fid}"}


@public_router.post("/sponsorships", dependencies=[Depends(spam_guard)])
async def create_sponsorship(body: SponsorshipIn):
    plan = await db.sponsorship_plans.find_one({"slug": body.plan, "active": True})
    if not plan:
        raise HTTPException(400, "Please choose a sponsorship level")
    if body.payment_method not in ("check", "other"):
        raise HTTPException(400, "Invalid payment method")
    previous = None
    if body.renewal:
        email = body.email.lower()
        cands = await db.sponsorships.find({"$or": [{"email": email}, {"company": body.company.strip()}],
                                            "status": {"$in": ["active", "expired"]}}).sort("end_date", -1).to_list(1)
        previous = cands[0] if cands else None
    now = datetime.utcnow()
    doc = {
        "id": gen_id(),
        "company": body.company.strip(), "contact_name": body.contact_name.strip(),
        "email": body.email.lower(), "phone": body.phone.strip(), "website": (body.website or "").strip(),
        "plan": plan["slug"], "tier": plan["name"], "amount": float(plan["price"]),
        "logo_url": body.logo_url or (previous or {}).get("logo_url") or "",
        "message": body.message or "",
        "payment_method": body.payment_method,
        "payment_status": "awaiting_check" if body.payment_method == "check" else "pending",
        "status": "pending",
        "is_renewal": bool(previous), "previous_id": previous["id"] if previous else None,
        "sponsor_code": (previous or {}).get("sponsor_code"),
        "start_date": None, "end_date": None,
        "created_at": now, "updated_at": now,
    }
    await db.sponsorships.insert_one(doc)
    return _clean(doc)


# ===================== Admin =====================
class PaymentUpdate(BaseModel):
    status: str
    note: Optional[str] = ""


@admin_router.get("/sponsorships")
async def admin_list(status: Optional[str] = None):
    f = {"status": status} if status and status != "all" else {}
    return _clean(await db.sponsorships.find(f).sort("created_at", -1).to_list(2000))


async def _activate(s: dict, username: str, now: datetime) -> dict:
    prev = await db.sponsorships.find_one({"id": s["previous_id"]}) if s.get("previous_id") else None
    prev_end = (prev or {}).get("end_date")
    end = year_end(prev_end.year + 1) if prev_end and prev_end > now else year_end(now.year)
    code = s.get("sponsor_code") or new_sponsor_code()
    listing = {
        "name": s["company"], "tier": s["tier"], "logo_url": s.get("logo_url") or None,
        "website": s.get("website") or None, "active": True, "sponsorship_id": s["id"], "expires_at": end,
    }
    sponsor_id = (prev or {}).get("sponsor_id")
    if sponsor_id and await db.sponsors.find_one({"id": sponsor_id}):
        await db.sponsors.update_one({"id": sponsor_id}, {"$set": listing})
    else:
        sponsor_id = gen_id()
        await db.sponsors.insert_one({**listing, "id": sponsor_id, "order": 100, "created_at": now})
    update = {
        "status": "active", "payment_status": "paid", "start_date": now, "end_date": end,
        "sponsor_code": code, "sponsor_id": sponsor_id, "paid_at": now, "paid_by": username,
    }
    if prev and prev.get("status") == "active":
        await db.sponsorships.update_one({"id": prev["id"]}, {"$set": {"status": "renewed", "updated_at": now}})
    return update


@admin_router.post("/sponsorships/{sid}/payment")
async def admin_set_payment(sid: str, body: PaymentUpdate, request: Request):
    if body.status not in PAYMENT_STATUSES:
        raise HTTPException(400, "Invalid payment status")
    s = await db.sponsorships.find_one({"id": sid})
    if not s:
        raise HTTPException(404, "Not found")
    now = datetime.utcnow()
    username = request.state.admin_user["username"]
    update = {"payment_status": body.status, "payment_note": body.note or "", "updated_at": now}
    if body.status == "paid" and s.get("status") != "active":
        update.update(await _activate(s, username, now))
    elif body.status in ("failed", "refunded"):
        update["status"] = "cancelled"
        await db.sponsors.update_many({"sponsorship_id": sid}, {"$set": {"active": False}})
    await db.sponsorships.update_one({"id": sid}, {"$set": update})
    return _clean(await db.sponsorships.find_one({"id": sid}))


@admin_router.delete("/sponsorships/{sid}")
async def admin_delete(sid: str):
    await db.sponsorships.delete_one({"id": sid})
    return {"ok": True}


def build_invoice_pdf(s: dict) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    w, h = letter
    maroon = (0.545, 0.102, 0.102)
    created = s.get("created_at") or datetime.utcnow()
    number = f"INV-{created.year}-{s['id'][:6].upper()}"
    c.setFillColorRGB(*maroon)
    c.rect(0, h - 90, w, 90, fill=1, stroke=0)
    c.setFillColorRGB(1, 0.97, 0.92)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(50, h - 50, "India Club of Greater Dayton")
    c.setFont("Helvetica", 10)
    c.drawString(50, h - 68, "Sponsorship Invoice")
    c.setFont("Helvetica-Bold", 14)
    c.drawRightString(w - 50, h - 50, "INVOICE")
    c.setFont("Helvetica", 10)
    c.drawRightString(w - 50, h - 68, number)

    c.setFillColorRGB(0.1, 0.1, 0.1)
    y = h - 130
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "BILL TO")
    c.drawString(350, y, "DETAILS")
    c.setFont("Helvetica", 10)
    for i, line in enumerate([s.get("company", ""), s.get("contact_name", ""), s.get("email", ""), s.get("phone", "")]):
        c.drawString(50, y - 16 * (i + 1), line)
    end = s.get("end_date")
    details = [
        f"Date: {created.strftime('%b %d, %Y')}",
        f"Status: {'PAID' if s.get('payment_status') == 'paid' else 'DUE'}",
        f"Valid through: {end.strftime('%b %d, %Y') if end else 'Dec 31 (on payment)'}",
        f"Sponsor code: {s.get('sponsor_code') or 'issued on payment'}",
    ]
    for i, line in enumerate(details):
        c.drawString(350, y - 16 * (i + 1), line)

    y -= 110
    c.setFillColorRGB(0.96, 0.94, 0.9)
    c.rect(50, y - 6, w - 100, 22, fill=1, stroke=0)
    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, y, "Description")
    c.drawRightString(w - 60, y, "Amount")
    c.setFont("Helvetica", 10)
    y -= 26
    label = f"{s.get('tier', '')} Sponsorship{' (renewal)' if s.get('is_renewal') else ''} — annual"
    c.drawString(60, y, label)
    c.drawRightString(w - 60, y, f"${float(s.get('amount') or 0):,.2f}")
    y -= 30
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(w - 60, y, f"Total: ${float(s.get('amount') or 0):,.2f}")

    y -= 50
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "How to pay")
    c.setFont("Helvetica", 10)
    for i, line in enumerate([
        "Make checks payable to: India Club of Greater Dayton",
        f"Please write the invoice number ({number}) on your check.",
        "Your sponsorship becomes active as soon as the Treasurer records your payment.",
    ]):
        c.drawString(50, y - 16 * (i + 1), line)
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColorRGB(0.45, 0.45, 0.45)
    c.drawCentredString(w / 2, 40, "Thank you for supporting the Indian-American community of Greater Dayton.")
    c.showPage()
    c.save()
    return buf.getvalue()


@admin_router.get("/sponsorships/{sid}/invoice")
async def admin_invoice(sid: str):
    s = await db.sponsorships.find_one({"id": sid})
    if not s:
        raise HTTPException(404, "Not found")
    pdf = build_invoice_pdf(s)
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="invoice-{s["id"][:6]}.pdf"'})
