#!/usr/bin/env python3
"""
Comprehensive backend API test suite for India Club of Greater Dayton
Tests all endpoints: auth, public reads, public submissions, admin CRUD, file uploads, classifieds workflow, stats
"""
import requests
import json
import io
from typing import Dict, Any, Optional

# Read base URL from frontend .env
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip() + '/api'
            break

print(f"Testing backend at: {BASE_URL}\n")

# Test credentials
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"
token = None

# Test results tracking
results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def test(name: str, func):
    """Run a test and track results"""
    global results
    results["total"] += 1
    try:
        func()
        results["passed"].append(name)
        print(f"✅ {name}")
        return True
    except AssertionError as e:
        results["failed"].append(f"{name}: {str(e)}")
        print(f"❌ {name}: {str(e)}")
        return False
    except Exception as e:
        results["failed"].append(f"{name}: {type(e).__name__}: {str(e)}")
        print(f"❌ {name}: {type(e).__name__}: {str(e)}")
        return False

def assert_status(resp, expected: int, msg: str = ""):
    """Assert response status code"""
    if resp.status_code != expected:
        raise AssertionError(f"Expected {expected}, got {resp.status_code}. {msg} Response: {resp.text[:200]}")

def assert_json(resp) -> Dict[str, Any]:
    """Assert response is valid JSON and return it"""
    try:
        return resp.json()
    except:
        raise AssertionError(f"Response is not valid JSON: {resp.text[:200]}")

def assert_field(data: Dict, field: str, msg: str = ""):
    """Assert field exists in response"""
    if field not in data:
        raise AssertionError(f"Missing field '{field}' in response. {msg}")

def assert_list(data: Any, min_count: int = 0, msg: str = ""):
    """Assert response is a list with minimum count"""
    if not isinstance(data, list):
        raise AssertionError(f"Expected list, got {type(data)}. {msg}")
    if len(data) < min_count:
        raise AssertionError(f"Expected at least {min_count} items, got {len(data)}. {msg}")

# ===================== 1. AUTH FLOW =====================
print("\n=== 1. AUTH FLOW ===")

def test_root():
    resp = requests.get(f"{BASE_URL}/")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "message")

def test_login_success():
    global token
    resp = requests.post(f"{BASE_URL}/admin/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    assert_status(resp, 200, "Login should succeed with correct credentials")
    data = assert_json(resp)
    assert_field(data, "token", "Login response should contain token")
    assert_field(data, "username", "Login response should contain username")
    token = data["token"]
    if not token:
        raise AssertionError("Token is empty")

def test_login_wrong_password():
    resp = requests.post(f"{BASE_URL}/admin/login", json={"username": ADMIN_USER, "password": "wrongpass"})
    assert_status(resp, 401, "Login should fail with wrong password")

def test_me_with_token():
    resp = requests.get(f"{BASE_URL}/admin/me", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200, "GET /admin/me should succeed with valid token")
    data = assert_json(resp)
    assert_field(data, "username")
    if data["username"] != ADMIN_USER:
        raise AssertionError(f"Expected username '{ADMIN_USER}', got '{data['username']}'")

def test_me_without_token():
    resp = requests.get(f"{BASE_URL}/admin/me")
    assert_status(resp, 401, "GET /admin/me should fail without token")

def test_change_password():
    # Change password to something else
    resp = requests.post(f"{BASE_URL}/admin/change-password", 
                        headers={"Authorization": f"Bearer {token}"},
                        json={"current_password": ADMIN_PASS, "new_password": "newpass123"})
    assert_status(resp, 200, "Password change should succeed")
    data = assert_json(resp)
    assert_field(data, "ok")
    
    # Change it back
    resp2 = requests.post(f"{BASE_URL}/admin/change-password",
                         headers={"Authorization": f"Bearer {token}"},
                         json={"current_password": "newpass123", "new_password": ADMIN_PASS})
    assert_status(resp2, 200, "Password change back should succeed")

test("GET /api/ (root)", test_root)
test("POST /api/admin/login (success)", test_login_success)
test("POST /api/admin/login (wrong password)", test_login_wrong_password)
test("GET /api/admin/me (with token)", test_me_with_token)
test("GET /api/admin/me (without token)", test_me_without_token)
test("POST /api/admin/change-password", test_change_password)

# ===================== 2. PUBLIC READ ENDPOINTS =====================
print("\n=== 2. PUBLIC READ ENDPOINTS ===")

def test_get_events():
    resp = requests.get(f"{BASE_URL}/events")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 6, "Should have 6 seeded events")

