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
FREE_PLAN = "free"  # no fee, no expiry, no member pricing
# Multi-year tiers on the "extended" plan → number of years covered
MULTI_YEAR_TIERS = {"silver": 5, "gold": 10}
APPLIES_TO = ("new", "renewal", "both")


# Fallbacks for plans/tiers that don't have admin settings yet. Admins manage these per plan and
# tier (includes_family, member_pricing, term_years) on the Membership Plans screen.
FAMILY_TIERS = {"family", "business"}
FAMILY_PLANS = {"business", "honorary", LIFETIME_PLAN}

# Plan settings loaded from the database (see load_plan_rules); keyed by plan slug / (plan, tier)
_plan_rules = {"plans": {}, "tiers": {}}


def load_plan_rules(plans: list) -> None:
    """Cache the admin-managed settings of every membership plan and tier."""
    plans_map, tiers_map = {}, {}
    for p in plans or []:
        plans_map[p.get("slug")] = p
        for t in p.get("tiers") or []:
            tiers_map[(p.get("slug"), t.get("slug"))] = t
    _plan_rules["plans"], _plan_rules["tiers"] = plans_map, tiers_map


def plan_setting(plan: Optional[str], tier: Optional[str], key: str, default):
    """Tier setting first, then the plan's, then the built-in default."""
    t = _plan_rules["tiers"].get((plan, tier))
    if t is not None and t.get(key) is not None:
        return t[key]
    p = _plan_rules["plans"].get(plan)
    if p is not None and p.get(key) is not None:
        return p[key]
    return default


HOUSEHOLD_SIZE = 6  # Family-type memberships: the member plus 5 family members


def default_settings(plan: Optional[str], tier: Optional[str]) -> dict:
    family = (tier in FAMILY_TIERS) if tier else (plan in FAMILY_PLANS)
    member_pricing = plan != FREE_PLAN
    people = HOUSEHOLD_SIZE if family else 1
    return {
        "includes_family": family,
        "member_pricing": member_pricing,
        "term_years": MULTI_YEAR_TIERS.get(tier, 1) if plan == "extended" else 1,
        "family_size": people,  # people the membership covers, including the member
        "member_tickets": people if member_pricing else 0,  # member-priced tickets per event
    }


def _int_setting(membership: Optional[dict], key: str) -> int:
    m = membership or {}
    plan, tier = m.get("plan"), m.get("tier")
    default = default_settings(plan, tier)[key]
    if m.get("lifetime"):
        default = HOUSEHOLD_SIZE
    try:
        return max(0, int(plan_setting(plan, tier, key, default)))
    except (TypeError, ValueError):
        return default


def family_size(membership: Optional[dict]) -> int:
    """People the membership covers, including the member (My Family holds family_size - 1)."""
    return max(1, _int_setting(membership, "family_size")) if family_enabled(membership) else 1


def member_ticket_limit(membership: Optional[dict]) -> int:
    """Member-priced tickets a membership gets per event (the member plus covered family)."""
    return _int_setting(membership, "member_tickets") if paid_member(membership) else 0


def paid_member(membership: Optional[dict]) -> bool:
    """Active membership whose plan gives member ticket pricing and members-only tickets."""
    m = membership or {}
    if m.get("status") != "active":
        return False
    plan, tier = m.get("plan"), m.get("tier")
    return bool(plan_setting(plan, tier, "member_pricing", default_settings(plan, tier)["member_pricing"]))


def family_enabled(membership: Optional[dict]) -> bool:
    """Active membership that covers named family members (My Family, family ticket pricing)."""
    m = membership or {}
    if m.get("status") != "active":
        return False
    if m.get("lifetime"):
        return True
    plan, tier = m.get("plan"), m.get("tier")
    return bool(plan_setting(plan, tier, "includes_family", default_settings(plan, tier)["includes_family"]))


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
    try:
        years = int(plan_setting(plan, tier, "term_years", default_settings(plan, tier)["term_years"]))
    except (TypeError, ValueError):
        years = 1
    return max(1, years)


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
    if plan == FREE_PLAN:
        return {"end_date": None, "lifetime": False, "promotion": None, "rule": "free"}
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
