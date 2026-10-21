"""Phase 7: requirements gap items — calendar-year memberships, promotions, lifetime, admin roles,
sponsorship lifecycle, sponsor pricing, exports, reminders, directory, spam protection."""
import os
import sys
import uuid
from datetime import datetime, timedelta

import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from membership_rules import add_months, compute_term, find_promotion  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
EVT = "evt-2"
COMPANY = f"P7 Sponsor {uuid.uuid4().hex[:5]}"


def _admin_login(username="admin", password="admin123"):
    r = requests.post(f"{API}/admin/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def admin_h():
    return _admin_login()


def _new_member():
    email = f"p7_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/members/register", json={"email": email, "password": "test12345", "first_name": "P7", "last_name": "Tester"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}, r.json()["member"]


def _parse(d):
    return datetime.fromisoformat(d.replace("Z", "+00:00")).replace(tzinfo=None)


def _settings(admin_h, **kw):
    r = requests.put(f"{API}/admin/site-settings", headers=admin_h, json=kw)
    assert r.status_code == 200, r.text


# ===================== Membership rules (unit) =====================
def _promo(**kw):
    base = {"id": "p1", "name": "Diwali", "active": True, "start_date": "2026-10-01", "end_date": "2026-11-15",
            "expiration_date": "2027-12-31", "applies_to": "both"}
    return {**base, **kw}


class TestMembershipRules:
    paid = datetime(2026, 10, 20, 12, 0)

    def test_standard_is_12_months_from_payment(self):
        t = compute_term("regular", "family", self.paid)
        assert t["end_date"] == datetime(2027, 10, 20, 12, 0) and t["rule"] == "standard"

    def test_leap_day_clamps(self):
        assert add_months(datetime(2028, 2, 29), 12) == datetime(2029, 2, 28)

    def test_promotion_fixed_expiration(self):
        t = compute_term("regular", "family", self.paid, kind="renewal", promotion=_promo())
        assert t["end_date"] == datetime(2027, 12, 31, 23, 59, 59)
        assert t["rule"] == "promotion" and t["promotion"]["name"] == "Diwali"

    def test_never_earlier_than_current(self):
        current = datetime(2028, 6, 1)
        t = compute_term("regular", "family", self.paid, kind="renewal", current_end=current, promotion=_promo())
        assert t["end_date"] == current and t["rule"] == "kept_current" and t["promotion"] is None

    def test_promotion_never_less_than_standard(self):
        t = compute_term("regular", "family", self.paid, promotion=_promo(expiration_date="2027-01-31"))
        assert t["end_date"] == datetime(2027, 10, 20, 12, 0) and t["rule"] == "standard"

    def test_applies_to_and_state(self):
        now = datetime(2026, 10, 20)
        assert find_promotion([_promo(applies_to="new")], now, "renewal") is None
        assert find_promotion([_promo(applies_to="renewal")], now, "renewal")["id"] == "p1"
        assert find_promotion([_promo(active=False)], now, "new") is None
        assert find_promotion([_promo(start_date="2026-11-01")], now, "new") is None  # scheduled
        assert find_promotion([_promo(end_date="2026-10-19")], now, "new") is None  # ended

    def test_multi_year_tiers(self):
        assert compute_term("extended", "silver", self.paid)["end_date"] == datetime(2031, 10, 20, 12, 0)

    def test_lifetime_has_no_end(self):
        t = compute_term("lifetime", None, self.paid)
        assert t["end_date"] is None and t["lifetime"]


# ===================== Membership API =====================
def _history(admin_h, mid):
    return requests.get(f"{API}/admin/members/{mid}/history", headers=admin_h).json()


def _create_promo(admin_h, **kw):
    today = datetime.utcnow().date()
    body = {"name": f"P7 Promo {uuid.uuid4().hex[:4]}", "start_date": str(today - timedelta(days=1)),
            "end_date": str(today + timedelta(days=10)), "expiration_date": f"{today.year + 2}-12-31",
            "applies_to": "both", "active": True, **kw}
    r = requests.post(f"{API}/admin/membership-promotions", headers=admin_h, json=body)
    assert r.status_code == 200, r.text
    return r.json()


def _off(admin_h, promo):
    body = {k: promo[k] for k in ("name", "start_date", "end_date", "expiration_date", "applies_to")}
    requests.put(f"{API}/admin/membership-promotions/{promo['id']}", headers=admin_h, json={**body, "active": False})


class TestMembershipApi:
    def test_subscribe_is_12_months_and_audited(self, admin_h):
        h, m = _new_member()
        r = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "family", "payment_method": "check"})
        assert r.status_code == 200, r.text
        j = r.json()
        end = _parse(j["membership"]["end_date"]).date()
        assert end == add_months(datetime.utcnow(), 12).date()
        assert j["membership"]["payment_status"] == "awaiting_check" and j["joined_at"]
        assert any(e["action"] == "join" for e in _history(admin_h, m["id"]))

    def test_payment_recalculates_from_payment_date(self, admin_h):
        h, m = _new_member()
        before = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "individual", "payment_method": "check"}).json()
        r = requests.post(f"{API}/admin/members/{m['id']}/mark-paid?status=paid", headers=admin_h)
        assert r.status_code == 200, r.text
        after = requests.get(f"{API}/members/me", headers=h).json()["membership"]
        assert after["paid_at"] and after["payment_status"] == "paid"
        assert _parse(after["end_date"]) >= _parse(before["membership"]["end_date"])
        entry = next(e for e in _history(admin_h, m["id"]) if e["action"] == "payment")
        assert entry["payment_status"] == "paid" and entry["previous_payment_status"] == "awaiting_check"

    def test_promotion_for_new_members(self, admin_h):
        promo = _create_promo(admin_h, applies_to="new")
        try:
            h, m = _new_member()
            q = requests.get(f"{API}/membership/quote", headers=h, params={"plan": "regular", "tier": "family"}).json()
            assert q["kind"] == "new" and q["promotion"]["id"] == promo["id"] and q["rule"] == "promotion"
            mem = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "family", "payment_method": "paypal"}).json()["membership"]
            assert _parse(mem["end_date"]).date().isoformat() == promo["expiration_date"]
            assert mem["promotion"]["name"] == promo["name"]
            listed = next(p for p in requests.get(f"{API}/admin/membership-promotions", headers=admin_h).json() if p["id"] == promo["id"])
            assert listed["usage_count"] == 1 and listed["state"] == "active"
            assert requests.delete(f"{API}/admin/membership-promotions/{promo['id']}", headers=admin_h).status_code == 400
            # Rule 6: switching the promotion off leaves granted memberships untouched
            _off(admin_h, promo)
            assert requests.get(f"{API}/members/me", headers=h).json()["membership"]["end_date"] == mem["end_date"]
        finally:
            _off(admin_h, promo)

    def test_new_only_promotion_skips_renewals(self, admin_h):
        h, m = _new_member()
        requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "family", "payment_method": "paypal"})
        promo = _create_promo(admin_h, applies_to="new")
        try:
            q = requests.get(f"{API}/membership/quote", headers=h, params={"plan": "regular", "tier": "family"}).json()
            assert q["kind"] == "renewal" and q["promotion"] is None
        finally:
            _off(admin_h, promo)

    def test_promotion_validation(self, admin_h):
        today = datetime.utcnow().date()
        bad = {"name": "Bad", "start_date": str(today), "end_date": str(today + timedelta(days=5)),
               "expiration_date": str(today + timedelta(days=2)), "applies_to": "both"}
        assert requests.post(f"{API}/admin/membership-promotions", headers=admin_h, json=bad).status_code == 400

    def test_early_renewal_never_shortens(self, admin_h):
        h, m = _new_member()
        requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "family", "payment_method": "paypal"})
        far = (datetime.utcnow() + timedelta(days=700)).date().isoformat()
        r = requests.post(f"{API}/admin/members/{m['id']}/expiration", headers=admin_h, json={"end_date": far, "reason": "Board-approved extension"})
        assert r.status_code == 200, r.text
        mem = requests.post(f"{API}/members/me/renew", headers=h).json()["membership"]
        assert _parse(mem["end_date"]).date().isoformat() == far and mem["term_rule"] == "kept_current"

    def test_override_requires_reason_and_is_logged(self, admin_h):
        h, m = _new_member()
        requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "family", "payment_method": "paypal"})
        assert requests.post(f"{API}/admin/members/{m['id']}/expiration", headers=admin_h, json={"end_date": "2030-01-31"}).status_code == 422
        requests.post(f"{API}/admin/members/{m['id']}/expiration", headers=admin_h, json={"end_date": "2030-01-31", "reason": "Volunteer of the year"})
        entry = next(e for e in _history(admin_h, m["id"]) if e["action"] == "override")
        assert entry["reason"] == "Volunteer of the year" and entry["actor"] == "admin"
        assert _parse(entry["new_end"]).date().isoformat() == "2030-01-31"

    def test_lifetime_hidden_and_not_purchasable(self):
        slugs = [p["slug"] for p in requests.get(f"{API}/membership-plans").json()]
        assert "lifetime" not in slugs
        h, _ = _new_member()
        r = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "lifetime", "payment_method": "check"})
        assert r.status_code == 400

    def test_admin_grants_lifetime_never_expires(self, admin_h):
        h, m = _new_member()
        r = requests.post(f"{API}/admin/members/{m['id']}/lifetime", headers=admin_h)
        assert r.status_code == 200, r.text
        mem = r.json()["membership"]
        assert mem["lifetime"] and mem["end_date"] is None and mem["status"] == "active"
        assert requests.post(f"{API}/members/me/renew", headers=h).status_code == 400

    def test_youth_tier_name(self):
        plans = {p["slug"]: p for p in requests.get(f"{API}/membership-plans").json()}
        names = [t["name"] for t in plans["regular"]["tiers"]]
        assert "Youth" in names


