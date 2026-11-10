"""One sample record from each part of the old Joomla site (indiaclubdayton.org), in the new app's shape.

Source: the old site's MySQL dump (tables prefixed q9gdn_). Only one record per kind is brought over,
so admins can see how old data looks here before a full import. Every record carries
`legacy_sample: True` and `legacy_source` ("<old table>#<old id>") so they are easy to find and remove.

Public content (event, business, sponsor logo, classified, photo, article) is copied as it was.
Records about private people (member, family, order, donation, subscriber, message) keep the real
plan, amounts, dates and city but use placeholder names and example.com emails.

How old tables map to new collections:
  osmembership_plans          -> membership_plans (already set up; Individual/Family/Student = regular tiers,
                                 Business, Silver/Gold = extended, Life Member/Platinum Membership = lifetime)
  osmembership_subscribers    -> members (+ membership)        field_value children/spouse -> family_members
  eb_events / eb_ticket_types -> events (+ ticket_types)       eb_locations -> events.venue
  eb_coupons                  -> events.promo_codes
  eb_registrants + _tickets   -> ticket_orders (+ tickets)
  cmdonation_donations        -> donations
  osmembership_subscribers on a sponsorship plan -> sponsorships
  sponsorswall_sponsors / djimageslider -> sponsors
  banners                     -> businesses (advertisers)
  jomcl_adverts               -> classifieds
  phocagallery                -> gallery
  content                     -> news
  acymailing_subscriber       -> subscribers
  flexicontact_log            -> contact_messages
  tlpteam_team                -> exec_team (already present)
"""
import logging
import secrets
from datetime import datetime

from auth import hash_password
from database import db
from family_tickets import new_ticket_code
from models import gen_id
from sponsorships import new_sponsor_code

log = logging.getLogger(__name__)

OLD = "https://www.indiaclubdayton.org/"
FLAG = "legacy_samples_v1"


def _tag(source: str, doc: dict) -> dict:
    return {**doc, "legacy_sample": True, "legacy_source": source}


