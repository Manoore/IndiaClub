"""Phase 5 backend tests:
- Ticket pricing precedence (early-bird > member > regular)
- Promo code application and limits
- /validate-promo previews
- Member renewal logic
- Admin event CRUD round-trip with new fields
- Legacy events without member_price/EB still work
"""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


# ===== Shared fixtures =====
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def active_member_token():
    r = requests.post(f"{API}/members/login", json={"email": "demo@indiaclubdayton.org", "password": "demo1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def member_headers(active_member_token):
    return {"Authorization": f"Bearer {active_member_token}"}


# ===== Event creation helper =====
def _now_iso(offset_days=0):
    return (datetime.utcnow() + timedelta(days=offset_days)).isoformat()


@pytest.fixture
def phase5_event(admin_headers):
    """Create a Phase-5 event with EB, member, regular prices + promo code."""
    payload = {
        "title": "TEST_phase5_event",
        "slug": f"test-phase5-{int(datetime.utcnow().timestamp())}",
        "category": "Cultural",
        "date": "2026-06-15",
        "event_format": "hybrid",
        "start_date": _now_iso(30),
        "end_date": _now_iso(31),
        "online_url": "https://zoom.us/j/test",
        "schedule": [{"day": "Day 1", "time": "6pm", "title": "Opening", "location_or_link": "Hall"}],
        "promo_codes": [
            {"code": "DIWALI20", "kind": "percent", "value": 20, "max_uses": 10, "used": 0},
            {"code": "FLAT5", "kind": "amount", "value": 5, "max_uses": 0, "used": 0},
            {"code": "USEDUP", "kind": "percent", "value": 50, "max_uses": 1, "used": 1},
        ],
        "ticket_types": [
            {
                "id": "adult-tt",
                "name": "Adult",
                "price": 50,
                "member_price": 35,
                "early_bird_price": 40,
                "early_bird_end_date": _now_iso(7),  # active EB window
                "quantity_total": 100,
                "quantity_sold": 0,
            },
            {
                "id": "child-tt",
                "name": "Child",
                "price": 20,
                "member_price": 15,
                "quantity_total": 100,
                "quantity_sold": 0,
            },
            {
                "id": "regular-tt",
                "name": "RegularOnly",
                "price": 25,
                "quantity_total": 50,
                "quantity_sold": 0,
            },
            {
                "id": "eb-expired-tt",
                "name": "ExpiredEB",
                "price": 30,
                "early_bird_price": 20,
                "early_bird_end_date": _now_iso(-5),  # EB already past
                "member_price": 22,
                "quantity_total": 50,
                "quantity_sold": 0,
            },
        ],
    }
    r = requests.post(f"{API}/admin/events", headers=admin_headers, json=payload)
    assert r.status_code == 200, r.text
    event = r.json()
    yield event
    # Cleanup
    requests.delete(f"{API}/admin/events/{event['id']}", headers=admin_headers)


# ===== Pricing precedence =====
class TestPricingPrecedence:
    def test_non_member_eb_active(self, phase5_event):
        """Non-member buying EB-active ticket should pay early_bird_price=40."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "adult-tt", "quantity": 1}],
                "buyer_name": "TEST_non_member_eb",
                "buyer_email": "test_nm_eb@example.com",
                "payment_method": "paypal",
            },
        )
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["items"][0]["unit_price"] == 40.0
        assert order["subtotal"] == 40.0
        assert order["total"] == 40.0

    def test_active_member_no_eb_window(self, phase5_event, member_headers):
        """Member buying Child ticket (no EB) should pay member_price=15."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            headers=member_headers,
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "child-tt", "quantity": 1}],
                "buyer_name": "TEST_member_no_eb",
                "buyer_email": "test_m_noeb@example.com",
                "payment_method": "paypal",
            },
        )
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["items"][0]["unit_price"] == 15.0

    def test_eb_takes_precedence_over_member(self, phase5_event, member_headers):
        """Active member buying EB-active Adult ticket pays EB=40 (not member=35)."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            headers=member_headers,
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "adult-tt", "quantity": 1}],
                "buyer_name": "TEST_member_eb",
                "buyer_email": "test_m_eb@example.com",
                "payment_method": "paypal",
            },
        )
        assert r.status_code == 200, r.text
        order = r.json()
        # EB beats member: 40 not 35
        assert order["items"][0]["unit_price"] == 40.0, "EB price (40) should win over member price (35)"

    def test_regular_price_when_neither_applies(self, phase5_event):
        """Non-member, no-EB ticket → regular price=25."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "regular-tt", "quantity": 1}],
                "buyer_name": "TEST_regular",
                "buyer_email": "test_reg@example.com",
                "payment_method": "paypal",
            },
        )
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["items"][0]["unit_price"] == 25.0

    def test_expired_eb_falls_to_member(self, phase5_event, member_headers):
        """Member buying ExpiredEB ticket → EB expired, member_price=22 used."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            headers=member_headers,
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "eb-expired-tt", "quantity": 1}],
                "buyer_name": "TEST_exp_eb",
                "buyer_email": "test_exp_eb@example.com",
                "payment_method": "paypal",
            },
        )
        assert r.status_code == 200, r.text
        assert r.json()["items"][0]["unit_price"] == 22.0

    def test_expired_eb_non_member_falls_to_regular(self, phase5_event):
        """Non-member buying ExpiredEB → regular=30."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "eb-expired-tt", "quantity": 1}],
                "buyer_name": "TEST_exp_eb_nm",
                "buyer_email": "test_exp_eb_nm@example.com",
                "payment_method": "paypal",
            },
        )
        assert r.status_code == 200, r.text
        assert r.json()["items"][0]["unit_price"] == 30.0


