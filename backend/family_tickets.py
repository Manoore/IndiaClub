"""Family groups, per-attendee tickets (QR/PDF) and event check-in."""
import io
import secrets
from datetime import datetime, date
from typing import Optional

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from auth import require_admin, require_member, decode_token
from database import db
from models import gen_id

INFANT_MAX_AGE = 2  # under 3 → free
CHILD_MAX_AGE = 11  # 3–11 → child price

member_router = APIRouter(prefix="/api/members/me")
public_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


class FamilyMemberIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    relation: str = "child"  # spouse | child | parent | sibling | other
    date_of_birth: date


class ReviewRequest(BaseModel):
    note: Optional[str] = ""


class CheckInRequest(BaseModel):
    code: str
    event_id: Optional[str] = None


def _clean(d):
    if isinstance(d, list):
        return [_clean(x) for x in d]
    d = dict(d)
    d.pop("_id", None)
    return d


def age_on(dob, on: datetime) -> Optional[int]:
    if not dob:
        return None
    if isinstance(dob, str):
        try:
            dob = date.fromisoformat(dob[:10])
        except ValueError:
            return None
    on_d = on.date()
    return on_d.year - dob.year - ((on_d.month, on_d.day) < (dob.month, dob.day))


def age_band(age: Optional[int]) -> str:
    if age is None:
        return "adult"
    if age <= INFANT_MAX_AGE:
        return "infant"
    if age <= CHILD_MAX_AGE:
        return "child"
    return "adult"


def new_ticket_code() -> str:
    return "ICGD-" + secrets.token_hex(4).upper()


# ===================== Member: My Family =====================
@member_router.get("/family")
async def list_family(member_id: str = Depends(require_member)):
    items = await db.family_members.find({"member_id": member_id}).sort("created_at", 1).to_list(100)
    now = datetime.utcnow()
    for i in items:
        i["age"] = age_on(i.get("date_of_birth"), now)
        i["age_band"] = age_band(i["age"])
    return _clean(items)


@member_router.post("/family")
async def add_family(body: FamilyMemberIn, member_id: str = Depends(require_member)):
    if body.date_of_birth > date.today():
        raise HTTPException(400, "Date of birth cannot be in the future")
    count = await db.family_members.count_documents({"member_id": member_id})
    if count >= 15:
        raise HTTPException(400, "Family group limit reached (15)")
    doc = {
        "id": gen_id(),
        "member_id": member_id,
        "name": body.name.strip(),
        "relation": body.relation,
        "date_of_birth": body.date_of_birth.isoformat(),
        "status": "pending",
        "admin_note": "",
        "created_at": datetime.utcnow(),
    }
    await db.family_members.insert_one(doc)
    return _clean(doc)


@member_router.put("/family/{fid}")
async def update_family(fid: str, body: FamilyMemberIn, member_id: str = Depends(require_member)):
    existing = await db.family_members.find_one({"id": fid, "member_id": member_id})
    if not existing:
        raise HTTPException(404, "Family member not found")
    if body.date_of_birth > date.today():
        raise HTTPException(400, "Date of birth cannot be in the future")
    upd = {"name": body.name.strip(), "relation": body.relation, "date_of_birth": body.date_of_birth.isoformat()}
    # Identity changes need re-verification
    if upd["name"] != existing.get("name") or upd["date_of_birth"] != existing.get("date_of_birth"):
        upd.update({"status": "pending", "admin_note": ""})
    await db.family_members.update_one({"id": fid}, {"$set": upd})
    return _clean(await db.family_members.find_one({"id": fid}))


@member_router.delete("/family/{fid}")
async def delete_family(fid: str, member_id: str = Depends(require_member)):
    r = await db.family_members.delete_one({"id": fid, "member_id": member_id})
    if not r.deleted_count:
        raise HTTPException(404, "Family member not found")
    return {"ok": True}


@member_router.get("/tickets")
async def my_tickets(member_id: str = Depends(require_member)):
    orders = await db.ticket_orders.find({"member_id": member_id}).sort("created_at", -1).to_list(200)
    return _clean(orders)


