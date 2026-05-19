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

## Architecture
- `/app/frontend/` — React SPA, TailwindCSS
- `/app/backend/` — FastAPI; `server.py` routes, `models.py`, `seed.py`

## URL Resolution (frontend → backend)
- Local/Emergent preview: `REACT_APP_BACKEND_URL` from `.env`
- Deployed (Firebase): `window.__ICGD_API_URL__` in `public/index.html` (editable post-build)

## Implemented (Feb 2026)
- JWT admin + member auth, Google Sign-In for members
- Membership management (auto-approval, perks)
- Event ticketing (custom types, member-only, sale windows, quantity caps)
- Dynamic Site CMS (`site_settings` key-value)
- Admin panel — mobile responsive, full CRUD for 20+ collections

### Phase 1 — Featured events + Buy Tickets on home (Feb 2026)
- `/api/events` supports `?featured=true&limit=N`
- Home shows only featured events; "Buy Tickets" auto-rendered when ticket_types present

### Phase 2 — Home CMS (Feb 2026)
- 4 new collections: HeroSlide, FeatureHighlight, Testimonial, SiteStat
- Home hero + stats + feature tiles + testimonials all DB-backed

### Phase 3 — Page CMS (Feb 2026)
- 3 new collections: EventCategory, DIFIAward, ConstitutionSection
- Wired 4 already-existing endpoints to About page (Tax Returns, Past Presidents, CSA Awardees, Exec Committee)
- Membership /regular & /extended now consume nested `tiers` from membership_plans
- Events hub + every /events/{slug} category page renders DB data

## Key Data Models (24 collections)
- `members`, `membership_plans` (with nested `tiers`), `perks`, `site_settings`
- `events` (with `ticket_types[]`, `featured`)
- `ticket_orders` (status: pending|paid|refunded)
- Phase 2: `hero_slides`, `feature_highlights`, `testimonials`, `site_stats`
- Phase 3: `event_categories`, `difi_awards`, `constitution_sections`
- `news`, `exec_team`, `gallery`, `sponsors`, `donors`, `classifieds`
- `past_presidents`, `awardees`, `tax_returns`, `programs`

## Key API Endpoints
- Public: `/api/events`, `/api/events?featured=true&limit=N`, `/api/hero-slides`, `/api/feature-highlights`, `/api/testimonials`, `/api/site-stats`, `/api/event-categories`, `/api/event-categories/{slug}`, `/api/difi-awards`, `/api/constitution`, `/api/site-settings`
- Auth: `/api/members/login`, `/api/members/auth/google`, `/api/admin/login`
- Tickets: `/api/events/{id}/purchase-tickets`
- Admin: `/api/admin/{collection}` GET/POST/PUT/DELETE for all 20+ CRUD collections

## Roadmap

### P2 — Remaining mocks (optional cleanup)
- [ ] Wire `GalleryPage` to `/api/gallery` (endpoint exists)
- [ ] Wire `ClassifiedPage` to `/api/classifieds` (endpoint exists)
- [ ] Wire `SponsorshipPage` to `/api/sponsors` + `/api/donors` (endpoints exist)
- [ ] Wire `ProgramsPage` to `/api/programs` (endpoint exists)
- [ ] Delete `mock.js` entirely

### P2 — Real integrations
- [ ] Stripe Checkout for event tickets + memberships (deferred by user)
- [ ] Email notifications via Resend/SendGrid (member welcome, admin alerts)
- [ ] Forgot Password flow (depends on email)
- [ ] Real file/image upload (currently base64-in-Mongo)

### P3 — Polish
- [ ] Refactor `server.py` (~870 lines) into `/routes` modules
- [ ] UptimeRobot keep-alive on Render → kill cold starts
- [ ] Wrap routes in ErrorBoundary to prevent blank-page crashes
- [ ] data-testid on admin sidebar links

## Known Mocks
- 💵 Payments — manual (cash/check/Venmo). Ticket orders saved as "pending"; admin marks paid.
- 📧 Emails — none sent.
- 🗂️ Home hero/stats/features/testimonials — **DB-BACKED (Phase 2)**
- 🎭 Event categories, DIFI awards, Constitution, Membership tiers — **DB-BACKED (Phase 3)**
- 🖼️ Gallery, Classifieds, Sponsors, Programs pages — STILL using mock fallback (backends exist; not wired to dedicated pages yet)

## Critical Conventions
- All API routes prefixed `/api/*`
- Frontend: `process.env.REACT_APP_BACKEND_URL` or `window.__ICGD_API_URL__`
- Backend: `os.environ.get('MONGO_URL')`, never hardcode
- Mongo: always exclude `_id` via `_strip()` helper
- Admin auth: `admin = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])`
- New CMS collections: add to `COLLECTIONS` + `COLL_NAMES` in `server.py` for auto-generated admin CRUD