# ===================== Admin roles =====================
class TestRoles:
    @pytest.fixture(scope="class")
    def volunteer(self, admin_h):
        uname = f"vol_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/admin/users", headers=admin_h, json={"username": uname, "password": "volunteer123", "role": "volunteer"})
        assert r.status_code == 200, r.text
        yield _admin_login(uname, "volunteer123"), r.json()
        requests.delete(f"{API}/admin/users/{r.json()['id']}", headers=admin_h)

    def test_me_reports_role(self, admin_h):
        me = requests.get(f"{API}/admin/me", headers=admin_h).json()
        assert me["role"] == "webmaster" and "*" in me["areas"]

    def test_volunteer_limited_to_checkin(self, volunteer):
        h, _ = volunteer
        assert requests.get(f"{API}/admin/me", headers=h).json()["areas"] == ["checkin"]
        assert requests.get(f"{API}/admin/events", headers=h).status_code == 200
        assert requests.get(f"{API}/admin/events/{EVT}/attendance", headers=h).status_code == 200
        assert requests.get(f"{API}/admin/members", headers=h).status_code == 403
        assert requests.get(f"{API}/admin/ticket-orders", headers=h).status_code == 403
        assert requests.post(f"{API}/admin/events", headers=h, json={"title": "x"}).status_code == 403
        assert requests.get(f"{API}/admin/users", headers=h).status_code == 403

    def test_treasurer_can_export_revenue_not_content(self, admin_h):
        uname = f"tr_{uuid.uuid4().hex[:6]}"
        u = requests.post(f"{API}/admin/users", headers=admin_h, json={"username": uname, "password": "treasurer123", "role": "treasurer"}).json()
        try:
            h = _admin_login(uname, "treasurer123")
            assert requests.get(f"{API}/admin/exports/revenue", headers=h).status_code == 200
            assert requests.get(f"{API}/admin/hero-slides", headers=h).status_code == 403
            assert requests.get(f"{API}/admin/exports/registrations", headers=h).status_code == 200
        finally:
            requests.delete(f"{API}/admin/users/{u['id']}", headers=admin_h)

    def test_cannot_remove_last_webmaster(self, admin_h):
        users = requests.get(f"{API}/admin/users", headers=admin_h).json()
        me = next(u for u in users if u["username"] == "admin")
        r = requests.put(f"{API}/admin/users/{me['id']}", headers=admin_h, json={"username": "admin", "role": "volunteer"})
        assert r.status_code == 400