# ===================== Admin: Family approvals =====================
@admin_router.get("/family-members")
async def admin_list_family(status: Optional[str] = None):
    f = {"status": status} if status and status != "all" else {}
    items = await db.family_members.find(f).sort("created_at", -1).to_list(2000)
    member_ids = list({i["member_id"] for i in items})
    members = {m["id"]: m for m in await db.members.find({"id": {"$in": member_ids}}).to_list(2000)}
    now = datetime.utcnow()
    out = []
    for i in items:
        m = members.get(i["member_id"]) or {}
        i["age"] = age_on(i.get("date_of_birth"), now)
        i["age_band"] = age_band(i["age"])
        i["member_name"] = f"{m.get('first_name', '')} {m.get('last_name', '')}".strip()
        i["member_email"] = m.get("email", "")
        i["member_status"] = (m.get("membership") or {}).get("status", "none")
        out.append(_clean(i))
    return out


async def _review(fid: str, status: str, note: str, username: str):
    r = await db.family_members.update_one({"id": fid}, {"$set": {
        "status": status, "admin_note": note or "", "reviewed_at": datetime.utcnow(), "reviewed_by": username,
    }})
    if not r.matched_count:
        raise HTTPException(404, "Not found")
    return {"ok": True}


@admin_router.post("/family-members/{fid}/approve")
async def admin_approve_family(fid: str, body: ReviewRequest, username: str = Depends(require_admin)):
    return await _review(fid, "approved", body.note, username)


@admin_router.post("/family-members/{fid}/reject")
async def admin_reject_family(fid: str, body: ReviewRequest, username: str = Depends(require_admin)):
    return await _review(fid, "rejected", body.note, username)


# ===================== Check-in =====================
@admin_router.post("/check-in")
async def admin_check_in(body: CheckInRequest, username: str = Depends(require_admin)):
    code = body.code.strip().upper()
    order = await db.ticket_orders.find_one({"tickets.code": code})
    if not order:
        raise HTTPException(404, "Ticket not found")
    ticket = next(t for t in order["tickets"] if t["code"] == code)
    info = {
        "code": code,
        "attendee_name": ticket.get("attendee_name"),
        "ticket_type_name": ticket.get("ticket_type_name"),
        "age_band": ticket.get("age_band"),
        "event_id": order["event_id"],
        "event_title": order.get("event_title"),
        "buyer_name": order.get("buyer_name"),
        "payment_status": order.get("payment_status"),
    }
    if body.event_id and body.event_id != order["event_id"]:
        raise HTTPException(400, f"This ticket is for a different event: {order.get('event_title')}")
    if order.get("payment_status") == "refunded":
        raise HTTPException(400, "This ticket was refunded and is no longer valid")
    if ticket.get("checked_in_at"):
        return {**info, "result": "already_checked_in", "checked_in_at": ticket["checked_in_at"]}
    now = datetime.utcnow()
    await db.ticket_orders.update_one(
        {"id": order["id"], "tickets.code": code},
        {"$set": {"tickets.$.checked_in_at": now, "tickets.$.checked_in_by": username}},
    )
    return {**info, "result": "checked_in", "checked_in_at": now}


@admin_router.get("/events/{event_id}/attendance")
async def admin_event_attendance(event_id: str):
    orders = await db.ticket_orders.find({"event_id": event_id, "payment_status": {"$ne": "refunded"}}).to_list(5000)
    tickets = [t for o in orders for t in (o.get("tickets") or [])]
    checked = [t for t in tickets if t.get("checked_in_at")]
    recent = sorted(checked, key=lambda t: t["checked_in_at"], reverse=True)[:10]
    return {
        "total": len(tickets),
        "checked_in": len(checked),
        "recent": [{"code": t["code"], "attendee_name": t.get("attendee_name"), "checked_in_at": t["checked_in_at"]} for t in recent],
    }


# ===================== PDF tickets =====================
def _qr_reader(data: str) -> ImageReader:
    img = qrcode.make(data, box_size=8, border=1)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf)


def _event_when(event: dict) -> str:
    sd = event.get("start_date")
    if isinstance(sd, datetime):
        return sd.strftime("%a, %b %d %Y · %I:%M %p")
    return " ".join(x for x in [event.get("date") or "", event.get("time") or ""] if x)