def _dt(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")


async def seed_legacy_samples() -> None:
    """Insert the samples once. Deleting one in admin keeps it deleted (the flag stops re-inserting)."""
    if await db.migration_flags.find_one({"id": FLAG}):
        return
    now = datetime.utcnow()

    # Event: q9gdn_eb_events#104 at q9gdn_eb_locations#23, ticket q9gdn_eb_ticket_types (Vendor Registration)
    ticket_id = gen_id()
    event = _tag("eb_events#104", {
        "id": gen_id(),
        "title": "Diwali 2026 Vendor Registration",
        "slug": "diwali-2026-vendor-registration",
        "category": "Diwali",
        "date": "November 14, 2026",
        "time": "5:00 PM – 9:00 PM",
        "venue": "Sinclair: Centerville Regional Center, 5800 Clyo Rd, Dayton, OH 45459",
        "description": "Book a vendor table at our Diwali celebration.",
        "long_description": (
            "We are very excited to announce our upcoming Diwali event!\n\n"
            "Vendor Registration:\n- Business Member Registration: $100\n- Non-Member Registration: $150\n\n"
            "Sponsorship: if you would like to help sponsor any of the expenses below, please reach out to "
            "Ajay Jindal at president@indiaclubdayton.org. Checks can be written out to "
            "'India Club of Greater Dayton'.\n- Venue\n- Hired staff (custodians, audio techs, etc.)\n- Dinner\n"
            "- Misc (decorations, paper supplies, etc.)\n\nThank you so much for supporting India Club!"
        ),
        "image_url": OLD + "images/Events2026/diwali-2026-flyer.jpg",
        "highlights": ["One vendor table per registration", "Business members pay $100"],
        "registration_open": True,
        "featured": False,
        "color": "#8B1A1A",
        "event_format": "in_person",
        "start_date": "2026-11-14T17:00",
        "end_date": "2026-11-14T21:00",
        "ticket_types": [{
            "id": ticket_id, "name": "Vendor Registration", "description": "Member discount applied at checkout",
            "price": 150.0, "member_price": 100.0, "members_only": False,
            "sale_start": "2026-09-21T00:05", "sale_end": "2026-11-08T23:55",
            "quantity_total": 25, "quantity_sold": 1, "order": 1,
        }],
        # q9gdn_eb_coupons DWEB02: $6 off, switched off on the old site
        "promo_codes": [{"code": "DWEB02", "kind": "amount", "value": 6, "max_uses": 1, "used": 0,
                         "per_customer": 1, "enabled": False}],
        "price_periods": [],
        "sponsor_perks": {},
        "donations_enabled": True,
        "fee_mode": "absorb",
        "fee_percent": 3.0,
        "fee_fixed": 0.30,
        "capacity": 25,
        "created_at": now,
    })

    # Member: q9gdn_osmembership_subscribers#6967 (Family Membership, renewed 2026-11-01, PayPal $50)
    member_id = gen_id()
    member = _tag("osmembership_subscribers#6967", {
        "id": member_id,
        "email": "legacy.sample.member@example.com",
        "password_hash": hash_password(secrets.token_urlsafe(24)),  # can't sign in until a reset
        "first_name": "Sample",
        "last_name": "Family Member",
        "gender": "Male",
        "phone": "9370000000",
        "address": "100 Sample Street",
        "city": "Beavercreek",
        "state": "Ohio",
        "zip": "45434",
        "country": "United States",
        "legacy_membership_id": "300248",
        "membership": {
            "plan": "regular", "tier": "family", "status": "active",
            "payment_method": "paypal", "payment_status": "paid", "family_count": 3,
            "donation_amount": 0, "term_kind": "renewal", "term_rule": "standard",
            "submitted_at": _dt("2026-11-01 23:18:30"), "paid_at": _dt("2026-11-01 23:18:32"),
            "start_date": _dt("2024-09-24 14:57:32"), "end_date": _dt("2027-01-01 04:59:59"),
            "approved_at": _dt("2026-11-01 23:18:32"), "approved_by": "legacy-import", "lifetime": False,
        },
        "joined_at": _dt("2024-09-24 14:57:32"),
        "created_at": now,
        "updated_at": now,
    })
    # Spouse and first child from q9gdn_osmembership_field_value (osm_os_spouse, osm_child1_*)
    family = [
        _tag("osmembership_field_value#6967:spouse", {
            "id": gen_id(), "member_id": member_id, "name": "Sample Spouse", "relation": "spouse",
            "date_of_birth": "1985-01-01", "status": "approved", "admin_note": "From old site", "created_at": now}),
        _tag("osmembership_field_value#6967:child1", {
            "id": gen_id(), "member_id": member_id, "name": "Sample Child", "relation": "child",
            "date_of_birth": "2010-01-01", "status": "approved", "admin_note": "From old site", "created_at": now}),
    ]

    # Ticket order: q9gdn_eb_registrants#5894 for event #104 (1 vendor registration, PayPal, paid)
    order = _tag("eb_registrants#5894", {
        "id": gen_id(), "event_id": event["id"], "event_title": event["title"], "member_id": None,
        "buyer_name": "Sample Vendor", "buyer_email": "legacy.sample.vendor@example.com", "buyer_phone": None,
        "items": [{"ticket_type_id": ticket_id, "ticket_type_name": "Vendor Registration",
                   "unit_price": 150.0, "quantity": 1}],
        "tickets": [{"code": new_ticket_code(), "ticket_type_id": ticket_id, "ticket_type_name": "Vendor Registration",
                     "attendee_name": "Sample Vendor", "kind": "self", "category": "non_member", "reason": "",
                     "family_member_id": None, "sponsor_person_id": None, "age_band": "adult",
                     "price": 150.0, "checked_in_at": None}],
        "period": None, "subtotal": 150.0, "discount": 0, "promo_code": None,
        "membership_purchase": None, "donation": None, "fee_contribution": 0, "total": 150.0,
        "payment_method": "paypal", "payment_status": "paid", "notes": "Imported from old site (PayPal)",
        "created_at": _dt("2026-09-29 22:25:58"), "updated_at": now,
    })

    # Donation: q9gdn_cmdonation_donations#42 ($50 PayPal, completed)
    donation = _tag("cmdonation_donations#42", {
        "id": gen_id(), "name": "Sample Donor", "email": "legacy.sample.donor@example.com", "amount": 50.0,
        "message": "Donate to India Club (old site campaign)", "payment_method": "paypal", "anonymous": True,
        "payment_status": "paid", "source": "legacy", "created_at": _dt("2026-09-11 16:16:51"),
    })

    # Sponsorship: Platinum Sponsorship subscriber on q9gdn_osmembership_plans#5 ($1,500, paid offline)
    sponsorship = _tag("osmembership_subscribers:plan5", {
        "id": gen_id(), "company": "Sample Sponsor (old site)", "contact_name": "Sample Sponsor",
        "email": "legacy.sample.sponsor@example.com", "phone": "9370000000", "website": "",
        "plan": "platinum", "tier": "Platinum", "amount": 1500.0, "logo_url": "", "message": "",
        "payment_method": "check", "payment_status": "paid", "status": "active",
        "is_renewal": False, "previous_id": None, "sponsor_code": new_sponsor_code(), "named_people": [],
        "start_date": _dt("2024-08-28 17:12:07"), "end_date": _dt("2027-01-01 04:59:59"),
        "paid_at": _dt("2024-08-28 17:12:07"), "paid_by": "legacy-import", "created_at": now, "updated_at": now,
    })

    # Sponsor wall logo: q9gdn_sponsorswall_sponsors (MM Title)
    sponsor = _tag("sponsorswall_sponsors:MM Title", {
        "id": gen_id(), "name": "MM Title", "logo_url": OLD + "images/sponsors/local/MM-Logo.jpg",
        "tier": "Bronze", "website": None, "active": True, "order": 200, "created_at": now,
    })

    # Advertiser: q9gdn_banners#16 (GreenRock Advisory)
    business = _tag("banners#16", {
        "id": gen_id(), "name": "GreenRock Advisory", "category": "Financial & Tax",
        "description": "Advertiser on the old India Club website.",
        "logo_url": OLD + "images/GreenRock_Advisory_Oct_2025.jpg", "status": "approved", "order": 100,
        "created_at": now,
    })

    # Classified: q9gdn_jomcl_adverts#17
    classified = _tag("jomcl_adverts#17", {
        "id": gen_id(), "title": "Hindu Temple of Dayton", "category": "Services",
        "location": "Beavercreek, OH", "price": None,
        "description": "Address: 2615 Temple Lane, Beavercreek, OH 45431.\n\n"
                       "Provides religious services and events at the temple and at your premises.",
        "contact": "(937) 429-4455", "status": "approved", "created_at": _dt("2019-03-19 19:30:31"),
    })

    # Photo: q9gdn_phocagallery (album "Womens Connect")
    photo = _tag("phocagallery:Womens Connect/img-20210105-wa0009.jpg", {
        "id": gen_id(), "title": "Women's Connect", "album": "Women's Connect",
        "image_url": OLD + "images/phocagallery/Womens%20Connect/img-20210105-wa0009.jpg",
        "created_at": _dt("2021-01-23 04:17:43"),
    })

    # Article: q9gdn_content#90 (Scholarships)
    news = _tag("content#90", {
        "id": gen_id(), "title": "ICGD Student Achievement Awards", "slug": "student-achievement-awards",
        "body": ("India Club of Greater Dayton (ICGD) Student Achievement Awards recognize Ohio high school "
                 "graduates who show excellence in general academics, community service, entrepreneurial "
                 "leadership, and arts or sports. ICGD is proud to recognize students' achievements and support "
                 "their higher studies, continuing its commitment to listen to the needs of the community.\n\n"
                 "ICGD has served the Greater Dayton area since 1967."),
        "published": True, "published_at": _dt("2018-12-10 00:00:00"), "created_at": now,
    })

    # Newsletter subscriber: q9gdn_acymailing_subscriber
    subscriber = _tag("acymailing_subscriber#3022", {
        "id": gen_id(), "email": "legacy.sample.subscriber@example.com", "name": "Sample Subscriber",
        "subscribed_at": now,
    })

    # Contact form: q9gdn_flexicontact_log#155 (topic "Events Related")
    message = _tag("flexicontact_log#155", {
        "id": gen_id(), "name": "Sample Visitor", "email": "legacy.sample.visitor@example.com",
        "subject": "Vendor events",
        "message": "Hello, I am a vendor from Columbus, Ohio and was wondering if you have any upcoming vendor events.",
        "read": True, "created_at": _dt("2023-08-10 00:00:00"),
    })

    inserts = [
        ("events", event), ("members", member), ("ticket_orders", order), ("donations", donation),
        ("sponsorships", sponsorship), ("sponsors", sponsor), ("businesses", business),
        ("classifieds", classified), ("gallery", photo), ("news", news), ("subscribers", subscriber),
        ("contact_messages", message),
    ] + [("family_members", f) for f in family]
    for coll, doc in inserts:
        if not await db[coll].find_one({"legacy_source": doc["legacy_source"]}):
            await db[coll].insert_one(doc)
    await db.migration_flags.insert_one({"id": FLAG, "at": now})
    log.info("Added %d sample records from the old site", len(inserts))