def test_get_event_by_id():
    # First get list to get an ID
    resp = requests.get(f"{BASE_URL}/events")
    events = assert_json(resp)
    if not events:
        raise AssertionError("No events found")
    event_id = events[0]["id"]
    
    resp2 = requests.get(f"{BASE_URL}/events/{event_id}")
    assert_status(resp2, 200)
    data = assert_json(resp2)
    assert_field(data, "id")
    assert_field(data, "title")

def test_get_news():
    resp = requests.get(f"{BASE_URL}/news")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 3, "Should have 3 seeded news items")

def test_get_exec_team():
    resp = requests.get(f"{BASE_URL}/exec-team")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 20, "Should have 20 exec team members")

def test_get_gallery():
    resp = requests.get(f"{BASE_URL}/gallery")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 15, "Should have 15 gallery images")

def test_get_sponsors():
    resp = requests.get(f"{BASE_URL}/sponsors")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 15, "Should have 15 sponsors")

def test_get_donors():
    resp = requests.get(f"{BASE_URL}/donors")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 8, "Should have 8 donors")

def test_get_classifieds():
    resp = requests.get(f"{BASE_URL}/classifieds")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 6, "Should have 6 approved classifieds")

def test_get_classifieds_by_category():
    resp = requests.get(f"{BASE_URL}/classifieds?category=Education")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 0, "Should return list (may be empty)")

def test_get_past_presidents():
    resp = requests.get(f"{BASE_URL}/past-presidents")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 15, "Should have 15 past presidents")

def test_get_awardees():
    resp = requests.get(f"{BASE_URL}/awardees")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 13, "Should have 13 awardees (7 CSA + 6 DIFI)")

def test_get_awardees_by_type():
    resp = requests.get(f"{BASE_URL}/awardees?type=difi")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 6, "Should have 6 DIFI awardees")

def test_get_tax_returns():
    resp = requests.get(f"{BASE_URL}/tax-returns")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 15, "Should have 15 tax returns")

def test_get_programs():
    resp = requests.get(f"{BASE_URL}/programs")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 4, "Should have 4 programs")

def test_get_program_by_slug():
    resp = requests.get(f"{BASE_URL}/programs/charity")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "slug")
    if data["slug"] != "charity":
        raise AssertionError(f"Expected slug 'charity', got '{data['slug']}'")

def test_get_membership_plans():
    resp = requests.get(f"{BASE_URL}/membership-plans")
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 4, "Should have 4 membership plans")

test("GET /api/events", test_get_events)
test("GET /api/events/{id}", test_get_event_by_id)
test("GET /api/news", test_get_news)
test("GET /api/exec-team", test_get_exec_team)
test("GET /api/gallery", test_get_gallery)
test("GET /api/sponsors", test_get_sponsors)
test("GET /api/donors", test_get_donors)
test("GET /api/classifieds", test_get_classifieds)
test("GET /api/classifieds?category=Education", test_get_classifieds_by_category)
test("GET /api/past-presidents", test_get_past_presidents)
test("GET /api/awardees", test_get_awardees)
test("GET /api/awardees?type=difi", test_get_awardees_by_type)
test("GET /api/tax-returns", test_get_tax_returns)
test("GET /api/programs", test_get_programs)
test("GET /api/programs/charity", test_get_program_by_slug)
test("GET /api/membership-plans", test_get_membership_plans)

# ===================== 3. PUBLIC SUBMISSION ENDPOINTS =====================
print("\n=== 3. PUBLIC SUBMISSION ENDPOINTS ===")

def test_post_subscriber():
    resp = requests.post(f"{BASE_URL}/subscribers", json={
        "email": "test@example.com",
        "name": "Test Subscriber"
    })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "ok")
    # Note: "id" field may not be present if subscriber already exists (returns "already": True instead)

def test_post_contact():
    resp = requests.post(f"{BASE_URL}/contact", json={
        "name": "John Doe",
        "email": "john@example.com",
        "subject": "Test Subject",
        "message": "Test message content"
    })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "ok")
    assert_field(data, "id")

def test_post_donation():
    resp = requests.post(f"{BASE_URL}/donations", json={
        "name": "Generous Donor",
        "email": "donor@example.com",
        "amount": 100,
        "message": "Happy to support"
    })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "ok")
    assert_field(data, "id")

