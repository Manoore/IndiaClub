"""Phase 7: requirements gap items — calendar-year memberships, promotions, lifetime, admin roles,
sponsorship lifecycle, sponsor pricing, exports, reminders, directory, spam protection."""
import os
import sys
import uuid
from datetime import datetime

import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from membership_rules import compute_term, year_end  # noqa: E402

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
class TestMembershipRules:
    now = datetime(2026, 3, 10, 12, 0)

    def test_standard_ends_dec_31(self):
        assert compute_term("regular", "family", self.now, {})["end_date"] == year_end(2026)

    def test_promo_window_adds_year(self):
        s = {"membership_promo_enabled": True, "membership_promo_start": "2026-03-01", "membership_promo_end": "2026-03-31"}
        t = compute_term("regular", "family", self.now, s)
        assert t["end_date"] == year_end(2027) and t["promo"]

    def test_promo_outside_window_ignored(self):
        s = {"membership_promo_enabled": True, "membership_promo_start": "2026-10-20", "membership_promo_end": "2026-11-30"}
        assert compute_term("regular", "family", self.now, s)["end_date"] == year_end(2026)

    def test_multi_year_tiers(self):
        assert compute_term("extended", "silver", self.now, {})["end_date"] == year_end(2030)
        assert compute_term("extended", "gold", self.now, {})["end_date"] == year_end(2035)

    def test_renewal_continues_from_current_end(self):
        t = compute_term("regular", "family", self.now, {}, current_end=year_end(2026))
        assert t["end_date"] == year_end(2027)

    def test_lifetime_has_no_end(self):
        t = compute_term("lifetime", None, self.now, {})
        assert t["end_date"] is None and t["lifetime"]


# ===================== Membership API =====================
class TestMembershipApi:
    def test_subscribe_ends_dec_31_and_check_awaits(self):
        h, _ = _new_member()
        r = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "family", "payment_method": "check"})
        assert r.status_code == 200, r.text
        mem = r.json()["membership"]
        end = _parse(mem["end_date"])
        assert (end.month, end.day) == (12, 31)
        assert mem["payment_status"] == "awaiting_check"

    def test_quote_and_promo(self, admin_h):
        today = datetime.utcnow().date().isoformat()
        _settings(admin_h, membership_promo_enabled=True, membership_promo_label="Diwali Promotion",
                  membership_promo_start=today, membership_promo_end=today)
        try:
            q = requests.get(f"{API}/membership/quote", params={"plan": "regular", "tier": "family"}).json()
            assert q["promo_label"] == "Diwali Promotion"
            assert _parse(q["valid_through"]).year == datetime.utcnow().year + 1
            h, _ = _new_member()
            mem = requests.post(f"{API}/members/me/subscribe", headers=h, json={"plan": "regular", "tier": "family", "payment_method": "paypal"}).json()["membership"]
            assert _parse(mem["end_date"]).year == datetime.utcnow().year + 1
            assert mem["promo_label"] == "Diwali Promotion"
        finally:
            _settings(admin_h, membership_promo_enabled=False)

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
