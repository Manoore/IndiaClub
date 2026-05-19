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
- Active Member: `demo@indiaclubdayton.org` / `demo1234`
- Pending Member: `demo.pending@indiaclubdayton.org` / `demo1234`

## URL Resolution (frontend → backend)
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
- `/api/events?featured=true&limit=N` filter
- Home shows only featured events; "Buy Tickets" auto-renders when ticket_types present

### Phase 2 — Home CMS
- 4 collections: HeroSlide, FeatureHighlight, Testimonial, SiteStat
- Home hero + stats + feature tiles + testimonials all DB-backed

### Phase 3 — Page CMS
- 3 collections: EventCategory, DIFIAward, ConstitutionSection
- About page sub-sections (Tax Returns, Past Presidents, CSA Awardees, Exec Committee) wired to DB
- Membership /regular & /extended consume nested `tiers` from membership_plans

### Phase 4 — Live pages + meaningful enhancements
- Gallery, Programs, Classifieds, Sponsorship pages wired to live endpoints
- **Classifieds approval workflow**: Public submit → status=pending → admin approves → public
- **Reveal Contact** anti-spam button on classifieds
- **Sponsor tier groups** (Diamond/Gold/Silver/Bronze) on Sponsor Directory
- **Donor Honor Roll** with live total pledged + year filter + anonymous donor support
- **Gallery album filter chips** (appears when multiple albums exist)
- Sponsor inquiry + Donation forms post to backend
- `mock.js` reduced from 856 → 83 lines (only NAV + VISITOR_COUNT)

## Data Model Map (24 collections)
- `members`, `membership_plans` (nested `tiers`), `perks`, `site_settings`
- `events` (with `ticket_types[]`, `featured`)
- `ticket_orders` (status: pending|paid|refunded)
- `hero_slides`, `feature_highlights`, `testimonials`, `site_stats` (Phase 2)
- `event_categories`, `difi_awards`, `constitution_sections` (Phase 3)
- `news`, `exec_team`, `gallery`, `sponsors`, `donors`, `classifieds`
- `past_presidents`, `awardees`, `tax_returns`, `programs`
- `sponsorship_inquiries`, `donations`, `subscribers`, `contact_messages`, `membership_applications`

## Key API Endpoints
- Public: `/api/events`, `/api/events?featured=true`, `/api/hero-slides`, `/api/feature-highlights`, `/api/testimonials`, `/api/site-stats`, `/api/event-categories`, `/api/event-categories/{slug}`, `/api/difi-awards`, `/api/constitution`, `/api/gallery`, `/api/sponsors`, `/api/donors`, `/api/classifieds`, `/api/programs`, `/api/site-settings`
- Public submit: `/api/classifieds` POST (status=pending), `/api/sponsorship-inquiries`, `/api/donations`, `/api/subscribers`, `/api/contact`, `/api/membership-applications`
- Auth: `/api/members/login`, `/api/members/auth/google`, `/api/admin/login`
- Tickets: `/api/events/{id}/purchase-tickets`
- Admin: `/api/admin/{collection}` GET/POST/PUT/DELETE for all 20+ CRUD collections, `/api/admin/classifieds/{id}/approve`, `/api/admin/classifieds/{id}/reject`

## Known Mocks
- 💵 Payments — manual (cash/check/Venmo/Zelle). Ticket orders + donations saved as "pending"; admin marks paid.
- 📧 Emails — none sent (donor receipts, sponsor inquiry confirmations, classified approval notifications all stored only).
- 📁 File uploads — base64-in-Mongo helper
- ✅ All other content is DB-backed and admin-editable

## Roadmap

### P2 — Real integrations
- [ ] Stripe Checkout for event tickets + memberships + donations (deferred by user)
- [ ] Email notifications via Resend/SendGrid (donor receipts, sponsor inquiry confirmations, classified approval notifications, member welcome)
- [ ] Forgot Password flow (depends on email)
- [ ] Real file/image upload

### P3 — Polish & infra
- [ ] Refactor `server.py` (~870 lines) into `/routes` modules
- [ ] UptimeRobot keep-alive ping on Render to kill cold starts
- [ ] Wrap routes in ErrorBoundary so a JS error doesn't blank the page
- [ ] data-testid on admin sidebar links
- [ ] Anti-spam contact hardening: move classified contact behind GET `/api/classifieds/{id}/contact` endpoint (currently in DOM, just visually hidden)

## Critical Conventions
- All API routes prefixed `/api/*`
- Frontend: `process.env.REACT_APP_BACKEND_URL` or `window.__ICGD_API_URL__`
- Backend: `os.environ.get('MONGO_URL')`, never hardcode
- Mongo: always exclude `_id` via `_strip()` helper
- Admin auth: `admin = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])`
- New CMS collections: add to `COLLECTIONS` + `COLL_NAMES` in `server.py` for auto-generated admin CRUD
