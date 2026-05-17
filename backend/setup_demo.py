from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

import asyncio
from datetime import datetime, timedelta
from database import db
from auth import hash_password
import uuid


async def setup_demo():
    await db.members.delete_many({"email": "demo@indiaclubdayton.org"})
    await db.members.delete_many({"email": "demo.pending@indiaclubdayton.org"})

    now = datetime.utcnow()
    end = now + timedelta(days=365)

    demo_active = {
        "id": str(uuid.uuid4()),
        "email": "demo@indiaclubdayton.org",
        "password_hash": hash_password("demo1234"),
        "first_name": "Priya", "last_name": "Demo",
        "gender": "Female", "phone": "937-555-0123", "phone_alt": None,
        "address": "100 Main Street", "address2": "Apt 4B",
        "city": "Dayton", "state": "OH", "zip": "45402", "country": "United States",
        "membership": {
            "plan": "regular", "tier": "family", "status": "active",
            "school_name": None, "degree_program": None,
            "donation_amount": 25.0, "payment_method": "paypal", "family_count": 4,
            "submitted_at": now - timedelta(days=10),
            "start_date": now - timedelta(days=10), "end_date": end,
            "approved_at": now - timedelta(days=8), "approved_by": "admin",
            "rejection_reason": None,
        },
        "created_at": now - timedelta(days=12), "updated_at": now,
    }

    pending = {
        "id": str(uuid.uuid4()),
        "email": "demo.pending@indiaclubdayton.org",
        "password_hash": hash_password("demo1234"),
        "first_name": "Arjun", "last_name": "Newcomer",
        "gender": "Male", "phone": "937-555-9876", "phone_alt": None,
        "address": "55 Riverside Drive", "address2": None,
        "city": "Beavercreek", "state": "OH", "zip": "45434", "country": "United States",
        "membership": {
            "plan": "regular", "tier": "individual", "status": "pending",
            "school_name": None, "degree_program": None,
            "donation_amount": 10.0, "payment_method": "check", "family_count": 1,
            "submitted_at": now - timedelta(days=1),
            "start_date": None, "end_date": None,
            "approved_at": None, "approved_by": None, "rejection_reason": None,
        },
        "created_at": now - timedelta(days=2), "updated_at": now - timedelta(days=1),
    }

    await db.members.insert_many([demo_active, pending])
    print("Demo accounts created in MongoDB")


asyncio.run(setup_demo())

# Verify login works
import requests
r = requests.post("http://localhost:8001/api/members/login",
    json={"email": "demo@indiaclubdayton.org", "password": "demo1234"})
print(f"Login test (active demo): {r.status_code}")
if r.ok:
    m = r.json()["member"]
    print(f"  name: {m['first_name']} {m['last_name']}")
    print(f"  status: {m['membership']['status']}")
    print(f"  plan: {m['membership']['plan']}/{m['membership']['tier']}")
    print(f"  valid until: {m['membership']['end_date']}")

r = requests.post("http://localhost:8001/api/members/login",
    json={"email": "demo.pending@indiaclubdayton.org", "password": "demo1234"})
print(f"\nLogin test (pending demo): {r.status_code}")
if r.ok:
    m = r.json()["member"]
    print(f"  name: {m['first_name']} {m['last_name']}")
    print(f"  status: {m['membership']['status']}")