# ===================== Sponsorships =====================
class TestSponsorships:
    @pytest.fixture(scope="class")
    def paid_sponsorship(self, admin_h):
        plans = requests.get(f"{API}/sponsorship-plans").json()
        assert [p["name"] for p in plans] == ["Platinum", "Gold", "Silver", "Bronze"]
        email = f"sp_{uuid.uuid4().hex[:6]}@example.com"
        r = requests.post(f"{API}/sponsorships", json={
            "company": COMPANY, "contact_name": "Asha", "email": email, "phone": "9375550100",
            "plan": "gold", "payment_method": "check",
        })
        assert r.status_code == 200, r.text
        s = r.json()
        assert s["status"] == "pending" and s["payment_status"] == "awaiting_check" and s["amount"] == 2500
        r = requests.post(f"{API}/admin/sponsorships/{s['id']}/payment", headers=admin_h, json={"status": "paid"})
        assert r.status_code == 200, r.text
        return r.json()

    def test_paid_activates_listing_through_dec_31(self, paid_sponsorship):
        s = paid_sponsorship
        assert s["status"] == "active" and s["sponsor_code"].startswith("SPN-")
        end = _parse(s["end_date"])
        assert (end.month, end.day, end.year) == (12, 31, datetime.utcnow().year)
        names = [x["name"] for x in requests.get(f"{API}/sponsors").json()]
        assert COMPANY in names

    def test_renewal_extends_a_year(self, admin_h, paid_sponsorship):
        r = requests.post(f"{API}/sponsorships", json={
            "company": COMPANY, "contact_name": "Asha", "email": paid_sponsorship["email"], "phone": "9375550100",
            "plan": "gold", "payment_method": "other", "renewal": True,
        })
        assert r.status_code == 200, r.text
        ren = r.json()
        assert ren["is_renewal"] and ren["previous_id"] == paid_sponsorship["id"]
        done = requests.post(f"{API}/admin/sponsorships/{ren['id']}/payment", headers=admin_h, json={"status": "paid"}).json()
        assert _parse(done["end_date"]).year == datetime.utcnow().year + 1
        assert done["sponsor_code"] == paid_sponsorship["sponsor_code"]
        listings = [x for x in requests.get(f"{API}/sponsors").json() if x["name"] == COMPANY]
        assert len(listings) == 1

    def test_invoice_pdf(self, admin_h, paid_sponsorship):
        r = requests.get(f"{API}/admin/sponsorships/{paid_sponsorship['id']}/invoice", headers=admin_h)
        assert r.status_code == 200 and r.content[:4] == b"%PDF"

    def test_sponsor_price_with_code(self, admin_h, paid_sponsorship):
        evt = requests.get(f"{API}/admin/events/{EVT}", headers=admin_h).json()
        tts = evt["ticket_types"]
        for t in tts:
            if t["id"] == "tt-diwali-gen":
                t["sponsor_price"] = 0
        requests.put(f"{API}/admin/events/{EVT}", headers=admin_h, json={"ticket_types": tts})
        body = {"event_id": EVT, "items": [{"ticket_type_id": "tt-diwali-gen", "quantity": 2}], "buyer_name": "Sponsor Guest",
                "buyer_email": "sg@example.com", "payment_method": "check", "sponsor_code": paid_sponsorship["sponsor_code"]}
        r = requests.post(f"{API}/events/{EVT}/purchase-tickets", json=body)
        assert r.status_code == 200, r.text
        o = r.json()
        assert o["total"] == 0 and o["sponsor_company"] == COMPANY
        assert o["payment_status"] == "awaiting_check"
        bad = requests.post(f"{API}/events/{EVT}/purchase-tickets", json={**body, "sponsor_code": "SPN-NOPE00"})
        assert bad.status_code == 400
        requests.delete(f"{API}/admin/ticket-orders/{o['id']}", headers=admin_h)

    def test_refund_deactivates_listing(self, admin_h):
        s = requests.post(f"{API}/sponsorships", json={"company": "Refund Co", "contact_name": "R", "email": "refund@example.com",
                                                       "phone": "9375550101", "plan": "bronze", "payment_method": "check"}).json()
        requests.post(f"{API}/admin/sponsorships/{s['id']}/payment", headers=admin_h, json={"status": "paid"})
        assert "Refund Co" in [x["name"] for x in requests.get(f"{API}/sponsors").json()]
        r = requests.post(f"{API}/admin/sponsorships/{s['id']}/payment", headers=admin_h, json={"status": "refunded"}).json()
        assert r["status"] == "cancelled"
        assert "Refund Co" not in [x["name"] for x in requests.get(f"{API}/sponsors").json()]


