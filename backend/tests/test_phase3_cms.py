"""
Backend tests for Phase 3 CMS additions:
- Public GETs: /api/event-categories, /api/event-categories/{slug}, /api/difi-awards, /api/constitution
- Membership plans nested .tiers (regular=4 tiers, extended=2 tiers)
- Admin CRUD for event-categories, difi-awards, constitution
- Auth required on admin endpoints
- Sanity: existing membership-plans endpoint preserved + no _id leaks
"""
import os
import random
import string
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_USER, ADMIN_PASS = "admin", "admin123"


def _rand(n=6):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_headers(s):
    r = s.post(f"{API}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ---------- Public GETs ----------
def test_event_categories_list(s):
    r = s.get(f"{API}/event-categories", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 8, f"expected >=8 event categories, got {len(data)}"
    slugs = {d.get("slug") for d in data}
    expected = {"difi", "diwali", "rising-stars", "golden-jewels",
                "womens-connect", "sports", "picnic", "upcoming"}
    assert expected.issubset(slugs), f"missing seeded slugs. got={slugs}"
    for d in data:
        assert "_id" not in d
        assert d.get("active", True) is True


def test_event_category_by_slug(s):
    r = s.get(f"{API}/event-categories/diwali", timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["slug"] == "diwali"
    assert "_id" not in d
    # Phase 3 wired fields used by frontend CategoryHero
    assert d.get("long_description"), "diwali should have long_description"
    assert d.get("venue"), "diwali should have venue"
    assert d.get("typical_timing"), "diwali should have typical_timing"
    assert isinstance(d.get("highlights", []), list)
    assert len(d.get("highlights", [])) >= 1


def test_event_category_unknown_slug_404(s):
    r = s.get(f"{API}/event-categories/this-slug-does-not-exist-{_rand()}", timeout=30)
    assert r.status_code == 404


def test_difi_awards_list_sorted_by_year_desc(s):
    r = s.get(f"{API}/difi-awards", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 6, f"expected >=6 DIFI awards, got {len(data)}"
    years = [d.get("year") for d in data]
    assert years == sorted(years, reverse=True), f"awards not sorted by year desc: {years}"
    for d in data:
        assert "_id" not in d


def test_constitution_list_sorted_by_order(s):
    r = s.get(f"{API}/constitution", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 11, f"expected >=11 constitution sections, got {len(data)}"
    orders = [d.get("order", 0) for d in data]
    assert orders == sorted(orders), f"constitution sections not sorted by order: {orders}"
    for d in data:
        assert "_id" not in d
        # items must be a list (per spec: ConstitutionSection.items is List[str])
        assert isinstance(d.get("items", []), list)


# ---------- Membership plans nested tiers ----------
def test_membership_plans_nested_tiers(s):
    r = s.get(f"{API}/membership-plans", timeout=30)
    assert r.status_code == 200
    plans = r.json()
    assert isinstance(plans, list) and len(plans) >= 2
    by_slug = {p.get("slug"): p for p in plans}
    assert "regular" in by_slug, "regular plan missing"
    assert "extended" in by_slug, "extended plan missing"

    regular_tiers = by_slug["regular"].get("tiers", [])
    extended_tiers = by_slug["extended"].get("tiers", [])
    assert len(regular_tiers) == 4, f"regular tiers should be 4, got {len(regular_tiers)}"
    assert len(extended_tiers) == 2, f"extended tiers should be 2, got {len(extended_tiers)}"

    reg_names = [t.get("name", "").lower() for t in regular_tiers]
    for kw in ["student", "individual", "family", "business"]:
        assert any(kw in n for n in reg_names), f"regular tier '{kw}' missing"

    ext_names = [t.get("name", "").lower() for t in extended_tiers]
    for kw in ["silver", "gold"]:
        assert any(kw in n for n in ext_names), f"extended tier '{kw}' missing"

    for p in plans:
        assert "_id" not in p


# ---------- Admin CRUD helper ----------
def _crud_smoke(s, admin_headers, endpoint, create_payload, update_payload, update_field, expected_value):
    c = s.post(f"{API}/admin/{endpoint}", headers=admin_headers, json=create_payload, timeout=30)
    assert c.status_code == 200, f"create {endpoint}: {c.text}"
    item = c.json()
    item_id = item["id"]
    assert "_id" not in item

    g = s.get(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, timeout=30)
    assert g.status_code == 200
    assert g.json()["id"] == item_id

    lst = s.get(f"{API}/admin/{endpoint}", headers=admin_headers, timeout=30)
    assert lst.status_code == 200
    assert item_id in [x["id"] for x in lst.json()]

    u = s.put(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, json=update_payload, timeout=30)
    assert u.status_code == 200, f"update {endpoint}: {u.text}"
    assert u.json()[update_field] == expected_value

    g2 = s.get(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, timeout=30)
    assert g2.json()[update_field] == expected_value

    d = s.delete(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, timeout=30)
    assert d.status_code == 200
    assert d.json()["deleted"] == 1

    g3 = s.get(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, timeout=30)
    assert g3.status_code == 404


def test_admin_event_categories_crud(s, admin_headers):
    slug = f"test-cat-{_rand()}"
    _crud_smoke(
        s, admin_headers, "event-categories",
        create_payload={"slug": slug, "name": "TEST_CAT", "tagline": "tg",
                        "description": "d", "long_description": "ld",
                        "venue": "v", "typical_timing": "tt",
                        "highlights": ["h1", "h2"], "order": 999, "active": True},
        update_payload={"name": "TEST_CAT_UPD"},
        update_field="name", expected_value="TEST_CAT_UPD",
    )


def test_admin_difi_awards_crud(s, admin_headers):
    _crud_smoke(
        s, admin_headers, "difi-awards",
        create_payload={"year": 1900, "title": "TEST_DIFI", "note": "n", "active": True},
        update_payload={"title": "TEST_DIFI_UPD"},
        update_field="title", expected_value="TEST_DIFI_UPD",
    )


def test_admin_constitution_crud(s, admin_headers):
    _crud_smoke(
        s, admin_headers, "constitution",
        create_payload={"n": "XX", "title": "TEST_SECTION", "order": 9999,
                        "items": ["c1", "c2"], "active": True},
        update_payload={"title": "TEST_SECTION_UPD"},
        update_field="title", expected_value="TEST_SECTION_UPD",
    )


# ---------- Auth required on new admin endpoints ----------
@pytest.mark.parametrize("endpoint", ["event-categories", "difi-awards", "constitution"])
def test_admin_endpoints_require_auth(s, endpoint):
    r = s.get(f"{API}/admin/{endpoint}", timeout=30)
    assert r.status_code in (401, 403)
    r2 = s.post(f"{API}/admin/{endpoint}", json={}, timeout=30)
    assert r2.status_code in (401, 403)


# ---------- Inactive items hidden from public ----------
def test_inactive_event_category_hidden(s, admin_headers):
    slug = f"test-inactive-{_rand()}"
    c = s.post(f"{API}/admin/event-categories", headers=admin_headers, json={
        "slug": slug, "name": "TEST_INACTIVE", "active": False, "order": 9999,
    }, timeout=30)
    assert c.status_code == 200, c.text
    cid = c.json()["id"]
    try:
        pub = s.get(f"{API}/event-categories", timeout=30).json()
        assert slug not in [x.get("slug") for x in pub]
    finally:
        s.delete(f"{API}/admin/event-categories/{cid}", headers=admin_headers, timeout=30)


# ---------- Preserve Phase 1+2 endpoints ----------
def test_existing_endpoints_preserved(s):
    for path in ["/hero-slides", "/feature-highlights", "/testimonials", "/site-stats", "/site-settings"]:
        r = s.get(f"{API}{path}", timeout=30)
        assert r.status_code == 200, f"{path} broken: {r.status_code}"
