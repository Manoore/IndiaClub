# India Club of Greater Dayton — Product Requirements (PRD)

## Original Problem
Clone https://www.indiaclubdayton.org/ as a modern multi-page React + FastAPI + MongoDB app with an admin section to manage all content. User wants real images (no AI generation) and a full end-to-end member account system.

## Stack
- Frontend: React 19, Tailwind, React Router v7, shadcn/ui
- Backend: FastAPI, Motor (async MongoDB)
- Auth: JWT with `typ` claim ("admin" | "member")
- Hosting (production): Firebase Hosting (frontend) + Render (backend) + MongoDB Atlas (DB)
- Hosting (preview): Emergent's preview env (cultural-connect-pro.preview.emergentagent.com)

## Personas
1. **Anonymous visitor** — browses public site, can submit Contact / Newsletter / Sponsor inquiry / anonymous Membership application
2. **Member** — registers, logs in, applies for membership plan, views dashboard with status
3. **Admin** — manages all content via /admin panel, approves/rejects member applications

---

## ✅ Implemented (as of 2026-02)

### Auto-approval + Google Sign-In + Site CMS + Event Tickets ⭐ NEW
- **Auto-approve**: members are now `active` immediately on subscribe (no admin approval needed). Admin "Mark as Paid" tracks actual payment via POST `/admin/members/{id}/mark-paid?paid=true`
- **Google Sign-In**: POST `/api/members/google-signin` verifies Google ID token, upserts member by email, issues member JWT. Frontend uses `@react-oauth/google`. Auto-links Google to existing email accounts. Requires `GOOGLE_CLIENT_ID` env var on backend and `REACT_APP_GOOGLE_CLIENT_ID` on frontend
- **Site Content CMS**: single-doc `site_settings` collection with 29 editable fields (hero, stats, contact, social, footer, about). Admin at `/admin/site-content` with 7 tabs. Public `GET /api/site-settings`, admin `PUT /api/admin/site-settings`
- **Event Ticket Categories**: each event has `ticket_types[]` with name, price, members_only flag, sale_start/sale_end, quantity_total. Public `POST /api/events/{id}/purchase-tickets` validates inventory/sale-window/member-eligibility. Admin at `/admin/ticket-orders` with filter, mark-paid, refund, delete (auto-restores inventory)
- **Demo accounts** (seeded): `demo@indiaclubdayton.org` / `demo1234` (active Regular/Family) and `demo.pending@indiaclubdayton.org` / `demo1234`

### Admin — Mobile Responsive ⭐ NEW
- Admin sidebar collapses into a drawer on screens < 1024px with hamburger menu
- Mobile topbar with menu / logout buttons
- Auto-closes drawer on route change
- Responsive padding (`px-4 sm:px-6 lg:px-8`) and adaptive table layouts
- Member admin table now horizontally scrolls on small screens
- CrudPage header (search + New button) wraps cleanly on mobile

### Member Perks System ⭐ NEW
- **MemberPerk model**: title, description, icon (Lucide name), image_url, link, link_label, badge (NEW/POPULAR/MEMBER-ONLY/LIMITED), category, active, order
- **Public**: `GET /api/perks` (active perks only)
- **Admin CRUD**: `/api/admin/perks` with full create/edit/delete
- **Admin page**: `/admin/perks` with image/icon preview, badge pills, drag-free order field
- **Frontend**: `<PerksSection>` component rendered on `/member/dashboard`. Shows all perks with locked styling for non-active members and full styling for active members. Cards link to event/classified/etc. pages
- **Seed**: 8 default perks pre-loaded (Discounted Events, Free Classifieds, Samachar Newsletter, Namaskaar Magazine, AGM Voting, Member Directory, Booth Rentals, Charity Support)

