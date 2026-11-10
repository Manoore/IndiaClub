"""Import the old Joomla site (indiaclubdayton.org) into the new app.

Usage (from backend/, with MONGO_URL and DB_NAME set in your own shell or .env):
    python import_legacy.py path/to/dump.sql            # dry run: reads the target DB, writes nothing, prints a report
    python import_legacy.py path/to/dump.sql --write    # imports, then removes the 14 sample records

Safe to run again: every record carries legacy_source ("<old table>#<old id>") and is skipped if already there.
Members are matched by email; an existing account keeps its password and profile, and its membership is only
replaced when the old one ends later.

What comes over (decisions agreed 2026-11-10):
  users + osmembership_subscribers -> members (one per email; registered-only users become Free members;
                                      blocked users without a current membership are skipped)
  old password hashes ($2y$ bcrypt) -> accepted at login, upgraded on first sign-in (see auth.verify_password)
  every subscription               -> membership_history
  spouse/children form fields      -> family_members (approved, within the household cap)
  eb_events (+ ticket types)       -> events (past events; same-day event with the same title merges into the new one)
  eb_registrants (+ tickets)       -> ticket_orders (paid or cancelled; abandoned ones skipped)
  cmdonation_donations COMPLETED   -> donations
  acymailing_subscriber confirmed  -> subscribers
  phocagallery                     -> gallery (links to the old site's images)
  Platinum/Gold/Silver/Bronze Sponsorship subscriptions -> sponsorships
Not imported: expired 2019 classifieds, static pages, contact-form log (spam), traffic and search logs,
sponsors/board (already entered).
"""
import argparse
import asyncio
import collections
import html
import logging
import re
import secrets
import sys
from datetime import datetime

OLD = "https://www.indiaclubdayton.org/"
P = "q9gdn_"
TABLES = {
    "users", "osmembership_subscribers", "osmembership_field_value", "osmembership_plans",
    "eb_events", "eb_locations", "eb_categories", "eb_ticket_types", "eb_registrants", "eb_registrant_tickets",
    "cmdonation_donations", "acymailing_subscriber", "phocagallery", "phocagallery_categories",
}
log = logging.getLogger("import_legacy")

# Old plan id -> (plan, tier)
PLAN_MAP = {
    "1": ("regular", "individual"), "2": ("regular", "family"), "15": ("regular", "family"),
    "3": ("regular", "student"), "4": ("business", "business"),
    "12": ("extended", "silver"), "13": ("extended", "gold"),
    "11": ("lifetime", None), "14": ("lifetime", None),
}
SPONSOR_PLANS = {"5": "platinum", "6": "gold", "7": "silver", "8": "bronze"}
PAY = {"os_offline": "check", "os_paypal": "paypal", "os_paypal_pro": "paypal", "os_paypal Pro": "paypal"}
# osmembership_fields ids
F_GENDER, F_SPOUSE, F_SCHOOL, F_DEGREE = "33", "15", "29", "30"
CHILDREN = [("18", "34"), ("20", "35"), ("21", "36"), ("22", "37")]  # (name, date of birth)
CATEGORY_WORDS = [
    ("diwali", "Diwali"), ("rising star", "Rising Stars"), ("golden jewel", "Golden Jewels"), ("senior", "Golden Jewels"),
    ("women", "Women's Connect"), ("picnic", "Picnic"), ("difi", "DIFI"), ("cricket", "Sports"),
    ("pickleball", "Sports"), ("tennis", "Sports"), ("volleyball", "Sports"), ("badminton", "Sports"),
    ("walk", "Sports"), ("run", "Sports"), ("republic", "Republic Day"), ("independence", "Independence Day"),
    ("holi", "Holi"),
]


