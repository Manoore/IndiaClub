"""Membership validity rules.

1. Default validity is 12 months from successful payment (multi-year tiers: 5 or 10 years).
2. An active promotion gives eligible purchases its configured, fixed expiration date.
3. The expiration date never becomes earlier than the member's current expiration.
4. A promotion applies to new members, renewing members, or both.
6. Ending a promotion never changes memberships already granted (dates are stored per member).
"""
import calendar
from datetime import datetime, date, time
from typing import Optional

LIFETIME_PLAN = "lifetime"
# Multi-year tiers on the "extended" plan → number of years covered
MULTI_YEAR_TIERS = {"silver": 5, "gold": 10}
APPLIES_TO = ("new", "renewal", "both")


# Memberships that cover a household (My Family, family ticket pricing)
FAMILY_TIERS = {"family", "business"}
FAMILY_PLANS = {"business", "honorary", LIFETIME_PLAN}


def family_enabled(membership: Optional[dict]) -> bool:
    m = membership or {}
    if m.get("status") != "active":
        return False
    return bool(m.get("lifetime")) or m.get("tier") in FAMILY_TIERS or m.get("plan") in FAMILY_PLANS


def add_months(d: datetime, months: int) -> datetime:
    """Same day-of-month `months` later, clamped to the month's last day (Feb 29 → Feb 28)."""
    y, m = divmod(d.month - 1 + months, 12)
    year, month = d.year + y, m + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return d.replace(year=year, month=month, day=day)


def to_date(v) -> Optional[date]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return None


def year_end(year: int) -> datetime:
    """Dec 31 of `year` — used for annual sponsorships, which run on the calendar year."""
    return datetime(year, 12, 31, 23, 59, 59)


def end_of_day(d: date) -> datetime:
    return datetime.combine(d, time(23, 59, 59))


def years_covered(plan: Optional[str], tier: Optional[str]) -> int:
    if plan == "extended" and tier in MULTI_YEAR_TIERS:
        return MULTI_YEAR_TIERS[tier]
    return 1


def promotion_state(p: dict, today: date) -> str:
    """off | scheduled | active | ended"""
    if not p.get("active"):
        return "off"
    start, end = to_date(p.get("start_date")), to_date(p.get("end_date"))
    if start and today < start:
        return "scheduled"
    if end and today > end:
        return "ended"
    return "active"


def find_promotion(promotions: list, now: datetime, kind: str) -> Optional[dict]:
    """Best active promotion for a 'new' or 'renewal' purchase (latest expiration wins)."""
    today = now.date()
    eligible = [
        p for p in promotions or []
        if promotion_state(p, today) == "active"
        and (p.get("applies_to") or "both") in ("both", kind)
        and to_date(p.get("expiration_date"))
    ]
    return max(eligible, key=lambda p: to_date(p["expiration_date"])) if eligible else None


def compute_term(plan: Optional[str], tier: Optional[str], paid_at: datetime, *, kind: str = "new",
                 current_end: Optional[datetime] = None, promotion: Optional[dict] = None) -> dict:
    """Expiration for a purchase paid at `paid_at`.

    standard  = paid_at + 12 months (× years for multi-year tiers)
    promotion = the promotion's fixed expiration date (never less than standard)
    result    = never earlier than the member's current expiration
    """
    if plan == LIFETIME_PLAN:
        return {"end_date": None, "lifetime": True, "promotion": None, "rule": "lifetime"}
    standard = add_months(paid_at, 12 * years_covered(plan, tier))
    end, rule = standard, "standard"
    if promotion and to_date(promotion.get("expiration_date")):
        promo_end = end_of_day(to_date(promotion["expiration_date"]))
        if promo_end > end:
            end, rule = promo_end, "promotion"
    if current_end and current_end > end:
        end, rule = current_end, "kept_current"
    promo_info = {"id": promotion["id"], "name": promotion.get("name")} if promotion and rule == "promotion" else None
    return {"end_date": end, "lifetime": False, "promotion": promo_info, "rule": rule, "standard_end": standard}
