# Medanya App – Frontend Design Summary (UI_Design)

This document summarizes the 17 screens in `UI_Design` and maps them to backend APIs and modules.

---

## Screen flow overview

| # | Screen | Purpose |
|---|--------|--------|
| 1 | **Onboarding / Login** | Get started with phone, Google, Facebook; terms/guidelines |
| 2 | **Request OTP** | Enter phone (+971), request OTP |
| 3 | **Verify Phone** | Enter 4-digit OTP, confirm, resend with cooldown |
| 4 | **Profile Creation** | Full name, neighborhood, profile picture → Join community |
| 5–6 | **Home** | Live broadcast, feed filters, Active Now streams, feed items |
| 7 | **Jobs** | Search/filter jobs, list with Apply, ratings, salary, location |
| 8 | **Marketplace** | Category/location filters, grid listings, Sell item |
| 9 | **Safety Hub** | AI Scammer Check, Report Scammer, Report Missing |
| 10 | **Messages** | Search, tabs: Private / Groups / Community, chat list |
| 11 | **Missing Person Detail** | Photo, name, location, description, voice PLAY, Call Family, Share |
| 12 | **Profile** | Name, location, Verify Profile, bio, Followers/Following/Likes, Edit |
| 13 | **Discover People** | Search users, roles, Follow/Following |
| 14 | **Profile / Settings** | Same list + **Light Mode**, **Secure Logout** |
| 15 | **Create Content** | Modal: Shoot Short, From Gallery, Go Live |
| 16 | **Safety / Alerts** | Report cards + Recent local alerts (risk labels), Emergency help |
| 17 | **Chat Conversation** | Thread with presence (Online), read receipts, “Type a safe message…” |

---

## Backend mapping (can the backend handle this?)

### Authentication & onboarding (Screens 1–4)

| UI element | Backend |
|------------|--------|
| Get started with phone | ✅ `POST /api/auth/otp/send`, `POST /api/auth/otp/verify` |
| Request OTP (phone input) | ✅ `/auth/otp/send` + rate limit / cooldown |
| Verify OTP (4 boxes, confirm, resend 32s) | ✅ `/auth/otp/verify`; resend = call `/otp/send` again (respect cooldown in UI) |
| Google / Facebook | ✅ Use Firebase `verify-otp` flow → `POST /api/auth/verify-otp` with ID token |
| Profile creation (name, neighborhood, photo) | ✅ `PATCH /api/users/me` (display_name, avatar_url); add “neighborhood” to user if needed |
| Join community button | ✅ After profile update, use existing JWT; no extra endpoint |

**Gap:** “Current neighborhood” – backend has no dedicated field; add to `users` (e.g. `neighborhood` / `location_text`) and to `PATCH /users/me` if you want it stored.

---

### Home (Screens 5–6)

| UI element | Backend |
|------------|--------|
| Live community broadcast (4.2K viewers) | ✅ `GET /api/streams`, Socket `stream:join` / `stream:viewerCount` |
| Filters: All Feed, Alerts, Jobs, Missing | ✅ `GET /api/feed?types=job,report,missing_person,marketplace` |
| Active Now (live streamers) | ✅ `GET /api/streams` (status=live) |
| Feed item (Safety Team, 2H ago) | ✅ Feed API returns mixed items with `createdAt` |
| Bottom nav: Home, Jobs, Market, +, Safety, Chat, Missing | ✅ All have backend modules |

---

### Jobs (Screen 7)

| UI element | Backend |
|------------|--------|
| Search roles or locations | ✅ `GET /api/jobs/search?keyword=...` or list with filters |
| Filters: All, Housemaid, Cleaner, Driver, Nanny | ✅ `GET /api/jobs?category=...` |
| Available opportunities, 124 FOUND | ✅ List response with total count |
| Job cards (title, employer, rating, type, salary, location, Apply) | ✅ Job detail + create application (if you add an “applications” API later) |

**Note:** “Rating” and “Apply” – backend has jobs CRUD but no rating or applications table yet; add when you implement those features.

---

### Marketplace (Screen 8)

| UI element | Backend |
|------------|--------|
| Find category, In location, search | ✅ `GET /api/marketplace/items`, `GET /api/marketplace/search` |
| Grid listings (image, price, location, heart) | ✅ List/detail; “favorite” = new feature if needed |
| Sell item | ✅ `POST /api/marketplace/items` (auth) |

---

### Safety Hub (Screens 9, 16)

| UI element | Backend |
|------------|--------|
| AI Scammer Check – search number or name | ✅ `GET /api/blacklist/search`, `GET /api/blacklist/:phoneNumber` |
| Report Scammer | ✅ `POST /api/reports` |
| Report Missing | ✅ `POST /api/missing-persons` |
| Recent local alerts (DANGEROUS, WARNING) | ✅ Feed with report type or `GET /api/feed?types=report`; risk from report/blacklist |
| Emergency help / Direct community liaison line | ⚠️ No backend; use static config or admin contact in app config |

---

### Messages & Chat (Screens 10, 17)