# ---------- reading the dump ----------
def _parse_values(s: str, i: int) -> list:
    rows, n = [], len(s)
    while i < n:
        c = s[i]
        if c == "(":
            row = []
            i += 1
            while True:
                while s[i] in " \n\r\t":
                    i += 1
                if s[i] == "'":
                    i += 1
                    buf = []
                    while True:
                        c = s[i]
                        if c == "\\":
                            buf.append({"n": "\n", "r": "\r", "t": "\t", "0": "\0"}.get(s[i + 1], s[i + 1]))
                            i += 2
                        elif c == "'" and s[i + 1] == "'":
                            buf.append("'")
                            i += 2
                        elif c == "'":
                            i += 1
                            break
                        else:
                            buf.append(c)
                            i += 1
                    row.append("".join(buf))
                else:
                    j = i
                    while s[j] not in ",)":
                        j += 1
                    tok = s[i:j].strip()
                    i = j
                    row.append(None if tok == "NULL" else tok)
                while s[i] in " \n\r\t":
                    i += 1
                if s[i] == ",":
                    i += 1
                    continue
                i += 1  # ')'
                break
            rows.append(row)
        elif c == ";":
            break
        else:
            i += 1
    return rows


def read_dump(path: str) -> dict:
    """{table: [row dicts]} for the tables the import needs (prefix stripped)."""
    schemas, data = {}, collections.defaultdict(list)
    cur, cols, buf, table = None, [], None, None
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            m = re.match(r"CREATE TABLE `([^`]+)`", line)
            if m:
                cur, cols = m.group(1), []
                continue
            if cur:
                m = re.match(r"\s+`([^`]+)` ", line)
                if m:
                    cols.append(m.group(1))
                if line.startswith(")"):
                    schemas[cur], cur = cols, None
                continue
            if buf is None:
                m = re.match(r"INSERT INTO `([^`]+)`", line)
                if not (m and m.group(1).startswith(P) and m.group(1)[len(P):] in TABLES):
                    continue
                table, buf = m.group(1), [line]
            else:
                buf.append(line)
            if not line.rstrip().endswith(";"):
                continue
            s, buf = "".join(buf), None
            hdr = re.match(r"INSERT INTO `[^`]+` \(([^)]*)\) VALUES", s)
            names = [x.strip(" `") for x in hdr.group(1).split(",")] if hdr else schemas[table]
            data[table[len(P):]].extend(dict(zip(names, r)) for r in _parse_values(s, s.index("VALUES") + 6))
    return data


# ---------- helpers ----------
def _dt(s):
    if not s or s.startswith("0000"):
        return None
    try:
        return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def _email(s) -> str:
    return (s or "").strip().lower()


def _clean(s) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip()


def _text(h: str) -> str:
    """HTML -> plain text with paragraph breaks; drops embedded images."""
    h = re.sub(r"<img[^>]*>", "", h or "")
    h = re.sub(r"(?i)<br\s*/?>|</p>|</li>|</h\d>|</div>", "\n", h)
    h = re.sub(r"(?i)<li[^>]*>", "- ", h)
    h = html.unescape(re.sub(r"<[^>]+>", "", h)).replace("\xa0", " ").replace("�", " ")
    lines = [re.sub(r"[ \t]+", " ", x).strip() for x in h.split("\n")]
    out = re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
    return out


def _first_image(*htmls) -> str:
    for h in htmls:
        for src in re.findall(r"<img[^>]+src=\"([^\"]+)\"", h or ""):
            if not src.startswith("data:"):
                return src if src.startswith("http") else OLD + src.lstrip("/")
    return ""


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def _fmt_time(d: datetime) -> str:
    return d.strftime("%I:%M %p").lstrip("0")


def _category(title: str, old_cat: str) -> str:
    t = title.lower()
    for word, cat in CATEGORY_WORDS:
        if word in t:
            return cat
    return old_cat or "Community"


def _legacy_check(hashed: str) -> bool:
    return (hashed or "").startswith(("$2y$", "$2a$", "$2b$"))