def test_post_membership_application():
    resp = requests.post(f"{BASE_URL}/membership-applications", json={
        "first_name": "Rajesh",
        "last_name": "Kumar",
        "email": "rajesh@example.com",
        "phone": "937-555-1234",
        "plan": "regular",
        "tier": "family",
        "family_members": 2
    })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "ok")
    assert_field(data, "id")

def test_post_sponsorship_inquiry():
    resp = requests.post(f"{BASE_URL}/sponsorship-inquiries", json={
        "company": "Acme Corp",
        "contact": "John Smith",
        "email": "john@acme.com",
        "phone": "937-555-9999",
        "tier": "Gold"
    })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "ok")
    assert_field(data, "id")

def test_post_classified():
    resp = requests.post(f"{BASE_URL}/classifieds", json={
        "title": "Test Classified",
        "category": "Services",
        "location": "Dayton",
        "price": "$50",
        "description": "Test classified description",
        "contact": "test@example.com"
    })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "ok")
    assert_field(data, "id")

def test_post_event_registration():
    # First get an event ID
    resp = requests.get(f"{BASE_URL}/events")
    events = assert_json(resp)
    if not events:
        raise AssertionError("No events found")
    event_id = events[0]["id"]
    
    resp2 = requests.post(f"{BASE_URL}/events/{event_id}/register", json={
        "event_id": event_id,
        "name": "Test Attendee",
        "email": "attendee@example.com"
    })
    assert_status(resp2, 200)
    data = assert_json(resp2)
    assert_field(data, "ok")
    assert_field(data, "id")

test("POST /api/subscribers", test_post_subscriber)
test("POST /api/contact", test_post_contact)
test("POST /api/donations", test_post_donation)
test("POST /api/membership-applications", test_post_membership_application)
test("POST /api/sponsorship-inquiries", test_post_sponsorship_inquiry)
test("POST /api/classifieds", test_post_classified)
test("POST /api/events/{id}/register", test_post_event_registration)

# ===================== 4. ADMIN CRUD ENDPOINTS =====================
print("\n=== 4. ADMIN CRUD ENDPOINTS ===")

created_ids = {}

def test_admin_list_events():
    resp = requests.get(f"{BASE_URL}/admin/events", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 6, "Should have at least 6 events")

def test_admin_create_event():
    resp = requests.post(f"{BASE_URL}/admin/events", 
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "title": "Test Event",
                            "slug": "test-event-2026",
                            "category": "Test",
                            "date": "December 31, 2026",
                            "time": "6:00 PM",
                            "venue": "Test Venue",
                            "description": "Test event description",
                            "registration_open": True,
                            "featured": False,
                            "color": "#000000"
                        })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "id")
    created_ids["event"] = data["id"]

def test_admin_get_event():
    if "event" not in created_ids:
        raise AssertionError("No event created yet")
    resp = requests.get(f"{BASE_URL}/admin/events/{created_ids['event']}", 
                       headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "id")
    assert_field(data, "title")

def test_admin_update_event():
    if "event" not in created_ids:
        raise AssertionError("No event created yet")
    resp = requests.put(f"{BASE_URL}/admin/events/{created_ids['event']}", 
                       headers={"Authorization": f"Bearer {token}"},
                       json={"title": "Updated Test Event"})
    assert_status(resp, 200)
    data = assert_json(resp)
    if data["title"] != "Updated Test Event":
        raise AssertionError(f"Title not updated: {data['title']}")

def test_admin_delete_event():
    if "event" not in created_ids:
        raise AssertionError("No event created yet")
    resp = requests.delete(f"{BASE_URL}/admin/events/{created_ids['event']}", 
                          headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "ok")

def test_admin_crud_exec_team():
    # Create
    resp = requests.post(f"{BASE_URL}/admin/exec-team",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "name": "Test Member",
                            "role": "Test Role",
                            "image_url": "https://example.com/test.jpg",
                            "order": 999,
                            "active": True
                        })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "id")
    member_id = data["id"]
    
    # Update
    resp2 = requests.put(f"{BASE_URL}/admin/exec-team/{member_id}",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"role": "Updated Role"})
    assert_status(resp2, 200)
    
    # Delete
    resp3 = requests.delete(f"{BASE_URL}/admin/exec-team/{member_id}",
                           headers={"Authorization": f"Bearer {token}"})
    assert_status(resp3, 200)

