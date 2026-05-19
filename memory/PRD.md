# ICGD — Product Requirements Document

## Original Problem Statement
Clone https://www.indiaclubdayton.org/ and create a modern UI with advanced features along with all the content and pages. Create an admin section where the content and all other stuff can be managed.

Full-stack React + FastAPI + MongoDB. Public pages (Home, About, Events, Programs, Membership), Admin CMS, Auth, Event Ticketing, Membership Subscriptions, and real scraped images.

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
- `/app/frontend/` — React SPA, TailwindCSS, hosted on Firebase
- `/app/backend/` — FastAPI, hosted on Render
  - `server.py` — all routes (auth, admin, members, perks, settings, tickets, CMS)
  - `models.py` — Pydantic models
  - `seed.py` — auto-seeds defaults on startup

## URL Resolution (frontend → backend)
- Local/Emergent preview: uses `REACT_APP_BACKEND_URL` from `.env`
- Deployed (Firebase/custom domain): uses `window.__ICGD_API_URL__` from `public/index.html` (editable post-build, no rebuild needed)

## Implemented (as of 2026-02)
- JWT admin + member auth
- Google Sign-In for members
- Membership management (auto-approval, perks)
- Event ticketing (custom types, member-only, sale windows, quantity caps)
- Dynamic Site CMS (`site_settings` key-value)
- Admin panel — mobile responsive, full CRUD for 17+ collections
- **Phase 1 (Feb 2026):** Featured events on home page from DB; "Buy Tickets" button auto-renders for events with `ticket_types`
- **Phase 2 (Feb 2026):** Removed mock data for hero slides, site stats, feature tiles, testimonials — all DB-backed with admin CRUD
- Pre-warm backend on admin login page + cold-start UX hint after 5s
- `setup_demo.py` / `seed.py` for demo accounts

## Key Data Models
- `members`, `membership_plans`, `perks`, `site_settings`
- `events` (with `ticket_types[]`, `featured`)
- `ticket_orders` (status: pending|paid|refunded)
- `hero_slides`, `feature_highlights`, `testimonials`, `site_stats` (Phase 2)
- `news`, `exec_team`, `gallery`, `sponsors`, `donors`, `classifieds`
- `past_presidents`, `awardees`, `tax_returns`, `programs`

## Key API Endpoints
- Public: `/api/events`, `/api/events?featured=true&limit=N`, `/api/hero-slides`, `/api/feature-highlights`, `/api/testimonials`, `/api/site-stats`, `/api/site-settings`, `/api/members/login`, `/api/members/auth/google`, `/api/events/{id}/purchase-tickets`
- Admin: `/api/admin/{collection}` GET/POST/PUT/DELETE for all 17 CRUD collections

## Roadmap

### P1 — Pending mock removal (Phase 3)
- [ ] `EVENT_CATEGORIES` — 8 program cards (DIFI, Diwali, Sports, etc.) needs DB + admin
- [ ] `EVENT_DETAILS` long-form per-category content
- [ ] `CONSTITUTION` (11-section bylaws) needs DB + admin
- [ ] `REGULAR_TIERS` / `EXTENDED_TIERS` membership sub-tier breakdown
- [ ] `DIFI_AWARDS` separate from community awardees
- [ ] Delete `mock.js` entirely once above are done

### P2 — Real integrations
- [ ] Stripe Checkout for event tickets + memberships (deferred by user)
- [ ] Email notifications via Resend/SendGrid (member welcome, admin alerts)
- [ ] Forgot Password flow (depends on email integration)
- [ ] Real file/image upload (currently MOCKED via base64-in-Mongo helper)

### P3 — Polish
- [ ] Refactor `server.py` (~830 lines) into `/routes` modules
- [ ] UptimeRobot keep-alive ping on Render to eliminate cold starts
- [ ] Add `data-testid` to admin sidebar links

## Known Mocks
- 💵 Payments — manual (cash/check/Venmo). Ticket orders saved as "pending"; admin marks paid.
- 📧 Emails — none sent. No buyer confirmation, no admin alert.
- 🗂️ Feature highlights, hero slides, testimonials, stats — **NOW DB-BACKED (Feb 2026)**
- 🎭 Event categories, constitution, DIFI awards, membership tiers — still mocked in `frontend/src/data/mock.js`

## Critical Conventions
- All API calls must hit `/api/*` prefix
- Frontend: `process.env.REACT_APP_BACKEND_URL` or `window.__ICGD_API_URL__`
- Backend: `os.environ.get('MONGO_URL')`, never hardcode
- Mongo: always exclude `_id` from responses via `_strip()` helper
- Auth: every admin endpoint mounted under `admin = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])`
- New CMS collections: add to `COLLECTIONS` + `COLL_NAMES` in `server.py` to auto-register admin CRUD
