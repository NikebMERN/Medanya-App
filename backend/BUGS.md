# Medanya Backend – Main Bugs & Errors to Fix

Use this list to track and fix the main bugs the backend currently cannot handle correctly.

---

## 1. Auth middleware: wrong JWT payload field (breaks all protected routes)

**Where:** `src/middlewares/auth.middleware.js`

**Problem:** JWT is issued with `userId` (see `auth.service.js` `issueJWT`), but the middleware uses `decoded.id` for the DB lookup. So `decoded.id` is `undefined` → no user row found → **401 "Invalid user"** on every protected route after login.

**Error user sees:** `401 { "error": { "code": "UNAUTHORIZED", "message": "Invalid user" } }`

**Fix:** Use `decoded.userId ?? decoded.id` for the user id and set `req.user` to a consistent shape `{ id, role, phone_number }`.

---

## 2. Auth middleware: malformed Authorization header crashes

**Where:** `src/middlewares/auth.middleware.js`

**Problem:** If client sends `Authorization: Bearer` (no space after) or just `Bearer`, then `authHeader.split(" ")[1]` is `undefined`. `jwt.verify(undefined, secret)` throws and is caught as "Invalid token", but it's clearer to reject early with a proper message.

**Fix:** After splitting, check that `token` exists and is a non-empty string before calling `jwt.verify`; otherwise return 401 with message like "Invalid authorization header".

---

## 3. JWT_SECRET not validated at startup

**Where:** `src/config/env.js` (and usage in `auth.middleware.js`, `auth.service.js`, `config/jwt.js`)

**Problem:** `JWT_SECRET` is not in the env schema. Server can start without it; first login or first protected request then fails with JWT sign/verify error.

**Error:** e.g. `JsonWebTokenError: secretOrPrivateKey must have a value` or similar when `process.env.JWT_SECRET` is undefined.

**Fix:** Add `JWT_SECRET: z.string().min(1)` to `env.js` so the app refuses to start without it (and document it in `.env.example`).

---

## 4. Admin can change their own role (self‑upgrade)

**Where:** `src/modules/admin/admin.service.js` – `setUserRole(userId, role)`

**Problem:** There is no check that the target user is not the current admin. An admin can promote themselves or change their own role (e.g. lock themselves out or escalate).

**Fix:** In the admin controller (or service), ensure `userId !== req.user.id` (or `req.user.userId`). If they match, return 403 with a message like "Cannot change your own role".

---

## 5. ~~Video uploads auto‑approved~~ ✅ FIXED

**Where:** `src/modules/videos/video.service.js` – `createVideo()`

**Was:** All uploads were `approved`. **Fixed:** `status = user?.role === 'admin' ? 'approved' : 'pending'`. Public list/detail already filter by approved.

---

## 6. Livestream: no “mute user” (block from stream chat)

**Where:** `src/modules/livestream/stream.socket.js` (and optionally stream model/service)

**Problem:** Admin/host cannot mute a user in a stream. Banned users are blocked at connection, but there is no in‑stream mute.

**Fix:** Add a way to mark a user as muted for a stream (e.g. in memory per stream: `mutedSet` of userIds, or a field in DB/Mongo). In `stream:chat:send`, if the sender is muted for that stream, reject with a clear error (e.g. "You are muted"). Add an event or HTTP endpoint for admin/host to mute/unmute (e.g. `stream:mute` / `stream:unmute` or PATCH stream/:id/mute).

---

## 7. Livestream: no “kick user” from stream room

**Where:** `src/modules/livestream/stream.socket.js`

**Problem:** Admin/host cannot kick a viewer from a stream room. Server never forces a socket to leave `stream:{streamId}`.

**Fix:** Implement a kick flow: e.g. server emits to the target socket an event like `stream:kicked` with `{ streamId }` so the client leaves the room and UI updates; optionally track kicked users for that stream and reject `stream:join` for them until stream ends or a time window. Add an event or HTTP endpoint for admin/host to kick (e.g. `stream:kick` with `targetUserId`).

---

## 8. (Optional) Server‑side OTP send/verify not implemented

**Where:** Auth module – no `POST /auth/otp/send` or `POST /auth/otp/verify`

**Problem:** Checklist expects OTP stored with TTL and rate‑limited verify. Current flow is Firebase ID token only (`POST /auth/verify-otp`).

**Fix only if required:** Add OTP send (store code with TTL in Redis/DB, rate limit), OTP verify (validate code, clear it, then create/fetch user and issue JWT). Keep or replace Firebase flow depending on product choice.

---

## Priority order (remaining)

| Priority | Bug | Status |
|----------|-----|--------|
| ~~P0~~ | ~~#1 Auth middleware JWT field~~ | ✅ Fixed |
| ~~P0~~ | ~~#3 JWT_SECRET in env~~ | ✅ Fixed (add JWT_SECRET to .env) |
| ~~P1~~ | ~~#2 Malformed Authorization~~ | ✅ Fixed |
| ~~P1~~ | ~~#4 Admin self-role change~~ | ✅ Fixed |
| ~~P1~~ | ~~#5 Video pending for non-admin~~ | ✅ Fixed |
| P2 | #6 Livestream mute | **TODO** |
| P2 | #7 Livestream kick | **TODO** |
| P3 | #8 OTP (only if product requires it) | Optional |

---

*Last updated from backend checklist review. Fix these in order of priority, then re-run tests and manual checks.*
