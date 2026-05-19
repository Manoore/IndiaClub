# ICGD — Product Requirements Document

## Original Problem Statement
Clone https://www.indiaclubdayton.org/ — create a modern UI with advanced features and admin CMS for managing all content. Full-stack React + FastAPI + MongoDB.

## What's Live
- Frontend: Firebase Hosting (`indiaclub-69aba.web.app`)
- Backend: Render (`https://icgd-api.onrender.com`)
- DB: MongoDB Atlas
- Preview/dev: Emergent preview URL (`REACT_APP_BACKEND_URL` in `.env`)

## Demo Accounts
- Admin: `admin` / `admin123`
- Active Member: `demo@indiaclubdayton.org` / `demo1234` (end_date now ~2029 after renew tests)
- Pending Member: `demo.pending@indiaclubdayton.org` / `demo1234`

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
