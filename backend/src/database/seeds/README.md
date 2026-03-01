# Database seeds

## Admin seed (create or update admin user)

Creates an admin user so you can log in to the Medanya Admin Panel (or use admin API routes).

### Run

From the **backend** directory:

```bash
npm run seed
```

This runs `node src/database/seeds/admin.seed.js`.

### Behaviour

- The script uses the phone number defined in `admin.seed.js` (default: `+251935657526`).
- If a user with that phone **does not exist**, it **inserts** a new user with:
  - `phone_number` = that phone
  - `role` = `'admin'`
  - `is_verified` = 1
  - `is_banned` = 0
- If a user with that phone **already exists**, it **updates** that user to:
  - `role` = `'admin'`
  - `is_banned` = 0
  - `is_verified` = 1

### Use another phone number

1. Open `src/database/seeds/admin.seed.js`.
2. Change the `phone` constant at the top to your desired E.164 number (e.g. `"+971501234567"`).
3. Run `npm run seed` again.

### Log in as admin

- **Admin panel (web):** Open the admin Vite app, enter the same phone number, request OTP, then enter the code. The backend must be able to send/verify OTP for that number (e.g. Firebase test number or real SMS).
- **API:** Use the same auth flow as the mobile app (e.g. `POST /api/auth/otp/send`, then `POST /api/auth/otp/verify`) to get a JWT. Use that JWT for `GET /api/admin/*` routes.

## Analytics seed

Creates analytics_daily documents for chart testing.

### Run

```bash
npm run seed:analytics
```

This runs `node scripts/seed_analytics.js` with defaults (30 days, 50 users, 10 creators).

### Params

```
node scripts/seed_analytics.js [days] [users] [creators]
```
