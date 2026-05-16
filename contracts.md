# India Club of Greater Dayton — Backend Contracts

## Auth
- Single admin user, JWT-based (HS256), 7-day token
- Default credentials seeded on first startup: `admin / admin123`
- Endpoints
  - POST `/api/admin/login` → `{ token }`
  - GET `/api/admin/me` → admin profile (requires auth)
  - POST `/api/admin/change-password` → updates admin password

## Public REST Endpoints (no auth)
All return JSON. All list endpoints sorted by `created_at desc` unless noted.
- GET `/api/events` — upcoming + featured events
- GET `/api/events/{id}` — single event
- POST `/api/events/{id}/register` — public registration
- GET `/api/news` — published news/announcements
- GET `/api/exec-team` — current executive committee
- GET `/api/gallery` — all gallery images
- GET `/api/sponsors` — active sponsors
- GET `/api/donors` — active donors
- GET `/api/classifieds?category=&location=` — approved ads
- POST `/api/classifieds` — submit new ad (goes to admin queue)
- POST `/api/subscribers` — newsletter signup
- POST `/api/contact` — contact form submission
- POST `/api/donations` — record a donation
- POST `/api/membership-applications` — submit membership application
- POST `/api/sponsorship-inquiries` — submit sponsor inquiry
- GET `/api/past-presidents`, `/api/awardees`, `/api/difi-awards`, `/api/tax-returns`
- GET `/api/programs`, `/api/programs/{slug}`
- POST `/api/files/upload` — single file upload (auth required for admin endpoints, public for receipts)

## Admin REST Endpoints (auth required, prefixed `/api/admin/`)
CRUD for: `events`, `news`, `exec-team`, `gallery`, `sponsors`, `donors`, `classifieds`, `past-presidents`, `awardees`, `difi-awards`, `tax-returns`, `programs`, `membership-plans`
List/read/delete for: `membership-applications`, `subscribers`, `contact-messages`, `donations`, `sponsorship-inquiries`, `event-registrations`
- Standard pattern: GET (list), GET `/{id}`, POST, PUT `/{id}`, DELETE `/{id}`
- Approve/reject classifieds: POST `/api/admin/classifieds/{id}/approve` and `/reject`

## File Uploads (images & PDFs)
- Uploaded files stored as base64 in MongoDB `files` collection: `{id, filename, mime_type, data_base64, uploaded_at}`
- Served via GET `/api/files/{id}` — returns Response with mime-type from base64
- Admin can upload via `/api/files/upload` multipart endpoint (auth)

## Models (MongoDB, all use `id: str = uuid4()` as primary key)
- Event: id, title, slug, category, date, time, venue, description, long_description, image_url, highlights[], registration_open, featured, created_at
- News: id, title, slug, body, image_url, published, published_at, created_at
- ExecMember: id, name, role, image_url, bio, order, active
- GalleryImage: id, title, image_url, album, created_at
- Sponsor: id, name, logo_url, tier, website, active, order
- Donor: id, name, amount, year, tier, anonymous
- Classified: id, title, category, location, price, description, image_url, contact, status (pending|approved|rejected), created_at
- Subscriber: id, email, name?, subscribed_at
- ContactMessage: id, name, email, subject, message, created_at, read
- Donation: id, name, email, amount, message, created_at
- MembershipApplication: id, first_name, last_name, email, phone, address, family, plan, tier, created_at, status
- SponsorshipInquiry: id, company, contact, email, phone, tier, message, created_at, status
- EventRegistration: id, event_id, name, email, phone, family_count, created_at
- PastPresident: id, year, name, order
- Awardee: id, year, name, contribution, type (community|difi), order
- TaxReturn: id, year, filed_by, president, file_id?, available, order
- Program: id, slug, name, image_url, intro, initiatives[{name, desc}], impact
- MembershipPlan: id, slug, name, price, period, description, benefits[], featured, tiers[{slug, name, price, benefits[], recommended}]

## Frontend Integration
- Frontend `/app/frontend/src/data/mock.js` will be replaced by:
  - `/app/frontend/src/api/client.js` — axios instance with REACT_APP_BACKEND_URL
  - `/app/frontend/src/api/{events,news,members,...}.js` — typed endpoint wrappers
- Public pages will fetch from API; form submissions hit POST endpoints
- Admin pages live under `/admin/*` route, require auth; on 401 redirect to `/admin/login`
- Admin context (`AdminAuthContext`) stores JWT in localStorage `icgd_admin_token`

## Seeding
- On backend startup, if DB empty, seed:
  - Default admin user (admin/admin123)
  - Membership plans (4)
  - Programs (4)
  - Past presidents (15)
  - Executive team (20 members)
  - Awardees & DIFI awards
  - Tax return records
  - Event categories metadata
  - Sample classifieds, sponsors, donors

## Mocked / Stub
- Image uploads are stored as base64 in MongoDB (acceptable for MVP; can move to S3 later)
- Email sending for newsletter is NOT implemented — subscribers only saved to DB
- Payment processing for donations/memberships is NOT integrated — only records the intent
- PDF generation for tax returns is NOT implemented — just file upload + serve