# ---------- building records ----------
class Importer:
    def __init__(self, data: dict, now: datetime):
        self.d, self.now = data, now
        self.report = collections.Counter()
        self.notes = []

    def build(self) -> dict:
        from auth import hash_password
        from family_tickets import new_ticket_code
        from membership_rules import HOUSEHOLD_SIZE, default_settings
        from models import gen_id
        from sponsorships import new_sponsor_code
        self.gen_id, self.ticket_code, self.sponsor_code = gen_id, new_ticket_code, new_sponsor_code
        self.hash = hash_password
        self.household, self.defaults = HOUSEHOLD_SIZE, default_settings
        out = collections.defaultdict(list)
        self._members(out)
        self._events(out)
        self._orders(out)
        self._donations(out)
        self._subscribers(out)
        self._gallery(out)
        return out

    def _members(self, out):
        d, now = self.d, self.now
        plans = {p["id"]: p["title"] for p in d["osmembership_plans"]}
        users_by_id = {u["id"]: u for u in d["users"]}
        users_by_email = {_email(u["email"]): u for u in d["users"]}
        fields = collections.defaultdict(dict)
        for v in d["osmembership_field_value"]:
            fields[v["subscriber_id"]][v["field_id"]] = (v["field_value"] or "").strip()
        subs_by_email = collections.defaultdict(list)
        for s in d["osmembership_subscribers"]:
            subs_by_email[_email(s["email"]) or _email(users_by_id.get(s["user_id"], {}).get("email"))].append(s)
        subs_by_email.pop("", None)
        self.member_ids = {}

        for email in sorted(set(subs_by_email) | set(users_by_email)):
            if not email or "@" not in email:
                continue
            subs = sorted(subs_by_email.get(email, []), key=lambda s: (s["to_date"] or "", s["id"]))
            user = users_by_email.get(email) or next((users_by_id[s["user_id"]] for s in subs if s["user_id"] in users_by_id), None)
            member_subs = [s for s in subs if s["plan_id"] in PLAN_MAP and s["published"] in ("1", "2")]
            latest = member_subs[-1] if member_subs else None
            current = bool(latest and latest["published"] == "1" and (latest["to_date"] or "") >= now.strftime("%Y-%m-%d"))
            if user and user.get("block") == "1" and not current:
                self.report["members skipped (blocked)"] += 1
                continue
            src = (latest or (subs[-1] if subs else None)) or {}
            name = _clean(user["name"]) if user else ""
            first = _clean(src.get("first_name")) or (name.split(" ")[0] if name else email.split("@")[0])
            last = _clean(src.get("last_name")) or (" ".join(name.split(" ")[1:]) if name else "")
            member_id = self.gen_id()
            self.member_ids[email] = member_id
            f = fields.get((latest or {}).get("id"), {})
            pw = user["password"] if user and _legacy_check(user.get("password")) else self.hash(secrets.token_urlsafe(24))
            if latest:
                plan, tier = PLAN_MAP[latest["plan_id"]]
                lifetime = plan == "lifetime"
                status = "active" if current else "expired"
                membership = {
                    "plan": plan, "tier": tier, "status": status, "lifetime": lifetime,
                    "school_name": f.get(F_SCHOOL) or None, "degree_program": f.get(F_DEGREE) or None,
                    "donation_amount": 0, "payment_method": PAY.get(latest["payment_method"], "other"),
                    "payment_status": "paid", "family_count": 1,
                    "submitted_at": _dt(latest["created_date"]), "paid_at": _dt(latest["payment_date"]) or _dt(latest["created_date"]),
                    "start_date": _dt(latest["from_date"]), "end_date": None if lifetime else _dt(latest["to_date"]),
                    "approved_at": _dt(latest["payment_date"]) or _dt(latest["created_date"]), "approved_by": "legacy-import",
                    "term_kind": "renewal" if latest.get("act") == "renew" else "new",
                    "term_rule": "lifetime" if lifetime else "standard",
                }
                if latest["plan_id"] == "14":
                    membership["note"] = "Platinum Membership (ages 70+) on the old site"
                self.report[f"members: {plans.get(latest['plan_id'], '?').strip()} ({status})"] += 1
            else:
                membership = {"plan": "free", "tier": None, "status": "active", "lifetime": False,
                              "payment_method": "none", "family_count": 1, "submitted_at": _dt(user["registerDate"]) if user else None,
                              "start_date": _dt(user["registerDate"]) if user else None, "end_date": None}
                self.report["members: Free (registered only)"] += 1
            starts = [x for x in (_dt(s["from_date"]) for s in subs) if x] + ([_dt(user["registerDate"])] if user and _dt(user["registerDate"]) else [])
            doc = {
                "id": member_id, "email": email, "password_hash": pw,
                "first_name": first or "Member", "last_name": last or "-",
                "gender": f.get(F_GENDER) or None, "phone": _clean(src.get("phone")) or None,
                "phone_alt": _clean(src.get("fax")) or None, "address": _clean(src.get("address")) or None,
                "address2": _clean(src.get("address2")) or None, "city": _clean(src.get("city")) or None,
                "state": _clean(src.get("state")) or None, "zip": _clean(src.get("zip")) or None,
                "country": _clean(src.get("country")) or "United States",
                "membership": membership, "joined_at": min(starts) if starts else None,
                "legacy_user_id": user["id"] if user else None,
                "legacy_membership_id": (latest or {}).get("membership_id"),
                "legacy_source": f"users#{user['id']}" if user else f"osmembership_subscribers#{src.get('id')}",
                "created_at": now, "updated_at": now,
            }
            out["members"].append(doc)

            # Family from the latest subscription's form
            if latest and (membership["lifetime"] or self.defaults(membership["plan"], membership["tier"])["includes_family"]):
                people = []
                if f.get(F_SPOUSE):
                    people.append(("spouse", f[F_SPOUSE], None))
                for name_id, dob_id in CHILDREN:
                    if f.get(name_id):
                        dob = f.get(dob_id) or ""
                        people.append(("child", f[name_id], dob[:10] if re.match(r"\d{4}-\d{2}-\d{2}", dob) else None))
                for n, (rel, pname, dob) in enumerate(people[: self.household - 1]):
                    out["family_members"].append({
                        "id": self.gen_id(), "member_id": member_id, "name": _clean(pname), "relation": rel,
                        "date_of_birth": dob, "status": "approved", "admin_note": "From old site",
                        "legacy_source": f"osmembership_field_value#{latest['id']}:{n}", "created_at": now,
                    })
                doc["membership"]["family_count"] = 1 + min(len(people), self.household - 1)

            for s in subs:
                if s["plan_id"] in SPONSOR_PLANS and s["published"] in ("1", "2"):
                    self._sponsorship(out, s, email)
                out["membership_history"].append({
                    "id": self.gen_id(), "member_id": member_id, "action": "legacy_subscription", "actor": "legacy-import",
                    "plan": plans.get(s["plan_id"], s["plan_id"]).strip(), "from_date": _dt(s["from_date"]),
                    "to_date": _dt(s["to_date"]), "amount": float(s["amount"] or 0),
                    "payment_method": PAY.get(s["payment_method"], s["payment_method"] or "other"),
                    "old_status": {"0": "pending", "1": "active", "2": "expired", "4": "cancelled"}.get(s["published"], s["published"]),
                    "legacy_source": f"osmembership_subscribers#{s['id']}", "created_at": _dt(s["created_date"]) or now,
                })

    def _sponsorship(self, out, s, email):
        level = SPONSOR_PLANS[s["plan_id"]]
        active = s["published"] == "1" and (s["to_date"] or "") >= self.now.strftime("%Y-%m-%d")
        out["sponsorships"].append({
            "id": self.gen_id(), "company": _clean(s.get("organization")) or _clean(f"{s['first_name']} {s['last_name']}"),
            "contact_name": _clean(f"{s['first_name']} {s['last_name']}"), "email": email, "phone": _clean(s.get("phone")),
            "website": "", "plan": level, "tier": level.title(), "amount": float(s["amount"] or 0), "logo_url": "",
            "message": "", "payment_method": PAY.get(s["payment_method"], "other"), "payment_status": "paid",
            "status": "active" if active else "expired", "is_renewal": False, "previous_id": None,
            "sponsor_code": self.sponsor_code(), "named_people": [],
            "start_date": _dt(s["from_date"]), "end_date": _dt(s["to_date"]), "paid_at": _dt(s["payment_date"]),
            "paid_by": "legacy-import", "legacy_source": f"osmembership_subscribers#{s['id']}",
            "created_at": _dt(s["created_date"]) or self.now, "updated_at": self.now,
        })
        self.report["sponsorships"] += 1

    def _events(self, out):
        d = self.d
        locs = {l["id"]: l for l in d["eb_locations"]}
        cats = {c["id"]: c["name"] for c in d["eb_categories"]}
        types = collections.defaultdict(list)
        for t in d["eb_ticket_types"]:
            types[t["event_id"]].append(t)
        paid_events = {r["event_id"] for r in d["eb_registrants"] if r["published"] == "1"}
        self.events, self.ticket_ids = {}, {}
        for e in d["eb_events"]:
            if e["published"] != "1" and e["id"] not in paid_events:
                continue
            start, end = _dt(e["event_date"]), _dt(e["event_end_date"])
            if not start:
                continue
            loc = locs.get(e["location_id"]) or {}
            venue = ", ".join(x for x in (_clean(loc.get("name")), _clean(loc.get("address"))) if x) or None
            tts = []
            for n, t in enumerate(sorted(types.get(e["id"], []), key=lambda t: int(t["ordering"] or 0))):
                tid = self.gen_id()
                self.ticket_ids[t["id"]] = (tid, _clean(t["title"]), float(t["price"] or 0))
                tts.append({"id": tid, "name": _clean(t["title"]), "description": _clean(t["description"]),
                            "price": float(t["price"] or 0), "member_price": None, "members_only": False,
                            "sale_start": None, "sale_end": e["cut_off_date"][:16].replace(" ", "T") if _dt(e["cut_off_date"]) else None,
                            "quantity_total": int(t["capacity"] or 0), "quantity_sold": 0, "order": n + 1,
                            "legacy_source": f"eb_ticket_types#{t['id']}"})
            if not tts:
                tid = self.gen_id()
                self.ticket_ids[f"event{e['id']}"] = (tid, "Registration", float(e["individual_price"] or 0))
                tts.append({"id": tid, "name": "Registration", "description": "", "price": float(e["individual_price"] or 0),
                            "member_price": None, "members_only": False, "quantity_total": 0, "quantity_sold": 0, "order": 1})
            title = _clean(e["title"]).replace(" - ", " ")
            doc = {
                "id": self.gen_id(), "title": title, "slug": f"{_norm(e['alias'] or title)[:60]}-{e['id']}",
                "category": _category(title, cats.get(e["main_category_id"], "")),
                "date": start.strftime("%B %-d, %Y") if sys.platform != "win32" else start.strftime("%B %#d, %Y"),
                "time": f"{_fmt_time(start)} – {_fmt_time(end)}" if end else _fmt_time(start),
                "venue": venue, "description": _text(e["short_description"])[:300],
                "long_description": _text((e["short_description"] or "") + "\n" + (e["description"] or "")),
                "image_url": _first_image(e.get("thumb") and f'<img src="media/com_eventbooking/images/{e["thumb"]}">',
                                          e["short_description"], e["description"]) or None,
                "highlights": [], "registration_open": False, "featured": False, "color": "#8B1A1A",
                "event_format": "in_person", "start_date": start.strftime("%Y-%m-%dT%H:%M"),
                "end_date": end.strftime("%Y-%m-%dT%H:%M") if end else None,
                "ticket_types": tts, "promo_codes": [], "price_periods": [], "sponsor_perks": {},
                "donations_enabled": False, "fee_mode": "absorb", "fee_percent": 3.0, "fee_fixed": 0.30, "capacity": 0,
                "legacy_source": f"eb_events#{e['id']}", "created_at": _dt(e.get("created_date")) or self.now,
            }
            self.events[e["id"]] = doc
            out["events"].append(doc)
        self.report["events"] = len(self.events)

    def _orders(self, out):
        regs = self.d["eb_registrants"]
        by_group = collections.defaultdict(list)
        for r in regs:
            if r["group_id"] not in (None, "0"):
                by_group[r["group_id"]].append(r)
        tickets_by_reg = collections.defaultdict(list)
        for t in self.d["eb_registrant_tickets"]:
            tickets_by_reg[t["registrant_id"]].append(t)
        for r in regs:
            if r["group_id"] not in (None, "0"):
                continue  # attendee row of a group; handled with its billing row
            ev = self.events.get(r["event_id"])
            if not ev:
                continue
            group = by_group.get(r["id"], [])
            states = {r["published"]} | {g["published"] for g in group}
            if "1" in states:
                status = "paid"
            elif "2" in states:
                status = "cancelled"
            else:
                self.report["orders skipped (never paid)"] += 1
                continue
            buyer = _clean(f"{r['first_name']} {r['last_name']}")
            email = _email(r["email"]) or next((_email(g["email"]) for g in group if _email(g["email"])), "")
            # ticket lines: (ticket_type_id, name, price) per ticket
            lines = []
            # A group's tickets sit on its billing row; attendee rows repeat them, so use those only as a fallback
            rows = tickets_by_reg[r["id"]] or [t for g in group for t in tickets_by_reg[g["id"]]]
            for t in rows:
                tt = self.ticket_ids.get(t["ticket_type_id"])
                if tt:
                    lines += [tt] * int(t["quantity"] or 1)
            if not lines:
                default = self.ticket_ids.get(f"event{r['event_id']}") or (ev["ticket_types"][0]["id"], ev["ticket_types"][0]["name"], ev["ticket_types"][0]["price"])
                lines = [default] * max(1, int(r["number_registrants"] or 1))
            names = [_clean(f"{g['first_name']} {g['last_name']}") for g in group] or [buyer]
            tickets, agg = [], {}
            for n, (tid, tname, price) in enumerate(lines):
                agg.setdefault(tid, {"ticket_type_id": tid, "ticket_type_name": tname, "unit_price": price, "quantity": 0})["quantity"] += 1
                tickets.append({"code": self.ticket_code(), "ticket_type_id": tid, "ticket_type_name": tname,
                                "attendee_name": names[n] if n < len(names) else buyer, "kind": "guest",
                                "category": "non_member", "reason": "", "family_member_id": None, "sponsor_person_id": None,
                                "age_band": "adult", "price": price,
                                "checked_in_at": _dt(r.get("checked_in_at")) if r.get("checked_in") == "1" else None})
            if status == "paid":
                for t in ev["ticket_types"]:
                    t["quantity_sold"] += sum(1 for x in tickets if x["ticket_type_id"] == t["id"])
            total = float(r["amount"] or r["total_amount"] or 0)
            out["ticket_orders"].append({
                "id": self.gen_id(), "event_id": ev["id"], "event_title": ev["title"],
                "member_id": self.member_ids.get(email), "buyer_name": buyer or email, "buyer_email": email or "unknown@example.com",
                "buyer_phone": _clean(r["phone"]) or None, "items": list(agg.values()), "tickets": tickets,
                "period": None, "subtotal": float(r["total_amount"] or 0), "discount": float(r["discount_amount"] or 0),
                "promo_code": None, "membership_purchase": None, "donation": None, "fee_contribution": 0, "total": total,
                "payment_method": PAY.get(r["payment_method"], "other") if total else "none", "payment_status": status,
                "notes": "Imported from old site", "legacy_code": r.get("ticket_code") or r.get("ticket_qrcode"),
                "legacy_source": f"eb_registrants#{r['id']}", "created_at": _dt(r["register_date"]) or self.now, "updated_at": self.now,
            })
            self.report[f"orders ({status})"] += 1
            self.report["tickets"] += len(tickets)

    def _donations(self, out):
        for x in self.d["cmdonation_donations"]:
            if x["status"] != "COMPLETED":
                continue
            out["donations"].append({
                "id": self.gen_id(), "name": _clean(f"{x['first_name']} {x['last_name']}") or "Donor",
                "email": _email(x["email"]) or "unknown@example.com", "amount": float(x["amount"] or 0),
                "message": "Donated on the old site", "payment_method": x["payment_method_id"] or "paypal",
                "anonymous": x.get("anonymous") == "1", "payment_status": "paid", "source": "legacy",
                "member_id": self.member_ids.get(_email(x["email"])),
                "legacy_source": f"cmdonation_donations#{x['id']}", "created_at": _dt(x["completed"]) or _dt(x["created"]) or self.now,
            })
        self.report["donations"] = len(out["donations"])

    def _subscribers(self, out):
        seen = set()
        for x in self.d["acymailing_subscriber"]:
            e = _email(x["email"])
            if x["enabled"] != "1" or x["confirmed"] != "1" or not e or e in seen or "@" not in e:
                continue
            seen.add(e)
            out["subscribers"].append({"id": self.gen_id(), "email": e, "name": _clean(x["name"]) or None,
                                       "subscribed_at": datetime.utcfromtimestamp(int(x["created"] or 0)) if (x["created"] or "0").isdigit() and int(x["created"] or 0) else self.now,
                                       "legacy_source": f"acymailing_subscriber#{x['subid']}"})
        self.report["newsletter subscribers"] = len(out["subscribers"])

    def _gallery(self, out):
        cats = {c["id"]: c for c in self.d["phocagallery_categories"]}
        for p in self.d["phocagallery"]:
            if p["published"] != "1" or p["approved"] != "1" or not p["filename"]:
                continue
            c = cats.get(p["catid"]) or {}
            parent = cats.get(c.get("parent_id")) or {}
            album = _clean(c.get("title")) or "General"
            if re.fullmatch(r"\d{4}", _clean(parent.get("title"))):
                album = f"{album} {parent['title']}"
            url = OLD + "images/phocagallery/" + "/".join(
                re.sub(r"[ ]", "%20", part) for part in p["filename"].split("/"))
            out["gallery"].append({"id": self.gen_id(), "title": _clean(p["title"]).replace("_", " ").replace("-", " "),
                                   "image_url": url, "album": album, "legacy_source": f"phocagallery#{p['id']}",
                                   "created_at": _dt(p["date"]) or self.now})
        self.report["gallery photos (linked)"] = len(out["gallery"])