# ===== Promo codes =====
class TestPromoCodes:
    def test_valid_promo_applies_discount(self, phase5_event):
        """DIWALI20: subtotal 80 (2x adult @40 EB) - 20% = 64."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "adult-tt", "quantity": 2}],
                "buyer_name": "TEST_promo",
                "buyer_email": "test_promo@example.com",
                "payment_method": "paypal",
                "promo_code": "DIWALI20",
            },
        )
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["subtotal"] == 80.0
        assert order["discount"] == 16.0  # 20% of 80
        assert order["total"] == 64.0
        assert order["promo_code"] == "DIWALI20"

    def test_amount_promo(self, phase5_event):
        """FLAT5: amount-based promo."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "regular-tt", "quantity": 1}],
                "buyer_name": "TEST_flat5",
                "buyer_email": "test_flat5@example.com",
                "payment_method": "paypal",
                "promo_code": "flat5",  # lowercase, should still match
            },
        )
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["discount"] == 5.0
        assert order["total"] == 20.0

    def test_invalid_promo_code(self, phase5_event):
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "adult-tt", "quantity": 1}],
                "buyer_name": "TEST_bad_promo",
                "buyer_email": "test_bp@example.com",
                "payment_method": "paypal",
                "promo_code": "NOTREAL",
            },
        )
        assert r.status_code == 400, r.text

    def test_promo_max_uses_exhausted(self, phase5_event):
        """USEDUP: max_uses=1, used=1 → 400."""
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/purchase-tickets",
            json={
                "event_id": phase5_event["id"],
                "items": [{"ticket_type_id": "adult-tt", "quantity": 1}],
                "buyer_name": "TEST_usedup",
                "buyer_email": "test_usedup@example.com",
                "payment_method": "paypal",
                "promo_code": "USEDUP",
            },
        )
        assert r.status_code == 400, r.text

    def test_validate_promo_valid(self, phase5_event):
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/validate-promo",
            json={"code": "DIWALI20"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] == "DIWALI20"
        assert d["kind"] == "percent"
        assert d["value"] == 20.0

    def test_validate_promo_invalid(self, phase5_event):
        r = requests.post(
            f"{API}/events/{phase5_event['id']}/validate-promo",
            json={"code": "FAKE"},
        )
        assert r.status_code == 404, r.text