### Public Site (35+ routes, real scraped content)
- Home, About (Mission, Constitution, Past Presidents, Awardees, Tax Returns, Exec Team, Contact)
- Events (Upcoming, DIFI, Sports, Golden Jewels, Rising Stars, Women's Connect, Picnic, Diwali)
- Membership (Regular w/ Student/Individual/Family/Business tiers, Business, Honorary, Extended Silver/Gold)
- Programs (Charity, Education, Scholarship, Community Service)
- Sponsorship (Become a Sponsor, Directory, Donate, Donors Directory)
- Classifieds (All Categories, All Locations, All Ads, Post Ad, My Ads)
- Gallery, Contact

### Backend API (FastAPI + MongoDB)
- Admin auth: POST `/api/admin/login`, GET `/api/admin/me`, POST `/api/admin/change-password`
- File storage: POST `/api/files/upload`, GET `/api/files/{id}` (base64 in Mongo)
- Public reads: events, news, exec-team, gallery, sponsors, donors, classifieds, programs, membership-plans, past-presidents, awardees, tax-returns
- Public submissions: classifieds, subscribers, contact, donations, membership-applications, sponsorship-inquiries, event registrations
- Admin CRUD for all content collections + admin inboxes for submissions
- Approve/Reject endpoints for classifieds AND membership-applications

### Member Account System (Phase 1 + Phase 2 — NEW)
- **Register**: POST `/api/members/register` → JWT token + member doc
- **Login**: POST `/api/members/login` → JWT token
- **Profile**: GET/PUT `/api/members/me`
- **Password**: POST `/api/members/me/change-password`
- **Subscribe**: POST `/api/members/me/subscribe` — saves plan/tier/address/payment-method on member; sets `membership.status='pending'`. Validates: plan exists, tier matches plan, student tier requires school+degree, payment method ∈ {paypal, check, other}
- **Admin manage**: GET `/api/admin/members?status=`, GET/POST approve/reject/DELETE `/api/admin/members/{id}`
- **Approve action**: sets `membership.status='active'`, `start_date=now`, `end_date=now+365d`, `approved_by=admin_user`
- **Token isolation**: admin token rejected on `/members/me`, member token rejected on `/admin/*`
- **Stats**: `/api/admin/stats` returns `members`, `members_active`, `members_pending` alongside existing counts

### Frontend Member Flow
- `/login` page — Sign In / Register tabs wired to backend via `MemberAuthContext`
- `/member/dashboard` — shows profile + membership status badge + payment instructions for pending + active membership card with dates + profile editor + password changer
- `/membership/:plan` — "Sign Up" buttons open `JoinModal`. If not logged in → shows Login/Register prompt. If logged in → full subscription form (gender, phone, address, family count, donation, payment method, school+degree if student tier)
- Navbar — shows "Member Login" when logged out, "Hi, {firstName}" linking to dashboard when logged in

### Admin Panel
- New `/admin/members` page — filter pills (all/pending/active/none/rejected/expired), search, status badges, approve/reject buttons for pending, Revoke for active, delete button, detail drawer with all fields including school info
- Members nav group added to admin sidebar (top of nav)
- Dashboard cards show active/pending member counts

### Hosting / White-labeling
- Emergent badge + tracking scripts removed from `index.html`
- Meta description updated to India Club branding
- Frontend deployed to Firebase Hosting (indiaclub-69aba.web.app)
- Backend deployed to Render free tier (icgd-api.onrender.com)
- MongoDB Atlas free tier (M0)

---

## 📦 Test Coverage
- Backend pytest suite: `/app/backend/tests/test_members_and_admin.py` — 34/34 passing
- Curl smoke: `/tmp/test_members.py` — 14/14 passing
- Validation smoke: 7/7 passing (unknown plan / missing tier / bad tier / student-no-school / bad payment method / valid student / valid business)
- Frontend e2e via testing_agent_v3_fork — ~95% pass; 2 minor cosmetic items addressed (inline login error + server-side validation)

---

## 🔮 Roadmap

### P0 — Not yet started
- *(none — Phase 1 + Phase 2 complete)*

### P1 — Next features
- **Stripe Checkout integration** — replace manual payment with online checkout. Webhook auto-activates membership on `payment_intent.succeeded`
- **Email notifications** — Resend/SendGrid integration for: registration welcome, application received, admin notification, approval, rejection, renewal reminders
- **Real file uploads in admin** — currently base64 in Mongo (5MB limit), consider Cloudinary free tier for scale

### P2 — Polish & member perks
- **Member-only gating**:
  - Free classified posting (only active members can post)
  - Discounted event registration tier
  - Magazine downloads (Samachar / Namaskaar)
  - Public member directory
- **Forgot password flow** for members
- **Annual renewal reminders** (cron-triggered email 30 days before `end_date`)
- **Auto-expire memberships** when `end_date < now()`

### P3 — Backlog
- Multi-language support (Hindi / Tamil / Telugu / Gujarati)
- Mobile app via React Native (or PWA install prompt)
- Calendar export / iCal feed for events
- Custom domain (indiaclubdayton.org) via Firebase Hosting domains
- Member badges / years-of-membership display
- Photo gallery uploader for members to contribute

---

## 🔐 Credentials
See `/app/memory/test_credentials.md`

## 📂 Key Files
- Backend: `/app/backend/{server.py, models.py, auth.py, seed.py, database.py}`
- Frontend pages: `/app/frontend/src/pages/*.jsx`
- Frontend auth: `/app/frontend/src/api/{client.js, AdminAuthContext.js, MemberAuthContext.js}`
- Admin: `/app/frontend/src/admin/{AdminRoutes.jsx, AdminPages.jsx, MembersAdmin.jsx, Dashboard.jsx, AdminLayout.jsx}`