def test_admin_crud_sponsors():
    # Create
    resp = requests.post(f"{BASE_URL}/admin/sponsors",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "name": "Test Sponsor",
                            "tier": "Gold",
                            "logo_url": "https://example.com/logo.jpg",
                            "active": True,
                            "order": 999
                        })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "id")
    sponsor_id = data["id"]
    
    # Update
    resp2 = requests.put(f"{BASE_URL}/admin/sponsors/{sponsor_id}",
                        headers={"Authorization": f"Bearer {token}"},
                        json={"tier": "Platinum"})
    assert_status(resp2, 200)
    
    # Delete
    resp3 = requests.delete(f"{BASE_URL}/admin/sponsors/{sponsor_id}",
                           headers={"Authorization": f"Bearer {token}"})
    assert_status(resp3, 200)

def test_admin_crud_gallery():
    # Create
    resp = requests.post(f"{BASE_URL}/admin/gallery",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "title": "Test Gallery Image",
                            "album": "2026",
                            "image_url": "https://example.com/image.jpg"
                        })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "id")
    image_id = data["id"]
    
    # Delete
    resp2 = requests.delete(f"{BASE_URL}/admin/gallery/{image_id}",
                           headers={"Authorization": f"Bearer {token}"})
    assert_status(resp2, 200)

def test_admin_crud_news():
    # Create
    resp = requests.post(f"{BASE_URL}/admin/news",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "title": "Test News",
                            "slug": "test-news-2026",
                            "body": "Test news content",
                            "published": True
                        })
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "id")
    news_id = data["id"]
    
    # Delete
    resp2 = requests.delete(f"{BASE_URL}/admin/news/{news_id}",
                           headers={"Authorization": f"Bearer {token}"})
    assert_status(resp2, 200)

test("GET /api/admin/events", test_admin_list_events)
test("POST /api/admin/events", test_admin_create_event)
test("GET /api/admin/events/{id}", test_admin_get_event)
test("PUT /api/admin/events/{id}", test_admin_update_event)
test("DELETE /api/admin/events/{id}", test_admin_delete_event)
test("Admin CRUD /api/admin/exec-team", test_admin_crud_exec_team)
test("Admin CRUD /api/admin/sponsors", test_admin_crud_sponsors)
test("Admin CRUD /api/admin/gallery", test_admin_crud_gallery)
test("Admin CRUD /api/admin/news", test_admin_crud_news)

# ===================== 5. ADMIN INBOX ENDPOINTS =====================
print("\n=== 5. ADMIN INBOX ENDPOINTS ===")

def test_admin_contact_messages():
    resp = requests.get(f"{BASE_URL}/admin/contact-messages", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 1, "Should have at least 1 contact message from earlier test")

def test_admin_subscribers():
    resp = requests.get(f"{BASE_URL}/admin/subscribers", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 1, "Should have at least 1 subscriber from earlier test")

def test_admin_donations():
    resp = requests.get(f"{BASE_URL}/admin/donations", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 1, "Should have at least 1 donation from earlier test")

def test_admin_membership_applications():
    resp = requests.get(f"{BASE_URL}/admin/membership-applications", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 1, "Should have at least 1 membership application from earlier test")

def test_admin_sponsorship_inquiries():
    resp = requests.get(f"{BASE_URL}/admin/sponsorship-inquiries", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 1, "Should have at least 1 sponsorship inquiry from earlier test")

