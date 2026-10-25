"""Role-based admin access: roles, path → area mapping, and admin user management."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from auth import decode_token, hash_password
from database import db
from models import gen_id

ROLES = {
    "webmaster": {"label": "Webmaster", "areas": ["*"]},
    "treasurer": {"label": "Treasurer", "areas": ["dashboard", "members", "tickets", "sponsors", "finance", "reports"]},
    "membership_chair": {"label": "Membership Chair", "areas": ["dashboard", "members", "reports"]},
    "event_coordinator": {"label": "Event Coordinator", "areas": ["dashboard", "events", "tickets", "checkin", "reports"]},
    "sponsorship_coordinator": {"label": "Sponsorship Coordinator", "areas": ["dashboard", "sponsors", "reports"]},
    "communications_lead": {"label": "Communications Lead", "areas": ["dashboard", "content"]},
    "volunteer": {"label": "Volunteer (check-in only)", "areas": ["checkin"]},
}

# First matching prefix wins (paths are relative to /api/admin)
AREA_PREFIXES = [
    ("/users", ["users"]),
    ("/members", ["members"]),
    ("/family-members", ["members"]),
    ("/perks", ["members"]),
    ("/membership-plans", ["members"]),
    ("/membership-promotions", ["members"]),
    ("/membership-applications", ["members"]),
    ("/check-in", ["checkin"]),
    ("/ticket-orders", ["tickets"]),
    ("/event-registrations", ["events", "tickets"]),
    ("/event-categories", ["events"]),
    ("/events", ["events"]),
    ("/sponsorships", ["sponsors"]),
    ("/sponsorship-plans", ["sponsors"]),
    ("/sponsorship-inquiries", ["sponsors"]),
    ("/sponsors", ["sponsors"]),
    ("/donors", ["sponsors", "finance"]),
    ("/donations", ["finance"]),
    ("/exports", ["reports"]),
    ("/reports", ["reports"]),
    ("/audit-log", ["reports"]),
    ("/stats", ["dashboard"]),
    ("/reminders", ["dashboard"]),
    ("/site-settings", ["content"]),
    ("/hero-slides", ["content"]),
    ("/feature-highlights", ["content"]),
    ("/testimonials", ["content"]),
    ("/site-stats", ["content"]),
    ("/difi-awards", ["content"]),
    ("/constitution", ["content"]),
    ("/news", ["content"]),
    ("/exec-team", ["content"]),
    ("/gallery", ["content"]),
    ("/programs", ["content"]),
    ("/past-presidents", ["content"]),
    ("/awardees", ["content"]),
    ("/tax-returns", ["content"]),
    ("/classifieds", ["content"]),
    ("/businesses", ["content"]),
    ("/contact-messages", ["content"]),
    ("/subscribers", ["content"]),
]


def areas_for_path(path: str, method: str) -> list:
    rel = path.split("/api/admin", 1)[-1] or "/"
    # Check-in volunteers need the event picker and live attendance counter
    if method == "GET" and (rel == "/events" or (rel.startswith("/events/") and rel.endswith(("/attendance", "/attendees")))):
        return ["events", "checkin"]
    for prefix, areas in AREA_PREFIXES:
        if rel == prefix or rel.startswith(prefix + "/"):
            return areas
    return ["webmaster-only"]


def role_areas(role: Optional[str]) -> list:
    return ROLES.get(role or "webmaster", ROLES["webmaster"])["areas"]


def can(role: Optional[str], *areas: str) -> bool:
    mine = role_areas(role)
    return "*" in mine or any(a in mine for a in areas)


async def current_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    username = decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="admin")
    if not username:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.admin_users.find_one({"username": username})
    if not user or user.get("disabled"):
        raise HTTPException(401, "Account not found or disabled")
    user.setdefault("role", "webmaster")  # accounts created before roles existed
    return user


async def admin_guard(request: Request, user: dict = Depends(current_admin)) -> str:
    """Router-level dependency: authenticates and checks the role may use this area."""
    if not can(user["role"], *areas_for_path(request.url.path, request.method)):
        raise HTTPException(403, f"Your role ({ROLES.get(user['role'], {}).get('label', user['role'])}) can't access this section")
    request.state.admin_user = user
    return user["username"]


# ===================== Admin users (webmaster only) =====================
router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_guard)])


class AdminUserIn(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: Optional[str] = Field(default=None, min_length=8)
    role: str = "volunteer"
    name: Optional[str] = ""
    disabled: bool = False


def _public(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("_id", "password_hash")} | {"role": u.get("role") or "webmaster"}


async def _webmaster_count(exclude_username: Optional[str] = None) -> int:
    users = await db.admin_users.find({"disabled": {"$ne": True}}).to_list(500)
    return sum(1 for u in users if (u.get("role") or "webmaster") == "webmaster" and u["username"] != exclude_username)


@router.get("/users/roles")
async def list_roles():
    return [{"value": k, "label": v["label"], "areas": v["areas"]} for k, v in ROLES.items()]


@router.get("/users")
async def list_users():
    return [_public(u) for u in await db.admin_users.find().sort("created_at", 1).to_list(500)]


@router.post("/users")
async def create_user(body: AdminUserIn):
    if body.role not in ROLES:
        raise HTTPException(400, "Unknown role")
    if not body.password:
        raise HTTPException(400, "Password is required (8+ characters)")
    username = body.username.strip().lower()
    if await db.admin_users.find_one({"username": username}):
        raise HTTPException(409, "Username already exists")
    doc = {
        "id": gen_id(), "username": username, "password_hash": hash_password(body.password),
        "role": body.role, "name": body.name or "", "disabled": body.disabled, "created_at": datetime.utcnow(),
    }
    await db.admin_users.insert_one(doc)
    return _public(doc)


@router.put("/users/{uid}")
async def update_user(uid: str, body: AdminUserIn, request: Request):
    u = await db.admin_users.find_one({"id": uid})
    if not u:
        raise HTTPException(404, "Not found")
    if body.role not in ROLES:
        raise HTTPException(400, "Unknown role")
    was_webmaster = (u.get("role") or "webmaster") == "webmaster"
    if was_webmaster and (body.role != "webmaster" or body.disabled) and await _webmaster_count(u["username"]) == 0:
        raise HTTPException(400, "Keep at least one active Webmaster")
    update = {"role": body.role, "name": body.name or "", "disabled": body.disabled}
    if body.password:
        update["password_hash"] = hash_password(body.password)
    await db.admin_users.update_one({"id": uid}, {"$set": update})
    return _public(await db.admin_users.find_one({"id": uid}))


@router.delete("/users/{uid}")
async def delete_user(uid: str, request: Request):
    u = await db.admin_users.find_one({"id": uid})
    if not u:
        raise HTTPException(404, "Not found")
    if u["username"] == request.state.admin_user["username"]:
        raise HTTPException(400, "You can't delete your own account")
    if (u.get("role") or "webmaster") == "webmaster" and await _webmaster_count(u["username"]) == 0:
        raise HTTPException(400, "Keep at least one active Webmaster")
    await db.admin_users.delete_one({"id": uid})
    return {"ok": True}