# ===================== Reports, reminders, check-in search =====================
class TestReports:
    @pytest.mark.parametrize("kind", ["members", "sponsors", "registrations", "revenue", "donations"])
    def test_exports_csv(self, admin_h, kind):
        r = requests.get(f"{API}/admin/exports/{kind}", headers=admin_h)
        assert r.status_code == 200, r.text
        assert r.headers["content-type"].startswith("text/csv")
        assert len(r.content.decode("utf-8-sig").splitlines()) >= 1

    def test_summary_and_reminders(self, admin_h):
        s = requests.get(f"{API}/admin/reports/summary", headers=admin_h).json()
        assert "total_paid" in s and isinstance(s["sources"], list)
        rem = requests.get(f"{API}/admin/reminders", headers=admin_h).json()
        assert {"members_expiring", "sponsors_expiring", "members_expired", "sponsors_expired"} <= rem.keys()

    def test_attendee_name_search(self, admin_h):
        body = {"event_id": EVT, "attendees": [{"ticket_type_id": "tt-diwali-gen", "name": "Zubin Searchable"}],
                "buyer_name": "Zubin Buyer", "buyer_email": "zb@example.com", "payment_method": "paypal"}
        o = requests.post(f"{API}/events/{EVT}/purchase-tickets", json=body).json()
        try:
            res = requests.get(f"{API}/admin/events/{EVT}/attendees", headers=admin_h, params={"q": "searchable"}).json()
            assert any(r["attendee_name"] == "Zubin Searchable" for r in res)
        finally:
            requests.delete(f"{API}/admin/ticket-orders/{o['id']}", headers=admin_h)

    def test_new_payment_statuses(self, admin_h):
        orders = requests.get(f"{API}/admin/ticket-orders", headers=admin_h).json()
        if orders:
            oid = orders[0]["id"]
            prev = orders[0]["payment_status"]
            assert requests.post(f"{API}/admin/ticket-orders/{oid}/mark-paid?status=failed", headers=admin_h).status_code == 200
            requests.post(f"{API}/admin/ticket-orders/{oid}/mark-paid?status={prev}", headers=admin_h)


