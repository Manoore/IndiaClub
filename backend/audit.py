"""Administrative audit trail: who changed prices, discounts, fee settings or registrations, and when."""
from datetime import datetime
from typing import Optional

from database import db
from models import gen_id

# Keys that never need recording (bookkeeping, counters, timestamps)
IGNORED_KEYS = {"_id", "updated_at", "created_at"}


def _changed(before: dict, after: dict) -> dict:
    keys = (set(before) | set(after)) - IGNORED_KEYS
    return {k: {"from": before.get(k), "to": after.get(k)} for k in sorted(keys) if before.get(k) != after.get(k)}


async def audit(actor: str, entity: str, entity_id: str, action: str,
                before: Optional[dict] = None, after: Optional[dict] = None, note: str = "") -> None:
    changes = _changed(before or {}, after or {}) if (before is not None or after is not None) else {}
    if action == "update" and not changes and not note:
        return
    await db.audit_log.insert_one({
        "id": gen_id(), "at": datetime.utcnow(), "actor": actor or "system",
        "entity": entity, "entity_id": entity_id, "action": action, "changes": changes, "note": note,
    })
