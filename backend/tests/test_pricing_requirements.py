"""Acceptance tests from the ICGD Event Pricing, Registration, Membership & Donations requirements
(section 13), plus the admin controls behind them.

Sample pricing (requirements section 4):
    Period       Non-member  Member  Platinum
    Early Bird   $25         $10     $0
    Regular      $30         $15     $0
"""
import os
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ET = ZoneInfo("America/New_York")
RUN = uuid.uuid4().hex[:6]


def _et(days=0, hours=0) -> str:
    return (datetime.now(ET) + timedelta(days=days, hours=hours)).strftime("%Y-%m-%dT%H:%M")


def _ticket(eb=(25, 10), reg=(30, 15)):
    return {"id": "gen", "name": "General", "price": reg[0], "quantity_total": 0, "quantity_sold": 0,
            "period_prices": {"eb": {"non_member": eb[0], "member": eb[1]}, "reg": {"non_member": reg[0], "member": reg[1]}}}


def _event(admin_h, *, early_bird_open=True, **extra):
    if early_bird_open:
        periods = [{"id": "eb", "name": "Early Bird", "start": _et(-10), "end": _et(10)},
                   {"id": "reg", "name": "Regular", "start": _et(10), "end": _et(30)}]
    else:
        periods = [{"id": "eb", "name": "Early Bird", "start": _et(-20), "end": _et(-1)},
                   {"id": "reg", "name": "Regular", "start": _et(-1), "end": _et(30)}]
    body = {"title": f"Pricing Test {RUN}", "slug": f"pricing-test-{uuid.uuid4().hex[:8]}", "category": "Diwali",
            "date": "Nov 14", "start_date": (datetime.utcnow() + timedelta(days=40)).isoformat(),
            "registration_open": True, "price_periods": periods, "ticket_types": [_ticket()],
            "promo_codes": [{"code": "SAVE5", "kind": "amount", "value": 5, "max_uses": 0, "used": 0},
                            {"code": "OLDCODE", "kind": "percent", "value": 10, "ends": _et(-2)[:10]}],
            "fee_mode": "voluntary", "fee_percent": 3, "fee_fixed": 0.30, **extra}
    r = requests.post(f"{API}/admin/events", headers=admin_h, json=body)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def eb_event(admin_h):
    return _event(admin_h)


@pytest.fixture(scope="module")
def regular_event(admin_h):
    return _event(admin_h, early_bird_open=False)