def test_admin_event_registrations():
    resp = requests.get(f"{BASE_URL}/admin/event-registrations", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_list(data, 1, "Should have at least 1 event registration from earlier test")

test("GET /api/admin/contact-messages", test_admin_contact_messages)
test("GET /api/admin/subscribers", test_admin_subscribers)
test("GET /api/admin/donations", test_admin_donations)
test("GET /api/admin/membership-applications", test_admin_membership_applications)
test("GET /api/admin/sponsorship-inquiries", test_admin_sponsorship_inquiries)
test("GET /api/admin/event-registrations", test_admin_event_registrations)

# ===================== 6. FILE UPLOAD =====================
print("\n=== 6. FILE UPLOAD ===")

def test_file_upload_without_auth():
    # Create a small test image (1x1 PNG)
    test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    files = {'file': ('test.png', io.BytesIO(test_image), 'image/png')}
    resp = requests.post(f"{BASE_URL}/files/upload", files=files)
    assert_status(resp, 401, "File upload should require auth")

def test_file_upload_with_auth():
    # Create a small test image (1x1 PNG)
    test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    files = {'file': ('test.png', io.BytesIO(test_image), 'image/png')}
    resp = requests.post(f"{BASE_URL}/files/upload", 
                        files=files,
                        headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    assert_field(data, "id")
    assert_field(data, "url")
    created_ids["file"] = data["id"]

def test_file_retrieve():
    if "file" not in created_ids:
        raise AssertionError("No file uploaded yet")
    resp = requests.get(f"{BASE_URL}/files/{created_ids['file']}")
    assert_status(resp, 200)
    if resp.headers.get('content-type') != 'image/png':
        raise AssertionError(f"Expected content-type 'image/png', got '{resp.headers.get('content-type')}'")

test("POST /api/files/upload (without auth)", test_file_upload_without_auth)
test("POST /api/files/upload (with auth)", test_file_upload_with_auth)
test("GET /api/files/{id}", test_file_retrieve)

# ===================== 7. CLASSIFIEDS WORKFLOW =====================
print("\n=== 7. CLASSIFIEDS WORKFLOW ===")

def test_classifieds_approve():
    # Get a pending classified (we created one earlier)
    resp = requests.get(f"{BASE_URL}/admin/classifieds", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    classifieds = assert_json(resp)
    
    # Find a pending one
    pending = [c for c in classifieds if c.get("status") == "pending"]
    if not pending:
        raise AssertionError("No pending classifieds found")
    
    classified_id = pending[0]["id"]
    created_ids["classified"] = classified_id
    
    # Approve it
    resp2 = requests.post(f"{BASE_URL}/admin/classifieds/{classified_id}/approve",
                         headers={"Authorization": f"Bearer {token}"})
    assert_status(resp2, 200)
    data = assert_json(resp2)
    assert_field(data, "ok")

def test_classifieds_reject():
    # Create a new classified to reject
    resp = requests.post(f"{BASE_URL}/classifieds", json={
        "title": "To Be Rejected",
        "category": "Services",
        "location": "Dayton",
        "price": "$10",
        "description": "This will be rejected",
        "contact": "reject@example.com"
    })
    assert_status(resp, 200)
    data = assert_json(resp)
    reject_id = data["id"]
    
    # Reject it
    resp2 = requests.post(f"{BASE_URL}/admin/classifieds/{reject_id}/reject",
                         headers={"Authorization": f"Bearer {token}"})
    assert_status(resp2, 200)
    
    # Verify it doesn't appear in public list
    resp3 = requests.get(f"{BASE_URL}/classifieds")
    assert_status(resp3, 200)
    classifieds = assert_json(resp3)
    rejected_in_list = [c for c in classifieds if c.get("id") == reject_id]
    if rejected_in_list:
        raise AssertionError("Rejected classified should not appear in public list")

test("POST /api/admin/classifieds/{id}/approve", test_classifieds_approve)
test("POST /api/admin/classifieds/{id}/reject", test_classifieds_reject)

# ===================== 8. STATS ENDPOINT =====================
print("\n=== 8. STATS ENDPOINT ===")

def test_admin_stats():
    resp = requests.get(f"{BASE_URL}/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert_status(resp, 200)
    data = assert_json(resp)
    
    # Check all expected fields
    expected_fields = [
        "members", "subscribers", "donations", "contact", "events", 
        "news", "gallery", "sponsors", "classifieds_pending", 
        "registrations", "sponsorship_inquiries"
    ]
    for field in expected_fields:
        assert_field(data, field, f"Stats should include {field}")
        if not isinstance(data[field], int):
            raise AssertionError(f"Stats field '{field}' should be an integer, got {type(data[field])}")

test("GET /api/admin/stats", test_admin_stats)

# ===================== SUMMARY =====================
print("\n" + "="*60)
print("TEST SUMMARY")
print("="*60)
print(f"Total tests: {results['total']}")
print(f"Passed: {len(results['passed'])} ✅")
print(f"Failed: {len(results['failed'])} ❌")
print(f"Success rate: {len(results['passed'])/results['total']*100:.1f}%")

if results['failed']:
    print("\n❌ FAILED TESTS:")
    for failure in results['failed']:
        print(f"  - {failure}")
    exit(1)
else:
    print("\n✅ ALL TESTS PASSED!")
    exit(0)
