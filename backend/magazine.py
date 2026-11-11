"""Vibrant Dayton, the club's digital magazine.

An issue has a cover, an intro, an optional PDF (or a link to read it elsewhere) and web articles.
Anyone can see covers, intros and article summaries; the full articles and the PDF need a member
sign-in (a free account is enough).
"""
import base64
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Response

from auth import decode_token
from database import db

public_router = APIRouter(prefix="/api/magazine")

ARTICLE_CATEGORIES = ["Community", "Business Spotlight", "Youth", "Culture", "Food & Recipes", "Health", "Events", "Other"]
TEASER_PARAGRAPHS = 2
ISSUE_PUBLIC = ("id", "slug", "title", "issue_date", "cover_url", "intro", "featured", "external_url", "published_at")
ARTICLE_LIST = ("id", "slug", "title", "author", "category", "summary", "cover_url", "issue_id", "order", "published_at",
                "business_slug")


def _member_id(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return decode_token(authorization.split(" ", 1)[1].strip(), expected_typ="member")


async def _signed_in(authorization: Optional[str]) -> bool:
    mid = _member_id(authorization)
    return bool(mid and await db.members.find_one({"id": mid}, {"_id": 1}))


def _pick(d: dict, keys) -> dict:
    return {k: d.get(k) for k in keys}


def _paragraphs(body: str) -> list:
    return [p for p in re.split(r"\n\s*\n", (body or "").strip()) if p.strip()]


async def _slugify(coll: str, title: str, own_id: Optional[str]) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")[:70] or "item"
    slug, n = base, 2
    while await db[coll].find_one({"slug": slug, "id": {"$ne": own_id}}, {"_id": 1}):
        slug, n = f"{base}-{n}", n + 1
    return slug


async def ensure_magazine_slugs():
    """Give issues and articles a web address, and stamp the first publish date (after admin saves)."""
    now = datetime.utcnow()
    for coll in ("magazine_issues", "magazine_articles"):
        async for d in db[coll].find({}):
            upd = {}
            if not d.get("slug"):
                upd["slug"] = await _slugify(coll, d.get("title"), d["id"])
            if d.get("status") == "published" and not d.get("published_at"):
                upd["published_at"] = now
            if upd:
                await db[coll].update_one({"id": d["id"]}, {"$set": upd})


async def _issue_or_404(slug: str) -> dict:
    issue = await db.magazine_issues.find_one({"slug": slug, "status": "published"})
    if not issue:
        raise HTTPException(404, "Issue not found")
    return issue


@public_router.get("/categories")
async def categories():
    return ARTICLE_CATEGORIES


@public_router.get("/issues")
async def list_issues():
    issues = await db.magazine_issues.find({"status": "published"}).sort([("issue_date", -1), ("published_at", -1)]).to_list(200)
    counts = {}
    async for a in db.magazine_articles.find({"status": "published", "issue_id": {"$in": [i["id"] for i in issues]}}, {"issue_id": 1}):
        counts[a["issue_id"]] = counts.get(a["issue_id"], 0) + 1
    return [{**_pick(i, ISSUE_PUBLIC), "has_pdf": bool(i.get("pdf_url")), "articles": counts.get(i["id"], 0)} for i in issues]


@public_router.get("/issues/{slug}")
async def get_issue(slug: str):
    issue = await _issue_or_404(slug)
    arts = await db.magazine_articles.find({"status": "published", "issue_id": issue["id"]}).sort([("order", 1), ("published_at", 1)]).to_list(100)
    return {**_pick(issue, ISSUE_PUBLIC), "has_pdf": bool(issue.get("pdf_url")), "articles": [_pick(a, ARTICLE_LIST) for a in arts]}


@public_router.get("/issues/{slug}/pdf")
async def issue_pdf(slug: str, authorization: Optional[str] = Header(None)):
    issue = await _issue_or_404(slug)
    if not await _signed_in(authorization):
        raise HTTPException(401, "Sign in (a free account is fine) to read the full issue")
    m = re.match(r"^/api/files/([\w-]+)$", issue.get("pdf_url") or "")
    if not m:
        raise HTTPException(404, "This issue has no PDF")
    f = await db.files.find_one({"id": m.group(1)})
    if not f:
        raise HTTPException(404, "PDF not found")
    return Response(content=base64.b64decode(f["data_base64"]), media_type="application/pdf", headers={
        "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": f'inline; filename="vibrant-dayton-{issue["slug"]}.pdf"',
    })


@public_router.get("/articles")
async def list_articles(category: Optional[str] = None, limit: int = 30):
    f = {"status": "published"}
    if category and category != "All":
        f["category"] = category
    arts = await db.magazine_articles.find(f).sort("published_at", -1).to_list(max(1, min(limit, 100)))
    issues = {i["id"]: i async for i in db.magazine_issues.find({"status": "published"}, {"id": 1, "slug": 1, "title": 1})}
    out = []
    for a in arts:
        if a.get("issue_id") and a["issue_id"] not in issues:
            continue  # its issue is still a draft
        iss = issues.get(a.get("issue_id"))
        out.append({**_pick(a, ARTICLE_LIST), "issue": {"slug": iss["slug"], "title": iss["title"]} if iss else None})
    return out


@public_router.get("/articles/{slug}")
async def get_article(slug: str, authorization: Optional[str] = Header(None)):
    a = await db.magazine_articles.find_one({"slug": slug, "status": "published"})
    if not a:
        raise HTTPException(404, "Article not found")
    iss = await db.magazine_issues.find_one({"id": a.get("issue_id")}) if a.get("issue_id") else None
    if iss and iss.get("status") != "published":
        raise HTTPException(404, "Article not found")
    paras = _paragraphs(a.get("body"))
    full = await _signed_in(authorization)
    return {
        **_pick(a, ARTICLE_LIST),
        "issue": {"slug": iss["slug"], "title": iss["title"]} if iss else None,
        "paragraphs": paras if full else paras[:TEASER_PARAGRAPHS],
        "locked": not full and len(paras) > TEASER_PARAGRAPHS,
    }