def _member(admin_h, tier="individual", active=True):
    email = f"pr_{uuid.uuid4().hex[:8]}@example.com"
    reg = requests.post(f"{API}/members/register", json={"email": email, "password": "test12345", "first_name": "Pat",
                                                         "last_name": f"Member{RUN}", "phone": "9375550100"}).json()
    h = {"Authorization": f"Bearer {reg['token']}"}
    mid = reg["member"]["id"]
    if tier:
        r = requests.post(f"{API}/members/me/subscribe", headers=h, json={
            "plan": "regular", "tier": tier, "payment_method": "check", "address": "1 Main St", "city": "Dayton",
            "state": "OH", "zip": "45402", "phone": "9375550100"})
        assert r.status_code == 200, r.text
        requests.post(f"{API}/admin/members/{mid}/mark-paid", headers=admin_h, params={"status": "paid"})
        if not active:
            r = requests.post(f"{API}/admin/members/{mid}/expiration", headers=admin_h,
                              json={"end_date": (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%d"), "reason": "Test: lapsed"})
            assert r.status_code == 200, r.text
    return h, mid, f"Pat Member{RUN}", email


@pytest.fixture(scope="module")
def member(admin_h):
    return _member(admin_h)


@pytest.fixture(scope="module")
def platinum(admin_h):
    """An active Platinum sponsorship with two named people."""
    s = requests.post(f"{API}/sponsorships", json={"company": f"Platinum Co {RUN}", "contact_name": "Raj", "email": f"plat_{RUN}@example.com",
                                                   "phone": "9375550100", "plan": "platinum", "payment_method": "check"}).json()
    s = requests.post(f"{API}/admin/sponsorships/{s['id']}/payment", headers=admin_h, json={"status": "paid"}).json()
    r = requests.put(f"{API}/admin/sponsorships/{s['id']}/named-people", headers=admin_h, json={"people": ["Raj Patel", "Mira Patel"]})
    assert r.status_code == 200, r.text
    s = r.json()
    return {"code": s["sponsor_code"], "people": {p["name"]: p["id"] for p in s["named_people"]}}


def _body(**kw):
    return {"buyer_name": kw.pop("buyer_name", "Test Buyer"), "buyer_email": kw.pop("buyer_email", f"buyer_{uuid.uuid4().hex[:6]}@example.com"),
            "payment_method": kw.pop("payment_method", "check"), **kw}


def _quote(event, headers=None, **kw):
    r = requests.post(f"{API}/events/{event['id']}/quote", headers=headers or {}, json=_body(**kw))
    assert r.status_code == 200, r.text
    return r.json()


def _buy(event, headers=None, **kw):
    return requests.post(f"{API}/events/{event['id']}/purchase-tickets", headers=headers or {}, json=_body(**kw))


SELF = {"ticket_type_id": "gen", "kind": "self"}


def _guest(name):
    return {"ticket_type_id": "gen", "kind": "guest", "name": name}


# ===================== Section 13 acceptance tests =====================
class TestAcceptance:
    def test_one_member_early_bird_10(self, eb_event, member):
        q = _quote(eb_event, member[0], attendees=[SELF])
        assert q["total"] == 10 and q["period"]["name"] == "Early Bird"
        assert q["lines"][0]["category"] == "member"

    def test_one_non_member_early_bird_25(self, eb_event):
        assert _quote(eb_event, attendees=[_guest("Visitor")])["total"] == 25

    def test_one_member_regular_15(self, regular_event, member):
        q = _quote(regular_event, member[0], attendees=[SELF])
        assert q["total"] == 15 and q["period"]["name"] == "Regular"

    def test_platinum_member_free(self, eb_event, platinum):
        q = _quote(eb_event, sponsor_code=platinum["code"],
                   attendees=[{"ticket_type_id": "gen", "kind": "sponsor", "sponsor_person_id": platinum["people"]["Raj Patel"]}])
        assert q["total"] == 0 and q["lines"][0]["category"] == "sponsor"

    def test_member_plus_two_guests_early_bird_60(self, eb_event, member):
        q = _quote(eb_event, member[0], attendees=[SELF, _guest("Guest One"), _guest("Guest Two")])
        assert [l["price"] for l in q["lines"]] == [10, 25, 25] and q["total"] == 60

    def test_expired_member_without_renewal_pays_non_member(self, eb_event, admin_h):
        h, *_ = _member(admin_h, active=False)
        q = _quote(eb_event, h, attendees=[SELF])
        assert q["total"] == 25
        assert q["membership_offer"]["reason"] == "expired" and q["membership_offer"]["member_savings"] == 15

    def test_expired_member_with_paid_renewal(self, eb_event, admin_h):
        h, mid, *_ = _member(admin_h, active=False)
        plans = {p["slug"]: p for p in requests.get(f"{API}/membership-plans").json()}
        dues = next(t["price"] for t in plans["regular"]["tiers"] if t["slug"] == "individual")
        q = _quote(eb_event, h, attendees=[SELF], membership={"plan": "regular", "tier": "individual"})
        assert q["lines"][0]["price"] == 10 and q["membership"]["price"] == dues and q["total"] == 10 + dues
        r = _buy(eb_event, h, attendees=[SELF], membership={"plan": "regular", "tier": "individual"})
        assert r.status_code == 200, r.text
        order = r.json()
        me = requests.get(f"{API}/members/me", headers=h).json()
        assert me["membership"]["status"] == "expired"  # not renewed until payment is confirmed
        requests.post(f"{API}/admin/ticket-orders/{order['id']}/mark-paid", headers=admin_h, params={"status": "paid"})
        me = requests.get(f"{API}/members/me", headers=h).json()
        assert me["membership"]["status"] == "active" and me["membership"]["payment_status"] == "paid"
        assert _parse(me["membership"]["end_date"]) > datetime.utcnow() + timedelta(days=300)
        # Confirming the same payment again must not renew twice
        requests.post(f"{API}/admin/ticket-orders/{order['id']}/mark-paid", headers=admin_h, params={"status": "paid"})
        hist = requests.get(f"{API}/admin/members/{mid}/history", headers=admin_h).json()
        assert sum(1 for x in hist if x.get("order_id") == order["id"]) == 1

    def test_unnamed_family_member_gets_no_member_benefit(self, eb_event, admin_h):
        h, *_ = _member(admin_h, tier="family")
        q = _quote(eb_event, h, attendees=[SELF, _guest("Cousin Not On Account")])
        assert [l["price"] for l in q["lines"]] == [10, 25]

    def test_regular_non_member_with_5_coupon(self, regular_event):
        q = _quote(regular_event, attendees=[_guest("Visitor")], promo_code="SAVE5")
        assert q["discount"] == 5 and q["total"] == 25

    def test_platinum_with_20_donation(self, eb_event, platinum):
        q = _quote(eb_event, sponsor_code=platinum["code"], donation={"amount": 20},
                   attendees=[{"ticket_type_id": "gen", "kind": "sponsor", "sponsor_person_id": platinum["people"]["Mira Patel"]}])
        assert q["total"] == 20 and q["donation"]["amount"] == 20

    def test_member_early_bird_with_25_donation(self, eb_event, member):
        assert _quote(eb_event, member[0], attendees=[SELF], donation={"amount": 25})["total"] == 35

    def test_invalid_or_expired_coupon(self, eb_event):
        for code, why in (("NOPE", "isn't valid"), ("OLDCODE", "expired")):
            q = _quote(eb_event, attendees=[_guest("V")], promo_code=code)
            assert q["discount"] == 0 and q["total"] == 25 and why in q["promo_error"]
            r = _buy(eb_event, attendees=[_guest("V")], promo_code=code)
            assert r.status_code == 400 and why in r.json()["detail"]

    def test_free_event_with_optional_donation(self, admin_h):
        ev = _event(admin_h, ticket_types=[{**_ticket(eb=(0, 0), reg=(0, 0)), "price": 0}])
        assert _quote(ev, attendees=[_guest("V")])["total"] == 0
        r = _buy(ev, attendees=[_guest("V")])
        assert r.status_code == 200 and r.json()["payment_status"] == "paid"
        q = _quote(ev, attendees=[_guest("V")], donation={"amount": 15})
        assert q["total"] == 15

    def test_payment_failure_confirms_nothing(self, eb_event, admin_h):
        h, mid, *_ = _member(admin_h, active=False)
        r = _buy(eb_event, h, attendees=[SELF], membership={"plan": "regular", "tier": "individual"}, donation={"amount": 10})
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["payment_status"] == "awaiting_check"
        requests.post(f"{API}/admin/ticket-orders/{order['id']}/mark-paid", headers=admin_h, params={"status": "failed"})
        me = requests.get(f"{API}/members/me", headers=h).json()
        assert me["membership"]["status"] == "expired"
        donations = [d for d in requests.get(f"{API}/admin/donations", headers=admin_h).json() if d.get("order_id") == order["id"]]
        assert len(donations) == 1 and donations[0]["payment_status"] == "failed"

    def test_no_surcharge_only_optional_contribution(self, eb_event, admin_h):
        q = _quote(eb_event, attendees=[_guest("V")])
        assert q["fee_contribution"] == 0 and q["total"] == 25
        q = _quote(eb_event, attendees=[_guest("V")], cover_fees=True)
        assert q["fee_contribution"] == round(25 * 0.03 + 0.30, 2) and q["total"] == round(25 + 25 * 0.03 + 0.30, 2)
        absorb = _event(admin_h, fee_mode="absorb")
        assert _quote(absorb, attendees=[_guest("V")], cover_fees=True)["fee_contribution"] == 0

    def test_early_bird_cutoff_regular_price_applies(self, regular_event):
        q = _quote(regular_event, attendees=[_guest("V")])
        assert q["total"] == 30 and q["period"]["name"] == "Regular"


def _parse(d):
    return datetime.fromisoformat(str(d).replace("Z", "+00:00")).replace(tzinfo=None)


# ===================== Eligibility details =====================
class TestEligibility:
    def test_verified_family_member_gets_member_price(self, eb_event, admin_h):
        h, *_ = _member(admin_h, tier="family")
        f = requests.post(f"{API}/members/me/family", headers=h, json={"name": "Asha Member", "relation": "spouse", "date_of_birth": "1985-04-01"}).json()
        fam = {"ticket_type_id": "gen", "kind": "family", "family_member_id": f["id"]}
        r = _buy(eb_event, h, attendees=[SELF, fam])
        assert r.status_code == 400 and "not verified" in r.json()["detail"]
        requests.post(f"{API}/admin/family-members/{f['id']}/approve", headers=admin_h, json={"note": ""})
        assert [l["price"] for l in _quote(eb_event, h, attendees=[SELF, fam])["lines"]] == [10, 10]

    def test_individual_member_cannot_add_family(self, eb_event, member):
        r = requests.post(f"{API}/events/{eb_event['id']}/quote", headers=member[0],
                          json=_body(attendees=[SELF, {"ticket_type_id": "gen", "kind": "family", "family_member_id": "x"}]))
        assert r.status_code == 403

    def test_new_membership_in_checkout(self, eb_event, admin_h):
        h, *_ = _member(admin_h, tier=None)
        q = _quote(eb_event, h, attendees=[SELF])
        assert q["total"] == 25 and q["membership_offer"]["reason"] == "join"
        q = _quote(eb_event, h, attendees=[SELF, _guest("Friend")], membership={"plan": "regular", "tier": "family"})
        assert [l["price"] for l in q["lines"]] == [10, 25] and q["membership"]["kind"] == "new"

    def test_membership_purchase_needs_sign_in(self, eb_event):
        r = requests.post(f"{API}/events/{eb_event['id']}/quote", json=_body(attendees=[_guest("V")], membership={"plan": "regular", "tier": "individual"}))
        assert r.status_code == 401

    def test_sponsor_person_once_per_event(self, admin_h, platinum):
        ev = _event(admin_h)
        att = [{"ticket_type_id": "gen", "kind": "sponsor", "sponsor_person_id": platinum["people"]["Raj Patel"]}]
        assert _buy(ev, sponsor_code=platinum["code"], attendees=att).status_code == 200
        r = _buy(ev, sponsor_code=platinum["code"], attendees=att)
        assert r.status_code == 400 and "already has a sponsor ticket" in r.json()["detail"]
        # Their guests pay the regular rate
        q = _quote(ev, sponsor_code=platinum["code"], attendees=[{**att[0], "sponsor_person_id": platinum["people"]["Mira Patel"]}, _guest("Plus One")])
        assert [l["price"] for l in q["lines"]] == [0, 25]

    def test_event_can_restrict_platinum(self, admin_h, platinum):
        att = [{"ticket_type_id": "gen", "kind": "sponsor", "sponsor_person_id": platinum["people"]["Raj Patel"]}]
        off = _event(admin_h, sponsor_perks={"platinum": {"mode": "off"}})
        assert _quote(off, sponsor_code=platinum["code"], attendees=att)["total"] == 25
        priced = _event(admin_h, sponsor_perks={"platinum": {"mode": "price", "price": 12}})
        assert _quote(priced, sponsor_code=platinum["code"], attendees=att)["total"] == 12

    def test_sponsor_named_people_limit(self, admin_h):
        s = requests.post(f"{API}/sponsorships", json={"company": f"Gold Co {RUN}", "contact_name": "G", "email": f"gold_{RUN}@example.com",
                                                       "phone": "9375550100", "plan": "gold", "payment_method": "check"}).json()
        requests.post(f"{API}/admin/sponsorships/{s['id']}/payment", headers=admin_h, json={"status": "paid"})
        r = requests.put(f"{API}/admin/sponsorships/{s['id']}/named-people", headers=admin_h, json={"people": ["A", "B", "C"]})
        assert r.status_code == 400 and "up to 2" in r.json()["detail"]

    def test_guest_never_gets_member_price_in_quick_mode(self, eb_event, member):
        q = _quote(eb_event, member[0], items=[{"ticket_type_id": "gen", "quantity": 3}], buyer_name=member[2])
        assert [l["price"] for l in q["lines"]] == [10, 25, 25]


# ===================== Promo code rules =====================
class TestPromoRules:
    @pytest.fixture(scope="class")
    def promo_event(self, admin_h):
        return _event(admin_h, promo_codes=[
            {"code": "ONCE", "kind": "percent", "value": 50, "per_customer": 1},
            {"code": "BIG", "kind": "amount", "value": 10, "min_purchase": 50},
            {"code": "MEMBERS", "kind": "percent", "value": 20, "categories": ["member"]},
            {"code": "PAUSED", "kind": "amount", "value": 5, "enabled": False},
            {"code": "SOON", "kind": "amount", "value": 5, "starts": _et(3)},
            {"code": "HUGE", "kind": "amount", "value": 500},
        ])

    def test_per_customer_limit(self, promo_event):
        email = f"once_{uuid.uuid4().hex[:6]}@example.com"
        assert _buy(promo_event, attendees=[_guest("V")], promo_code="ONCE", buyer_email=email).status_code == 200
        r = _buy(promo_event, attendees=[_guest("V")], promo_code="ONCE", buyer_email=email)
        assert r.status_code == 400 and "maximum number of times" in r.json()["detail"]

    def test_minimum_purchase(self, promo_event):
        assert "at least $50" in _quote(promo_event, attendees=[_guest("V")], promo_code="BIG")["promo_error"]
        assert _quote(promo_event, attendees=[_guest("A"), _guest("B")], promo_code="BIG")["discount"] == 10

    def test_membership_category_restriction(self, promo_event, member):
        assert "membership type" in _quote(promo_event, attendees=[_guest("V")], promo_code="MEMBERS")["promo_error"]
        assert _quote(promo_event, member[0], attendees=[SELF], promo_code="MEMBERS")["discount"] == 2

    def test_disabled_and_not_started(self, promo_event):
        assert "no longer active" in _quote(promo_event, attendees=[_guest("V")], promo_code="PAUSED")["promo_error"]
        assert "isn't active yet" in _quote(promo_event, attendees=[_guest("V")], promo_code="SOON")["promo_error"]

    def test_never_negative_and_excludes_donation_and_dues(self, promo_event):
        q = _quote(promo_event, attendees=[_guest("V")], promo_code="HUGE", donation={"amount": 30})
        assert q["discount"] == 25 and q["total"] == 30


# ===================== Admin controls =====================
class TestAdminControls:
    def test_overlapping_periods_rejected(self, admin_h):
        body = {"title": "Bad", "slug": f"bad-{uuid.uuid4().hex[:6]}", "category": "Other", "date": "x",
                "price_periods": [{"id": "a", "name": "Early", "start": _et(-5), "end": _et(5)},
                                  {"id": "b", "name": "Regular", "start": _et(2), "end": _et(20)}]}
        r = requests.post(f"{API}/admin/events", headers=admin_h, json=body)
        assert r.status_code == 400 and "overlap" in r.json()["detail"]

    def test_registration_window_enforced(self, admin_h):
        future = _event(admin_h, price_periods=[{"id": "eb", "name": "Early Bird", "start": _et(2), "end": _et(10)}])
        r = requests.post(f"{API}/events/{future['id']}/quote", json=_body(attendees=[_guest("V")]))
        assert r.status_code == 400 and "Registration opens" in r.json()["detail"]
        closed = _event(admin_h, price_periods=[{"id": "eb", "name": "Early Bird", "start": _et(-10), "end": _et(-1)}])
        r = requests.post(f"{API}/events/{closed['id']}/quote", json=_body(attendees=[_guest("V")]))
        assert r.status_code == 400 and "closed" in r.json()["detail"]

    def test_capacity(self, admin_h):
        ev = _event(admin_h, capacity=2)
        assert _buy(ev, attendees=[_guest("A")]).status_code == 200
        r = _buy(ev, attendees=[_guest("B"), _guest("C")])
        assert r.status_code == 400 and "Only 1 spots remain" in r.json()["detail"]

    def test_prices_locked_after_purchase(self, admin_h):
        ev = _event(admin_h)
        order = _buy(ev, attendees=[_guest("V")]).json()
        ev["ticket_types"] = [_ticket(eb=(99, 99))]
        assert requests.put(f"{API}/admin/events/{ev['id']}", headers=admin_h, json=ev).status_code == 200
        orders = requests.get(f"{API}/admin/ticket-orders", headers=admin_h, params={"event_id": ev["id"]}).json()
        assert next(o for o in orders if o["id"] == order["id"])["total"] == 25

    def test_price_changes_are_audited(self, admin_h):
        ev = _event(admin_h)
        ev["ticket_types"] = [_ticket(eb=(20, 8))]
        requests.put(f"{API}/admin/events/{ev['id']}", headers=admin_h, json=ev)
        log = requests.get(f"{API}/admin/audit-log", headers=admin_h, params={"entity_id": ev["id"]}).json()
        upd = next(x for x in log if x["action"] == "update")
        assert upd["actor"] == "admin" and "ticket_types" in upd["changes"]

    def test_comp_and_price_adjustment(self, admin_h):
        ev = _event(admin_h, price_periods=[{"id": "eb", "name": "Early Bird", "start": _et(-10), "end": _et(-1)}])
        r = requests.post(f"{API}/admin/events/{ev['id']}/comp-tickets", headers=admin_h, json={
            "attendees": [{"ticket_type_id": "gen", "name": "Chief Guest"}], "buyer_name": "Board", "buyer_email": "board@example.com",
            "reason": "Chief guest invitation"})
        assert r.status_code == 200, r.text
        o = r.json()
        assert o["total"] == 0 and o["payment_status"] == "paid" and o["tickets"][0]["category"] == "complimentary"
        open_ev = _event(admin_h)
        o = _buy(open_ev, attendees=[_guest("V")]).json()
        r = requests.post(f"{API}/admin/ticket-orders/{o['id']}/adjust", headers=admin_h,
                          json={"ticket_code": o["tickets"][0]["code"], "price": 15, "reason": "Volunteer discount"})
        assert r.status_code == 200 and r.json()["total"] == 15
        log = requests.get(f"{API}/admin/audit-log", headers=admin_h, params={"entity_id": o["id"]}).json()
        assert log[0]["action"] == "price_adjustment" and log[0]["note"] == "Volunteer discount"

    def test_duplicate_and_preview(self, admin_h, eb_event):
        r = requests.post(f"{API}/admin/events/{eb_event['id']}/duplicate", headers=admin_h)
        assert r.status_code == 200
        copy = r.json()
        assert copy["id"] != eb_event["id"] and copy["registration_open"] is False
        assert copy["price_periods"] == eb_event["price_periods"] and copy["ticket_types"][0]["period_prices"] == eb_event["ticket_types"][0]["period_prices"]
        p = requests.post(f"{API}/admin/events/pricing-preview", headers=admin_h, json=eb_event).json()
        eb = next(row for row in p["rows"] if row["period"] == "Early Bird")
        assert (eb["non_member"], eb["member"], eb["sponsors"]["Platinum"], eb["current"]) == (25, 10, 0, True)

    def test_checkout_options(self, eb_event):
        o = requests.get(f"{API}/events/{eb_event['id']}/checkout-options").json()
        assert o["period"]["name"] == "Early Bird" and o["donations_enabled"] is True
        assert o["donation_presets"] == [10, 25, 50, 100] and o["fee_mode"] == "voluntary"


# ===================== Household limits, past events, Platinum 2 =====================
class TestHouseholdLimits:
    def test_platinum_covers_two_people(self, admin_h):
        plat = next(p for p in requests.get(f"{API}/sponsorship-plans").json() if p["slug"] == "platinum")
        assert plat["named_people"] == 2

    def test_family_list_capped_at_six_people(self, admin_h):
        h, *_ = _member(admin_h, tier="family")
        me = requests.get(f"{API}/members/me", headers=h).json()
        assert me["family_size"] == 6 and me["member_tickets_per_event"] == 6
        for i in range(5):
            r = requests.post(f"{API}/members/me/family", headers=h, json={"name": f"Kid {i}", "relation": "child", "date_of_birth": "2015-01-01"})
            assert r.status_code == 200, r.text
        r = requests.post(f"{API}/members/me/family", headers=h, json={"name": "Kid 6", "relation": "child", "date_of_birth": "2015-01-01"})
        assert r.status_code == 400 and "up to 6 people" in r.json()["detail"]

    def test_individual_gets_one_member_ticket(self, admin_h, eb_event):
        h, *_ = _member(admin_h)
        assert requests.get(f"{API}/members/me", headers=h).json()["member_tickets_per_event"] == 1
        q = _quote(eb_event, h, attendees=[SELF, _guest("Friend")])
        assert [l["price"] for l in q["lines"]] == [10, 25]
        assert q["member_tickets"]["limit"] == 1

    def test_one_ticket_per_person_per_event(self, admin_h):
        ev = _event(admin_h)
        h, *_ = _member(admin_h)
        assert _buy(ev, h, attendees=[SELF]).status_code == 200
        r = _buy(ev, h, attendees=[SELF])
        assert r.status_code == 400 and "already have a ticket" in r.json()["detail"]
        # Guests can still be added later, at the non-member price
        q = _quote(ev, h, attendees=[_guest("Friend")])
        assert q["total"] == 25 and q["member_tickets"]["used"] == 1

    def test_member_ticket_limit_applies_across_orders(self, admin_h):
        ev = _event(admin_h)
        h, mid, *_ = _member(admin_h, tier="family")
        fams = []
        for i in range(5):
            f = requests.post(f"{API}/members/me/family", headers=h, json={"name": f"Fam {i}", "relation": "spouse", "date_of_birth": "1980-01-01"}).json()
            requests.post(f"{API}/admin/family-members/{f['id']}/approve", headers=admin_h, json={"note": ""})
            fams.append({"ticket_type_id": "gen", "kind": "family", "family_member_id": f["id"]})
        # Admin lowers the Family allowance to 3 member tickets
        plans = {p["slug"]: p for p in requests.get(f"{API}/admin/membership-plans", headers=admin_h).json()}
        regular = plans["regular"]
        original = [dict(t) for t in regular["tiers"]]
        try:
            tiers = [{**t, "member_tickets": 3} if t["slug"] == "family" else t for t in original]
            assert requests.put(f"{API}/admin/membership-plans/{regular['id']}", headers=admin_h, json={**regular, "tiers": tiers}).status_code == 200
            assert _buy(ev, h, attendees=[SELF, fams[0]]).status_code == 200
            q = _quote(ev, h, attendees=fams[1:4])
            assert [l["price"] for l in q["lines"]] == [10, 25, 25]
            assert "limit reached" in q["lines"][2]["reason"]
        finally:
            requests.put(f"{API}/admin/membership-plans/{regular['id']}", headers=admin_h, json={**regular, "tiers": original})


class TestPastEvents:
    def test_ended_event_stops_selling(self, admin_h):
        ev = _event(admin_h, start_date=(datetime.now(ET) - timedelta(days=3)).strftime("%Y-%m-%dT%H:%M"),
                    end_date=(datetime.now(ET) - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M"))
        r = requests.post(f"{API}/events/{ev['id']}/quote", json=_body(attendees=[_guest("V")]))
        assert r.status_code == 400 and "ended" in r.json()["detail"]
        # Still listed publicly (the site shows it under Past Events)
        assert any(e["id"] == ev["id"] for e in requests.get(f"{API}/events").json())