# ===================== Community =====================
class TestCommunity:
    def test_business_directory_flow(self, admin_h):
        h, _ = _new_member()
        assert requests.post(f"{API}/businesses", json={"name": "Anon Biz"}).status_code == 401
        r = requests.post(f"{API}/businesses", headers=h, json={"name": "P7 Grocers", "category": "Grocery"})
        assert r.status_code == 200, r.text
        bid = r.json()["id"]
        assert "P7 Grocers" not in [b["name"] for b in requests.get(f"{API}/businesses").json()]
        assert requests.post(f"{API}/admin/businesses/{bid}/approve", headers=admin_h).status_code == 200
        assert "P7 Grocers" in [b["name"] for b in requests.get(f"{API}/businesses").json()]
        requests.delete(f"{API}/admin/businesses/{bid}", headers=admin_h)

    def test_classifieds_members_only(self, admin_h):
        ad = {"title": "P7 ad", "category": "For Sale", "location": "Dayton", "description": "desc", "contact": "x@example.com"}
        _settings(admin_h, classifieds_members_only=True)
        try:
            assert requests.post(f"{API}/classifieds", json=ad).status_code == 401
            h, m = _new_member()
            assert requests.post(f"{API}/classifieds", headers=h, json=ad).status_code == 200
        finally:
            _settings(admin_h, classifieds_members_only=False)

    def test_honeypot_rejects_bots(self):
        r = requests.post(f"{API}/contact", json={"name": "Bot", "email": "bot@example.com", "subject": "hi",
                                                  "message": "spam", "website_hp": "http://spam.example"})
        assert r.status_code == 400


