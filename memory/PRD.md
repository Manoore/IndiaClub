# ICGD — Product Requirements Document

## Original Problem Statement
Clone https://www.indiaclubdayton.org/ — create a modern UI with advanced features and admin CMS for managing all content. Full-stack React + FastAPI + MongoDB.

## What's Live
- Frontend: Firebase Hosting (`indiaclub-69aba.web.app`)
- Backend: Render (`https://icgd-api.onrender.com`)
- DB: MongoDB Atlas
- Preview/dev: Emergent preview URL (`REACT_APP_BACKEND_URL` in `.env`)

## Demo Accounts
- Credentials are not stored in this repo. The first admin is created from `ADMIN_INITIAL_PASSWORD` (env) or a random password logged once on first start.
- Demo members are created by `backend/setup_demo.py` for local/preview testing only.

## URL Resolution
- Local/Emergent preview: `REACT_APP_BACKEND_URL` from `.env`
- Deployed (Firebase): `window.__ICGD_API_URL__` in `public/index.html` (editable post-build)

## Implemented (Feb 2026)

### Core
- JWT admin + member auth, Google Sign-In for members
- Membership management (auto-approval, perks)
- Event ticketing (custom types, member-only, sale windows, quantity caps)
- Dynamic Site CMS (`site_settings` key-value)
- Admin panel — mobile responsive, full CRUD for 20+ collections

### Phase 1 — Featured events + Buy Tickets on home

### Phase 2 — Home CMS (HeroSlide, FeatureHighlight, Testimonial, SiteStat)

### Phase 3 — Page CMS (EventCategory, DIFIAward, ConstitutionSection) + About-page sub-sections wired

### Phase 4 — Live data on Gallery/Programs/Classifieds/Sponsorship + meaningful enhancements (classifieds approval workflow, sponsor tier groups, donor honor roll, gallery albums)

### Phase 5 — Pricing matrix + Events 2.0 + Renewal + Promo codes
- **TicketType** extended: `member_price`, `early_bird_price`, `early_bird_end_date` (all optional)
- Pricing precedence: **Early-bird → Member → Regular**
- **Event** extended: `event_format` (in_person/online/hybrid), `start_date`, `end_date`, `online_url`, `schedule[]`, `promo_codes[]`
- **POST /api/members/me/renew** — extends 365 days (additive); expired members restart from now
- **Auto-expire** on startup flips overdue active memberships to `expired`
- **Promo codes** per event (percent or amount, max_uses tracking) — `/validate-promo` + apply at checkout
- Frontend: TicketPurchaseModal shows EARLY BIRD / MEMBER PRICE badges + promo input + discount line; MemberDashboard has renewal banner (≤30 days) + Renew button on expired

### Phase 6 — Family Groups + Per-Attendee QR Tickets (Jun 2026)
- `family_members` collection {member_id, name, relation, date_of_birth, status pending|approved|rejected, admin_note}; changing name/DOB resets to pending
- Member dashboard: "My Family" CRUD + "My Tickets" (codes, check-in status, PDF download)
- Admin `/admin/family-approvals` (verify/reject with note) and `/admin/check-in` (html5-qrcode camera + manual code, attendance counter, duplicate/refund/wrong-event protection)
- Checkout "Name each attendee" mode: self + approved family + named guests; `TicketType.child_price` (3–11); verified under-3 free; guests pay adult price
- Every order stores `tickets[]` (unique `ICGD-XXXXXXXX` code per attendee); PDF via reportlab + qrcode: `/api/tickets/{order_id}/pdf?email=` and `/api/admin/ticket-orders/{id}/pdf`
- Member JWT now sent on all non-admin requests (backend member pricing now matches what the frontend shows)
- Code lives in `backend/family_tickets.py`; tests in `backend/tests/test_phase6_family_tickets.py` (26/26 pass)

### Phase 7 — Requirements gaps without external services (Oct 2026)
- **Calendar-year memberships** (`backend/membership_rules.py`): every term ends Dec 31; renewals of active members continue from the current end year; Extended Silver/Gold = 5/10 calendar years
- **Promotion window** (Site Content → Membership Promotion): purchases/renewals inside it run through Dec 31 next year; `GET /api/membership/quote` shows valid-through + promo at signup
- **Legacy lifetime**: hidden `lifetime` plan, admin-only grant (`POST /api/admin/members/{id}/lifetime`), never expires; "Student" tier renamed **Youth**
- **Payment statuses** everywhere: pending · awaiting_check · paid · failed · refunded (tickets, memberships, sponsorships, donations); check payments start as awaiting_check
- **Role-based admin** (`backend/admin_access.py`): Webmaster, Treasurer, Membership Chair, Event Coordinator, Sponsorship Coordinator, Communications Lead, Volunteer (check-in only); Admin Users page; path → area guard on all `/api/admin/*`
- **Sponsorship lifecycle** (`backend/sponsorships.py`): Platinum/Gold/Silver/Bronze plans (admin-editable), public signup with logo upload, pay by check/other, Treasurer marks paid → listing live through Dec 31 + sponsor code, renewals extend a year, PDF invoices, auto-expiry
- **Sponsor ticket pricing**: `TicketType.sponsor_price` unlocked by a valid sponsor code at checkout (0 = included)
- **Reports** (`backend/reports.py`): CSV exports (members, sponsors, registrations, revenue, donations), revenue summary by year, renewal reminder queue (expiring/lapsed within 30 days)
- **Events**: calendar view, search, category filters, month grouping, past-events toggle; check-in name search + remaining counter
- **Homepage (WF-1)**: single static hero with Member / Events / Donate CTAs, Join · Support · Community tiles, Community Stories strip; executive team removed from homepage
- **Community**: business directory (member submits → admin approves), optional members-only classifieds (posting + contact details)
- **Spam protection** (`backend/spam.py`): honeypot field + per-IP rate limit on public forms (`SPAM_MAX_PER_WINDOW`)
- **SEO/analytics**: per-page titles and descriptions; Google Analytics via Site Content measurement ID
- Daily-ish background job (every 6h) expires memberships and sponsorships; disable with `DISABLE_BACKGROUND_JOBS=1`
- Tests: `backend/tests/test_phase7_requirements.py`

