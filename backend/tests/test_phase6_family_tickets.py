"""Phase 6: Family groups, per-attendee tickets, PDF tickets and check-in."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
EVT = "evt-2"
TT = "tt-diwali-gen"
CREATED_ORDERS = []


@pytest.fixture(scope="module")
def admin_h():
    r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _member_h(email):
    r = requests.post(f"{API}/members/login", json={"email": email, "password": "demo1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def mem_h():
    return _member_h("demo@indiaclubdayton.org")


@pytest.fixture(scope="module")
def pend_h():
    return _member_h("demo.pending@indiaclubdayton.org")


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_h):
    yield
    for oid in CREATED_ORDERS:
        requests.delete(f"{API}/admin/ticket-orders/{oid}", headers=admin_h)
    # family test members
    for h_email in ["demo@indiaclubdayton.org", "demo.pending@indiaclubdayton.org"]:
        h = _member_h(h_email)
        for f in requests.get(f"{API}/members/me/family", headers=h).json():
            if f["name"].startswith("TEST_"):
                requests.delete(f"{API}/members/me/family/{f['id']}", headers=h)


def _sold():
    ev = requests.get(f"{API}/events/{EVT}").json()
    return next(t for t in ev["ticket_types"] if t["id"] == TT)["quantity_sold"]


def _buy(payload, headers=None, event=EVT):
    base = {"event_id": event, "buyer_name": "TEST Buyer", "buyer_email": "test_buyer@example.com", "buyer_phone": "",
            "payment_method": "zelle", "items": []}
    base.update(payload)
    r = requests.post(f"{API}/events/{event}/purchase-tickets", json=base, headers=headers or {})
    if r.status_code == 200:
        CREATED_ORDERS.append(r.json()["id"])
    return r


def _fam(mem_h, name):
    return next((f for f in requests.get(f"{API}/members/me/family", headers=mem_h).json() if f["name"] == name), None)


# ---- Family CRUD ----
class TestFamilyCRUD:
    def test_requires_auth(self):
        assert requests.get(f"{API}/members/me/family").status_code in (401, 403)

    def test_seeded_family(self, mem_h):
        anya, baby = _fam(mem_h, "Anya Demo"), _fam(mem_h, "Baby Demo")
        assert anya and anya["status"] == "approved" and anya["age_band"] == "child"
        assert baby and baby["status"] == "approved" and baby["age_band"] == "infant"
        assert all("_id" not in f for f in requests.get(f"{API}/members/me/family", headers=mem_h).json())

    def test_create_update_delete(self, mem_h, admin_h):
        r = requests.post(f"{API}/members/me/family", headers=mem_h,
                          json={"name": "TEST_Kid", "relation": "child", "date_of_birth": "2017-03-03"})
        assert r.status_code == 200, r.text
        f = r.json()
        assert f["status"] == "pending" and f["name"] == "TEST_Kid"
        # approve, then relation-only edit keeps approved
        assert requests.post(f"{API}/admin/family-members/{f['id']}/approve", json={"note": ""}, headers=admin_h).status_code == 200
        r = requests.put(f"{API}/members/me/family/{f['id']}", headers=mem_h,
                         json={"name": "TEST_Kid", "relation": "other", "date_of_birth": "2017-03-03"})
        assert r.status_code == 200 and r.json()["status"] == "approved" and r.json()["relation"] == "other"
        # dob edit resets to pending
        r = requests.put(f"{API}/members/me/family/{f['id']}", headers=mem_h,
                         json={"name": "TEST_Kid", "relation": "other", "date_of_birth": "2016-03-03"})
        assert r.json()["status"] == "pending"
        # reject with note
        r = requests.post(f"{API}/admin/family-members/{f['id']}/reject", json={"note": "Need ID"}, headers=admin_h)
        assert r.status_code == 200
        g = _fam(mem_h, "TEST_Kid")
        assert g["status"] == "rejected" and g["admin_note"] == "Need ID"
        # delete
        assert requests.delete(f"{API}/members/me/family/{f['id']}", headers=mem_h).status_code == 200
        assert _fam(mem_h, "TEST_Kid") is None
        assert requests.delete(f"{API}/members/me/family/{f['id']}", headers=mem_h).status_code == 404

    def test_future_dob_rejected(self, mem_h):
        r = requests.post(f"{API}/members/me/family", headers=mem_h,
                          json={"name": "TEST_Future", "relation": "child", "date_of_birth": "2099-01-01"})
        assert r.status_code == 400

    def test_admin_list_filter(self, admin_h):
        r = requests.get(f"{API}/admin/family-members?status=approved", headers=admin_h)
        assert r.status_code == 200
        items = r.json()
        assert items and all(i["status"] == "approved" for i in items)
        assert "member_name" in items[0] and "member_email" in items[0]
        assert requests.get(f"{API}/admin/family-members").status_code in (401, 403)

    def test_admin_review_404(self, admin_h):
        r = requests.post(f"{API}/admin/family-members/nope/approve", json={}, headers=admin_h)
        assert r.status_code == 404


# ---- Named purchase pricing ----
class TestNamedPurchase:
    def test_named_pricing_and_sold(self, mem_h):
        anya, baby = _fam(mem_h, "Anya Demo"), _fam(mem_h, "Baby Demo")
        before = _sold()
        r = _buy({"attendees": [
            {"ticket_type_id": TT, "name": "Priya Demo"},
            {"ticket_type_id": TT, "family_member_id": anya["id"]},
            {"ticket_type_id": TT, "family_member_id": baby["id"]},
            {"ticket_type_id": TT, "name": "TEST Guest"},
        ]}, mem_h)
        assert r.status_code == 200, r.text
        o = r.json()
        prices = [t["price"] for t in o["tickets"]]
        assert prices == [20, 10, 0, 20], prices
        assert o["total"] == 50 and o["subtotal"] == 50
        assert [t["age_band"] for t in o["tickets"]] == ["adult", "child", "infant", "adult"]
        assert all(t["code"].startswith("ICGD-") for t in o["tickets"])
        assert len({t["code"] for t in o["tickets"]}) == 4
        assert o["member_id"]
        assert _sold() == before + 4

    def test_pending_family_rejected(self, mem_h):
        f = requests.post(f"{API}/members/me/family", headers=mem_h,
                          json={"name": "TEST_Pend", "relation": "child", "date_of_birth": "2019-01-01"}).json()
        r = _buy({"attendees": [{"ticket_type_id": TT, "family_member_id": f["id"]}]}, mem_h)
        assert r.status_code == 400 and "not verified" in r.json()["detail"]

    def test_duplicate_family_rejected(self, mem_h):
        anya = _fam(mem_h, "Anya Demo")
        r = _buy({"attendees": [{"ticket_type_id": TT, "family_member_id": anya["id"]}] * 2}, mem_h)
        assert r.status_code == 400

    def test_other_members_family_rejected(self, pend_h, mem_h):
        anya = _fam(mem_h, "Anya Demo")
        r = _buy({"attendees": [{"ticket_type_id": TT, "family_member_id": anya["id"]}]}, pend_h)
        assert r.status_code == 400

    def test_family_requires_login(self, mem_h):
        anya = _fam(mem_h, "Anya Demo")
        r = _buy({"attendees": [{"ticket_type_id": TT, "family_member_id": anya["id"]}]})
        assert r.status_code == 401

    def test_empty_name_rejected(self, mem_h):
        r = _buy({"attendees": [{"ticket_type_id": TT, "name": "  "}]}, mem_h)
        assert r.status_code == 400

    def test_anon_named_guest_full_price(self):
        r = _buy({"attendees": [{"ticket_type_id": TT, "name": "TEST Anon"}]})
        assert r.status_code == 200 and r.json()["tickets"][0]["price"] == 25


class TestQuantityMode:
    def test_anon_quantity(self):
        before = _sold()
        r = _buy({"items": [{"ticket_type_id": TT, "quantity": 3}]})
        assert r.status_code == 200, r.text
        o = r.json()
        names = [t["attendee_name"] for t in o["tickets"]]
        assert names == ["TEST Buyer", "TEST Buyer – Guest 1", "TEST Buyer – Guest 2"]
        assert o["total"] == 75 and o["member_id"] is None
        assert _sold() == before + 3


class TestMembersOnlyAndPromo:
    @pytest.fixture(scope="class")
    def temp_event(self, admin_h):
        eid = None
        payload = {"title": "TEST_Phase6 Event", "slug": "test-phase6-event", "date": "Dec 1, 2026", "category": "cultural",
                   "ticket_types": [
                       {"id": "tt-mo", "name": "Members", "price": 30, "members_only": True, "quantity_total": 0, "quantity_sold": 0},
                       {"id": "tt-gen", "name": "Gen", "price": 40, "member_price": 30, "child_price": 15, "quantity_total": 0, "quantity_sold": 0},
                   ],
                   "promo_codes": [{"code": "TEST10", "kind": "percent", "value": 10, "max_uses": 0, "used": 0}]}
        r = requests.post(f"{API}/admin/events", json=payload, headers=admin_h)
        assert r.status_code == 200, r.text
        eid = r.json()["id"]
        yield eid
        requests.delete(f"{API}/admin/events/{eid}", headers=admin_h)

    def test_child_price_persists(self, temp_event):
        ev = requests.get(f"{API}/events/{temp_event}").json()
        assert next(t for t in ev["ticket_types"] if t["id"] == "tt-gen")["child_price"] == 15

    def test_members_only_403(self, temp_event, pend_h):
        r = _buy({"attendees": [{"ticket_type_id": "tt-mo", "name": "TEST X"}]}, pend_h, event=temp_event)
        assert r.status_code == 403
        r = _buy({"attendees": [{"ticket_type_id": "tt-mo", "name": "TEST X"}]}, None, event=temp_event)
        assert r.status_code == 403

    def test_promo_on_named(self, temp_event, mem_h):
        anya = _fam(mem_h, "Anya Demo")
        r = _buy({"promo_code": "test10", "attendees": [
            {"ticket_type_id": "tt-gen", "name": "Priya Demo"},
            {"ticket_type_id": "tt-gen", "family_member_id": anya["id"]}]}, mem_h, event=temp_event)
        assert r.status_code == 200, r.text
        o = r.json()
        assert o["subtotal"] == 45 and round(o["total"], 2) == 40.5 and o["promo_code"] == "TEST10"

    def test_checkin_wrong_event(self, temp_event, admin_h):
        r = _buy({"attendees": [{"ticket_type_id": "tt-gen", "name": "TEST Wrong"}]}, event=temp_event)
        code = r.json()["tickets"][0]["code"]
        r = requests.post(f"{API}/admin/check-in", json={"code": code, "event_id": EVT}, headers=admin_h)
        assert r.status_code == 400 and "different event" in r.json()["detail"]


# ---- PDF + check-in ----
class TestPdfAndCheckin:
    @pytest.fixture(scope="class")
    def order(self, mem_h):
        r = _buy({"attendees": [{"ticket_type_id": TT, "name": "TEST PDF 1"}, {"ticket_type_id": TT, "name": "TEST PDF 2"}]}, mem_h)
        assert r.status_code == 200
        return r.json()

    def test_pdf_forbidden(self, order):
        assert requests.get(f"{API}/tickets/{order['id']}/pdf").status_code == 403
        assert requests.get(f"{API}/tickets/{order['id']}/pdf?email=wrong@x.com").status_code == 403

    def test_pdf_by_email_and_owner(self, order, mem_h):
        r = requests.get(f"{API}/tickets/{order['id']}/pdf?email=TEST_BUYER@example.com")
        assert r.status_code == 200 and r.headers["content-type"].startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        r = requests.get(f"{API}/tickets/{order['id']}/pdf", headers=mem_h)
        assert r.status_code == 200 and r.content[:4] == b"%PDF"

    def test_pdf_other_member_forbidden(self, order, pend_h):
        assert requests.get(f"{API}/tickets/{order['id']}/pdf", headers=pend_h).status_code == 403

    def test_admin_pdf(self, order, admin_h):
        r = requests.get(f"{API}/admin/ticket-orders/{order['id']}/pdf", headers=admin_h)
        assert r.status_code == 200 and r.content[:4] == b"%PDF"
        assert requests.get(f"{API}/admin/ticket-orders/{order['id']}/pdf").status_code in (401, 403)

    def test_my_tickets(self, order, mem_h):
        r = requests.get(f"{API}/members/me/tickets", headers=mem_h)
        assert r.status_code == 200
        assert any(o["id"] == order["id"] for o in r.json())

    def test_checkin_flow(self, order, admin_h):
        att0 = requests.get(f"{API}/admin/events/{EVT}/attendance", headers=admin_h).json()
        code = order["tickets"][0]["code"]
        r = requests.post(f"{API}/admin/check-in", json={"code": code.lower(), "event_id": EVT}, headers=admin_h)
        assert r.status_code == 200 and r.json()["result"] == "checked_in"
        assert r.json()["attendee_name"] == "TEST PDF 1"
        r = requests.post(f"{API}/admin/check-in", json={"code": code, "event_id": EVT}, headers=admin_h)
        assert r.json()["result"] == "already_checked_in"
        att1 = requests.get(f"{API}/admin/events/{EVT}/attendance", headers=admin_h).json()
        assert att1["checked_in"] == att0["checked_in"] + 1
        assert any(x["code"] == code for x in att1["recent"])

    def test_checkin_invalid(self, admin_h):
        r = requests.post(f"{API}/admin/check-in", json={"code": "ICGD-BOGUS00"}, headers=admin_h)
        assert r.status_code == 404

    def test_checkin_refunded(self, order, admin_h):
        requests.post(f"{API}/admin/ticket-orders/{order['id']}/mark-paid?status=refunded", headers=admin_h)
        r = requests.post(f"{API}/admin/check-in", json={"code": order["tickets"][1]["code"]}, headers=admin_h)
        assert r.status_code == 400
