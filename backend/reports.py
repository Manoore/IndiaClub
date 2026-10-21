"""Admin reporting: CSV exports, revenue summary, renewal reminder queue, payment reconciliation."""
import csv
import io
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from admin_access import admin_guard, can
from database import db

router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])

PAYMENT_STATUSES = ("pending", "awaiting_check", "paid", "failed", "refunded")
EXPORT_AREAS = {
    "members": ("members",),
    "sponsors": ("sponsors",),
    "registrations": ("events", "tickets"),
    "revenue": ("finance",),
    "donations": ("finance",),
}


def _fmt(v) -> str:
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d %H:%M")
    return str(v)


def _csv(filename: str, header: list, rows: list) -> StreamingResponse:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        w.writerow([_fmt(x) for x in r])
    data = io.BytesIO(buf.getvalue().encode("utf-8-sig"))  # BOM so Excel opens UTF-8 correctly
    return StreamingResponse(data, media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


async def membership_fees() -> dict:
    """(plan, tier) → price, used to value memberships in revenue reports."""
    fees = {}
    for p in await db.membership_plans.find().to_list(100):
        fees[(p["slug"], None)] = float(p.get("price") or 0)
        for t in p.get("tiers") or []:
            fees[(p["slug"], t.get("slug"))] = float(t.get("price") or 0)
    return fees


def _fee(fees: dict, mem: dict) -> float:
    return fees.get((mem.get("plan"), mem.get("tier")), fees.get((mem.get("plan"), None), 0.0))


async def revenue_rows(year: Optional[int] = None) -> list:
    """[date, source, reference, name, email, amount, method, status]"""
    rows = []
    for o in await db.ticket_orders.find().to_list(20000):
        rows.append([o.get("created_at"), "Event tickets", o.get("event_title", ""), o.get("buyer_name"),
                     o.get("buyer_email"), round(float(o.get("total") or 0), 2), o.get("payment_method"), o.get("payment_status")])
    fees = await membership_fees()
    for m in await db.members.find({"membership.plan": {"$nin": [None, ""]}}).to_list(20000):
        mem = m.get("membership") or {}
        if mem.get("lifetime"):
            continue
        amount = _fee(fees, mem) + float(mem.get("donation_amount") or 0)
        status = mem.get("payment_status") or ("paid" if mem.get("payment_received") else "pending")
        rows.append([mem.get("submitted_at") or m.get("created_at"), "Membership",
                     f"{mem.get('plan')}/{mem.get('tier') or '-'}", f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(),
                     m.get("email"), round(amount, 2), mem.get("payment_method"), status])
        for u in mem.get("upgrades") or []:
            if float(u.get("amount") or 0) > 0:
                rows.append([u.get("created_at"), "Membership upgrade", f"{u.get('from_tier')} -> {u.get('to_tier')}",
                             f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(), m.get("email"),
                             round(float(u["amount"]), 2), u.get("payment_method"), u.get("payment_status")])
    for s in await db.sponsorships.find().to_list(5000):
        rows.append([s.get("created_at"), "Sponsorship", f"{s.get('tier')} sponsorship", s.get("company"),
                     s.get("email"), round(float(s.get("amount") or 0), 2), s.get("payment_method"), s.get("payment_status")])
    for d in await db.donations.find().to_list(20000):
        rows.append([d.get("created_at"), "Donation", (d.get("message") or "")[:60], d.get("name"), d.get("email"),
                     round(float(d.get("amount") or 0), 2), d.get("payment_method") or "", d.get("payment_status") or "pending"])
    if year:
        rows = [r for r in rows if isinstance(r[0], datetime) and r[0].year == year]
    rows.sort(key=lambda r: r[0] or datetime.min, reverse=True)
    return rows


@router.get("/exports/{kind}")
async def export(kind: str, request: Request, year: Optional[int] = None):
    if kind not in EXPORT_AREAS:
        raise HTTPException(404, "Unknown export")
    if not can(request.state.admin_user["role"], *EXPORT_AREAS[kind]):
        raise HTTPException(403, "Your role can't export this data")
    stamp = datetime.utcnow().strftime("%Y%m%d")

    if kind == "members":
        fees = await membership_fees()
        rows = []
        for m in await db.members.find().sort("created_at", -1).to_list(20000):
            mem = m.get("membership") or {}
            rows.append([m.get("first_name"), m.get("last_name"), m.get("email"), m.get("phone"),
                         m.get("address"), m.get("city"), m.get("state"), m.get("zip"),
                         mem.get("plan"), mem.get("tier"), mem.get("status"),
                         "Lifetime" if mem.get("lifetime") else mem.get("end_date"), mem.get("start_date"),
                         _fee(fees, mem), mem.get("payment_method"),
                         mem.get("payment_status") or ("paid" if mem.get("payment_received") else "pending"),
                         m.get("created_at")])
        return _csv(f"members-{stamp}.csv",
                    ["First name", "Last name", "Email", "Phone", "Address", "City", "State", "ZIP", "Plan", "Tier",
                     "Status", "Valid through", "Start date", "Fee", "Payment method", "Payment status", "Joined"], rows)

    if kind == "sponsors":
        rows = [[s.get("company"), s.get("contact_name"), s.get("email"), s.get("phone"), s.get("website"), s.get("tier"),
                 s.get("amount"), s.get("status"), s.get("payment_method"), s.get("payment_status"), s.get("start_date"),
                 s.get("end_date"), s.get("sponsor_code"), "Yes" if s.get("is_renewal") else "No", s.get("created_at")]
                for s in await db.sponsorships.find().sort("created_at", -1).to_list(5000)]
        return _csv(f"sponsors-{stamp}.csv",
                    ["Company", "Contact", "Email", "Phone", "Website", "Tier", "Amount", "Status", "Payment method",
                     "Payment status", "Start", "Valid through", "Sponsor code", "Renewal", "Submitted"], rows)

    if kind == "registrations":
        rows = []
        for o in await db.ticket_orders.find().sort("created_at", -1).to_list(20000):
            for t in o.get("tickets") or []:
                rows.append([o.get("event_title"), t.get("attendee_name"), t.get("ticket_type_name"), t.get("age_band"),
                             t.get("price"), t.get("code"), t.get("checked_in_at"), o.get("buyer_name"), o.get("buyer_email"),
                             o.get("buyer_phone"), o.get("payment_status"), o.get("created_at")])
        for r in await db.event_registrations.find().sort("created_at", -1).to_list(20000):
            rows.append([r.get("event_id"), r.get("name"), "Free registration", "", 0, "", "", r.get("name"),
                         r.get("email"), r.get("phone"), "", r.get("created_at")])
        return _csv(f"event-registrations-{stamp}.csv",
                    ["Event", "Attendee", "Ticket type", "Age band", "Price", "Ticket code", "Checked in at",
                     "Buyer", "Buyer email", "Buyer phone", "Payment status", "Ordered"], rows)

    if kind == "donations":
        rows = [[d.get("created_at"), d.get("name"), d.get("email"), d.get("amount"), d.get("payment_status") or "pending",
                 d.get("message")] for d in await db.donations.find().sort("created_at", -1).to_list(20000)]
        return _csv(f"donations-{stamp}.csv", ["Date", "Name", "Email", "Amount", "Payment status", "Message"], rows)

    rows = await revenue_rows(year)
    return _csv(f"revenue-{year or 'all'}-{stamp}.csv",
                ["Date", "Source", "Reference", "Name", "Email", "Amount", "Payment method", "Payment status"], rows)


@router.get("/reports/summary")
async def revenue_summary(year: Optional[int] = None):
    year = year or datetime.utcnow().year
    rows = await revenue_rows(year)
    out = {}
    for r in rows:
        src, amount, status = r[1], float(r[5] or 0), r[7] or "pending"
        b = out.setdefault(src, {"source": src, "paid": 0.0, "outstanding": 0.0, "refunded": 0.0, "count": 0})
        b["count"] += 1
        if status == "paid":
            b["paid"] += amount
        elif status == "refunded":
            b["refunded"] += amount
        elif status in ("pending", "awaiting_check"):
            b["outstanding"] += amount
    sources = [{**v, "paid": round(v["paid"], 2), "outstanding": round(v["outstanding"], 2), "refunded": round(v["refunded"], 2)}
               for v in out.values()]
    return {
        "year": year,
        "sources": sources,
        "total_paid": round(sum(s["paid"] for s in sources), 2),
        "total_outstanding": round(sum(s["outstanding"] for s in sources), 2),
    }


@router.get("/reminders")
async def renewal_reminders(days: int = 30):
    """Who needs a renewal nudge: expiring within `days`, or expired in the last `days`."""
    now = datetime.utcnow()
    soon, recent = now + timedelta(days=days), now - timedelta(days=days)

    def member_row(m):
        mem = m.get("membership") or {}
        return {"id": m["id"], "name": f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(), "email": m.get("email"),
                "phone": m.get("phone"), "plan": mem.get("plan"), "tier": mem.get("tier"), "end_date": mem.get("end_date")}

    def sponsor_row(s):
        return {"id": s["id"], "name": s.get("company"), "contact": s.get("contact_name"), "email": s.get("email"),
                "phone": s.get("phone"), "tier": s.get("tier"), "end_date": s.get("end_date")}

    members_expiring = await db.members.find({"membership.status": "active", "membership.lifetime": {"$ne": True},
                                              "membership.end_date": {"$gte": now, "$lte": soon}}).to_list(5000)
    members_expired = await db.members.find({"membership.status": "expired",
                                             "membership.end_date": {"$gte": recent, "$lt": now}}).to_list(5000)
    sponsors_expiring = await db.sponsorships.find({"status": "active", "end_date": {"$gte": now, "$lte": soon}}).to_list(1000)
    sponsors_expired = await db.sponsorships.find({"status": "expired", "end_date": {"$gte": recent, "$lt": now}}).to_list(1000)
    by_end = lambda r: r["end_date"] or now  # noqa: E731
    return {
        "days": days,
        "members_expiring": sorted(map(member_row, members_expiring), key=by_end),
        "members_expired": sorted(map(member_row, members_expired), key=by_end),
        "sponsors_expiring": sorted(map(sponsor_row, sponsors_expiring), key=by_end),
        "sponsors_expired": sorted(map(sponsor_row, sponsors_expired), key=by_end),
    }


class PaymentUpdate(BaseModel):
    status: str


@router.post("/donations/{did}/payment")
async def set_donation_payment(did: str, body: PaymentUpdate):
    if body.status not in PAYMENT_STATUSES:
        raise HTTPException(400, "Invalid payment status")
    r = await db.donations.update_one({"id": did}, {"$set": {"payment_status": body.status}})
    if not r.matched_count:
        raise HTTPException(404, "Not found")
    return {"ok": True}
