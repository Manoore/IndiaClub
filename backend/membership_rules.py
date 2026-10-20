"""Membership validity rules: calendar-year terms, promotion windows, multi-year and lifetime plans."""
from datetime import datetime, date
from typing import Optional

LIFETIME_PLAN = "lifetime"
# Multi-year tiers on the "extended" plan → number of calendar years covered
MULTI_YEAR_TIERS = {"silver": 5, "gold": 10}


def year_end(year: int) -> datetime:
    return datetime(year, 12, 31, 23, 59, 59)


def _to_date(v) -> Optional[date]:
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


def active_promo(settings: Optional[dict], now: datetime) -> Optional[dict]:
    """Return {label, start, end} when a membership promotion window covers `now`."""
    s = settings or {}
    if not s.get("membership_promo_enabled"):
        return None
    start, end = _to_date(s.get("membership_promo_start")), _to_date(s.get("membership_promo_end"))
    today = now.date()
    if start and today < start:
        return None
    if end and today > end:
        return None
    return {"label": s.get("membership_promo_label") or "Membership Promotion", "start": start, "end": end}


def years_covered(plan: Optional[str], tier: Optional[str]) -> int:
    if plan == "extended" and tier in MULTI_YEAR_TIERS:
        return MULTI_YEAR_TIERS[tier]
    return 1


def compute_term(plan: Optional[str], tier: Optional[str], now: datetime, settings: Optional[dict],
                 current_end: Optional[datetime] = None) -> dict:
    """Work out the membership end date.

    - Lifetime: no end date.
    - Standard: through Dec 31 of the current year (N years for multi-year tiers).
    - Promotion window active: one extra calendar year (e.g. Diwali → Dec 31 next year).
    - Renewal of a still-active membership: continues from the current end date's year.
    """
    if plan == LIFETIME_PLAN:
        return {"end_date": None, "lifetime": True, "promo": None}
    years = years_covered(plan, tier)
    if current_end and current_end > now:
        return {"end_date": year_end(current_end.year + years), "lifetime": False, "promo": None}
    promo = active_promo(settings, now)
    extra = 1 if promo else 0
    return {"end_date": year_end(now.year + years - 1 + extra), "lifetime": False, "promo": promo["label"] if promo else None}
