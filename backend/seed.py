"""Seed initial data into MongoDB on startup if collections are empty."""
from datetime import datetime, timedelta
from database import db
from auth import hash_password


async def seed_if_empty():
    # ---- Admin ----
    if await db.admin_users.count_documents({}) == 0:
        await db.admin_users.insert_one({
            "id": "admin-1",
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "created_at": datetime.utcnow(),
        })

    # ---- Past Presidents ----
    if await db.past_presidents.count_documents({}) == 0:
        pres = [
            ("2017", "Ashesh Agrawal"), ("2016", "Rakesh Arora"), ("2015", "Pratibha Gupta"),
            ("2014", "Vinit Mishra"), ("2013", "Srinivas Katragadda"), ("2012", "Ravi Swaminathan"),
            ("2011", "Hyacinth Dey"), ("2010", "Ravi Ravikumar"), ("2009", "Rakesh Gupta"),
            ("2008", "Bhanu Raghavan"), ("2007", "Hemant Garg"), ("2006", "Ashwin Rao"),
            ("2005", "Raj Singh"), ("2004", "Bhanu Raghavan"), ("2003", "Krishna Sharma"),
        ]
        await db.past_presidents.insert_many([
            {"id": f"pp-{i}", "year": y, "name": n, "order": i}
            for i, (y, n) in enumerate(pres)
        ])

    # ---- Awardees ----
    if await db.awardees.count_documents({}) == 0:
        csa = [
            (2024, "Dr. Suresh Gupta", "Health & education advocacy across Greater Dayton"),
            (2023, "Mrs. Lalita Rao", "Senior care initiatives and community kitchen"),
            (2022, "Pradeep Mehta", "Youth mentorship and summer STEM camps"),
            (2021, "Dr. Anjali Verma", "Pandemic-era community health response"),
            (2019, "Hyacinth Dey", "Decades of cultural programming leadership"),
            (2018, "Ravi Swaminathan", "Sustained financial stewardship of ICGD"),
            (2017, "Bhanu Raghavan", "Multi-year service across two presidential terms"),
        ]
        difi = [
            (2024, "Outstanding Cultural Showcase", "Diwali Mela performance"),
            (2023, "Best Multicultural Booth", "DIFI World Affairs Festival"),
            (2022, "Community Excellence Award", "Volunteer-led programming"),
            (2021, "Pandemic Response Recognition", "Virtual event innovation"),
            (2019, "Heritage Showcase Excellence", "Cultural diversity celebration"),
            (2017, "Best Performance Group", "Indian classical dance"),
        ]
        docs = []
        for i, (y, n, c) in enumerate(csa):
            docs.append({"id": f"csa-{i}", "year": y, "name": n, "contribution": c, "type": "community", "order": i})
        for i, (y, n, c) in enumerate(difi):
            docs.append({"id": f"difi-{i}", "year": y, "name": n, "contribution": c, "type": "difi", "order": i})
        await db.awardees.insert_many(docs)

    # ---- Tax Returns ----
    if await db.tax_returns.count_documents({}) == 0:
        tr = [
            (2017, "Ashesh Agrawal", "Ashesh Agrawal", True),
            (2016, "Rakesh Arora", "Rakesh Arora", True),
            (2015, "Selvam Kandasamy", "Pratibha Gupta", True),
            (2014, "Selvam Kandasamy", "Vinit Mishra", True),
            (2013, "Selvam Kandasamy", "Srinivas Katragadda", True),
            (2012, "Srinivas Katragadda", "Ravi Swaminathan", True),
            (2011, "Ravi Swaminathan", "Hyacinth Dey", True),
            (2010, "—", "Ravi Ravikumar", False),
            (2009, "—", "Rakesh Gupta", False),
            (2008, "Rakesh Gupta", "Bhanu Raghavan", True),
            (2007, "Ravi Ravikumar", "Hemant Garg", True),
            (2006, "Ravi Ravikumar", "Ashwin Rao", True),
            (2005, "Arun Jain", "Raj Singh", True),
            (2004, "Raj Singh", "Bhanu Raghavan", True),
            (2003, "Bhanu Raghavan", "Krishna Sharma", True),
        ]
        await db.tax_returns.insert_many([
            {"id": f"tr-{i}", "year": y, "filed_by": f, "president": p, "available": a, "file_id": None, "order": i}
            for i, (y, f, p, a) in enumerate(tr)
        ])

    # ---- Membership Plans ----
    if await db.membership_plans.count_documents({}) == 0:
        plans = [
            {
                "id": "plan-regular", "slug": "regular", "name": "Annual — Regular",
                "price": 50, "period": "Family $50/yr",
                "description": "Choose from Student, Individual or Family — full access to all India Club events at member pricing.",
                "benefits": ["Discounted Event Tickets", "Participation in all India Club Events", "Free India Club Samachar Newsletter", "Free India Club Namaskaar Magazine", "Free Online Classified Advt to all Members"],
                "featured": True, "order": 1,
                "tiers": [
                    {"slug": "student", "name": "Student", "price": 20, "recommended": False, "benefits": ["Discounted Event Tickets", "Participation in all India Club Events", "Free India Club Samachar Newsletter", "Free India Club Namaskaar Magazine", "Free Online Classified Advt"]},
                    {"slug": "individual", "name": "Individual", "price": 30, "recommended": False, "benefits": ["Discounted Event Tickets", "Participation in all India Club Events", "Free India Club Samachar Newsletter", "Free India Club Namaskaar Magazine", "Free Online Classified Advt"]},
                    {"slug": "family", "name": "Family", "price": 50, "recommended": True, "benefits": ["Discounted Event Tickets", "Participation in all India Club Events", "Free India Club Samachar Newsletter", "Free India Club Namaskaar Magazine", "Free Online Classified Advt"]},
                    {"slug": "business", "name": "Business", "price": 250, "recommended": False, "benefits": ["Promotional Offer: Includes Family Membership", "Discounted Event Tickets", "Participation in all the Club Events", "Discounted Advt. on Samachar Magazine", "Discounted Event Booth Rentals", "Free India Club Namaskar (Annual)"]},
                ],
            },
            {
                "id": "plan-business", "slug": "business", "name": "Annual — Business",
                "price": 250, "period": "per year",
                "description": "Promote your business to 1000+ Indian families. Includes Family Membership.",
                "benefits": ["Promotional Offer: Includes Family Membership", "Discounted Event Tickets", "Participation in all the Club Events", "Discounted Advt. on Samachar Magazine", "Discounted Event Booth Rentals", "Free India Club Namaskar (Annual)", "Free Online Classified Advt to all Members"],
                "featured": False, "order": 2, "tiers": [],
            },
            {
                "id": "plan-honorary", "slug": "honorary", "name": "Honorary",
                "price": 0, "period": "by invitation",
                "description": "For individuals who have contributed to the cause and well-being of the Asian Indian Community.",
                "benefits": ["Subject to Executive Committee approval", "No membership dues required", "All privileges of Family Membership", "Listed on Honor Wall — except voting rights"],
                "featured": False, "order": 3, "tiers": [],
            },
            {
                "id": "plan-extended", "slug": "extended", "name": "Extended",
                "price": 200, "period": "Silver $200 / Gold $400",
                "description": "Multi-year membership — buy multiple years and get bonus years free.",
                "benefits": ["Silver ($200): Buy 4 years, get 5th year FREE", "Gold ($400): Buy 8 years, get 2 years FREE", "Discounted Event Tickets", "Participation in all India Club Events", "Free Samachar & Namaskar Magazine"],
                "featured": False, "order": 4,
                "tiers": [
                    {"slug": "silver", "name": "Silver Membership", "price": 200, "recommended": True, "tagline": "5 Years — Buy 4 Get 1 Free", "benefits": ["Buy 4 years and get 5th year FREE", "Discounted Event Tickets", "Participation in all India Club Events", "Free India Club Samachar Magazine", "Free India Club Namaskar Magazine"]},
                    {"slug": "gold", "name": "Gold Membership", "price": 400, "recommended": False, "tagline": "10 Years — Buy 8 Get 2 Free", "benefits": ["Buy 8 years and get 2 years FREE", "Discounted Event Tickets", "Participation in all India Club Events", "Free India Club Samachar Magazine", "Free India Club Namaskar Magazine"]},
                ],
            },
        ]
        await db.membership_plans.insert_many(plans)

    # ---- Programs ----
    if await db.programs.count_documents({}) == 0:
        progs = [
            {
                "id": "prog-charity", "slug": "charity", "name": "Charity", "order": 1,
                "image_url": "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "summary": "Annual food drives, disaster relief contributions and partnerships with local nonprofits.",
                "intro": "ICGD's charity arm channels community generosity toward causes that matter — locally in Dayton and internationally back home in India.",
                "initiatives": [
                    {"name": "Foodbank Dayton Partnership", "desc": "Quarterly food drives collecting non-perishables. Over 5,000 lbs donated annually."},
                    {"name": "United Way Greater Dayton", "desc": "ICGD is a designated workplace giving recipient."},
                    {"name": "India Flood & Earthquake Relief", "desc": "Activated emergency drives in 2018, 2020 and 2023."},
                    {"name": "Winter Coat Drive", "desc": "Annual coat collection for Dayton homeless shelters."},
                    {"name": "Blood Donation Camp", "desc": "Annual camp with Community Blood Center."},
                ],
                "impact": "Over $300,000 raised in cumulative donations across our 58-year history.",
            },
            {
                "id": "prog-education", "slug": "education", "name": "Education", "order": 2,
                "image_url": "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "summary": "Heritage classes, language workshops and STEM mentorship for our youth.",
                "intro": "Education has always been a core ICGD pillar — from heritage language classes to college mentorship.",
                "initiatives": [
                    {"name": "Saturday Heritage School", "desc": "Hindi, Telugu, Tamil and Bengali language classes for K–8."},
                    {"name": "SAT & College Prep", "desc": "Volunteer mentorship by community professionals."},
                    {"name": "STEM Summer Camp", "desc": "One-week intensive camp for ages 8–14 every July."},
                    {"name": "Bharatanatyam & Tabla Classes", "desc": "Subsidized classical arts classes."},
                    {"name": "Cultural Storytelling Series", "desc": "Monthly storytelling from Indian epics."},
                ],
                "impact": "200+ children enrolled in our Saturday school programs.",
            },
            {
                "id": "prog-scholarship", "slug": "scholarship", "name": "Scholarship", "order": 3,
                "image_url": "https://images.unsplash.com/photo-1651512186979-737021ace442?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "summary": "Merit and need-based scholarships for graduating high-school seniors.",
                "intro": "The ICGD Scholarship Program awards five $2,000 scholarships annually to graduating high school seniors of Indian origin.",
                "initiatives": [
                    {"name": "Eligibility", "desc": "Asian Indian student graduating high school in Greater Dayton."},
                    {"name": "Criteria", "desc": "Merit, community service, financial need and essay on Indian heritage."},
                    {"name": "Application Window", "desc": "Opens February 1 and closes April 15 each year."},
                    {"name": "Award Amount", "desc": "$2,000 per recipient paid to college/university."},
                    {"name": "Selection", "desc": "Reviewed by a five-member volunteer Scholarship Committee."},
                ],
                "impact": "75+ scholarships awarded — totaling over $150,000.",
            },
            {
                "id": "prog-csa", "slug": "community-service", "name": "Community Service Awards", "order": 4,
                "image_url": "https://images.unsplash.com/photo-1622610607501-32ac9c927216?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "summary": "Honoring volunteers whose service uplifts the Dayton Indian community.",
                "intro": "The Community Service Awards recognize individuals whose volunteer efforts have profoundly impacted the Asian Indian community.",
                "initiatives": [
                    {"name": "Annual Award", "desc": "Presented each year at the Diwali Mela."},
                    {"name": "Nominations", "desc": "Open July–September."},
                    {"name": "Selection Committee", "desc": "Panel of past Presidents and CSA recipients."},
                    {"name": "Recognition", "desc": "Trophy, lifetime ICGD membership and newsletter feature."},
                    {"name": "Honor Wall", "desc": "All recipients are honored on the permanent ICGD Honor Wall."},
                ],
                "impact": "25+ exceptional volunteers honored.",
            },
        ]
        await db.programs.insert_many(progs)

    # ---- Executive Team ----
    if await db.exec_team.count_documents({}) == 0:
        team = [
            ("Ajay Jindal", "President", "8B1A1A"),
            ("Vijaya Patil", "President Elect", "E07A1F"),
            ("Puneeta Aggarwal", "Ex President", "C9A961"),
            ("Pooja Lele", "Secretary", "8B1A1A"),
            ("Amala Ganathe", "Treasurer", "2E5E3E"),
            ("Karthik Jeeva", "Membership Chair", "E07A1F"),
            ("Chandrani Mukherjee", "Cultural Chair", "8B1A1A"),
            ("Kuldeep Surana", "Cultural Alternate", "1a0e0a"),
            ("Shruti Nagaraju", "Cultural Alternate", "C9A961"),
            ("Pinki Chowdhury", "Youth Chair", "E07A1F"),
            ("Prisha Rajulapalli", "Youth Representative", "2E5E3E"),
            ("Aalna Makote", "Youth Representative", "8B1A1A"),
            ("Prisha Echuri", "Youth Representative", "1a0e0a"),
            ("Devandra Goel", "DIFI Delegate", "C9A961"),
            ("Girija Chaubey", "DIFI Alternate", "E07A1F"),
            ("Jigisha Vaddhi", "DIFI Design Lead", "8B1A1A"),
            ("Amit Kumar", "Event Coordinator", "2E5E3E"),
            ("Suman Srinivasan", "Golden Jewels Lead", "C9A961"),
            ("Rajiv Ranjan", "Sports Chair", "E07A1F"),
            ("Prakash Gupta", "Webmaster", "1a0e0a"),
        ]
        docs = []
        for i, (n, r, bg) in enumerate(team):
            url_n = n.replace(" ", "+")
            color = "FFE9D0" if bg == "8B1A1A" else ("FFF9F0" if bg != "C9A961" else "2A1A0E")
            docs.append({
                "id": f"exec-{i}", "name": n, "role": r,
                "image_url": f"https://ui-avatars.com/api/?name={url_n}&size=400&background={bg}&color={color}&bold=true&font-size=0.4",
                "order": i, "active": True, "created_at": datetime.utcnow(),
            })
        await db.exec_team.insert_many(docs)

    # ---- Events ----
    if await db.events.count_documents({}) == 0:
        evts = [
            {"slug": "rising-star-may-2026", "title": "Rising Star May 2026", "category": "Rising Stars", "date": "May 17, 2026", "time": "5:00 PM – 9:00 PM", "venue": "Sinclair Community College, Dayton", "description": "Annual youth talent showcase featuring solo and group performances.", "registration_open": True, "featured": True, "color": "#C9A961"},
            {"slug": "diwali-mela-2026", "title": "Diwali Mela 2026", "category": "Diwali", "date": "November 1, 2026", "time": "4:00 PM – 10:00 PM", "venue": "Dayton Convention Center", "description": "Diwali Mela with dance performances, bazaar stalls, traditional dinner and firework finale.", "registration_open": True, "featured": True, "color": "#8B1A1A"},
            {"slug": "icgd-summer-picnic", "title": "ICGD Summer Picnic", "category": "Picnic", "date": "July 12, 2026", "time": "11:00 AM – 5:00 PM", "venue": "Eastwood MetroPark, Dayton", "description": "Community picnic with cricket, antakshari, kids games and home-made Indian food.", "registration_open": True, "featured": False, "color": "#E07A1F"},
            {"slug": "womens-connect-march", "title": "Women's Connect: Lead the Change", "category": "Women's Connect", "date": "March 8, 2026", "time": "6:00 PM – 8:30 PM", "venue": "Online & In-person, Centerville", "description": "International Women's Day event with keynote speakers and networking.", "registration_open": False, "featured": False, "color": "#E07A1F"},
            {"slug": "icgd-cricket-cup", "title": "Cricket Premier League — ICGD Cup", "category": "Sports", "date": "August 23, 2026", "time": "8:00 AM – 7:00 PM", "venue": "Wegerzyn Gardens, Dayton", "description": "Annual six-team T10 tournament. Free entry, family-friendly.", "registration_open": True, "featured": False, "color": "#C9A961"},
            {"slug": "golden-jewels-tea", "title": "Golden Jewels Tea & Bhajan Evening", "category": "Golden Jewels", "date": "April 5, 2026", "time": "4:00 PM – 6:30 PM", "venue": "Hindu Temple of Dayton", "description": "Bhajans, chai and conversation for our golden community members.", "registration_open": True, "featured": False, "color": "#8B1A1A"},
        ]
        for i, e in enumerate(evts):
            e["id"] = f"evt-{i+1}"
            e["image_url"] = f"https://images.unsplash.com/photo-160{['5292356183-a77d0a9c9d1d','5292356183-a77d0a9c9d1d','5292356183-a77d0a9c9d1d','5292356183-a77d0a9c9d1d','5292356183-a77d0a9c9d1d','5292356183-a77d0a9c9d1d'][i]}?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
            e["highlights"] = []
            e["long_description"] = e["description"]
            e["created_at"] = datetime.utcnow()
        await db.events.insert_many(evts)

    # ---- Sponsors ----
    if await db.sponsors.count_documents({}) == 0:
        sps = [
            ("Athena Investment Properties", "Gold", "8B1A1A"), ("Day Freight", "Silver", "E07A1F"),
            ("Dayton Business Journal", "Gold", "1a0e0a"), ("FRI", "Silver", "C9A961"),
            ("GDAA", "Silver", "8B1A1A"), ("Greentree", "Gold", "2E5E3E"),
            ("India Chat Cafe", "Bronze", "E07A1F"), ("Mike's Auto", "Bronze", "1a0e0a"),
            ("Mount Mortgage", "Silver", "C9A961"), ("Mo Dough", "Bronze", "8B1A1A"),
            ("Nova", "Bronze", "E07A1F"), ("Shree G", "Bronze", "2E5E3E"),
            ("Sports Clips", "Silver", "1a0e0a"), ("Bonzi", "Bronze", "C9A961"),
            ("Alice", "Bronze", "8B1A1A"),
        ]
        docs = []
        for i, (n, t, bg) in enumerate(sps):
            url_n = n.replace(" ", "+").replace("'", "")
            docs.append({
                "id": f"sp-{i}", "name": n, "tier": t, "website": None,
                "logo_url": f"https://ui-avatars.com/api/?name={url_n}&size=220&background={bg}&color=FFF9F0&bold=true&font-size=0.35",
                "active": True, "order": i, "created_at": datetime.utcnow(),
            })
        await db.sponsors.insert_many(docs)

    # ---- Donors ----
    if await db.donors.count_documents({}) == 0:
        donors = [
            ("Anonymous Patron", 25000, 2025, "Founder"), ("Dr. Suresh & Rita Gupta", 10000, 2025, "Platinum"),
            ("Mehta Family Trust", 7500, 2024, "Diamond"), ("Rao Charitable Foundation", 5000, 2024, "Diamond"),
            ("Verma Family", 2500, 2024, "Gold"), ("Iyer Family", 2500, 2023, "Gold"),
            ("Patel Family", 1500, 2023, "Silver"), ("Sharma Family", 1000, 2023, "Silver"),
        ]
        await db.donors.insert_many([
            {"id": f"d-{i}", "name": n, "amount": a, "year": y, "tier": t, "anonymous": "Anonymous" in n, "created_at": datetime.utcnow()}
            for i, (n, a, y, t) in enumerate(donors)
        ])

    # ---- Classifieds ----
    if await db.classifieds.count_documents({}) == 0:
        cls = [
            ("Looking for a Hindi Tutor", "Education", "Centerville", "$25/hr", "Seeking experienced Hindi tutor for elementary kids. Weekend availability preferred.", "hindi.parent@email.com"),
            ("2BR Apartment for Rent — Beavercreek", "Housing", "Beavercreek", "$1,450/mo", "Spacious 2BR, 2BA apartment with parking. Available June 1.", "(937) 555-0001"),
            ("Pre-owned Toyota Camry 2019", "Vehicles", "Dayton", "$14,500", "55K miles, single owner, well-maintained.", "camry.seller@email.com"),
            ("Bharatanatyam classes — Beginners welcome", "Services", "Kettering", "$80/mo", "Trained guru offering classes for ages 6+.", "dance.guru@email.com"),
            ("Handcrafted Sarees — Direct from Banaras", "For Sale", "Dayton", "$150+", "Authentic Banarasi silk sarees in stunning designs.", "sarees@email.com"),
            ("Tax Filing & CPA Services", "Services", "Centerville", "Quote on call", "Licensed CPA, 15+ years experience with personal & business returns.", "(937) 555-9999"),
        ]
        await db.classifieds.insert_many([
            {"id": f"cls-{i}", "title": t, "category": c, "location": l, "price": p, "description": d, "contact": ct, "image_url": None, "status": "approved", "created_at": datetime.utcnow()}
            for i, (t, c, l, p, d, ct) in enumerate(cls)
        ])

    # ---- News ----
    if await db.news.count_documents({}) == 0:
        news = [
            ("Diwali Mela 2026 — Sponsorship Now Open", "diwali-2026-sponsorship-open", "Sponsorship slots for our largest event of the year are now open. Tiered packages from Bronze to Diamond available. Contact us to secure your slot."),
            ("Scholarship Applications Open February 1", "scholarship-applications-2026", "Five $2,000 scholarships will be awarded to graduating Indian-American high school seniors in Greater Dayton."),
            ("Rising Stars 2026 — Registration Now Open", "rising-stars-2026-registration", "Calling all young artists ages 5–22! Register now for our signature youth talent showcase on May 17."),
        ]
        await db.news.insert_many([
            {"id": f"news-{i}", "title": t, "slug": s, "body": b, "image_url": None, "published": True, "published_at": datetime.utcnow(), "created_at": datetime.utcnow()}
            for i, (t, s, b) in enumerate(news)
        ])

    # ---- Gallery ----
    if await db.gallery.count_documents({}) == 0:
        titles = [
            "ICGD Cultural Evening", "Diwali Celebration", "Classical Dance Recital", "Festival Performance", "Rising Stars Show",
            "Community Gathering", "Cultural Showcase", "Indian Festival", "Stage Performance", "Group Dance",
            "Youth Performance", "Cultural Night", "ICGD Event", "Holi Splash", "Family Picnic",
        ]
        ids = ["1605292356183-a77d0a9c9d1d", "1577083753695-e010191bacb5", "1463592177119-bab2a00f3ccb", "1645264090488-a019de493023", "1651512186979-737021ace442",
               "1592843997881-cab3860b1067", "1585607344893-43a4bd91169a", "1467810563316-b5476525c0f9", "1716714620140-9ed26b67e900", "1716714607603-8aa6a2f16d84",
               "1605302977140-6572a4421aef", "1468234847176-28606331216a", "1605292356183-a77d0a9c9d1d", "1577083753695-e010191bacb5", "1463592177119-bab2a00f3ccb"]
        await db.gallery.insert_many([
            {"id": f"g-{i}", "title": t, "album": "2026", "image_url": f"https://images.unsplash.com/photo-{ids[i]}?crop=entropy&cs=srgb&fm=jpg&q=85&w=900", "created_at": datetime.utcnow()}
            for i, t in enumerate(titles)
        ])


    # ---- Member Perks ----
    if await db.perks.count_documents({}) == 0:
        perks = [
            {
                "id": "perk-events",
                "title": "Discounted Event Tickets",
                "description": "Members pay member pricing on all ICGD events — Diwali, DIFI, Rising Stars and more. Typical savings of 30–40% per ticket.",
                "icon": "Ticket",
                "badge": "POPULAR",
                "category": "Events",
                "link": "/events",
                "link_label": "Browse Events",
                "active": True,
                "order": 1,
                "created_at": datetime.utcnow(),
            },
            {
                "id": "perk-classifieds",
                "title": "Free Classified Ads",
                "description": "Post unlimited classified ads — buy/sell, rentals, services, jobs — completely free for active members.",
                "icon": "Tag",
                "category": "Community",
                "link": "/classified/post-ads",
                "link_label": "Post an Ad",
                "active": True,
                "order": 2,
                "created_at": datetime.utcnow(),
            },
            {
                "id": "perk-newsletter",
                "title": "Samachar Newsletter",
                "description": "Quarterly community newsletter with event highlights, member stories, recipes, and cultural articles — delivered to your inbox.",
                "icon": "Newspaper",
                "category": "Publications",
                "active": True,
                "order": 3,
                "created_at": datetime.utcnow(),
            },
            {
                "id": "perk-namaskar",
                "title": "Namaskaar Magazine",
                "description": "Annual full-color souvenir magazine celebrating community achievements, sponsors, and the year's events. Free for members.",
                "icon": "BookOpen",
                "category": "Publications",
                "active": True,
                "order": 4,
                "created_at": datetime.utcnow(),
            },
            {
                "id": "perk-voting",
                "title": "AGM Voting Rights",
                "description": "Vote in the Annual General Meeting, help elect the next Executive Committee, and shape the direction of the club.",
                "icon": "Vote",
                "badge": "MEMBER-ONLY",
                "category": "Governance",
                "active": True,
                "order": 5,
                "created_at": datetime.utcnow(),
            },
            {
                "id": "perk-directory",
                "title": "Member Directory",
                "description": "Connect with 1000+ Indian families in the Dayton area. A trusted private directory of fellow members for networking and friendship.",
                "icon": "Users",
                "category": "Community",
                "active": True,
                "order": 6,
                "created_at": datetime.utcnow(),
            },
            {
                "id": "perk-booth",
                "title": "Event Booth Rentals",
                "description": "Business members get discounted booth rentals at Diwali, DIFI, and other major events to promote their services.",
                "icon": "Store",
                "category": "Business",
                "active": True,
                "order": 7,
                "created_at": datetime.utcnow(),
            },
            {
                "id": "perk-charity",
                "title": "Support Local Charity",
                "description": "Your membership directly funds ICGD's foodbank partnership, scholarship program, and disaster-relief contributions back home in India.",
                "icon": "Heart",
                "category": "Impact",
                "active": True,
                "order": 8,
                "created_at": datetime.utcnow(),
            },
        ]
        await db.perks.insert_many(perks)


    # ---- Demo Members (for testing the member flow) ----
    if await db.members.count_documents({"email": "demo@indiaclubdayton.org"}) == 0:
        now = datetime.utcnow()
        await db.members.insert_one({
            "id": "demo-member-active",
            "email": "demo@indiaclubdayton.org",
            "password_hash": hash_password("demo1234"),
            "first_name": "Priya",
            "last_name": "Demo",
            "gender": "Female",
            "phone": "937-555-0123",
            "phone_alt": None,
            "address": "100 Main Street",
            "address2": "Apt 4B",
            "city": "Dayton",
            "state": "OH",
            "zip": "45402",
            "country": "United States",
            "membership": {
                "plan": "regular", "tier": "family", "status": "active",
                "school_name": None, "degree_program": None,
                "donation_amount": 25.0, "payment_method": "paypal", "family_count": 4,
                "submitted_at": now - timedelta(days=10),
                "start_date": now - timedelta(days=10),
                "end_date": now + timedelta(days=355),
                "approved_at": now - timedelta(days=8),
                "approved_by": "admin",
                "rejection_reason": None,
            },
            "created_at": now - timedelta(days=12),
            "updated_at": now,
        })

    if await db.members.count_documents({"email": "demo.pending@indiaclubdayton.org"}) == 0:
        now = datetime.utcnow()
        await db.members.insert_one({
            "id": "demo-member-pending",
            "email": "demo.pending@indiaclubdayton.org",
            "password_hash": hash_password("demo1234"),
            "first_name": "Arjun",
            "last_name": "Newcomer",
            "gender": "Male",
            "phone": "937-555-9876",
            "phone_alt": None,
            "address": "55 Riverside Drive",
            "address2": None,
            "city": "Beavercreek",
            "state": "OH",
            "zip": "45434",
            "country": "United States",
            "membership": {
                "plan": "regular", "tier": "individual", "status": "pending",
                "school_name": None, "degree_program": None,
                "donation_amount": 10.0, "payment_method": "check", "family_count": 1,
                "submitted_at": now - timedelta(days=1),
                "start_date": None, "end_date": None,
                "approved_at": None, "approved_by": None, "rejection_reason": None,
            },
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(days=1),
        })


    # ---- Hero Slides ----
    if await db.hero_slides.count_documents({}) == 0:
        slides = [
            {
                "image_url": "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "headline": "Celebrating Indian Heritage",
                "subhead": "Connecting families across Greater Dayton since 1967",
                "cta_label": "Become a Member",
                "cta_link": "/membership/regular",
            },
            {
                "image_url": "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "headline": "Festival of Lights",
                "subhead": "Diwali Mela — the warmth of community, the magic of celebration",
                "cta_label": "See Events",
                "cta_link": "/events/upcoming",
            },
            {
                "image_url": "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "headline": "Programs for Every Generation",
                "subhead": "From Rising Stars to Golden Jewels — there is a place for you",
                "cta_label": "Explore Programs",
                "cta_link": "/programs",
            },
        ]
        await db.hero_slides.insert_many([
            {
                "id": f"hero-{i}",
                "image_url": s["image_url"],
                "headline": s["headline"],
                "subhead": s["subhead"],
                "cta_label": s["cta_label"],
                "cta_link": s["cta_link"],
                "order": (i + 1) * 10,
                "active": True,
                "created_at": datetime.utcnow(),
            } for i, s in enumerate(slides)
        ])

    # ---- Feature Highlights ----
    if await db.feature_highlights.count_documents({}) == 0:
        feats = [
            {"title": "Become a Member", "description": "Join 1000+ families and immerse in cultural events, networking and community.", "cta": "Join Today", "link": "/membership/regular", "accent": "#8B1A1A", "image_url": "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
            {"title": "Sponsor India Club", "description": "A community-funded institution supported by sponsors and well-wishers.", "cta": "Sponsor Us", "link": "/sponsorship/become-sponsor", "accent": "#E07A1F", "image_url": "https://images.unsplash.com/photo-1716714607603-8aa6a2f16d84?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
            {"title": "Business Membership", "description": "Grow your business with the largest Indian community in Greater Dayton.", "cta": "Learn More", "link": "/membership/business", "accent": "#C9A961", "image_url": "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
            {"title": "Donate to Own a Place", "description": "Help us build a permanent home so we can serve you more efficiently.", "cta": "Donate Now", "link": "/sponsorship/donate", "accent": "#8B1A1A", "image_url": "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"},
        ]
        await db.feature_highlights.insert_many([
            {"id": f"feat-{i}", **f, "order": (i + 1) * 10, "active": True, "created_at": datetime.utcnow()}
            for i, f in enumerate(feats)
        ])

    # ---- Testimonials ----
    if await db.testimonials.count_documents({}) == 0:
        quotes = [
            {"name": "Amrit & Shashi Chadha", "date": "Feb 06, 2024", "body": "Thank you for sharing the program. You guys had done a wonderful job in planning and organizing the program. Congratulations and God Bless."},
            {"name": "Priya Menon", "date": "Oct 24, 2024", "body": "The Diwali Mela was magical — stalls, dance, fireworks. Felt like home, thousands of miles from India."},
            {"name": "Suresh & Latha Iyer", "date": "Apr 18, 2025", "body": "Golden Jewels evenings have brought so much joy. The volunteers go above and beyond every single time."},
        ]
        await db.testimonials.insert_many([
            {"id": f"test-{i}", **q, "rating": 5, "image_url": None, "order": (i + 1) * 10, "active": True, "created_at": datetime.utcnow()}
            for i, q in enumerate(quotes)
        ])

    # ---- Site Stats ----
    if await db.site_stats.count_documents({}) == 0:
        stats = [
            {"label": "Founded", "value": "1967"},
            {"label": "Member Families", "value": "1000+"},
            {"label": "Annual Events", "value": "40+"},
            {"label": "Years of Service", "value": "58"},
        ]
        await db.site_stats.insert_many([
            {"id": f"stat-{i}", **s, "order": (i + 1) * 10, "active": True, "created_at": datetime.utcnow()}
            for i, s in enumerate(stats)
        ])

    # ---- Event Categories (merged with EVENT_DETAILS long-form content) ----
    if await db.event_categories.count_documents({}) == 0:
        cats = [
            {
                "slug": "difi", "name": "DIFI", "tagline": "Dayton India Festival of India",
                "description": "The signature multi-day cultural festival celebrating Indian dance, music, food and tradition.",
                "image_url": "https://images.unsplash.com/photo-1585607344893-43a4bd91169a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "color": "#E07A1F",
                "long_description": "DIFI — the Dayton International Festival Inc. — is one of Ohio's premier multicultural celebrations. India Club proudly represents the Indian community every year with a vibrant booth featuring classical and folk dance performances, traditional cuisine, henna art, saree displays, and live music from across India's many regions.",
                "highlights": [
                    "Bharatanatyam, Kathak, Kuchipudi & folk dance performances",
                    "Authentic regional Indian food (North, South, Bengali, Punjabi)",
                    "Live tabla, sitar and Bollywood music",
                    "Henna/Mehendi artists & Saree drape demonstrations",
                    "Children's craft corner with diya painting & rangoli",
                ],
                "venue": "Dayton Convention Center, Downtown Dayton",
                "typical_timing": "Annual — Memorial Day Weekend",
            },
            {
                "slug": "diwali", "name": "Diwali", "tagline": "Festival of Lights",
                "description": "Light up the night with diyas, fireworks, performances and the warmth of community.",
                "image_url": "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "color": "#8B1A1A",
                "long_description": "Diwali is India Club's most beloved annual celebration — a magical evening that brings 1500+ community members together to mark the Festival of Lights.",
                "highlights": [
                    "Cultural showcase: 15+ dance & music performances",
                    "Traditional Indian dinner (vegetarian & non-vegetarian)",
                    "Diya lighting ceremony & Lakshmi Puja",
                    "Bazaar stalls — sarees, jewelry, sweets, handicrafts",
                    "Children's activities and Diwali photo booth",
                ],
                "venue": "Dayton Convention Center",
                "typical_timing": "Last weekend of October or first weekend of November",
            },
            {
                "slug": "rising-stars", "name": "Rising Stars", "tagline": "Showcasing Young Talent",
                "description": "A youth showcase celebrating dance, music, and dramatic arts from rising performers.",
                "image_url": "https://images.unsplash.com/photo-1716714620140-9ed26b67e900?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "color": "#C9A961",
                "long_description": "Rising Stars is ICGD's signature youth showcase celebrating the talent, dedication and creativity of our young community members aged 5–22.",
                "highlights": [
                    "Solo and group performances",
                    "Classical, semi-classical, fusion & Bollywood dance",
                    "Vocal performances — Hindustani, Carnatic, light music",
                    "Instrumental — sitar, tabla, violin, keyboard",
                    "Every performer receives a certificate of participation",
                ],
                "venue": "Sinclair Community College Auditorium",
                "typical_timing": "Spring (May)",
            },
            {
                "slug": "golden-jewels", "name": "Golden Jewels", "tagline": "Honoring Our Seniors",
                "description": "Programs and gatherings celebrating our elders — the golden jewels of our community.",
                "image_url": "https://images.unsplash.com/photo-1716714607603-8aa6a2f16d84?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "color": "#8B1A1A",
                "long_description": "Golden Jewels is a heartfelt program dedicated to our senior community members — the elders whose wisdom, stories and warmth are the soul of ICGD.",
                "highlights": [
                    "Monthly tea & antakshari evenings",
                    "Bhajan & devotional music sessions",
                    "Annual health awareness camp with local physicians",
                    "Day trips to museums, gardens and local attractions",
                    "Year-end Golden Jewels Gala honoring seniors 70+",
                ],
                "venue": "Hindu Temple of Dayton & rotating venues",
                "typical_timing": "Monthly + Annual Gala in April",
            },
            {
                "slug": "womens-connect", "name": "Women's Connect", "tagline": "Empower & Inspire",
                "description": "A platform for women to learn, lead and uplift one another through workshops and meetups.",
                "image_url": "https://images.unsplash.com/photo-1605302977140-6572a4421aef?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "color": "#E07A1F",
                "long_description": "Women's Connect is ICGD's empowerment platform — a space where women learn, lead, share stories, find mentors and uplift one another.",
                "highlights": [
                    "International Women's Day annual signature event",
                    "Quarterly leadership & career workshops",
                    "Wellness, fitness and yoga circles",
                    "New-mom support group & meet-ups",
                    "Networking dinners with women business leaders",
                ],
                "venue": "Centerville & online (hybrid format)",
                "typical_timing": "Monthly meet-ups + March 8 signature event",
            },
            {
                "slug": "sports", "name": "Sports", "tagline": "Cricket, Tennis & More",
                "description": "Tournaments, leagues and friendly matches that keep our community active and connected.",
                "image_url": "https://images.unsplash.com/photo-1468234847176-28606331216a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "color": "#C9A961",
                "long_description": "ICGD Sports brings the community together through the games we love. We organize year-round leagues, tournaments and family-friendly recreational events.",
                "highlights": [
                    "Cricket Premier League — annual six-team T10 tournament",
                    "Table tennis leagues (singles & doubles)",
                    "Badminton open & junior tournaments",
                    "Volleyball summer league",
                    "Yoga classes (weekly, all levels)",
                ],
                "venue": "Wegerzyn Gardens & local community centers",
                "typical_timing": "Year-round — major tournaments July–September",
            },
            {
                "slug": "picnic", "name": "Picnic", "tagline": "Summer Community Picnic",
                "description": "Sun, games and home-style food — the annual ICGD picnic brings everyone together.",
                "image_url": "https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "color": "#E07A1F",
                "long_description": "The ICGD Annual Summer Picnic is the warmest day on our calendar — a relaxed afternoon of cricket, antakshari, kids games, food and laughter.",
                "highlights": [
                    "Free entry for all India Club members and guests",
                    "Cricket and volleyball tournaments",
                    "Antakshari & kids' carnival games",
                    "Home-style Indian lunch served picnic-style",
                    "Live tambola (housie) for grown-ups",
                ],
                "venue": "Eastwood MetroPark, Dayton",
                "typical_timing": "Mid-July",
            },
            {
                "slug": "upcoming", "name": "Upcoming Events", "tagline": "Don't Miss What's Next",
                "description": "All confirmed events on the ICGD calendar — register and reserve your seat early.",
                "image_url": "https://images.unsplash.com/photo-1577083753695-e010191bacb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600",
                "color": "#8B1A1A",
                "long_description": "Here are all the confirmed upcoming events on the ICGD calendar. Register early — many events sell out, and members enjoy priority booking and discounted pricing.",
                "highlights": [
                    "Members get up to 50% off ticket prices",
                    "Children under 5 free at most events",
                    "Early-bird discounts available 30 days out",
                    "Volunteer to attend free + earn community service hours",
                ],
                "venue": "Various venues across Greater Dayton",
                "typical_timing": "Year-round",
            },
        ]
        await db.event_categories.insert_many([
            {"id": f"cat-{i}", **c, "order": (i + 1) * 10, "active": True, "created_at": datetime.utcnow()}
            for i, c in enumerate(cats)
        ])

    # ---- DIFI Awards ----
    if await db.difi_awards.count_documents({}) == 0:
        awards = [
            (2024, "Outstanding Cultural Showcase", "Diwali Mela performance"),
            (2023, "Best Multicultural Booth", "DIFI World Affairs Festival"),
            (2022, "Community Excellence Award", "Volunteer-led programming"),
            (2021, "Pandemic Response Recognition", "Virtual event innovation"),
            (2019, "Heritage Showcase Excellence", "Cultural diversity celebration"),
            (2017, "Best Performance Group", "Indian classical dance"),
        ]
        await db.difi_awards.insert_many([
            {"id": f"difi-{i}", "year": y, "title": t, "note": n, "order": (i + 1) * 10, "active": True, "created_at": datetime.utcnow()}
            for i, (y, t, n) in enumerate(awards)
        ])

    # ---- Constitution & Bylaws ----
    if await db.constitution_sections.count_documents({}) == 0:
        sections = [
            ("I", "Name and Location", [
                "1.1 The name of this non-profit 501(c)(3) organization shall be India Club of Greater Dayton (hereinafter referred to as India Club).",
                "1.2 The registered office of India Club shall be located in the greater Dayton area in the state of Ohio.",
            ]),
            ("II", "Objectives", [
                "2.1 To promote the welfare and assimilation of Asian Indians of greater Dayton and vicinity.",
                "2.2 To sustain and perpetuate the heritage and culture of India.",
                "2.3 To centralize resources, energies and talents for general betterment of Asian Indians.",
                "2.4 To promote educational, literacy, cultural and charitable activities.",
                "2.5 To disseminate information provided by other non-profit organizations.",
                "2.6 To raise funds for specified welfare projects.",
            ]),
            ("III", "Club Activities", [
                "3.1 The Club shall remain a non-partisan, secular, and non-sectarian organization.",
                "3.2 The Club shall not encourage any treasonous or seditious activity.",
                "3.4 The Club shall organize periodically cultural and social programs, charitable and scientific projects, concerts, seminars, and lectures.",
                "3.6 Any purchase of capital goods over $5,000 must be approved by the General Body.",
                "3.8 The Club shall meet its financial obligations through membership fees, special fund raising programs and donations.",
            ]),
            ("IV", "Membership", [
                "4.1 Any individual who subscribes to the objectives of the India Club can become a member.",
                "4.2 There shall be five classes of memberships: Family, Individual, Student, Institutional, Honorary.",
                "4.3 Annual and life membership dues will be decided by the E.C. every year.",
                "4.4 To be eligible to vote, a member must be in good standing — annual fees paid/renewed by March 15.",
                "4.5 Family members shall have two votes — one for the principal member and one for any other family member.",
            ]),
            ("V", "Fiscal Year", [
                "5.1 The fiscal year of the Club shall commence on the first day of January and end on the 31st day of December.",
            ]),
            ("VI", "Executive Committee", [
                "6.1 The E.C. shall consist of eleven members: President, President-elect, Secretary, Treasurer and seven members at large.",
                "6.2 Of the seven members at large, one shall hold the position of Delegate to International Festivals (DIFI) and at least two shall be youth aged 16–23.",
                "6.3 The E.C. shall meet at least nine times a year. Six members shall constitute the quorum.",
                "6.4 Members of the E.C. shall not receive any remuneration for their services.",
            ]),
            ("VII", "Responsibilities and Duties of Officers", [
                "PRESIDENT — Chief executive officer; presides over meetings; responsible for coordinating activities and public relations.",
                "PRESIDENT-ELECT — Acts in absence of the President; custodian of capital goods and equipment.",
                "SECRETARY — Recording officer; maintains minutes, member mailing addresses and voter list.",
                "TREASURER — Custody of all funds; maintains account books; publishes audited annual financial report.",
                "EX-OFFICIO — The previous year's President serves as Ex-officio member of the current E.C.",
            ]),
            ("VIII", "Nominations and Elections", [
                "8.1 A Nominating Committee is appointed by the President at least two months before the annual general body meeting.",
                "8.2 The N.C. is composed of five members; the outgoing President acts as Chairman.",
                "8.5 No individual shall serve on the E.C. for more than six consecutive years.",
                "8.8 Candidates are elected by a simple majority vote of voting members present at the meeting.",
            ]),
            ("IX", "Conduct of Meetings and Quorum", [
                "9.1 The annual general body meeting is held during the last quarter of fiscal year.",
                "9.2 Special meetings may be held upon a call of the E.C. or upon written request of 50+ members.",
                "9.5 Notice of meetings shall be sent to each voting member at least 15 days in advance.",
                "9.7 25% of all voting members shall form the quorum for a business or election meeting.",
            ]),
            ("X", "Amendments", [
                "10.1 Amendments may be proposed by the E.C. or by written request of at least 50 voting members.",
                "10.2 General information on proposed amendments shall be sent to members at least 15 days prior to the meeting.",
            ]),
            ("XI", "Dissolution", [
                "11.1 In the event of dissolution, any net assets shall be donated to secular, non-profit, charitable organizations meeting 501(c)(3) criteria.",
                "11.2 The assets will be frozen for one year to address unforeseen liabilities before donations are made.",
            ]),
        ]
        await db.constitution_sections.insert_many([
            {"id": f"const-{i}", "n": n, "title": t, "items": items, "order": (i + 1) * 10, "active": True, "created_at": datetime.utcnow()}
            for i, (n, t, items) in enumerate(sections)
        ])

