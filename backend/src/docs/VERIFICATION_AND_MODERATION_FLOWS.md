# Verification & Moderation – Frontend Flow Notes

## A) KYC Screen (React Native)

### Profile data required first
- **full_name**: Collect on Profile or before KYC (required for P2 name match).
- **birthdate**: Collect on Profile or before KYC (required for P3 age >= 18 and DOB match).
- Store via PATCH `/users/me` (backend to support `full_name`, `dob` in user update if not already).

### KYC screen flow
1. **Doc type**: User selects passport / Fayda / resident_id / other.
2. **Document images**: Upload front (required), back (optional). Use Cloudinary signed upload; send returned URLs.
3. **Selfie**: Upload live selfie or normal selfie. Send URL.
4. **Document number**: User enters (stored as hash + last4 only).
5. **Consent**: Required checkbox.
6. **Submit**: POST `/kyc/submit` with:
   - `docType`, `docNumber`, `frontImageUrl`, `backImageUrl` (optional), `selfieImageUrl`
   - `fullName`, `birthdate` (from profile or form)
   - `consent: true`
7. **Response**: Returns `status` (e.g. `pending_auto`, `verified_auto`, `pending_manual`) and optional `verification.allPass`.
8. **UI states**:
   - Show "Processing…" while submitting (backend runs auto-verification).
   - On success: show status (Verified / Pending manual review / Rejected).
   - If `pending_manual`: "Under review; we’ll notify you."

### Posting gate (jobs / marketplace)
- **Tier 0**: Not verified – can browse, chat, report; limited posting.
- **Tier 1**: OTP verified – can post with strict rate limits.
- **Tier 2**: KYC verified – can post more; show trust badge.
- **Age**: Must be >= 18 to post jobs or sell items. Check `user.dob` and block with message if under 18.
- **Block** if: OTP not verified, age < 18, or (when exceeding thresholds) not KYC verified. Show clear message and link to KYC.

---

## B) Safety / Reporting UI

### Report content
- **Endpoint**: POST `/reports/content` with:
  - `targetType`: `"video"` | `"livestream"` | `"job"` | `"market"` | `"user"`
  - `targetId`: string ID of the content/user
  - `reason`: `sexual_nudity` | `gore_violence` | `hate_harassment` | `scam_fraud` | `child_safety` | `other`
- **Behaviour**: One report per user per target per 24h. If >= 3 unique reporters in 24h (or 1 for child_safety / gore_violence), content is auto-hidden/stream stopped and admin notified.
- **UI**: On video/stream/job/market/user detail, add "Report" with reason picker and optional note. Show confirmation: "Report recorded" or "Content has been hidden due to reports."

### Safety modal (before go-live for livestream)
- Show community rules; user must accept before starting stream.
- Store acceptance (e.g. `safety_acknowledged_at` or a dedicated livestream-rules flag) and only then allow "Go live".

---

## C) Socket events (React Native client)

Listen for:

- **`livestream_stop`**: `{ streamId, reason?, action? }` – Stream was stopped (admin or threshold). Leave stream UI and show message.
- **`content_removed`**: `{ targetType, targetId, action? }` – Video/content was removed. Refresh list or show "Content unavailable".
- **`user_banned`**: `{ reason? }` – Current user was banned. Clear token, redirect to login, show "Account banned".

---

## D) Admin panel (Web)

- **Moderation queue**: GET `/admin/moderation/queue` – Returns `kyc`, `videos`, `streams` needing review.
- **KYC**: GET `/admin/kyc?status=pending_manual`, PATCH `/admin/kyc/:submissionId/approve` (body: `{ faceVerified }`), PATCH `/admin/kyc/:submissionId/reject` (body: `{ reason }`).
- **Video**: PATCH `/admin/moderation/video/:id` body `{ action: "delete" | "restore" | "ban_user" }`.
- **Stream**: PATCH `/admin/moderation/stream/:id` body `{ action: "stop" | "restore" | "ban_user" | "ban_phone" }`.
- **UI**: List flagged items with thumbnail (video), stream title + host (stream), report count, top reasons, quick actions: Delete/Restore, Stop stream, Ban user, Ban phone.

---

## E) Backend endpoints summary

| Method | Path | Description |
|--------|------|-------------|
| POST | /kyc/submit | Submit KYC (doc + selfie + fullName + birthdate); auto-verification runs. |
| GET | /kyc/status | Current user KYC status and latest submission. |
| GET | /admin/kyc | List KYC submissions (default status pending_manual). |
| PATCH | /admin/kyc/:id/approve | Approve KYC (optional faceVerified). |
| PATCH | /admin/kyc/:id/reject | Reject KYC with reason. |
| POST | /reports/content | Create content report (targetType, targetId, reason). |
| GET | /admin/moderation/queue | Moderation queue (KYC + videos + streams). |
| PATCH | /admin/moderation/video/:id | delete \| restore \| ban_user. |
| PATCH | /admin/moderation/stream/:id | stop \| restore \| ban_user \| ban_phone. |

---

## F) User update (full_name, dob)

- Backend: PATCH `/users/me` should accept `full_name` and `dob` (date string YYYY-MM-DD) and persist to `users.full_name` and `users.dob` (migration 019 adds these columns).
- Mobile: Profile or onboarding screen collects full name and birthdate and sends via PATCH `/users/me` before or during KYC flow.
