"""
Backend tests covering member auth flow + admin member management + token isolation.
Covers: register/login/me/update/change-password/subscribe + admin approve/reject/delete
+ token isolation + admin CRUD smoke + admin stats new fields.
"""
import os
import time
import random
import string
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cultural-connect-pro.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "admin123"


def _rand(n=6):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


# --------- Fixtures ---------
@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def member(s):
    email = f"e2etest+{_rand()}@example.com"
    payload = {"email": email, "password": "test1234", "first_name": "E2E", "last_name": "Tester", "phone": "+15555550001"}
    r = s.post(f"{API}/members/register", json=payload, timeout=30)
    assert r.status_code == 200, f"register failed: {r.text}"
    data = r.json()
    return {"email": email, "password": "test1234", "token": data["token"], "id": data["member"]["id"], "data": data["member"]}


@pytest.fixture(scope="module")
def member_headers(member):
    return {"Authorization": f"Bearer {member['token']}"}


# --------- Health ---------
def test_root(s):
    r = s.get(f"{API}/", timeout=30)
    assert r.status_code == 200
    assert "ICGD" in r.json().get("message", "")


# --------- Admin login (preserve) ---------
def test_admin_login_works(admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 10


def test_admin_me(s, admin_headers):
    r = s.get(f"{API}/admin/me", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    assert r.json()["username"] == ADMIN_USER


# --------- Member auth ---------
def test_member_register_returns_token_and_profile(member):
    assert member["token"]
    assert member["data"]["email"] == member["email"]
    assert member["data"]["first_name"] == "E2E"
    assert "password_hash" not in member["data"]
    assert "_id" not in member["data"]
    assert member["data"]["membership"]["status"] == "none"


def test_member_register_duplicate_email_409(s, member):
    r = s.post(f"{API}/members/register", json={
        "email": member["email"], "password": "anything", "first_name": "X", "last_name": "Y"
    }, timeout=30)
    assert r.status_code == 409


def test_member_login_success(s, member):
    r = s.post(f"{API}/members/login", json={"email": member["email"], "password": member["password"]}, timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert j["member"]["email"] == member["email"]
    assert j["token"]


def test_member_login_bad_password(s, member):
    r = s.post(f"{API}/members/login", json={"email": member["email"], "password": "wrong"}, timeout=30)
    assert r.status_code == 401


def test_member_me(s, member_headers, member):
    r = s.get(f"{API}/members/me", headers=member_headers, timeout=30)
    assert r.status_code == 200
    assert r.json()["id"] == member["id"]


def test_member_update_profile(s, member_headers):
    r = s.put(f"{API}/members/me", headers=member_headers,
              json={"city": "Dayton", "state": "OH", "zip": "45402"}, timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert j["city"] == "Dayton"
    assert j["state"] == "OH"
    # Verify persistence
    r2 = s.get(f"{API}/members/me", headers=member_headers, timeout=30)
    assert r2.json()["city"] == "Dayton"


def test_member_change_password_wrong_current(s, member_headers):
    r = s.post(f"{API}/members/me/change-password", headers=member_headers,
               json={"current_password": "wrong", "new_password": "newpass1234"}, timeout=30)
    assert r.status_code == 401


def test_member_change_password_then_login(s, member, member_headers):
    # change pw
    r = s.post(f"{API}/members/me/change-password", headers=member_headers,
               json={"current_password": member["password"], "new_password": "newpass1234"}, timeout=30)
    assert r.status_code == 200
    # old password no longer works
    r1 = s.post(f"{API}/members/login", json={"email": member["email"], "password": member["password"]}, timeout=30)
    assert r1.status_code == 401
    # new password works
    r2 = s.post(f"{API}/members/login", json={"email": member["email"], "password": "newpass1234"}, timeout=30)
    assert r2.status_code == 200
    member["password"] = "newpass1234"


def test_member_subscribe_pending(s, member_headers):
    payload = {
        "plan": "regular", "tier": "individual",
        "donation_amount": 25, "payment_method": "paypal", "family_count": 1,
        "address": "123 Test St", "city": "Dayton", "state": "OH", "zip": "45402", "country": "United States",
        "phone": "+15555551234",
    }
    r = s.post(f"{API}/members/me/subscribe", headers=member_headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["membership"]["status"] == "pending"
    assert j["membership"]["plan"] == "regular"
    assert j["membership"]["tier"] == "individual"
    assert j["membership"]["payment_method"] == "paypal"
    assert j["address"] == "123 Test St"


def test_member_subscribe_student_requires_school(s, member_headers):
    # Student tier with school fields
    payload = {
        "plan": "regular", "tier": "student", "school_name": "Wright State",
        "degree_program": "MS CS", "donation_amount": 0, "payment_method": "check", "family_count": 1,
    }
    r = s.post(f"{API}/members/me/subscribe", headers=member_headers, json=payload, timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert j["membership"]["tier"] == "student"
    assert j["membership"]["school_name"] == "Wright State"
    assert j["membership"]["degree_program"] == "MS CS"


# --------- Token isolation ---------
def test_admin_token_rejected_on_member_endpoint(s, admin_headers):
    r = s.get(f"{API}/members/me", headers=admin_headers, timeout=30)
    assert r.status_code == 401


def test_member_token_rejected_on_admin_endpoint(s, member_headers):
    r = s.get(f"{API}/admin/me", headers=member_headers, timeout=30)
    assert r.status_code == 401
    r2 = s.get(f"{API}/admin/members", headers=member_headers, timeout=30)
    assert r2.status_code == 401


def test_member_endpoints_require_token(s):
    r = s.get(f"{API}/members/me", timeout=30)
    assert r.status_code == 401


# --------- Admin members ---------
def test_admin_list_members(s, admin_headers, member):
    r = s.get(f"{API}/admin/members", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    ids = [m["id"] for m in data]
    assert member["id"] in ids


def test_admin_list_members_filter_pending(s, admin_headers, member):
    r = s.get(f"{API}/admin/members?status=pending", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    for m in data:
        assert m["membership"]["status"] == "pending"
    assert member["id"] in [m["id"] for m in data]


def test_admin_get_member(s, admin_headers, member):
    r = s.get(f"{API}/admin/members/{member['id']}", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    assert r.json()["id"] == member["id"]
    assert "password_hash" not in r.json()


def test_admin_approve_member(s, admin_headers, member, member_headers):
    r = s.post(f"{API}/admin/members/{member['id']}/approve", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    # Verify via admin endpoint
    g = s.get(f"{API}/admin/members/{member['id']}", headers=admin_headers, timeout=30).json()
    assert g["membership"]["status"] == "active"
    assert g["membership"]["start_date"]
    assert g["membership"]["end_date"]
    assert g["membership"]["approved_by"] == ADMIN_USER
    # Verify member sees the same
    me = s.get(f"{API}/members/me", headers=member_headers, timeout=30).json()
    assert me["membership"]["status"] == "active"


def test_admin_reject_member(s, admin_headers):
    # Make new member to reject
    email = f"e2ereject+{_rand()}@example.com"
    reg = s.post(f"{API}/members/register", json={
        "email": email, "password": "x12345678", "first_name": "Rej", "last_name": "Ect"
    }, timeout=30).json()
    mid = reg["member"]["id"]
    r = s.post(f"{API}/admin/members/{mid}/reject", headers=admin_headers, json={"reason": "Incomplete info"}, timeout=30)
    assert r.status_code == 200
    g = s.get(f"{API}/admin/members/{mid}", headers=admin_headers, timeout=30).json()
    assert g["membership"]["status"] == "rejected"
    assert g["membership"]["rejection_reason"] == "Incomplete info"


def test_admin_delete_member(s, admin_headers):
    email = f"e2edel+{_rand()}@example.com"
    reg = s.post(f"{API}/members/register", json={
        "email": email, "password": "x12345678", "first_name": "Del", "last_name": "Me"
    }, timeout=30).json()
    mid = reg["member"]["id"]
    r = s.delete(f"{API}/admin/members/{mid}", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    assert r.json()["deleted"] == 1
    g = s.get(f"{API}/admin/members/{mid}", headers=admin_headers, timeout=30)
    assert g.status_code == 404


# --------- Admin stats with member fields ---------
def test_admin_stats_includes_member_fields(s, admin_headers):
    r = s.get(f"{API}/admin/stats", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    j = r.json()
    for k in ("members", "members_active", "members_pending"):
        assert k in j
        assert isinstance(j[k], int)
    assert j["members_active"] >= 1


# --------- Existing public endpoints smoke ---------
@pytest.mark.parametrize("path", [
    "/events", "/news", "/exec-team", "/gallery", "/sponsors",
    "/membership-plans", "/programs", "/past-presidents", "/awardees",
])
def test_public_lists(s, path):
    r = s.get(f"{API}{path}", timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# --------- Existing admin CRUD smoke (events) ---------
def test_admin_events_crud(s, admin_headers):
    payload = {"title": "TEST_event", "slug": f"test-event-{_rand()}", "category": "Cultural",
               "date": "2026-12-31", "description": "Test event"}
    c = s.post(f"{API}/admin/events", headers=admin_headers, json=payload, timeout=30)
    assert c.status_code == 200, c.text
    eid = c.json()["id"]
    # Update
    u = s.put(f"{API}/admin/events/{eid}", headers=admin_headers, json={"description": "Updated"}, timeout=30)
    assert u.status_code == 200
    assert u.json()["description"] == "Updated"
    # Delete
    d = s.delete(f"{API}/admin/events/{eid}", headers=admin_headers, timeout=30)
    assert d.status_code == 200
    assert d.json()["deleted"] == 1


# --------- Cleanup ---------
def test_cleanup_test_member(s, admin_headers, member):
    r = s.delete(f"{API}/admin/members/{member['id']}", headers=admin_headers, timeout=30)
    assert r.status_code == 200
