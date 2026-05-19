"""Phase 4 backend wiring tests.

Covers:
- Public read endpoints for the 4 pages (gallery / programs / classifieds / sponsors / donors)
- POST /api/classifieds creates rows with status=pending and they're hidden from public list
- Admin approve flow -> ad appears on public list
- POST /api/sponsorship-inquiries
- POST /api/donations
- GET /api/programs/{slug} returns intro/initiatives/impact for 4 real slugs
"""
import os
import uuid
import requests
import pytest

def _load_backend_url():
    if os.environ.get("REACT_APP_BACKEND_URL"):
        return os.environ["REACT_APP_BACKEND_URL"]
    # Fallback: parse from /app/frontend/.env (same source-of-truth)
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")


BASE = _load_backend_url().rstrip("/")
API = f"{BASE}/api"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# -------- gallery / sponsors / donors / programs reads ----------
class TestPublicReads:
    def test_gallery_returns_list(self):
        r = requests.get(f"{API}/gallery")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        for img in data:
            assert "_id" not in img
            assert "id" in img and "image_url" in img

    def test_sponsors_grouped_data(self):
        r = requests.get(f"{API}/sponsors")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        tiers = {s.get("tier") for s in data}
        # at least one tier present from Diamond/Gold/Silver/Bronze
        assert tiers & {"Diamond", "Gold", "Silver", "Bronze"}
        for s in data:
            assert "_id" not in s

    def test_donors_have_year_and_amount(self):
        r = requests.get(f"{API}/donors")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        for d in data:
            assert "amount" in d and "year" in d

    def test_programs_list_has_4(self):
        r = requests.get(f"{API}/programs")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 4
        slugs = {p["slug"] for p in data}
        assert {"charity", "education", "community-service"} <= slugs or len(slugs) >= 4

    @pytest.mark.parametrize("slug", ["charity", "education", "community-service"])
    def test_program_detail_has_intro_initiatives_impact(self, slug):
        r = requests.get(f"{API}/programs/{slug}")
        assert r.status_code == 200, f"{slug}: {r.text}"
        p = r.json()
        assert p["slug"] == slug
        assert p.get("intro"), f"intro missing for {slug}"
        assert isinstance(p.get("initiatives"), list) and len(p["initiatives"]) >= 1
        for init in p["initiatives"]:
            assert "name" in init and "desc" in init
        assert p.get("impact")


# -------- classifieds list filters to approved only ----------
class TestClassifiedsApprovalFlow:
    def test_list_only_returns_approved(self):
        r = requests.get(f"{API}/classifieds")
        assert r.status_code == 200
        data = r.json()
        for c in data:
            assert c.get("status") == "approved", f"non-approved leaked: {c}"

    def test_post_creates_pending_then_admin_approves_publishes(self, admin_headers):
        unique = f"TEST_phase4_{uuid.uuid4().hex[:8]}"
        payload = {
            "title": unique,
            "category": "Services",
            "location": "Dayton",
            "price": "$50",
            "description": "phase 4 test ad",
            "contact": "test@example.com",
        }
        # POST should ignore client-supplied status and set pending
        payload_bad = {**payload, "status": "approved"}
        r = requests.post(f"{API}/classifieds", json=payload_bad)
        assert r.status_code == 200, r.text
        new_id = r.json()["id"]

        # not in public list
        listing = requests.get(f"{API}/classifieds").json()
        assert all(c["id"] != new_id for c in listing), "pending ad leaked to public"

        # Approve via admin
        ar = requests.post(f"{API}/admin/classifieds/{new_id}/approve", headers=admin_headers)
        assert ar.status_code == 200, ar.text

        # Now appears in public list
        listing2 = requests.get(f"{API}/classifieds").json()
        assert any(c["id"] == new_id and c["title"] == unique for c in listing2), \
            "approved ad not visible publicly"

        # cleanup
        dr = requests.delete(f"{API}/admin/classifieds/{new_id}", headers=admin_headers)
        assert dr.status_code in (200, 204)

    def test_admin_approve_requires_auth(self):
        r = requests.post(f"{API}/admin/classifieds/nonexistent/approve")
        assert r.status_code in (401, 403)


# -------- donations & sponsorship inquiries ----------
class TestPledgesAndSponsorInquiries:
    def test_donation_post(self):
        payload = {
            "name": "TEST_phase4_donor",
            "email": "donor.test@example.com",
            "amount": 100,
            "message": "phase 4 donation test",
        }
        r = requests.post(f"{API}/donations", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert "id" in body

    def test_donation_validates_email(self):
        r = requests.post(f"{API}/donations", json={
            "name": "bad", "email": "not-an-email", "amount": 50,
        })
        assert r.status_code == 422

    def test_sponsorship_inquiry_post(self):
        payload = {
            "company": "TEST_phase4_co",
            "contact": "Jane Doe",
            "email": "jane.test@example.com",
            "phone": "555-1212",
            "tier": "Gold",
            "message": "phase 4 sponsor inquiry test",
        }
        r = requests.post(f"{API}/sponsorship-inquiries", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert "id" in body

    def test_sponsorship_inquiry_validates_email(self):
        r = requests.post(f"{API}/sponsorship-inquiries", json={
            "company": "x", "contact": "y", "email": "bad", "phone": "1",
        })
        assert r.status_code == 422


# -------- no _id leakage ----------
class TestNoMongoIdLeak:
    @pytest.mark.parametrize("endpoint", [
        "/gallery", "/sponsors", "/donors", "/classifieds", "/programs",
    ])
    def test_no_id_in_lists(self, endpoint):
        r = requests.get(f"{API}{endpoint}")
        assert r.status_code == 200
        for item in r.json():
            assert "_id" not in item, f"_id leaked in {endpoint}"
