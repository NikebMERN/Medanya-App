# Medanya Admin Panel

React (Vite) admin panel for Medanya App. Uses the same backend API with JWT; only users with `role: "admin"` can access admin routes.

## Tech stack

- React 19, Vite 7
- TailwindCSS
- TanStack Query (React Query)
- React Router 7
- Zod, react-hook-form, @hookform/resolvers
- Axios (API client)

## Setup

```bash
cd admin
npm install
cp .env.example .env
# Edit .env if needed (Vite proxy points /api to localhost:4001 by default)
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). Log in with an **admin** phone number and OTP (see “Creating an admin” below).

## Creating an admin (backend seed)

The backend has a seed script that creates or updates an admin user by phone number.

1. **Run the seed** (from backend directory):

   ```bash
   cd backend
   npm run seed
   ```

   This runs `node src/database/seeds/admin.seed.js`. By default it uses the phone number **+251935657526**: if that user exists, it sets their role to `admin`; otherwise it creates a new user with that phone and role `admin`.

2. **Use another phone number**  
   Edit `backend/src/database/seeds/admin.seed.js` and change the `phone` constant at the top to your desired number (e.g. your own phone in E.164 format). Then run `npm run seed` again.

3. **Log in from the admin panel**  
   - Enter that phone number (e.g. `+251935657526`) and click “Send OTP”.
   - If the backend uses Firebase Phone Auth, you must either:
     - Add this number as a **test number** in Firebase Console (Authentication → Sign-in method → Phone → Phone numbers for testing), and use the fixed test code, or
     - Use the same OTP flow as the mobile app (e.g. reCAPTCHA / client-side Firebase) if you integrate it in the admin app.
   - After entering the correct OTP, the backend returns a JWT and user object. If `user.role === "admin"`, the panel stores the token and redirects to the dashboard.

## Build

```bash
npm run build
npm run preview   # serve dist
```

## Backend TODO (API contract)

The panel is built to work with the existing Medanya backend. The following endpoints are **already implemented** and used:

- `POST /api/auth/otp/send` – send OTP
- `POST /api/auth/otp/verify` – verify OTP and return JWT + user
- `GET /api/admin/health`
- `GET /api/admin/users` (pagination)
- `PATCH /api/admin/users/:id/role`
- `PATCH /api/admin/users/:id/ban`
- `GET /api/admin/kyc` (list KYC submissions by status)
- `PATCH /api/admin/kyc/:submissionId/approve` (body: `{ faceVerified?: boolean }`)
- `PATCH /api/admin/kyc/:submissionId/reject` (body: `{ reason?: string }`)
- `GET /api/admin/reviews/listings`
- `PATCH /api/admin/reviews/listings/:type/:id`
- `GET /api/admin/users/:id/risk`

To fully match the original admin spec, the backend could add:

- Dedicated admin auth (e.g. `POST /admin/auth/login`, OTP/2FA, refresh, logout)
- `GET /admin/dashboard/summary`
- `GET /admin/moderation/items` (unified queue with type/status/risk)
- `PATCH /admin/moderation/items/:id`
- Reports/search, blacklist, severe abuse, livestream controls, wallet/gifts, settings (risk weights, keywords), audit log (`GET /admin/audit`)

## Security notes

- Admin JWT is stored in `sessionStorage` (and optionally `window.__ADMIN_TOKEN__` for the API client). For production, consider httpOnly cookies set by the backend.
- All admin API calls send `Authorization: Bearer <token>`. The backend must enforce `requireRole("admin")` on every admin route.
- 401 responses clear the stored token and redirect to `/login`.

## Acceptance checklist

- [x] Admin can log in with OTP and obtain session (same auth as app; admin role required)
- [x] RBAC: only admin can access panel; non-admin is redirected to login
- [x] Moderation: KYC queue with filters (pending/approved/rejected), approve/reject with optional face verified
- [x] Users: list with pagination
- [ ] Reports/blacklist, severe abuse, livestream, wallet, settings, audit log (when backend endpoints exist)
- [x] Error handling and loading states on main pages
