"""One-off helper to seed/cleanup Phase 5 UI test fixtures."""
import asyncio, sys
from datetime import datetime, timedelta
from database import db
from auth import hash_password
from models import Member


async def seed():
    # 1. Phase 5 test event
    now = datetime.utcnow()
    ev_id = "TEST_phase5_ui_event"
    await db.events.delete_one({"id": ev_id})
    await db.events.insert_one({
        "id": ev_id,
        "title": "TEST Phase 5 UI Event",
        "slug": "test-phase5-ui",
        "category": "Cultural",
        "date": "2026-06-15",
        "event_format": "hybrid",
        "start_date": now + timedelta(days=30),
        "online_url": "https://zoom.us/j/test",
        "venue": "ICGD Hall",
        "description": "Phase 5 UI test event",
        "ticket_types": [{
            "id": "p5-adult",
            "name": "Adult",
            "price": 50,
            "member_price": 35,
            "early_bird_price": 40,
            "early_bird_end_date": now + timedelta(days=7),
            "quantity_total": 100,
            "quantity_sold": 0,
            "order": 1,
        }, {
            "id": "p5-child",
            "name": "Child",
            "price": 20,
            "member_price": 15,
            "quantity_total": 100,
            "quantity_sold": 0,
            "order": 2,
        }],
        "promo_codes": [
            {"code": "DIWALI20", "kind": "percent", "value": 20, "max_uses": 10, "used": 0},
        ],
        "featured": True,
        "registration_open": True,
        "created_at": now,
    })
    print(f"Seeded event {ev_id}")

    # 2. Expiring member for renewal-banner test
    em = "test_expiring_ui@example.com"
    await db.members.delete_one({"email": em})
    m = Member(email=em, password_hash=hash_password("test1234"), first_name="Soon", last_name="Expire")
    d = m.model_dump()
    d["membership"]["plan"] = "regular"
    d["membership"]["tier"] = "individual"
    d["membership"]["status"] = "active"
    d["membership"]["start_date"] = datetime.utcnow() - timedelta(days=355)
    d["membership"]["end_date"] = datetime.utcnow() + timedelta(days=10)
    await db.members.insert_one(d)
    print(f"Seeded expiring member {em}")


async def cleanup():
    await db.events.delete_one({"id": "TEST_phase5_ui_event"})
    await db.members.delete_one({"email": "test_expiring_ui@example.com"})
    print("Cleaned up")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "seed"
    if cmd == "cleanup":
        asyncio.run(cleanup())
    else:
        asyncio.run(seed())
