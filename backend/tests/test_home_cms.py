"""
Backend tests for the Phase 1+2 CMS additions:
- Public GET endpoints: /api/hero-slides, /api/feature-highlights, /api/testimonials, /api/site-stats
- Featured/limit filters on /api/events
- Admin CRUD for the 4 new collections under /api/admin/{hero-slides|feature-highlights|testimonials|site-stats}
- Sanity: /api/site-settings preserved
"""
import os
import random
import string
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cultural-connect-pro.preview.emergentagent.com").rstrip("/")
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


# ---- Public list endpoints ----
@pytest.mark.parametrize("path,min_count", [
    ("/hero-slides", 1),
    ("/feature-highlights", 1),
    ("/testimonials", 1),
    ("/site-stats", 1),
])
def test_public_cms_lists(s, path, min_count):
    r = s.get(f"{API}{path}", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= min_count, f"{path} returned {len(data)} items, expected >= {min_count}"
    # Validate no _id leaks
    for item in data:
        assert "_id" not in item
        assert item.get("active", True) is True, f"{path}: only active should be returned"


def test_public_hero_slides_sorted_by_order(s):
    r = s.get(f"{API}/hero-slides", timeout=30)
    data = r.json()
    orders = [d.get("order", 0) for d in data]
    assert orders == sorted(orders), f"hero-slides not sorted by order: {orders}"


def test_public_feature_highlights_sorted_by_order(s):
    r = s.get(f"{API}/feature-highlights", timeout=30)
    data = r.json()
    orders = [d.get("order", 0) for d in data]
    assert orders == sorted(orders)


def test_public_testimonials_sorted_by_order(s):
    r = s.get(f"{API}/testimonials", timeout=30)
    data = r.json()
    orders = [d.get("order", 0) for d in data]
    assert orders == sorted(orders)


def test_public_site_stats_sorted_by_order(s):
    r = s.get(f"{API}/site-stats", timeout=30)
    data = r.json()
    orders = [d.get("order", 0) for d in data]
    assert orders == sorted(orders)


# ---- Events featured+limit filter ----
def test_events_featured_limit_filter(s, admin_headers):
    # Create one featured + one non-featured event
    slug_f = f"test-feat-{_rand()}"
    slug_n = f"test-nonfeat-{_rand()}"
    feat = {"title": "TEST_featured", "slug": slug_f, "category": "Cultural",
            "date": "2026-12-31", "description": "f", "featured": True}
    non = {"title": "TEST_non_featured", "slug": slug_n, "category": "Cultural",
           "date": "2026-12-31", "description": "n", "featured": False}
    a = s.post(f"{API}/admin/events", headers=admin_headers, json=feat, timeout=30)
    b = s.post(f"{API}/admin/events", headers=admin_headers, json=non, timeout=30)
    assert a.status_code == 200 and b.status_code == 200, f"{a.text} / {b.text}"
    aid, bid = a.json()["id"], b.json()["id"]

    try:
        # featured=true should include 'a' and not 'b'
        r = s.get(f"{API}/events?featured=true&limit=50", timeout=30)
        assert r.status_code == 200
        ids = [e["id"] for e in r.json()]
        assert aid in ids, "featured event missing from featured=true result"
        assert bid not in ids, "non-featured event leaked into featured=true result"
        for e in r.json():
            assert e.get("featured") is True

        # limit=1 returns exactly 1
        r2 = s.get(f"{API}/events?featured=true&limit=1", timeout=30)
        assert r2.status_code == 200
        assert len(r2.json()) == 1

        # No filter returns both
        r3 = s.get(f"{API}/events", timeout=30)
        ids3 = [e["id"] for e in r3.json()]
        assert aid in ids3 and bid in ids3
    finally:
        s.delete(f"{API}/admin/events/{aid}", headers=admin_headers, timeout=30)
        s.delete(f"{API}/admin/events/{bid}", headers=admin_headers, timeout=30)


# ---- Admin CRUD smoke for each new collection ----
def _crud_smoke(s, admin_headers, endpoint, create_payload, update_payload, update_field, expected_value):
    # CREATE
    c = s.post(f"{API}/admin/{endpoint}", headers=admin_headers, json=create_payload, timeout=30)
    assert c.status_code == 200, f"create {endpoint}: {c.text}"
    item = c.json()
    item_id = item["id"]
    assert "_id" not in item

    # GET single
    g = s.get(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, timeout=30)
    assert g.status_code == 200
    assert g.json()["id"] == item_id

    # LIST (admin) contains it
    lst = s.get(f"{API}/admin/{endpoint}", headers=admin_headers, timeout=30)
    assert lst.status_code == 200
    assert item_id in [x["id"] for x in lst.json()]

    # UPDATE
    u = s.put(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, json=update_payload, timeout=30)
    assert u.status_code == 200, f"update {endpoint}: {u.text}"
    assert u.json()[update_field] == expected_value

    # Verify persistence via GET
    g2 = s.get(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, timeout=30)
    assert g2.json()[update_field] == expected_value

    # DELETE
    d = s.delete(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, timeout=30)
    assert d.status_code == 200
    assert d.json()["deleted"] == 1

    # Verify gone
    g3 = s.get(f"{API}/admin/{endpoint}/{item_id}", headers=admin_headers, timeout=30)
    assert g3.status_code == 404


def test_admin_hero_slides_crud(s, admin_headers):
    _crud_smoke(s, admin_headers, "hero-slides",
                create_payload={"image_url": "https://example.com/a.jpg", "headline": "TEST_HERO",
                                "subhead": "sub", "cta_label": "Go", "cta_link": "/events",
                                "order": 99, "active": True},
                update_payload={"headline": "TEST_HERO_UPDATED"},
                update_field="headline", expected_value="TEST_HERO_UPDATED")


def test_admin_feature_highlights_crud(s, admin_headers):
    _crud_smoke(s, admin_headers, "feature-highlights",
                create_payload={"title": "TEST_FEAT", "description": "d", "cta": "Learn More",
                                "link": "/x", "order": 99, "active": True},
                update_payload={"title": "TEST_FEAT_UPD"},
                update_field="title", expected_value="TEST_FEAT_UPD")


def test_admin_testimonials_crud(s, admin_headers):
    _crud_smoke(s, admin_headers, "testimonials",
                create_payload={"name": "Tester", "body": "TEST quote here", "date": "Jan 01, 2026",
                                "rating": 5, "order": 99, "active": True},
                update_payload={"name": "Tester Updated"},
                update_field="name", expected_value="Tester Updated")


def test_admin_site_stats_crud(s, admin_headers):
    _crud_smoke(s, admin_headers, "site-stats",
                create_payload={"label": "TEST_STAT", "value": "42", "order": 99, "active": True},
                update_payload={"value": "99"},
                update_field="value", expected_value="99")


# ---- active=false filter test (public should not return inactive) ----
def test_inactive_hero_slide_hidden_from_public(s, admin_headers):
    c = s.post(f"{API}/admin/hero-slides", headers=admin_headers, json={
        "image_url": "https://example.com/x.jpg", "headline": "TEST_INACTIVE_HERO",
        "subhead": "", "cta_label": "", "cta_link": "", "order": 999, "active": False,
    }, timeout=30)
    assert c.status_code == 200, c.text
    sid = c.json()["id"]
    try:
        pub = s.get(f"{API}/hero-slides", timeout=30).json()
        assert sid not in [x["id"] for x in pub], "inactive slide leaked to public endpoint"
    finally:
        s.delete(f"{API}/admin/hero-slides/{sid}", headers=admin_headers, timeout=30)


# ---- Preserve site-settings ----
def test_site_settings_preserved(s):
    r = s.get(f"{API}/site-settings", timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "_id" not in j
    assert isinstance(j, dict)


# ---- Auth required for admin endpoints ----
@pytest.mark.parametrize("endpoint", ["hero-slides", "feature-highlights", "testimonials", "site-stats"])
def test_admin_endpoints_require_auth(s, endpoint):
    r = s.get(f"{API}/admin/{endpoint}", timeout=30)
    assert r.status_code in (401, 403)
    r2 = s.post(f"{API}/admin/{endpoint}", json={}, timeout=30)
    assert r2.status_code in (401, 403)