def build_tickets_pdf(order: dict, event: dict) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    w, h = letter
    maroon = (0.545, 0.102, 0.102)
    saffron = (0.878, 0.478, 0.122)
    tickets = order.get("tickets") or []
    for idx, t in enumerate(tickets, 1):
        c.setFillColorRGB(*maroon)
        c.rect(0, h - 110, w, 110, fill=1, stroke=0)
        c.setFillColorRGB(1, 0.97, 0.9)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, h - 40, "INDIA CLUB OF GREATER DAYTON")
        c.setFont("Helvetica-Bold", 22)
        c.drawString(50, h - 72, (order.get("event_title") or "")[:48])
        c.setFont("Helvetica", 11)
        c.drawString(50, h - 95, f"Ticket {idx} of {len(tickets)}")

        c.setFillColorRGB(0.1, 0.1, 0.1)
        y = h - 160
        rows = [
            ("ATTENDEE", t.get("attendee_name") or ""),
            ("TICKET", f"{t.get('ticket_type_name', '')}" + (f"  ({t['age_band'].title()})" if t.get("age_band") and t["age_band"] != "adult" else "")),
            ("WHEN", _event_when(event) or "See event page"),
            ("WHERE", (event.get("venue") or ("Online" if event.get("event_format") == "online" else "TBA"))[:60]),
            ("PRICE", f"${float(t.get('price') or 0):.2f}"),
            ("PURCHASED BY", f"{order.get('buyer_name', '')} · {order.get('buyer_email', '')}"),
        ]
        for label, val in rows:
            c.setFont("Helvetica-Bold", 9)
            c.setFillColorRGB(*saffron)
            c.drawString(50, y, label)
            c.setFont("Helvetica", 13)
            c.setFillColorRGB(0.1, 0.1, 0.1)
            c.drawString(50, y - 17, str(val)[:60])
            y -= 48

        qr_size = 200
        c.drawImage(_qr_reader(t["code"]), w - qr_size - 50, h - 140 - qr_size, qr_size, qr_size)
        c.setFont("Courier-Bold", 14)
        c.drawCentredString(w - 50 - qr_size / 2, h - 160 - qr_size, t["code"])

        status = order.get("payment_status", "pending")
        c.setFont("Helvetica-Bold", 12)
        if status == "paid":
            c.setFillColorRGB(0.02, 0.47, 0.34)
            c.drawCentredString(w - 50 - qr_size / 2, h - 182 - qr_size, "PAID")
        else:
            c.setFillColorRGB(0.7, 0.33, 0.04)
            c.drawCentredString(w - 50 - qr_size / 2, h - 182 - qr_size, "PAYMENT PENDING")

        c.setStrokeColorRGB(0.8, 0.8, 0.8)
        c.setDash(4, 4)
        c.line(40, 90, w - 40, 90)
        c.setDash()
        c.setFont("Helvetica", 9)
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.drawString(50, 70, "Present this QR code at the entrance. Each code admits one person and can be scanned once.")
        c.drawString(50, 56, f"Order {order.get('id', '')}")
        c.showPage()
    c.save()
    return buf.getvalue()


async def _pdf_response(order: dict):
    if not order.get("tickets"):
        raise HTTPException(400, "This order has no individual tickets")
    event = await db.events.find_one({"id": order["event_id"]}) or {}
    pdf = build_tickets_pdf(order, event)
    fname = f"tickets-{order['id'][:8]}.pdf"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{fname}"'})


@public_router.get("/tickets/{order_id}/pdf")
async def download_tickets_pdf(order_id: str, email: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    order = await db.ticket_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    mid = None
    if authorization and authorization.startswith("Bearer "):
        mid = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member")
    owns = mid and order.get("member_id") == mid
    email_ok = email and email.strip().lower() == (order.get("buyer_email") or "").lower()
    if not (owns or email_ok):
        raise HTTPException(403, "Not allowed to access these tickets")
    return await _pdf_response(order)


@admin_router.get("/ticket-orders/{order_id}/pdf")
async def admin_tickets_pdf(order_id: str):
    order = await db.ticket_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    return await _pdf_response(order)