# ---------- writing ----------
SAMPLE_COLLECTIONS = ["events", "members", "family_members", "ticket_orders", "donations", "sponsorships", "sponsors",
                      "businesses", "classifieds", "gallery", "news", "subscribers", "contact_messages"]


async def write(db, out: dict, imp: Importer, apply: bool) -> collections.Counter:
    stats = collections.Counter()
    if apply:
        for c in SAMPLE_COLLECTIONS:
            r = await db[c].delete_many({"legacy_sample": True})
            stats[f"samples removed from {c}"] += r.deleted_count
        await db.migration_flags.update_one({"id": "legacy_samples_v1"}, {"$set": {"id": "legacy_samples_v1"}}, upsert=True)

    # Members: match by email. Existing accounts keep login/profile; take the old membership if it ends later.
    remap = {}
    for m in out["members"]:
        existing = await db.members.find_one({"email": m["email"]})
        if not existing:
            stats["members new"] += 1
            if apply:
                await db.members.insert_one(m)
            continue
        remap[m["id"]] = existing["id"]
        old_mem, cur = m["membership"], existing.get("membership") or {}
        later = not cur.get("lifetime") and old_mem.get("plan") != "free" and (
            old_mem.get("lifetime")
            or (old_mem.get("status") == "active" and cur.get("status") != "active")
            or (old_mem.get("status") == cur.get("status")
                and (old_mem.get("end_date") or datetime.min) > (cur.get("end_date") or datetime.min)))
        stats["members matched existing account" + (" (membership updated)" if later else "")] += 1
        if apply:
            upd = {"legacy_user_id": m["legacy_user_id"], "legacy_membership_id": m["legacy_membership_id"],
                   "legacy_source": m["legacy_source"]}
            if later:
                upd["membership"] = old_mem
            if not existing.get("joined_at") and m.get("joined_at"):
                upd["joined_at"] = m["joined_at"]
            for k in ("phone", "address", "city", "state", "zip", "gender"):
                if not existing.get(k) and m.get(k):
                    upd[k] = m[k]
            await db.members.update_one({"id": existing["id"]}, {"$set": upd})

    for coll in ("family_members", "membership_history"):
        for x in out[coll]:
            x["member_id"] = remap.get(x["member_id"], x["member_id"])
    for coll in ("ticket_orders", "donations"):
        for x in out[coll]:
            if x.get("member_id"):
                x["member_id"] = remap.get(x["member_id"], x["member_id"])

    # Events: a new-site event on the same day with the same title takes the old one's orders
    event_remap = {}
    for e in out["events"]:
        day = e["start_date"][:10]
        cands = await db.events.find({"start_date": {"$regex": f"^{day}"}, "legacy_source": {"$exists": False}}).to_list(20)
        match = next((c for c in cands if _norm(c.get("title")) == _norm(e["title"])), None)
        if match:
            event_remap[e["id"]] = match
            stats["events merged into existing"] += 1
    for o in out["ticket_orders"]:
        target = event_remap.get(o["event_id"])
        if target:
            o["event_id"] = target["id"]
            o["event_title"] = target["title"]
    if apply:
        for old_id, target in event_remap.items():
            e = next(x for x in out["events"] if x["id"] == old_id)
            if await db.events.find_one({"id": target["id"], "legacy_merged_from": e["legacy_source"]}):
                continue
            # Kept for the imported orders and check-in only: sold out and off sale, so nobody can buy them here
            extra = [dict(t, name=f"{t['name']} (old site)", quantity_total=max(1, t["quantity_sold"]),
                          sale_end="2000-01-01T00:00") for t in e["ticket_types"]]
            for o in out["ticket_orders"]:
                for it in o["items"]:
                    if it["ticket_type_id"] in {t["id"] for t in extra}:
                        it["ticket_type_name"] += " (old site)"
                for t in o["tickets"]:
                    if t["ticket_type_id"] in {x["id"] for x in extra}:
                        t["ticket_type_name"] += " (old site)"
            await db.events.update_one({"id": target["id"]}, {"$push": {"ticket_types": {"$each": extra}},
                                                               "$set": {"legacy_merged_from": e["legacy_source"]}})

    for coll in ("events", "family_members", "membership_history", "ticket_orders", "donations", "sponsorships",
                 "subscribers", "gallery"):
        for x in out[coll]:
            if coll == "events" and x["id"] in event_remap:
                continue
            if await db[coll].find_one({"legacy_source": x["legacy_source"]}, {"_id": 1}):
                stats[f"{coll} already imported"] += 1
                continue
            if coll == "subscribers" and await db.subscribers.find_one({"email": x["email"]}, {"_id": 1}):
                stats["subscribers already on list"] += 1
                continue
            stats[f"{coll} new"] += 1
            if apply:
                await db[coll].insert_one(x)
    if apply:
        await db.migration_flags.update_one({"id": "legacy_import_v1"}, {"$set": {"id": "legacy_import_v1", "at": datetime.utcnow()}}, upsert=True)
    return stats


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dump")
    ap.add_argument("--write", action="store_true", help="import for real (default is a dry run)")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    print(f"Reading {args.dump} ...")
    data = read_dump(args.dump)
    imp = Importer(data, datetime.utcnow())
    out = imp.build()
    print("\nFrom the old site:")
    for k, v in sorted(imp.report.items()):
        print(f"  {k}: {v}")
    import os
    if not os.environ.get("MONGO_URL", "").strip().startswith("mongodb"):
        # Asked here (hidden, nothing echoed or saved) so the shell can't mangle & or quotes in the link
        import getpass
        os.environ["MONGO_URL"] = getpass.getpass("\nPaste MONGO_URL from Render (hidden), then press Enter: ").strip().strip('"“”')
    if not os.environ.get("DB_NAME"):
        os.environ["DB_NAME"] = input("DB_NAME from Render: ").strip()
    print(f"Database: {os.environ['DB_NAME']}")
    from database import db
    stats = await write(db, out, imp, apply=args.write)
    print("\n" + ("Written:" if args.write else "Dry run (nothing written). Would do:"))
    for k, v in sorted(stats.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    asyncio.run(main())