## Data Models (27 collections)
- `members`, `membership_plans` (nested `tiers`), `perks`, `site_settings`
- `events` (Phase 5 — with `event_format`, structured dates, `online_url`, `schedule`, `promo_codes`, ticket_types with full pricing matrix)
- `ticket_orders` (status: pending|paid|refunded, with optional `promo_code` and `discount` fields)
- Phase 2: `hero_slides`, `feature_highlights`, `testimonials`, `site_stats`
- Phase 3: `event_categories`, `difi_awards`, `constitution_sections`
- `news`, `exec_team`, `gallery`, `sponsors`, `donors`, `classifieds`
- `past_presidents`, `awardees`, `tax_returns`, `programs`
- `sponsorship_inquiries`, `donations`, `subscribers`, `contact_messages`, `membership_applications`

## Key API Endpoints
- Public: `/api/events`, `/api/events?featured=true`, `/api/hero-slides`, `/api/feature-highlights`, `/api/testimonials`, `/api/site-stats`, `/api/event-categories`, `/api/event-categories/{slug}`, `/api/difi-awards`, `/api/constitution`, `/api/gallery`, `/api/sponsors`, `/api/donors`, `/api/classifieds`, `/api/programs`, `/api/site-settings`
- Public submit: `/api/classifieds` POST (pending), `/api/sponsorship-inquiries`, `/api/donations`, `/api/subscribers`, `/api/contact`, `/api/membership-applications`
- Auth: `/api/members/login`, `/api/members/auth/google`, `/api/admin/login`
- Tickets: `/api/events/{id}/purchase-tickets`, `/api/events/{id}/validate-promo`
- Members: `/api/members/me/subscribe`, `/api/members/me/renew` (Phase 5)
- Admin: `/api/admin/{collection}` for all 20+ CRUD collections + classified approve/reject + ticket-order paid/refunded

## Known Mocks
- 💵 Payments — manual (cash/check/Venmo/Zelle). Ticket orders + donations saved as "pending"; admin marks paid.
- 📧 Emails — none sent (donor receipts, renewal reminders, classified approval notifications all stored only).
- 📁 File uploads — base64-in-Mongo helper

## Roadmap

### P2 — Real integrations
- [ ] Stripe Checkout for tickets + memberships + donations (deferred by user)
- [ ] Email notifications via Resend/SendGrid (donor receipts, renewal reminders 30/7-day, classified approval, member welcome, Forgot Password)
- [ ] Forgot Password flow (depends on email)
- [ ] Real file/image upload

### P3 — Polish & infra (from Phase 5 code review)
- [ ] Refactor `server.py` (~974 lines now) → `/routes` modules — overdue
- [ ] Make promo `used` counter atomic (Mongo `$inc` with positional operator) — currently 2-step, theoretical race condition
- [ ] Add daily background task for auto-expire (currently startup-only — overlong-running servers don't catch expiries between restarts)
- [ ] Add `PromoValidateRequest` Pydantic model (currently `body: dict`)
- [ ] Document timezone assumption on `early_bird_end_date` (currently naive UTC; admin datetime-local input may carry tz offset)
- [ ] Audit trail for renewals (currently overwrites without history — add `renewals` collection or membership_history field)
- [ ] UptimeRobot keep-alive ping on Render to kill cold starts
- [ ] Wrap routes in ErrorBoundary so a JS error doesn't blank the page
- [ ] data-testid on admin sidebar links
- [ ] Anti-spam: move classified contact behind GET endpoint (currently DOM-hidden)

### P3 — Stale tests to clean up
- [ ] `test_member_subscribe_pending` + `test_admin_list_members_filter_pending` still expect status="pending" but business is auto-approve to "active" — update or delete

## Critical Conventions
- All API routes prefixed `/api/*`
- Frontend: `process.env.REACT_APP_BACKEND_URL` or `window.__ICGD_API_URL__`
- Backend: `os.environ.get('MONGO_URL')`, never hardcode
- Mongo: always exclude `_id` via `_strip()` helper
- Admin auth: `admin = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])`
- New CMS collections: add to `COLLECTIONS` + `COLL_NAMES` in `server.py` for auto-generated admin CRUD
- Pricing precedence (Phase 5): Early-bird (if within window) > Member (if active) > Regular