# ===== Membership Renewal =====
class TestMemberRenewal:
    def test_renew_active_extends_end_date(self, member_headers, active_member_token):
        # Get current end_date
        me1 = requests.get(f"{API}/members/me", headers=member_headers).json()
        old_end_str = me1["membership"]["end_date"]
        old_end = datetime.fromisoformat(old_end_str.replace("Z", "+00:00")).replace(tzinfo=None)

        r = requests.post(f"{API}/members/me/renew", headers=member_headers)
        assert r.status_code == 200, r.text
        new_end_str = r.json()["membership"]["end_date"]
        new_end = datetime.fromisoformat(new_end_str.replace("Z", "+00:00")).replace(tzinfo=None)

        # Should be extended by ~365 days from old end (if old end was in the future)
        delta = (new_end - old_end).days
        assert 364 <= delta <= 366, f"Expected ~365 day extension, got {delta}"
        assert r.json()["membership"]["status"] == "active"

    def test_renew_no_plan_returns_400(self, admin_headers):
        # Register a fresh member with no subscription
        email = f"test_no_plan_{int(datetime.utcnow().timestamp())}@example.com"
        reg = requests.post(f"{API}/members/register", json={
            "email": email, "password": "test1234",
            "first_name": "Test", "last_name": "NoPlan",
        })
        assert reg.status_code == 200, reg.text
        token = reg.json()["token"]
        member_id = reg.json()["member"]["id"]

        r = requests.post(f"{API}/members/me/renew", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 400, r.text

        # Cleanup
        requests.delete(f"{API}/admin/members/{member_id}", headers=admin_headers)


# ===== Admin event CRUD round-trip with new fields =====
class TestAdminEventRoundtrip:
    def test_create_and_get_with_new_fields(self, admin_headers):
        payload = {
            "title": "TEST_roundtrip",
            "slug": f"test-rt-{int(datetime.utcnow().timestamp())}",
            "category": "Cultural",
            "date": "2026-07-04",
            "event_format": "online",
            "online_url": "https://meet.google.com/test",
            "start_date": _now_iso(60),
            "end_date": _now_iso(60),
            "schedule": [{"day": "Day 1", "time": "7pm", "title": "Opening", "location_or_link": "Zoom"}],
            "promo_codes": [{"code": "SAVE10", "kind": "percent", "value": 10, "max_uses": 5, "used": 0}],
            "ticket_types": [{
                "id": "rt-tt",
                "name": "RT Adult",
                "price": 100,
                "member_price": 80,
                "early_bird_price": 70,
                "early_bird_end_date": _now_iso(10),
            }],
        }
        c = requests.post(f"{API}/admin/events", headers=admin_headers, json=payload)
        assert c.status_code == 200, c.text
        ev = c.json()
        eid = ev["id"]
        try:
            assert ev["event_format"] == "online"
            assert ev["online_url"] == "https://meet.google.com/test"
            assert len(ev["promo_codes"]) == 1
            assert ev["promo_codes"][0]["code"] == "SAVE10"
            assert ev["ticket_types"][0]["member_price"] == 80
            assert ev["ticket_types"][0]["early_bird_price"] == 70

            g = requests.get(f"{API}/events/{eid}")
            assert g.status_code == 200
            ev2 = g.json()
            assert ev2["event_format"] == "online"
            assert ev2["ticket_types"][0]["early_bird_price"] == 70
            assert "_id" not in ev2
        finally:
            requests.delete(f"{API}/admin/events/{eid}", headers=admin_headers)


# ===== Legacy events still work =====
class TestLegacyEvents:
    def test_legacy_event_without_new_fields_purchase(self, admin_headers):
        """Event with only price (no member_price/EB) → purchase uses regular price."""
        payload = {
            "title": "TEST_legacy",
            "slug": f"test-legacy-{int(datetime.utcnow().timestamp())}",
            "category": "Cultural",
            "date": "2026-08-15",
            "ticket_types": [{
                "id": "legacy-tt",
                "name": "Legacy Adult",
                "price": 45,
                "quantity_total": 50,
            }],
        }
        c = requests.post(f"{API}/admin/events", headers=admin_headers, json=payload)
        assert c.status_code == 200, c.text
        eid = c.json()["id"]
        try:
            r = requests.post(
                f"{API}/events/{eid}/purchase-tickets",
                json={
                    "event_id": eid,
                    "items": [{"ticket_type_id": "legacy-tt", "quantity": 2}],
                    "buyer_name": "TEST_legacy_buyer",
                    "buyer_email": "leg@example.com",
                    "payment_method": "paypal",
                },
            )
            assert r.status_code == 200, r.text
            order = r.json()
            assert order["items"][0]["unit_price"] == 45.0
            assert order["subtotal"] == 90.0
            assert order["total"] == 90.0
        finally:
            requests.delete(f"{API}/admin/events/{eid}", headers=admin_headers)

    def test_seeded_events_still_load(self):
        r = requests.get(f"{API}/events")
        assert r.status_code == 200
        events = r.json()
        assert isinstance(events, list)
        for ev in events:
            assert "_id" not in ev