# ===================== My Family gating + changing membership type =====================
class TestFamilyAndTierChange:
    def _member(self, tier):
        h, m = _new_member()
        r = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": tier, "payment_method": "check"})
        assert r.status_code == 200, r.text
        return h, r.json()

    def test_individual_cannot_use_family(self):
        h, me = self._member("individual")
        assert me["family_enabled"] is False
        r = requests.post(f"{API}/members/me/family", headers=h, json={"name": "Kid", "relation": "child", "date_of_birth": "2018-05-01"})
        assert r.status_code == 403

    def test_family_member_can_use_family(self):
        h, me = self._member("family")
        assert me["family_enabled"] is True
        r = requests.post(f"{API}/members/me/family", headers=h, json={"name": "Kid", "relation": "child", "date_of_birth": "2018-05-01"})
        assert r.status_code == 200, r.text

    def test_same_plan_resubscribe_blocked(self):
        h, _ = self._member("individual")
        r = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "family", "payment_method": "check"})
        assert r.status_code == 400 and "Change membership type" in r.text

    def test_upgrade_pays_difference_keeps_expiry(self, admin_h):
        h, me = self._member("individual")
        q = requests.get(f"{API}/members/me/change-tier/quote", headers=h, params={"tier": "family"}).json()
        assert q["kind"] == "upgrade" and q["amount"] == 20
        r = requests.post(f"{API}/members/me/change-tier", headers=h, json={"tier": "family", "payment_method": "check"})
        assert r.status_code == 200, r.text
        j = r.json()
        mem = j["membership"]
        assert mem["tier"] == "family" and j["family_enabled"] is True
        assert mem["end_date"] == me["membership"]["end_date"]
        up = mem["upgrades"][-1]
        assert up["amount"] == 20 and up["payment_status"] == "awaiting_check"
        assert requests.post(f"{API}/admin/members/{j['id']}/upgrades/{up['id']}/payment", headers=admin_h, json={"status": "paid"}).status_code == 200
        hist = _history(admin_h, j["id"])
        assert any(e["action"] == "upgrade" and e["amount"] == 20 for e in hist)
        assert any(e["action"] == "upgrade_payment" and e["payment_status"] == "paid" for e in hist)
        csv_text = requests.get(f"{API}/admin/exports/revenue", headers=admin_h).content.decode("utf-8-sig")
        assert "Membership upgrade" in csv_text

    def test_downgrade_waits_for_renewal(self):
        h, me = self._member("family")
        q = requests.get(f"{API}/members/me/change-tier/quote", headers=h, params={"tier": "individual"}).json()
        assert q["kind"] == "downgrade" and q["amount"] == 0
        mem = requests.post(f"{API}/members/me/change-tier", headers=h, json={"tier": "individual"}).json()["membership"]
        assert mem["tier"] == "family" and mem["scheduled_tier"] == "individual"
        renewed = requests.post(f"{API}/members/me/renew", headers=h).json()["membership"]
        assert renewed["tier"] == "individual" and not renewed.get("scheduled_tier")