| UI element | Backend |
|------------|--------|
| Search conversations, Private / Groups / Community | ✅ `GET /api/chats`; “Community” = community room posts (separate) |
| Chat list (avatar, name, verified, last message, time) | ✅ Chats list + last message from messages API |
| Online dot (e.g. Al Sahar Agency) | ✅ Socket presence: `presence:online` / `presence:offline` |
| Conversation (bubbles, timestamps, read receipt) | ✅ `GET /api/chats/:id/messages`, send via Socket `chat:message:send`, read receipt via `chat:message:read` |
| Type a safe message, send | ✅ Socket `chat:message:send` + optional content moderation |

---

### Missing Persons (Screen 11)

| UI element | Backend |
|------------|--------|
| Report Missing button | ✅ `POST /api/missing-persons` |
| Detail: photo, name, age, location, date, description | ✅ `GET /api/missing-persons/:id` |
| Voice description PLAY | ✅ `voiceUrl` on alert; play in app |
| Call Family, Share Case | ✅ Contact from detail; share = deep link or share sheet (no extra API) |
| Comments / voice comments | ✅ `GET /api/missing-persons/:id/comments`, `POST /api/missing-persons/:id/comments` (text and/or voiceUrl) |

---

### Profile & Discover (Screens 12, 13, 14)

| UI element | Backend |
|------------|--------|
| Profile: name, location, bio, Edit | ✅ `GET /api/users/me`, `PATCH /api/users/me` (extend with bio/neighborhood if needed) |
| Verify Profile button | ⚠️ No “verification” flow in backend; can be UI-only or add verification API later |
| Followers / Following / Likes | ⚠️ No follow or likes API yet; backend would need follow and (e.g.) content-like tables |
| Discover People, search, roles (Community Leader, Verified Employer, etc.) | ⚠️ User search/list possible via `GET /api/admin/users` for admin; no public “discover users” or roles in list yet |
| Follow / Following buttons | ❌ Need `POST/DELETE /api/users/:id/follow` (or similar) |
| Light Mode | ⚠️ Client-only or add `preferred_theme` to `PATCH /users/me` |
| Secure Logout | ✅ Client drops JWT; optional `POST /auth/logout` for token blacklist if you add it |

---

### Create Content (Screen 15)

| UI element | Backend |
|------------|--------|
| Shoot Short / From Gallery | ✅ `POST /api/videos` (videoUrl, thumbnailUrl, etc.) – upload file to your storage then send URLs |
| Go Live | ✅ `POST /api/streams`, then Agora token + Socket `stream:join` |

---

### Summary: what the backend can handle today

- **Fully supported:** Auth (OTP + Firebase), profile create/update, home feed, jobs, marketplace, safety/reports, missing persons (including voice and comments), chat list + conversation + presence + read receipts, streams (create, join, viewer count, mute/kick), short videos, community room posts/comments/moderation.
- **Partially supported / small gaps:**
  - **Neighborhood:** Add to user model and `PATCH /users/me` if you want it stored.
  - **Job “Apply” / “Rating”:** Not in backend yet; add when you build applications and ratings.
  - **Favorites (e.g. marketplace heart):** Not in backend; add favorites API if needed.
  - **Emergency line:** Use app config or static content.
- **Not yet in backend:**
  - **Follow / Following / Discover People:** Need follow model + endpoints and optionally public user discovery.
  - **Verify profile:** No verification workflow in backend yet.
  - **Light mode:** Prefer client-side or add user preference field.

---

## File list (UI_Design folder)

- `WhatsApp Image 2026-01-28 at 7.10.30 PM.jpeg` – Onboarding
- `WhatsApp Image 2026-01-28 at 7.10.31 PM.jpeg` – Request OTP
- `WhatsApp Image 2026-01-28 at 7.10.31 PM (1).jpeg` – Verify Phone
- `WhatsApp Image 2026-01-28 at 7.10.31 PM (2).jpeg` – Profile Creation
- `WhatsApp Image 2026-01-28 at 7.10.31 PM (3).jpeg` – Home
- `WhatsApp Image 2026-01-28 at 7.10.32 PM.jpeg` – Home (variant)
- `WhatsApp Image 2026-01-28 at 7.10.32 PM (1).jpeg` – Jobs
- `WhatsApp Image 2026-01-28 at 7.10.32 PM (2).jpeg` – Marketplace
- `WhatsApp Image 2026-01-28 at 7.10.33 PM.jpeg` – Safety Hub
- `WhatsApp Image 2026-01-28 at 7.10.33 PM (1).jpeg` – Messages
- `WhatsApp Image 2026-01-28 at 7.10.33 PM (2).jpeg` – Missing Person Detail
- `WhatsApp Image 2026-01-28 at 7.10.33 PM (3).jpeg` – Profile
- `WhatsApp Image 2026-01-28 at 7.10.34 PM.jpeg` – Discover People
- `WhatsApp Image 2026-01-28 at 7.10.34 PM (1).jpeg` – Profile/Settings (Light mode, Logout)
- `WhatsApp Image 2026-01-28 at 7.10.35 PM.jpeg` – Create Content modal
- `WhatsApp Image 2026-01-28 at 7.10.35 PM (1).jpeg` – Safety / Recent alerts
- `WhatsApp Image 2026-01-28 at 7.10.35 PM (2).jpeg` – Chat conversation

---

*Generated from UI_Design folder review. Backend can handle most of these screens; follow/unfollow and a few preferences need new endpoints or fields.*
